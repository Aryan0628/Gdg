import sys
import json
import os
import ee
import datetime
import time
import traceback
DEFAULT_DAYS_BACK = 5
FIRE_COLLECTION = 'FIRMS'  #Includes VIIRS (375m)
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
        now = datetime.datetime.now(datetime.timezone.utc)
        end_date = ee.Date(now)
        start_date = end_date.advance(-days_back, 'day')

       
        dataset = ee.ImageCollection(FIRE_COLLECTION) \
            .filterDate(start_date, end_date) \
            .filterBounds(region_geometry)

       
        # l=Low, n=Nominal, h=High
        def map_confidence(img):
            conf_numeric = img.select('confidence').remap(['l', 'n', 'h'], [1, 2, 3], 0).rename('conf_score')
            return img.addBands(conf_numeric)

        dataset_mapped = dataset.map(map_confidence)

        # Create Mosaics 
        temp_max = dataset_mapped.select('T21').max().clip(region_geometry)
        conf_max = dataset_mapped.select('conf_score').max().clip(region_geometry)

        #industries masking 
        wc = ee.Image(LANDCOVER_COLLECTION).select('Map')
        industrial_mask = wc.neq(50) # Keep everything except factories/cities

       #filtering for indian summers
        
        valid_fire_mask = conf_max.eq(3).Or(
            conf_max.eq(2).And(temp_max.gt(330.0))
        )

    
        final_mask = valid_fire_mask.And(industrial_mask)
        
        
        fire_clean = temp_max.updateMask(final_mask)

        # converting to boolean for counting
        hot_pixels = fire_clean.gt(0).selfMask()
        
        stats = hot_pixels.reduceRegion(
            reducer=ee.Reducer.count(),
            geometry=region_geometry,
            scale=375,
            maxPixels=1e9
        )
        pixel_count = stats.get('T21').getInfo()
        if pixel_count is None: pixel_count = 0
        
        print(f"Detected {pixel_count} verified VIIRS pixels.", file=sys.stderr)


        vis_params = {
            "min": 325, # Kelvin (~52C) - Start showing red here
            "max": 400, # Kelvin (~127C) - Peak yellow/white
            "palette": ['ff0000', 'ffa500', 'ffff00'] 
        }

       #after url
        after_image_url = get_fire_image_url(fire_clean, region_geometry, vis_params, "after")

       #before url
        hist_start = start_date.advance(-1, 'year')
        hist_end = end_date.advance(-1, 'year')
        
        
        hist_ds = ee.ImageCollection(FIRE_COLLECTION).filterDate(hist_start, hist_end).filterBounds(region_geometry).map(map_confidence)
        hist_temp = hist_ds.select('T21').max().clip(region_geometry)
        hist_conf = hist_ds.select('conf_score').max().clip(region_geometry)
        hist_mask = (hist_conf.eq(3).Or(hist_conf.eq(2).And(hist_temp.gt(330.0)))).And(industrial_mask)
        hist_clean = hist_temp.updateMask(hist_mask)
        
        before_image_url = get_fire_image_url(hist_clean, region_geometry, vis_params, "before")

       #fire point rist
        fires_list = []
        if pixel_count > 0:
           
            vectors = fire_clean.addBands(ee.Image.pixelLonLat()).reduceToVectors(
                geometry=region_geometry,
                scale=375,
                maxPixels=1e8,
                reducer=ee.Reducer.mean(), 
                bestEffort=True,
                numPixels=50 
            )
            
            features = vectors.getInfo()['features']
            for feat in features:
                props = feat['properties']
                temp_k = props.get('mean', 0)
                
                # Assign intensity label based on temperature
                intensity = "Moderate"
                if temp_k > 350: intensity = "Severe"
                elif temp_k < 330: intensity = "Smoldering"

                fires_list.append({
                    "acq_date": "N/A (Mosaic)",
                    "brightness": round(temp_k, 2), 
                    "temp_c": round(temp_k - 273.15, 1),
                    "intensity": intensity,
                    "confidence": "High (VIIRS Verified)",
                    "latitude": feat['geometry']['coordinates'][0][0][1],
                    "longitude": feat['geometry']['coordinates'][0][0][0]
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
        print(traceback.format_exc(), file=sys.stderr)
        return {"status": "error", "message": f"Script Error: {e}"}

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

    print(f"Starting VIIRS Analysis for {region_id}...", file=sys.stderr)
    result = detect_active_fires(ee_geom, days)
    result['region_id'] = region_id
    print(json.dumps(result))