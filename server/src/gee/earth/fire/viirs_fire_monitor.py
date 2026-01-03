# backend/services/google-earth/viirs_fire_monitor.py

import sys
import json
import os
import ee
import datetime
import traceback

# --- CONFIGURATION ---
DEFAULT_DAYS_BACK = 5
FIRE_COLLECTION = 'FIRMS'  
# --- MODIFIED: Added MODIS LST collection for background thermal map ---
LST_COLLECTION = 'MODIS/061/MOD11A1' 
LANDCOVER_COLLECTION = 'ESA/WorldCover/v100/2020'
gcp_project_id = 'certain-acre-482416-b7'

def initialize_gee(credentials_path_arg):
    global gcp_project_id
    try:
        credentials_path = credentials_path_arg
        if not credentials_path or not os.path.exists(credentials_path):
            print(f"ERROR: Credentials file not found.", file=sys.stderr)
            return False
        
        credentials = ee.ServiceAccountCredentials(None, key_file=credentials_path)
        ee.Initialize(credentials=credentials, project=gcp_project_id, opt_url='https://earthengine-highvolume.googleapis.com')
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
        # 1. Date Setup
        now = datetime.datetime.now(datetime.timezone.utc)
        end_date = ee.Date(now)
        start_date = end_date.advance(-days_back, 'day')

        # 2. Load FIRMS Collection
        dataset = ee.ImageCollection(FIRE_COLLECTION) \
            .filterDate(start_date, end_date) \
            .filterBounds(region_geometry)

        # 3. Mosaics (Max Value Composites)
        temp_max = dataset.select('T21').max().clip(region_geometry)
        conf_max = dataset.select('confidence').max().clip(region_geometry)

        # 4. Industrial Masking
        wc = ee.Image(LANDCOVER_COLLECTION).select('Map')
        industrial_mask = wc.neq(50) 

        # 5. Fire Detection Logic
        valid_fire_mask = conf_max.gt(90).Or(
            conf_max.gt(40).And(temp_max.gt(330.0))
        )

        final_mask = valid_fire_mask.And(industrial_mask)
        fire_clean = temp_max.updateMask(final_mask)

        # 6. Count Hot Pixels
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

        # --- INTELLIGENT VISUALIZATION ---
        
        if pixel_count > 0:
            # SCENARIO A: Fire Detected -> Show the Fire Layer (Red/Yellow)
            current_image_to_show = fire_clean
            vis_params = {
                "min": 325, "max": 400, 
                "palette": ['ff0000', 'ffa500', 'ffff00'] 
            }
            # Historical Background (1 year ago)
            hist_start = start_date.advance(-1, 'year')
            hist_end = end_date.advance(-1, 'year')
            
            hist_lst = ee.ImageCollection(LST_COLLECTION) \
                .filterDate(hist_start, hist_end) \
                .filterBounds(region_geometry) \
                .select('LST_Day_1km') \
                .mean() \
                .clip(region_geometry) \
                .multiply(0.02)
            
            # Use Thermal Palette for the "Before" image
            vis_params_hist = {
                "min": 290, "max": 330, 
                "palette": ['0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000']
            }
            before_image_url = get_fire_image_url(hist_lst, region_geometry, vis_params_hist, "before")   
        else:
            # SCENARIO B: No Fire -> Show MODIS Land Surface Temperature (Background)
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
                "min": 290, 
                "max": 330, 
                "palette": ['0000ff', '00ffff', '00ff00', 'ffff00', 'ff0000'] 
            }
            
            before_image_url = get_fire_image_url(hist_lst, region_geometry, vis_params, "before")

        # Generate 'After' (Current) Image URL
        after_image_url = get_fire_image_url(current_image_to_show, region_geometry, vis_params, "after")
        
        # 8. Fire Points List
        fires_list = []
        if pixel_count > 0:
            # --- FIXED SECTION ---
            # 1. Create an integer "label" band (value=1) to define the grouping
            grouping = fire_clean.gt(0).rename('label').int()
            
            # 2. Stack the Label + Temp + Lon/Lat
            input_image = grouping.addBands(fire_clean).addBands(ee.Image.pixelLonLat())

            # 3. Run reduceToVectors on the integer Label band
            vectors = input_image.reduceToVectors(
                geometry=region_geometry,
                scale=1000, 
                maxPixels=1e8,
                reducer=ee.Reducer.mean(), # Averages Temp & Lat/Lon for each fire blob
                bestEffort=True
            )
            
            features = vectors.getInfo()['features']
            
            # Limit list size in Python
            for feat in features[:50]: 
                props = feat['properties']
                # The reducer mean will be in 'mean' (if 1 band) or 'T21' depending on reducer output
                # Usually simply 'mean' if reducing a specific band, but here we reduced multiple.
                # However, since 'fire_clean' (T21) is the first added band after label, 
                # GEE usually names the property 'mean' if only one extra band, 
                # or 'T21' if names are preserved. Let's check 'T21' first, then 'mean'.
                
                # Note: reduceToVectors with multi-band reducer often produces properties like "mean", "mean_1", etc.
                # To be safe, we'll try to get 'T21' (original name) or fallback to 'mean'.
                temp_k = props.get('T21', props.get('mean', 0))
                
                intensity = "Moderate"
                if temp_k > 350: intensity = "Severe"
                elif temp_k < 330: intensity = "Smoldering"

                # We can also get lat/lon from the reducer if we prefer, but geometry centroid is fine
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

# --- MAIN ENTRY POINT ---
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
        elif g_type == 'Point': ee_geom = ee.Geometry.Point(coords).buffer(10000)
        else: raise ValueError(f"Unknown Type: {g_type}")
    except Exception as e:
         print(json.dumps({"status": "error", "message": f"Geometry Error: {e}"}))
         sys.exit(1)

    print(f"Starting VIIRS/FIRMS Analysis for {region_id}...", file=sys.stderr)
    result = detect_active_fires(ee_geom, days)
    result['region_id'] = region_id
    print(json.dumps(result))