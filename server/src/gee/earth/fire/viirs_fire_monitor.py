# backend/services/google-earth/viirs_fire_monitor.py

import sys
import json
import os
import ee
import datetime
import traceback
# 1. UPDATED: Modern Authentication Library
from google.oauth2 import service_account

# --- CONFIGURATION ---
DEFAULT_DAYS_BACK = 5
FIRE_COLLECTION = 'FIRMS'  
LST_COLLECTION = 'MODIS/061/MOD11A1' 
LANDCOVER_COLLECTION = 'ESA/WorldCover/v100/2020'
GCP_PROJECT_ID = 'certain-acre-482416-b7'
DEFAULT_BUFFER = 5000 # Default 5km buffer if user doesn't specify one

def initialize_gee(credentials_path_arg):
    try:
        if not credentials_path_arg or not os.path.exists(credentials_path_arg):
            print(f"ERROR: Credentials file not found.", file=sys.stderr)
            return False
        
        # 2. UPDATED: Use modern Service Account Auth
        credentials = service_account.Credentials.from_service_account_file(credentials_path_arg)
        scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/earthengine'])
        ee.Initialize(credentials=scoped_credentials, project=GCP_PROJECT_ID, opt_url='https://earthengine-highvolume.googleapis.com')
        return True
    except Exception as e:
        print(f"ERROR: GEE init failed: {e}", file=sys.stderr)
        return False

def get_fire_image_url(image, region_geometry, vis_params, label):
    try:
        url = image.getThumbURL({
            'min': vis_params.get('min', 325),
            'max': vis_params.get('max', 400),
            'palette': vis_params.get('palette', ['red', 'orange', 'yellow']),
            'dimensions': 512,
            'region': region_geometry,
            'format': 'png'
        })
        return url

    except Exception as e:
        print(f"WARNING: Could not get {label} URL: {e}", file=sys.stderr)
        return None

