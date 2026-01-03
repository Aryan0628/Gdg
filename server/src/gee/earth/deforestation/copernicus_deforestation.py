import sys
import json
import os
import ee
import datetime
import traceback
# 1. ADDED: Modern Auth Library
from google.oauth2 import service_account
# --- CONFIGURATION ---
GCP_PROJECT_ID = 'certain-acre-482416-b7' 

# 30 days ensures we get at least 2-3 passes of Sentinel-2 (Revisit is 5 days)
RECENT_PERIOD_DAYS = 6

# Comparison Baseline (Last 3 months for a stable average)
PREVIOUS_PERIOD_DAYS = 90 

DEFAULT_NDVI_DROP_THRESHOLD = -0.15 
SATELLITE_COLLECTION = 'COPERNICUS/S2_SR_HARMONIZED'
NIR_BAND = 'B8'
RED_BAND = 'B4'
CLOUD_MASK_BAND = 'SCL'
SCL_MASK_VALUES = [3, 8, 9, 10, 11] 
REDUCTION_SCALE = 20 
DEFAULT_POINT_BUFFER = 1000

def initialize_gee(credentials_path_arg):
    try:
        if not credentials_path_arg or not os.path.exists(credentials_path_arg):
            print(f"ERROR: Credentials file not found.", file=sys.stderr)
            return False
        
        # 2. UPDATED: Modern Authentication Method
        credentials = service_account.Credentials.from_service_account_file(credentials_path_arg)
        scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/earthengine'])
        ee.Initialize(credentials=scoped_credentials, project=GCP_PROJECT_ID, opt_url='https://earthengine-highvolume.googleapis.com')
        return True
    except Exception as e:
        print(f"ERROR: GEE init failed: {e}", file=sys.stderr)
        return False

def mask_s2_clouds(image):
    """
    Aggressive Cloud Masking using the Scene Classification Layer (SCL).
    """
    scl = image.select(CLOUD_MASK_BAND)
    # We allow classes 4 (Vegetation), 5 (Bare Soils), 6 (Water), 7 (Unclassified)
    # We mask 3 (Cloud Shadows), 8-10 (Clouds), 11 (Snow)
    mask = scl.remap(SCL_MASK_VALUES, [0]*len(SCL_MASK_VALUES), defaultValue=1)
    return image.updateMask(mask)

def calculate_ndvi(image):
    ndvi = image.normalizedDifference([NIR_BAND, RED_BAND]).rename('NDVI')
    return image.addBands(ndvi).copyProperties(image, ['system:time_start'])

def get_image_thumbnail_url(image, region_geometry, vis_params, filename_prefix):
    try:
        url = image.getThumbURL({
            'min': vis_params.get('min', -0.2),
            'max': vis_params.get('max', 0.8),
            'dimensions': 512,
            'palette': vis_params.get('palette', ['red', 'yellow', 'green']),
            'region': region_geometry,
            'format': 'png'
        })
        return url
    except Exception as e:
        print(f"WARNING: Thumbnail failed for {filename_prefix}: {e}", file=sys.stderr)
        return None
