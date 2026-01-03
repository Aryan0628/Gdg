import sys
import json
import os
import ee
import datetime
import traceback
from google.oauth2 import service_account
GCP_PROJECT_ID = 'certain-acre-482416-b7' 

# We check the last 6 days for Air Quality to smooth out cloud gaps.
RECENT_PERIOD_DAYS = 6
DEFAULT_BUFFER_METERS = 5000

POLLUTANT_CONFIG = {
    'NO2': {
        'collection': 'COPERNICUS/S5P/NRTI/L3_NO2',
        'band': 'tropospheric_NO2_column_number_density',
        'name': 'Nitrogen Dioxide',
        'unit': 'mol/m^2',
        'threshold': 0.00015, 
        'vis_params': {'min': 0, 'max': 0.0002, 'palette': ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}
    },
    'CO': {
        'collection': 'COPERNICUS/S5P/NRTI/L3_CO',
        'band': 'CO_column_number_density',
        'name': 'Carbon Monoxide',
        'unit': 'mol/m^2',
        'threshold': 0.05, 
        'vis_params': {'min': 0, 'max': 0.05, 'palette': ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}
    },
    'SO2': {
        'collection': 'COPERNICUS/S5P/NRTI/L3_SO2',
        'band': 'SO2_column_number_density',
        'name': 'Sulfur Dioxide',
        'unit': 'mol/m^2',
        'threshold': 0.0005, 
        'vis_params': {'min': 0, 'max': 0.001, 'palette': ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}
    },
    'O3': {
        'collection': 'COPERNICUS/S5P/NRTI/L3_O3',
        'band': 'O3_column_number_density',
        'name': 'Ozone',
        'unit': 'mol/m^2',
        'threshold': 0.15, 
        'vis_params': {'min': 0.12, 'max': 0.15, 'palette': ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}
    },
    'AEROSOL': {
        'collection': 'COPERNICUS/S5P/NRTI/L3_AER_AI',
        'band': 'absorbing_aerosol_index',
        'name': 'UV Aerosol Index',
        'unit': 'Index',
        'threshold': 1.0, 
        'vis_params': {'min': -1, 'max': 2.0, 'palette': ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']}
    }
}

def initialize_gee(credentials_path_arg):
    try:
        credentials_path = credentials_path_arg
        if not credentials_path or not os.path.exists(credentials_path):
            print(f"ERROR: Credentials file not found.", file=sys.stderr)
            return False
        
        credentials = service_account.Credentials.from_service_account_file(credentials_path)
        scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/earthengine'])
        
        ee.Initialize(
            credentials=scoped_credentials, 
            project=GCP_PROJECT_ID, 
            opt_url='https://earthengine-highvolume.googleapis.com'
        )
        return True
    except Exception as e:
        print(f"ERROR: GEE Init Failed: {e}", file=sys.stderr)
        return False

def get_heatmap_url(image, region_geometry, vis_params):
    try:
        return image.getThumbURL({
            'min': vis_params['min'], 
            'max': vis_params['max'], 
            'palette': vis_params['palette'],
            'dimensions': 512, 
            'region': region_geometry, 
            'format': 'png'
        })
    except Exception as e:
        print(f"WARNING: Thumbnail failed: {e}", file=sys.stderr)
        return None

def check_air_quality(region_geometry, pollutant_code, threshold_override):
    try:
        p_code = pollutant_code.upper()
        config = POLLUTANT_CONFIG.get(p_code)
        if not config:
            return {"status": "error", "message": f"Invalid pollutant code: {p_code}"}

        threshold = threshold_override if threshold_override is not None else config['threshold']
        now = datetime.datetime.now(datetime.timezone.utc)
        end_date = ee.Date(now)
        start_date = end_date.advance(-RECENT_PERIOD_DAYS, 'day')

        collection = (ee.ImageCollection(config['collection'])
            .filterBounds(region_geometry)
            .filterDate(start_date, end_date)
            .select(config['band']))


        count = collection.size().getInfo()
        if count == 0:
            return {
                "status": "success", 
                "data_found": False, 
                "value_valid": False,
                "parameter": config['name'],
                "pollutant_code": p_code,
                "average_value": None,
                "unit": config['unit'],
                "latest_image_id": None,
                "latest_image_timestamp": None,
                "alert_triggered": False,
                "threshold_used": threshold,
                "air_quality_status": "No Data (Satellite Pass Pending)",
                "heatmap_url": None,
                "message": f"No {config['name']} data available in last {RECENT_PERIOD_DAYS} days.",
                "dates": {
                    "scan_window_start": start_date.format('YYYY-MM-dd').getInfo(),
                    "scan_window_end": end_date.format('YYYY-MM-dd').getInfo()
                }
            }
        latest_image = collection.sort('system:time_start', False).first()
        latest_info = latest_image.getInfo()
        latest_id = latest_info['id']
        latest_ts = latest_info['properties']['system:time_start']
    
        mean_img = collection.mean().clip(region_geometry)
        stats = mean_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region_geometry,
            scale=1113.2, 
            bestEffort=True,
            maxPixels=1e9
        )
        
        avg_val = stats.get(config['band']).getInfo()
        
        if avg_val is None: 
            return {
                "status": "success", 
                "data_found": True, 
                "value_valid": False, 
                "parameter": config['name'],
                "pollutant_code": p_code,
                "average_value": None, 
                "unit": config['unit'],
                "latest_image_id": latest_id,
                "latest_image_timestamp": latest_ts,
                "alert_triggered": False,
                "threshold_used": threshold,
                "air_quality_status": "Unknown (Obscured by Clouds)",
                "heatmap_url": None,
                "message": "Data exists but area is obscured (likely clouds).",
                "dates": {
                    "scan_window_start": start_date.format('YYYY-MM-dd').getInfo(),
                    "scan_window_end": end_date.format('YYYY-MM-dd').getInfo()
                }
            }

        print(f"UrbanFlow Live Check: {p_code} = {avg_val}", file=sys.stderr)

        alert_triggered = avg_val > threshold
        status_label = "Hazardous" if alert_triggered else "Good"

        heatmap_url = get_heatmap_url(mean_img, region_geometry, config['vis_params'])

        return {
            "status": "success",
            "data_found": True,
            "value_valid": True,
            "parameter": config['name'],
            "pollutant_code": p_code,
            "average_value": avg_val,
            "unit": config['unit'],
            "latest_image_id": latest_id,
            "latest_image_timestamp": latest_ts,
            "alert_triggered": alert_triggered,
            "threshold_used": threshold,
            "air_quality_status": status_label,
            "heatmap_url": heatmap_url,
            "dates": {
                "scan_window_start": start_date.format('YYYY-MM-dd').getInfo(),
                "scan_window_end": end_date.format('YYYY-MM-dd').getInfo()
            }
        }

    except Exception as e:
        print(f"ERROR: Logic Error: {e}", file=sys.stderr)
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing credentials arg"}))
        sys.exit(1)
    
    credentials_path = sys.argv[1]
    input_str = sys.stdin.read()
    
    try:
        params = json.loads(input_str)
        geojson = params['geometry']
        region_id = params.get('region_id', 'unknown')
        
        buffer_radius = int(params.get('buffer_meters', DEFAULT_BUFFER_METERS))
        
        pollutant = params.get('pollutant', 'NO2')
        threshold = params.get('threshold', None)
        if threshold: threshold = float(threshold)

    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Input Parsing Error: {e}"}))
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
        else: raise ValueError(f"Unknown Geometry Type: {g_type}")
    except Exception as e:
         print(json.dumps({"status": "error", "message": f"Geometry Error: {e}"}))
         sys.exit(1)

    print(f"Starting UrbanFlow Air Quality Check ({pollutant}) for {region_id}...", file=sys.stderr)
    
    result = check_air_quality(ee_geom, pollutant, threshold)
    result['region_id'] = region_id
    
    print(json.dumps(result))