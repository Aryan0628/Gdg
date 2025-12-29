import { db } from "../firebaseadmin/firebaseadmin.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
const flag_room=async(req,res)=>{
    const { roomId, severity, ai_reason } = req.body;
    try {
        
            if (!roomId || !severity || !ai_reason) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields",
            });
            }
            await addDoc(collection(db, "women", "flaggedRoom"), {
            roomId,
            severity,
            ai_reason,
            createdAt: serverTimestamp(),
            });
        
            return res.status(200).json({
            status: "success",
            message: "Room flagged successfully",
            });
        
    } catch (error) {
        console.error("Flag room error:", error);
        return res.status(500).json({
        status: "error",
        message: "Internal server error",
        });
    }
}
    
export default flag_room