def check_deforestation(region_geometry, threshold, buffer_radius_meters):
    try:
        # 3. FIXED: Safe UTC Date handling
        end_date_recent = ee.Date(datetime.datetime.now(datetime.timezone.utc))
        start_date_recent = end_date_recent.advance(-RECENT_PERIOD_DAYS, 'day')
        
        # Baseline Window
        end_date_baseline = start_date_recent
        start_date_baseline = end_date_baseline.advance(-PREVIOUS_PERIOD_DAYS, 'day')

        # Get Recent Collection
        recent_collection = ee.ImageCollection(SATELLITE_COLLECTION) \
            .filterBounds(region_geometry) \
            .filterDate(start_date_recent, end_date_recent) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50)) \
            .map(mask_s2_clouds) \
            .map(calculate_ndvi)

        # Check Data Availability
        count = recent_collection.size().getInfo()
        if count == 0:
            # 4. FIXED: 'null' (JS) -> None (Python)
            return {
                "status": "success", 
                "message": f"No satellite pass in the last {RECENT_PERIOD_DAYS} days (or too cloudy).",
                "alert_triggered": False,
                "mean_ndvi_change": 0,
                "threshold": threshold,
                "start_image_url": None,
                "end_image_url": None,
                "change_image_url": None,
                "dates": {
                    "scan_window_start": start_date_recent.format('YYYY-MM-dd').getInfo(),
                    "scan_window_end": end_date_recent.format('YYYY-MM-dd').getInfo(),
                }
            }
        # LOGIC: 
        # Recent = MAX NDVI (Greenest pixel in the last 30 days to avoid temporary noise)
        recent_ndvi = recent_collection.select('NDVI').max().clip(region_geometry)

        # Baseline = MEDIAN NDVI (Typical look of the forest over last 3 months)
        baseline_ndvi = ee.ImageCollection(SATELLITE_COLLECTION) \
            .filterBounds(region_geometry) \
            .filterDate(start_date_baseline, end_date_baseline) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50)) \
            .map(mask_s2_clouds) \
            .map(calculate_ndvi) \
            .select('NDVI') \
            .median() \
            .clip(region_geometry)

        # Calculate Difference: (Current - Old)
        # If forest is gone, Current (0.2) - Old (0.8) = -0.6 (Negative Value)
        ndvi_diff = recent_ndvi.subtract(baseline_ndvi)
        
        stats = ndvi_diff.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region_geometry,
            scale=REDUCTION_SCALE,
            maxPixels=1e9,
            bestEffort=True
        )
        
        mean_change = stats.get('NDVI').getInfo()

        if mean_change is None:
             return {"status": "success", "message": "Area obscured by clouds/shadows in recent pass.", "alert_triggered": False}

        print(f"UrbanFlow Live Check: Delta = {mean_change}", file=sys.stderr)
        
        alert_triggered = mean_change < threshold

        # --- VISUALIZATION SETUP ---
        vis_params_ndvi = {'min': 0, 'max': 0.8, 'palette': ['#d7191c', '#ffffbf', '#1a9641']}
        
        start_url = get_image_thumbnail_url(baseline_ndvi, region_geometry, vis_params_ndvi, "before")
        end_url = get_image_thumbnail_url(recent_ndvi, region_geometry, vis_params_ndvi, "after")

        # Change Mask (Red Alert Layer)
        # Highlights only pixels where vegetation dropped significantly
        loss_mask = ndvi_diff.lt(threshold).selfMask()
        
        vis_params_loss = {
            'min': 0, 
            'max': 1, 
            'palette': ['FF0000'] # Pure Bright Red for loss
        }
        
        change_url = get_image_thumbnail_url(loss_mask, region_geometry, vis_params_loss, "change_mask")

        return {
            "status": "success",
            "alert_triggered": alert_triggered,
            "mean_ndvi_change": round(mean_change, 4),
            "threshold": threshold,
            "start_image_url": start_url,
            "end_image_url": end_url,
            "change_image_url": change_url,
            "dates": {
                "scan_window_start": start_date_recent.format('YYYY-MM-dd').getInfo(),
                "scan_window_end": end_date_recent.format('YYYY-MM-dd').getInfo()
            }
        }

    except ee.EEException as e:
        print(f"ERROR: GEE Error: {e}", file=sys.stderr)
        return {"status": "error", "message": str(e)}
    except Exception as e:
        print(f"ERROR: Script Error: {e}", file=sys.stderr)
        return {"status": "error", "message": str(e)}

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
        threshold = float(params.get('threshold', DEFAULT_NDVI_DROP_THRESHOLD))
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

    print(f"Starting UrbanFlow Rapid Check for {region_id}...", file=sys.stderr)
    result = check_deforestation(ee_geom, threshold, buffer_radius)
    result['region_id'] = region_id
    print(json.dumps(result))