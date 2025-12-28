import { useAuthStore } from "../../../store/useAuthStore";
import { ref, set, get, update } from "firebase/database";
import { db } from "../../../firebase/firebase";
import axios from "axios";
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
    const route_id = destination_place_id // ⚠️ Use destination as route key

    const start_lat = start_coords.lat;
    const start_lng = start_coords.lng;
    const end_lat = end_coords.lat;
    const end_lng = end_coords.lng;

    /* ---------------- USER ACTIVE ---------------- */
    await set(ref(db, `women/user_active/${user_id}`), {
      routeId: route_id,
      start: { start_lat, start_lng },
      end: { end_lat, end_lng },
      current: { start_lat, start_lng },
      status: "active",
    });

    /* ---------------- ROUTE ---------------- */
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

    /* ---------------- ROOM ---------------- */
    const roomRef = ref(db, `women/rooms/${route_id}`);
    const roomSnap = await get(roomRef);

    if (!roomSnap.exists()) {
      await set(roomRef, {
        routeId: route_id,
        createdAt: Date.now(),
      });
    }

    /* ---------------- ROOM MEMBER ---------------- */
    await set(ref(db, `women/rooms/${route_id}/members/${user_id}`), {
      joinedAt: Date.now(),
      current_lat: start_lat,
      current_lng: start_lng,
      status: "active",
    });

    /* ---------------- BACKEND NOTIFY ---------------- */
    await axios.post(
      `/api/room/room_data`,
      { roomId: route_id,
        userId:user_id,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("Route + Room initialized successfully");

  } catch (error) {
    console.error("Error saving route:", error);
  }
};
