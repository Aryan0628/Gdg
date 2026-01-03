# backend/services/google-earth/landsat_heat_island.py

import sys
import json
import os
import ee
import datetime
import traceback
from google.oauth2 import service_account

# --- CONFIGURATION ---
GCP_PROJECT_ID = 'certain-acre-482416-b7'

# Look back 16 days (Landsat revisit cycle is 16 days)
RECENT_PERIOD_DAYS = 16

DEFAULT_TEMP_THRESHOLD = 40.0  # Celsius
DEFAULT_BUFFER = 5000

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
        print(f"WARNING: Thumbnail generation failed: {e}", file=sys.stderr)
        return None

def check_heat_islands(region_geometry, threshold, region_id):
    try:
        # 1. Define Time Window (Timezone Aware)
        now = datetime.datetime.now(datetime.timezone.utc)
        end_date = ee.Date(now)
        start_date = end_date.advance(-RECENT_PERIOD_DAYS, 'day')

        # 2. Priority Switching Logic (Landsat 9 -> Landsat 8)
        satellite_priority = [
            {"name": "Landsat 9", "id": "LANDSAT/LC09/C02/T1_L2"},
            {"name": "Landsat 8", "id": "LANDSAT/LC08/C02/T1_L2"}
        ]

        latest_image = None
        used_sat_name = None

        for sat in satellite_priority:
            print(f"UrbanFlow: Checking {sat['name']} ({sat['id']})...", file=sys.stderr)
            
            collection = (ee.ImageCollection(sat['id'])
                       .filterBounds(region_geometry)
                       .filterDate(start_date, end_date)
                       .filter(ee.Filter.lt('CLOUD_COVER', 100)) 
                       .select('ST_B10')) # Thermal Band

            count = collection.size().getInfo()
            
            if count > 0:
                # Found data! Grab the newest image and break the loop.
                latest_image = collection.sort('system:time_start', False).first()
                used_sat_name = sat['name']
                print(f"UrbanFlow: Found {count} images in {sat['name']}. Using latest.", file=sys.stderr)
                break
            else:
                print(f"UrbanFlow: No recent data found in {sat['name']}. Switching to next...", file=sys.stderr)

        # 3. Check if we found ANYTHING after checking both
        if latest_image is None:
            return {
                "status": "success", 
                "message": "No clear thermal data found in Landsat 8 OR 9 in the last 16 days.",
                "data_found": False,
                "alert_triggered": False,
                "heat_status": "No Data",
                "max_temp_celsius": None,
                "mean_temp_celsius": None,
                "threshold": threshold,
                "satellite_source": None,
                "latest_image_id": None,
                "heatmap_url": None,
                "dates": {
                    "scan_window_start": start_date.format('YYYY-MM-dd').getInfo(),
                    "scan_window_end": end_date.format('YYYY-MM-dd').getInfo()
                }
            }

        # 4. Get Metadata
        latest_info = latest_image.getInfo()
        latest_id = latest_info['id']
        latest_timestamp = latest_info['properties']['system:time_start']
        
        date_str = datetime.datetime.fromtimestamp(latest_timestamp / 1000.0, datetime.timezone.utc).strftime('%Y-%m-%d')
        print(f"UrbanFlow Heat Check: Processing image from {date_str} (Source: {used_sat_name})", file=sys.stderr)

        # 5. Process Temperature (Kelvin -> Celsius)
        # Formula: (DN * 0.00341802 + 149.0) - 273.15
        temp_celsius = latest_image.multiply(0.00341802).add(149.0).subtract(273.15)

        # 6. Statistics
        stats = temp_celsius.reduceRegion(
            reducer=ee.Reducer.max().combine(reducer2=ee.Reducer.mean(), sharedInputs=True),
            geometry=region_geometry,
            scale=30, 
            bestEffort=True,
            maxPixels=1e9
        )

        max_temp = stats.get('ST_B10_max').getInfo()
        mean_temp = stats.get('ST_B10_mean').getInfo()

        # Handle masked pixels (Clouds over the specific ROI)
        if max_temp is None: 
            return {
                "status": "success", 
                "message": "Data exists but pixels over ROI are masked (likely clouds).", 
                "alert_triggered": False,
                "data_found": True,
                "value_valid": False,
                "heat_status": "Obscured",
                "max_temp_celsius": None,
                "mean_temp_celsius": None,
                "threshold": threshold,
                "satellite_source": used_sat_name,
                "latest_image_id": latest_id,
                "heatmap_url": None,
                "dates": {
                    "scan_window_start": start_date.format('YYYY-MM-dd').getInfo(),
                    "scan_window_end": end_date.format('YYYY-MM-dd').getInfo()
                }
            }

        print(f"UrbanFlow Result: Max Temp = {max_temp:.2f}°C, Mean Temp = {mean_temp:.2f}°C", file=sys.stderr)

        # 7. Alert Logic
        alert_triggered = False
        status_label = "Normal"
        
        if max_temp > 48.0:
            status_label = "Extreme Heat Danger"
            alert_triggered  = True
        elif max_temp > threshold:
            status_label = "High Heat Warning"
            alert_triggered = True

        # 8. Visualization
        vis_params = {'min': 25, 'max': 60, 'palette': ['blue', 'cyan', 'yellow', 'orange', 'red']}
        heatmap_url = get_heatmap_url(temp_celsius, region_geometry, vis_params)

        return {
            "status": "success",
            "data_found": True,
            "value_valid": True,
            "alert_triggered": alert_triggered,
            "heat_status": status_label,
            "max_temp_celsius": round(max_temp, 2),
            "mean_temp_celsius": round(mean_temp, 2),
            "threshold": threshold,
            "image_date": date_str,
            "satellite_source": used_sat_name,
            "latest_image_id": latest_id,
            "heatmap_url": heatmap_url,
            "dates": {
                "scan_window_start": start_date.format('YYYY-MM-dd').getInfo(),
                "scan_window_end": end_date.format('YYYY-MM-dd').getInfo()
            }
        }

    except Exception as e:
        print(f"ERROR: Logic Error: {e}", file=sys.stderr)
        return {"status": "error", "message": str(e)}

# --- MAIN EXECUTION BLOCK ---
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
        
        # Consistent Input Parsing
        threshold = float(params.get('threshold', DEFAULT_TEMP_THRESHOLD))
        buffer_radius = int(params.get('buffer_meters', DEFAULT_BUFFER))
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Input Parsing Error: {e}"}))
        sys.exit(1)

    if not initialize_gee(credentials_path):
        print(json.dumps({"status": "error", "message": "GEE Init Failed"}))
        sys.exit(1)

    try:
        g_type = geojson.get('type')
        coords = geojson.get('coordinates')
        if g_type == 'Point': ee_geom = ee.Geometry.Point(coords).buffer(buffer_radius)
        elif g_type == 'Polygon': ee_geom = ee.Geometry.Polygon(coords)
        elif g_type == 'MultiPolygon': ee_geom = ee.Geometry.MultiPolygon(coords)
        else: raise ValueError(f"Unknown Geometry: {g_type}")
    except Exception as e:
         print(json.dumps({"status": "error", "message": f"Geometry Error: {e}"}))
         sys.exit(1)

    print(f"Starting UrbanFlow Heat Check for {region_id}...", file=sys.stderr)
    
    result = check_heat_islands(ee_geom, threshold, region_id)
    result['region_id'] = region_id
    
    print(json.dumps(result))