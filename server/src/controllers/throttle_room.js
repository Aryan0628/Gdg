import { db } from "../firebaseadmin/firebaseadmin.js";
// You don't need "firebase/firestore" imports when using the Admin SDK db directly

const throttle_room = async (req, res) => {
    const { triggeredByUserId, routeId, aiAnalysis, alertLevel, timestamp } = req.body;
    
    try {
        if (!triggeredByUserId || !routeId || !aiAnalysis || !alertLevel || !timestamp) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields",
            });
        }

        // CORRECT FIX: Use Admin SDK chaining syntax
        // Path: women (col) -> flaggedRoom (doc) -> throttle_room (col)
        await db.collection("women")
                .doc("flaggedRoom")
                .collection("throttle_room")
                .add({
                    triggeredByUserId,
                    routeId,
                    aiAnalysis,
                    alertLevel,
                    timestamp  // Saves the timestamp passed from frontend
                });

        return res.status(200).json({
            status: "success",
            message: "Room throttled successfully",
        });

    } catch (error) {
        console.error("throttle room error:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

export default throttle_room;