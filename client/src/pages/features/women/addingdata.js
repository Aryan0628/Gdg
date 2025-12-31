import { useAuthStore } from "../../../store/useAuthStore";
import { ref, set, get, update } from "firebase/database";
import { db } from "../../../firebase/firebase";
import axios from "axios";

/* ---------------- HELPER FUNCTIONS ---------------- */

// 1. Haversine Distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// 2. Geohash Encoder/Decoder Constants
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

// Encode Lat/Lng to Geohash
function encodeGeohash(lat, lon, precision = 9) {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = "";

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx = idx * 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
}

// Decode Geohash to {lat, lng} (Used to find the center of existing clusters)
function decodeGeohash(geohash) {
  let evenBit = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  for (let i = 0; i < geohash.length; i++) {
    const chr = geohash.charAt(i);
    const idx = BASE32.indexOf(chr);
    if (idx === -1) throw new Error("Invalid geohash");

    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;
      if (evenBit) {
        const lonMid = (lonMin + lonMax) / 2;
        if (bitN === 1) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        const latMid = (latMin + latMax) / 2;
        if (bitN === 1) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }
      evenBit = !evenBit;
    }
  }
  
  return {
    lat: (latMin + latMax) / 2,
    lng: (lonMin + lonMax) / 2
  };
}

/* ---------------- MAIN FUNCTION ---------------- */

export const saveRouteToDatabase = async (routeData) => {
  try {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error("User not found");

    const {
      destination_place_id,
      end_address,
      start_coords,
      end_coords,
      travel_mode,
    } = routeData;

    const user_id = user.sub;
    const route_id = destination_place_id; // Use destination as route key

    const start_lat = start_coords.lat;
    const start_lng = start_coords.lng;
    const end_lat = end_coords.lat;
    const end_lng = end_coords.lng;

    /* ---------------- 1. USER ACTIVE ---------------- */
    await set(ref(db, `women/user_active/${user_id}`), {
      routeId: route_id,
      start: { start_lat, start_lng },
      end: { end_lat, end_lng },
      current: { start_lat, start_lng },
      status: "active",
    });

    /* ---------------- 2. ROUTE ---------------- */
    const routeRef = ref(db, `women/routes/${route_id}`);
    const routeSnap = await get(routeRef);

    if (!routeSnap.exists()) {
      await set(routeRef, {
        start: { start_lat, start_lng },
        end: { end_lat, end_lng },
        destinationplace_id: destination_place_id,
        endaddress: end_address,
        travelmode: travel_mode,
        lastUpdated: Date.now(),
        userCount: 1,
      });
    } else {
      await update(routeRef, {
        userCount: (routeSnap.val().userCount || 0) + 1,
        lastUpdated: Date.now(),
      });
    }

    /* ---------------- 3. ROOM ---------------- */
    const roomRef = ref(db, `women/rooms/${route_id}`);
    const roomSnap = await get(roomRef);

    if (!roomSnap.exists()) {
      await set(roomRef, {
        routeId: route_id,
        createdAt: Date.now(),
      });
    }

    /* ---------------- 4. ROOM MEMBER ---------------- */
    await set(ref(db, `women/rooms/${route_id}/members/${user_id}`), {
      joinedAt: Date.now(),
      current_lat: start_lat,
      current_lng: start_lng,
      status: "active",
    });

    /* ---------------- 5. LOCAL ROOM CLUSTERING ---------------- */
    // Path: women/localrooms/${geohashId}/${roomId}/
    
    const localRoomsRef = ref(db, "women/localroom");
    const localRoomsSnap = await get(localRoomsRef);

    let alreadyInLocalRoom = false;
    let bestClusterGeohash = null;
    let minDistance = 5; // 5 km radius

    if (localRoomsSnap.exists()) {
      const allClusters = localRoomsSnap.val();

      // Step A: Check if this roomId already exists ANYWHERE
      for (const [geohashId, roomsInCluster] of Object.entries(allClusters)) {
        if (roomsInCluster[route_id]) {
          console.log(`Route ${route_id} already exists in Local Room ${geohashId}`);
          alreadyInLocalRoom = true;
          break;
        }
      }

      // Step B: If not found, find the nearest cluster within 5km
      if (!alreadyInLocalRoom) {
        for (const geohashId of Object.keys(allClusters)) {
          // Decode the geohash key to get its approximate center
          try {
            const center = decodeGeohash(geohashId);
            const dist = getDistanceFromLatLonInKm(
              start_lat,
              start_lng,
              center.lat,
              center.lng
            );

            if (dist < minDistance) {
              minDistance = dist;
              bestClusterGeohash = geohashId;
            }
          } catch (e) {
            console.warn(`Invalid geohash key in DB: ${geohashId}`);
          }
        }
      }
    }

    // Step C: Action - Add to existing or Create new
    if (!alreadyInLocalRoom) {
      let targetGeohash = bestClusterGeohash;

      // If no nearby cluster found, create a new one based on current location
      if (!targetGeohash) {
        targetGeohash = encodeGeohash(start_lat, start_lng);
        console.log(`Creating NEW Local Room Cluster: ${targetGeohash}`);
      } else {
        console.log(`Joining EXISTING Local Room Cluster: ${targetGeohash} (Dist: ${minDistance.toFixed(2)}km)`);
      }

      // Add data to the selected cluster
      await set(ref(db, `women/localroom/${targetGeohash}/${route_id}`), {
        start_lat: start_lat,
        start_lng: start_lng, // "start lag"
        end_lat: end_lat,
        end_lng: end_lng,     // "end lag"
        
      });
      await update(ref(db, `women/routes/${route_id}`), {
        geoHash: targetGeohash
      });

    } else {
        console.log("No further action needed for Local Room (already exists).");
    }

    /* ---------------- 6. BACKEND NOTIFY ---------------- */
    await axios.post(
      `/api/room/room_data`,
      { roomId: route_id, userId: user_id },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("Route + Room + LocalRoom processed successfully");

  } catch (error) {
    console.error("Error saving route:", error);
  }
};