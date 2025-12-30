import { db } from "../firebaseadmin/firebaseadmin.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const throttle_room=async(req,res)=>{
    const {triggeredByUserId,routeId,aiAnalysis,alertLevel,timestamp}=req.body
    try {
        if (!triggeredByUserId || !routeId || !aiAnalysis||!alertLevel||!timestamp) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields",
            });
        }
        await addDoc(collection(db,"women","throttle_room"),{
            triggeredByUserId,
            routeId,
            aiAnalysis,
            alertLevel,
            timestamp
        })
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
export default throttle_room