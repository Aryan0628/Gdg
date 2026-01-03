import sys
import json
import os
import ee
import datetime
import traceback
from google.oauth2 import service_account
GCP_PROJECT_ID = 'certain-acre-482416-b7'

DEFAULT_FLOOD_ALERT_THRESHOLD_PERCENT = 5.0
RECENT_FLOOD_PERIOD_DAYS = 10
BASELINE_PERIOD_OFFSET_YEARS = 1
BASELINE_PERIOD_DURATION_DAYS = 30


S1_COLLECTION = 'COPERNICUS/S1_GRD'
S1_POLARIZATION = 'VV' 
S1_INSTRUMENT_MODE = 'IW'
WATER_THRESHOLD_DB = -16 
REDUCTION_SCALE_S1 = 20
DEFAULT_POINT_BUFFER = 1000

def initialize_gee(credentials_path_arg):
    try:
        if not credentials_path_arg or not os.path.exists(credentials_path_arg):
            print(f"ERROR: Credentials file not found.", file=sys.stderr)
            return False
        
        credentials = service_account.Credentials.from_service_account_file(credentials_path_arg)
        scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/earthengine'])
        ee.Initialize(credentials=scoped_credentials, project=GCP_PROJECT_ID, opt_url='https://earthengine-highvolume.googleapis.com')
        return True
    except Exception as e:
        print(f"ERROR: GEE Init Failed: {e}", file=sys.stderr)
        return False

def smooth_radar(image):
    return image.focal_median(50, 'circle', 'meters')

def apply_water_threshold(image):
    smoothed = smooth_radar(image)
    water = smoothed.select(S1_POLARIZATION).lt(WATER_THRESHOLD_DB).rename('water')
    return water.copyProperties(image, ['system:time_start'])

def get_flood_image_url(image, region_geometry, vis_params, label):
    try:
        url = image.getThumbURL({
            'min': vis_params.get('min', 0),
            'max': vis_params.get('max', 1),
            'dimensions': 512,
            'palette': vis_params.get('palette', ['000000', '00ffff']),
            'region': region_geometry,
            'format': 'png'
        })
        return url
    except Exception as e:
        print(f"WARNING: Thumbnail failed for {label}: {e}", file=sys.stderr)
        return None

def check_flooding(region_geometry, threshold_percent, buffer_radius_meters):
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        end_date_recent = ee.Date(now)
        start_date_recent = end_date_recent.advance(-RECENT_FLOOD_PERIOD_DAYS, 'day')

        end_date_baseline = end_date_recent.advance(-BASELINE_PERIOD_OFFSET_YEARS, 'year')
        start_date_baseline = end_date_baseline.advance(-BASELINE_PERIOD_DURATION_DAYS, 'day')

        s1_collection = ee.ImageCollection(S1_COLLECTION) \
            .filter(ee.Filter.eq('instrumentMode', S1_INSTRUMENT_MODE)) \
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', S1_POLARIZATION)) \
            .filterBounds(region_geometry) \
            .select(S1_POLARIZATION)

        recent_s1 = s1_collection.filterDate(start_date_recent, end_date_recent)
        baseline_s1 = s1_collection.filterDate(start_date_baseline, end_date_baseline)


        count = recent_s1.size().getInfo()
        if count == 0:
            return {
                "status": "success", 
                "message": "No Sentinel-1 pass in last 10 days.", 
                "alert_triggered": False,
                "flooded_area_sqkm": 0,
                "flooded_percentage": 0,
                "total_area_sqkm": 0,
                "threshold_percent":threshold_percent,
                "start_image_url":None, 
                "end_image_url": None,      
                "dates": {
                    "scan_window_start": start_date_recent.format('YYYY-MM-dd').getInfo(),
                    "scan_window_end": end_date_recent.format('YYYY-MM-dd').getInfo(),
                }
            }
        recent_water = recent_s1.map(apply_water_threshold).median().gt(0.5).clip(region_geometry)
        baseline_water = baseline_s1.map(apply_water_threshold).median().gt(0.5).clip(region_geometry)
        flood_mask = recent_water.subtract(baseline_water).gt(0).rename('flood_water').selfMask()

        pixel_area = ee.Image.pixelArea().divide(1e6) 
        
        flood_stats = flood_mask.multiply(pixel_area).reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=region_geometry,
            scale=REDUCTION_SCALE_S1,
            maxPixels=1e9,
            bestEffort=True
        )
        total_stats = pixel_area.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=region_geometry,
            scale=REDUCTION_SCALE_S1,
            maxPixels=1e9,
            bestEffort=True
        )

        flooded_sqkm = flood_stats.get('flood_water').getInfo()
        total_sqkm = total_stats.get('area').getInfo()

        if flooded_sqkm is None: flooded_sqkm = 0.0
        if total_sqkm is None: total_sqkm = 0.0

        flooded_percentage = (flooded_sqkm / total_sqkm * 100) if total_sqkm > 0 else 0
        alert_triggered = flooded_percentage > threshold_percent

        print(f"UrbanFlow Flood Check: {flooded_sqkm:.4f} km2 detected ({flooded_percentage:.2f}%)", file=sys.stderr)

        vis_params = {'palette': ['00ffff']} 
        flood_url = get_flood_image_url(flood_mask, region_geometry, vis_params, "flood_map")

        # For "Before", we show the Radar intensity to prove it's dry
        radar_vis = {'min': -25, 'max': 0}
        baseline_url = get_flood_image_url(baseline_s1.median().clip(region_geometry), region_geometry, radar_vis, "radar_base")

        return {
            "status": "success",
            "alert_triggered": alert_triggered,
            "flooded_area_sqkm": round(flooded_sqkm, 3),
            "flooded_percentage": round(flooded_percentage, 2),
            "total_area_sqkm": round(total_sqkm, 3),
            "threshold_percent": threshold_percent,
            "start_image_url": baseline_url, 
            "end_image_url": flood_url,      
            "dates": {
               "scan_window_start": start_date_recent.format('YYYY-MM-dd').getInfo(),
                "scan_window_end": end_date_recent.format('YYYY-MM-dd').getInfo(),
            }
        }

    except ee.EEException as e:
        print(f"ERROR: GEE Error: {e}", file=sys.stderr)
        return {"status": "error", "message": f"GEE Error: {str(e)}"}
    except Exception as e:
        print(f"ERROR: Script Error: {e}", file=sys.stderr)
        return {"status": "error", "message": f"Script Error: {str(e)}"}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing credentials arg"}))
        sys.exit(1)
    
    credentials_path = sys.argv[1]
    input_str = sys.stdin.read()
    
    try:
        params = json.loads(input_str)
        geojson = params['geometry']
        threshold = float(params.get('threshold_percent', DEFAULT_FLOOD_ALERT_THRESHOLD_PERCENT))
        region_id = params.get('region_id', 'unknown')
        buffer_radius = int(params.get('buffer_meters', DEFAULT_POINT_BUFFER))
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
        elif g_type == 'Point': ee_geom = ee.Geometry.Point(coords).buffer(buffer_radius)
        else: raise ValueError(f"Unknown Type: {g_type}")
    except Exception as e:
         print(json.dumps({"status": "error", "message": f"Geometry Error: {e}"}))
         sys.exit(1)

    print(f"Starting UrbanFlow Flood Analysis for {region_id}...", file=sys.stderr)
    result = check_flooding(ee_geom, threshold, buffer_radius)
    result['region_id'] = region_id
    print(json.dumps(result))