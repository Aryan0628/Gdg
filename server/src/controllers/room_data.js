
import admin from "firebase-admin";
import { db } from "../firebaseadmin/firebaseadmin.js";
const room_data=async(req,res)=>{
    try {
        const { roomId, userId, message } = req.body;
    
        if (!roomId || !userId) {
          return res.status(400).json({ 
            success: false,
            error: "roomId and userId are required" 
          });
        }
        console.log(roomId);
    
        const roomRef = db.collection("women").doc("rooms").collection(roomId).doc("metadata");
        const roomSnap = await roomRef.get();
        console.log("Room metadata:", roomSnap.data());
    
        // Update room metadata
        await roomRef.set(
          {
            lastUpdated: new Date().toISOString(),
            updatedBy: userId,
          },
          { merge: true }
        );
    
        // Append message only if provided
        if (message) {
          const messagesRef = db
            .collection("women")
            .doc("rooms")
            .collection(roomId)
            .doc("messages");
    
          await messagesRef.set({
            messages: admin.firestore.FieldValue.arrayUnion({
              userId,
              text: message,
              createdAt: admin.firestore.Timestamp.now(),
            }),
          });
        }
        console.log("Added in Database");
        return res.status(200).json({
          success: true,
          roomId,
          userId,
          message: message ? "Room updated with message" : "Room metadata updated",
        });
      } catch (error) {
        console.error("Room update error:", error);
        res.status(500).json({ 
          success: false,
          error: "Internal server error",
          details: error.message 
        });
      }
}
export default room_data