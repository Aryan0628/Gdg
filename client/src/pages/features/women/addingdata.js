import { useAuthStore } from "../../../store/useAuthStore";
import {ref, set } from "firebase/database";
import { db } from "../../../firebase/firebase";
import { v4 as uuidv4 } from "uuid";



/**
 * Save route data to database
 * @param {Object} routeData - The full route data from commute planning
 * @param {string} routeData.destination_name - Name of destination
 * @param {string} routeData.destination_place_id - Google Place ID
 * @param {string} routeData.travel_mode - Travel mode (DRIVING, TRANSIT, etc.)
 * @param {Object} routeData.start_coords - Starting coordinates {lat, lng}
 * @param {Object} routeData.end_coords - Ending coordinates {lat, lng}
 * @param {string} routeData.start_address - Starting address
 * @param {string} routeData.end_address - Destination address
 * @param {string} routeData.distance_text - Distance text (e.g., "15 km")
 * @param {number} routeData.distance_value - Distance in meters
 * @param {string} routeData.duration_text - Duration text (e.g., "20 mins")
 * @param {number} routeData.duration_value - Duration in seconds
 * @param {string} routeData.polyline - Encoded polyline for map display
 * @param {string} routeData.created_at - ISO timestamp of route creation
 */
export const saveRouteToDatabase = async (routeData) => {
  try {
    // Get user from store
    const { user } = useAuthStore.getState();
    
    if (!user) {
      console.error("User not found in store");
      return;
    }
    const route=routeData;
    const destinationplace_id=route.destination_place_id;
    const endaddress=route.end_address;
    const endcoords=route.end_coords
    const end_lat=endcoords.lat;
    const end_lng=endcoords.lng;
    const route_id = uuidv4();
    const startcoords=route.start_coords;
    const start_lat=startcoords.lat;
    const start_lng=startcoords.lng;
    const travelmode=route.travel_mode;
    const user_id=user._sub
    const createdAt=route.created_at;
    //initialsisng to firebase realtime database;
    //creating user in women firebase

    set(ref(db,`women/user_active/${user_id}`),{
        routeId:route_id,
        start:{start_lat,start_lng},
        end:{end_lat,end_lng},
        current:{start_lat,start_lng},
        status:"active",
    })

    set(ref(db,`women/routes/${route_id}`),{
        start:{start_lat,start_lng},
        end:{end_lat,end_lng},
        lastUpdated: Date.now(),
        destinationplace_id:destinationplace_id,
        endaddress:endaddress,
        travelmode:travelmode,
    })
    set(ref(db,`women/routes/${route_id}/member/${user_id}`),{
        current_lat:start_lat,
        current_lng:start_lng,
        joinedAt:createdAt,
    })
    console.log("Route Recieved",route);

  } catch (error) {
    console.error("Error saving route to database:", error);
    throw error;
  }
};