def detect_active_fires(region_geometry, days_back):
    try:
        # 3. UPDATED: Safe UTC Date handling
        now = datetime.datetime.now(datetime.timezone.utc)
        end_date = ee.Date(now)
        start_date = end_date.advance(-days_back, 'day')

        # Load Collection
        dataset = ee.ImageCollection(FIRE_COLLECTION) \
            .filterDate(start_date, end_date) \
            .filterBounds(region_geometry)

        # Mosaics
        temp_max = dataset.select('T21').max().clip(region_geometry)
        conf_max = dataset.select('confidence').max().clip(region_geometry)

        # Industrial Masking
        wc = ee.Image(LANDCOVER_COLLECTION).select('Map')
        industrial_mask = wc.neq(50) 

        # Fire Logic
        valid_fire_mask = conf_max.gt(90).Or(
            conf_max.gt(40).And(temp_max.gt(330.0))
        )

        final_mask = valid_fire_mask.And(industrial_mask)
        fire_clean = temp_max.updateMask(final_mask)

        # Count Hot Pixels
        hot_pixels = fire_clean.gt(0).selfMask()
        stats = hot_pixels.reduceRegion(
            reducer=ee.Reducer.count(),
            geometry=region_geometry,
            scale=1000, 
            maxPixels=1e9
        )
        pixel_count = stats.get('T21').getInfo()
        if pixel_count is None: pixel_count = 0
        
        print(f"UrbanFlow: Detected {pixel_count} verified fire pixels.", file=sys.stderr)

        # --- VISUALIZATION LOGIC ---
        if pixel_count > 0:
            # SCENARIO A: Fire Found
            current_image_to_show = fire_clean
            vis_params = {
                "min": 325, "max": 400, 
                "palette": ['ff0000', 'ffa500', 'ffff00'] 
            }
            
            hist_start = start_date.advance(-1, 'year')
            hist_end = end_date.advance(-1, 'year')
            
            hist_lst = ee.ImageCollection(LST_COLLECTION) \
                .filterDate(hist_start, hist_end) \
                .filterBounds(region_geometry) \
                .select('LST_Day_1km') \
                .mean() \
                .clip(region_geometry) \
                .multiply(0.02)
            vis_params_hist = {
                "min": 290, "max": 330, 
                "palette": ['0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000']
            }
            before_image_url = get_fire_image_url(hist_lst, region_geometry, vis_params_hist, "before")   
        else:
            safe_start_date = end_date.advance(-30, 'day')
            lst_dataset = ee.ImageCollection(LST_COLLECTION) \
                .filterDate(safe_start_date, end_date) \
                .filterBounds(region_geometry) \
                .select('LST_Day_1km') \
                .mean() \
                .clip(region_geometry)
            
            current_image_to_show = lst_dataset.multiply(0.02)

            hist_start = safe_start_date.advance(-1, 'year')
            hist_end = end_date.advance(-1, 'year')
            hist_lst = ee.ImageCollection(LST_COLLECTION) \
                .filterDate(hist_start, hist_end) \
                .filterBounds(region_geometry) \
                .select('LST_Day_1km') \
                .mean() \
                .clip(region_geometry) \
                .multiply(0.02)
            
            vis_params = {
                "min": 273,  # Change to 273 Kelvin (0°C)
                "max": 310,  # Lower max to 310 Kelvin (37°C) to make contrast visible
                "palette": ['0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000'] 
            }
            
            before_image_url = get_fire_image_url(hist_lst, region_geometry, vis_params, "before")

        after_image_url = get_fire_image_url(current_image_to_show, region_geometry, vis_params, "after")
        
        fires_list = []
        if pixel_count > 0:
            grouping = fire_clean.gt(0).rename('label').int()
            input_image = grouping.addBands(fire_clean).addBands(ee.Image.pixelLonLat())
            vectors = input_image.reduceToVectors(
                geometry=region_geometry,
                scale=1000, 
                maxPixels=1e8,
                reducer=ee.Reducer.mean(), 
                bestEffort=True
            )
            
            features = vectors.getInfo()['features']
            for feat in features[:50]: 
                props = feat['properties']
                temp_k = props.get('T21', props.get('mean', 0))
                
                intensity = "Moderate"
                if temp_k > 350: intensity = "Severe"
                elif temp_k < 330: intensity = "Smoldering"

                coords = feat['geometry']['coordinates']
                if len(coords) > 0 and isinstance(coords[0], list):
                    lat = coords[0][0][1]
                    lon = coords[0][0][0]
                else:
                    lat = 0; lon = 0

                fires_list.append({
                    "acq_date": "Recent (Mosaic)",
                    "brightness": round(temp_k, 2), 
                    "temp_c": round(temp_k - 273.15, 1),
                    "intensity": intensity,
                    "confidence": "High (>40%)",
                    "latitude": lat,
                    "longitude": lon
                })

        return {
            "status": "success",
            "active_fire_count": pixel_count,
            "fires": fires_list,
            "days_back": days_back,
            "start_image_url": before_image_url, 
            "end_image_url": after_image_url
        }

    except ee.EEException as gee_error:
        print(f"ERROR: GEE Error: {gee_error}", file=sys.stderr)
        return {"status": "error", "message": f"GEE Error: {gee_error}"}
    except Exception as e:
        print(f"ERROR: Script Error: {e}", file=sys.stderr)
        return {"status": "error", "message": f"Script Error: {e}"}

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing credentials arg"}))
        sys.exit(1)
    
    credentials_path = sys.argv[1]
    input_str = sys.stdin.read()
    
    try:
        params = json.loads(input_str)
        geojson = params['geometry']
        days = int(params.get('days_back', DEFAULT_DAYS_BACK))
        region_id = params.get('region_id', 'unknown')
        
        # 4. UPDATED: Dynamic Buffer Parsing
        buffer_radius = int(params.get('buffer_meters', DEFAULT_BUFFER))
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Input Error: {e}"}))
        sys.exit(1)

    if not initialize_gee(credentials_path):
        print(json.dumps({"status": "error", "message": "GEE Init Failed"}))
        sys.exit(1)

    try:
        g_type = geojson.get('type')
        coords = geojson.get('coordinates')
        if g_type == 'Polygon': ee_geom = ee.Geometry.Polygon(coords)
        elif g_type == 'MultiPolygon': ee_geom = ee.Geometry.MultiPolygon(coords)
        
        # 5. UPDATED: Apply the dynamic buffer here
        elif g_type == 'Point': ee_geom = ee.Geometry.Point(coords).buffer(buffer_radius)
        
        else: raise ValueError(f"Unknown Type: {g_type}")
    except Exception as e:
         print(json.dumps({"status": "error", "message": f"Geometry Error: {e}"}))
         sys.exit(1)

    print(f"Starting VIIRS/FIRMS Analysis for {region_id}...", file=sys.stderr)
    result = detect_active_fires(ee_geom, days)
    result['region_id'] = region_id
    print(json.dumps(result))