import sys
import json
import os
import ee
import datetime
import time
import traceback

# --- CONFIGURATION FOR URBANFLOW ---
gcp_project_id = 'certain-acre-482416-b7'

# EROSION SETTINGS
# We compare the coastline from 24 years ago to today.
HISTORIC_YEAR = 2000
CURRENT_YEAR = 2015

# DATASETS
# Landsat 7 for history (Year 2000)
L7_COLLECTION = 'LANDSAT/LE07/C02/T1_L2'
# Landsat 8/9 for modern day (Year 2024)
L8_COLLECTION = 'LANDSAT/LC08/C02/T1_L2'

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
        print(f"ERROR: GEE Init Failed: {e}", file=sys.stderr)
        return False

def get_image_url(image, region, vis_params, label):
    try:
        return image.getThumbURL({
            'min': vis_params.get('min', 0), 
            'max': vis_params.get('max', 1), 
            'dimensions': 512, 
            'region': region, 
            'format': 'png'
        })
    except Exception as e:
        print(f"WARNING: Thumbnail failed for {label}: {e}", file=sys.stderr)
        return None

# --- MNDWI CALCULATION (Modified NDWI) ---
# Formula: (Green - SWIR) / (Green + SWIR)
# Better than NDWI because it ignores white waves/surf.

def add_mndwi_l8(image):
    # Landsat 8: Green=SR_B3, SWIR=SR_B6
    mndwi = image.normalizedDifference(['SR_B3', 'SR_B6']).rename('mndwi')
    return image.addBands(mndwi)

def add_mndwi_l7(image):
    # Landsat 7: Green=SR_B2, SWIR=SR_B5
    mndwi = image.normalizedDifference(['SR_B2', 'SR_B5']).rename('mndwi')
    return image.addBands(mndwi)

def analyze_erosion(region_geometry):
    try:
        # 1. LOAD HISTORIC DATA (Year 2000)
        # We take the median of the entire year to remove tidal differences (High/Low tide average)
        start_hist = f'{HISTORIC_YEAR}-01-01'
        end_hist = f'{HISTORIC_YEAR}-12-31'
        
        hist_col = ee.ImageCollection(L7_COLLECTION) \
            .filterBounds(region_geometry) \
            .filterDate(start_hist, end_hist) \
            .filter(ee.Filter.lt('CLOUD_COVER', 20))
            
        if hist_col.size().getInfo() == 0:
            return {"status": "error", "message": f"No cloud-free Landsat 7 data found for year {HISTORIC_YEAR}"}

        hist_img = hist_col.map(add_mndwi_l7).select('mndwi').median().clip(region_geometry)

        # 2. LOAD CURRENT DATA (Year 2024)
        start_curr = f'{CURRENT_YEAR}-01-01'
        end_curr = f'{CURRENT_YEAR}-12-31'
        
        curr_col = ee.ImageCollection(L8_COLLECTION) \
            .filterBounds(region_geometry) \
            .filterDate(start_curr, end_curr) \
            .filter(ee.Filter.lt('CLOUD_COVER', 20))

        if curr_col.size().getInfo() == 0:
            return {"status": "error", "message": f"No cloud-free Landsat 8 data found for year {CURRENT_YEAR}"}
            
        curr_img = curr_col.map(add_mndwi_l8).select('mndwi').median().clip(region_geometry)

        # 3. CREATE WATER MASKS
        # MNDWI > 0.1 usually indicates water (tuned for Indian coast)
        WATER_THRESHOLD = 0.1
        hist_water = hist_img.gt(WATER_THRESHOLD).selfMask()
        curr_water = curr_img.gt(WATER_THRESHOLD).selfMask()

        # 4. CALCULATE EROSION (Area Difference)
        # Pixel Area Calculation
        def get_water_area(water_img):
            stats = water_img.multiply(ee.Image.pixelArea()).reduceRegion(
                reducer=ee.Reducer.sum(), 
                geometry=region_geometry, 
                scale=30, # Landsat resolution
                maxPixels=1e9
            )
            return stats.get('mndwi').getInfo()

        area_hist_sqm = get_water_area(hist_water)
        area_curr_sqm = get_water_area(curr_water)
        
        if area_hist_sqm is None: area_hist_sqm = 0
        if area_curr_sqm is None: area_curr_sqm = 0

        # Math: If water area increased, land was lost.
        water_increase_sqm = area_curr_sqm - area_hist_sqm
        land_change_hectares = (water_increase_sqm / 10000.0) * -1 # Flip sign: Negative = Loss

        status_msg = "Stable"
        if land_change_hectares < -2: status_msg = "Severe Erosion"
        elif land_change_hectares > 2: status_msg = "Accretion (New Land)"

        print(f"UrbanFlow Coastal Check: Change = {land_change_hectares:.2f} Ha", file=sys.stderr)

        # 5. VISUALIZATION (Change Detection Map)
        # RED = Erosion (Was Land, Now Water)
        # CYAN = Accretion (Was Water, Now Land)
        # WHITE = Always Water
        # BLACK = Always Land
        
        # We visualize the logical difference
        # Current Water (Red Channel) vs Historic Water (Green/Blue Channels)
        combined_vis = ee.Image.cat([
            curr_water.unmask(0), # R (Shows current water state)
            hist_water.unmask(0), # G (Shows old water state)
            hist_water.unmask(0)  # B 
        ]).visualize(min=0, max=1)

        vis_url = get_image_url(combined_vis, region_geometry, {'min': 0, 'max': 1}, "change_map")

        return {
            "status": "success",
            "message": status_msg,
            "net_land_change_hectares": round(land_change_hectares, 2),
            "erosion_detected": land_change_hectares < -1.0, # Alert if > 1 Ha lost
            "comparison_years": f"{HISTORIC_YEAR} vs {CURRENT_YEAR}",
            "visualization_url": vis_url
        }

    except Exception as e:
        print(f"ERROR: Script Error: {e}", file=sys.stderr)
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing credentials arg"}))
        sys.exit(1)
    
    credentials = sys.argv[1]
    input_str = sys.stdin.read()
    
    try:
        params = json.loads(input_str)
        geom = params['geometry']
        region_id = params.get('region_id', 'unknown')
    except:
        print(json.dumps({"status": "error", "message": "Invalid Input"}))
        sys.exit(1)

    if not initialize_gee(credentials):
        print(json.dumps({"status": "error", "message": "GEE Init Failed"}))
        sys.exit(1)

    # GeoJSON Parsing
    try:
        coords = geom['coordinates']
        type = geom['type']
        if type == 'Polygon': ee_geom = ee.Geometry.Polygon(coords)
        elif type == 'MultiPolygon': ee_geom = ee.Geometry.MultiPolygon(coords)
        # For coastal points, we need a larger buffer to capture the ocean+land interface
        else: ee_geom = ee.Geometry.Point(coords).buffer(3000) 
    except:
        print(json.dumps({"status": "error", "message": "Geometry Error"}))
        sys.exit(1)

    print(f"Starting Landsat Coastal Analysis for {region_id}...", file=sys.stderr)
    result = analyze_erosion(ee_geom)
    result['region_id'] = region_id
    print(json.dumps(result))