import { db } from "../firebaseadmin/firebaseadmin.js";
import admin from "firebase-admin";

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { senderId, text } = req.body;

    if (!senderId || !text) {
      return res.status(400).json({
        success: false,
        message: "senderId and text are required",
      });
    }

    // Check chat exists
    const chatSnap = await db.collection("chats").doc(chatId).get();
    if (!chatSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const chat = chatSnap.data();

    // Authorization: only participants can send
    if (!chat.participants || !chat.participants.includes(senderId)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to send message",
      });
    }

    await db.collection("messages").add({
      chatId,
      senderId,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ sendMessage error:", err);
    return res.status(500).json({ success: false });
  }
};

/* ================= GET MESSAGES ================= */
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    // Check chat exists
    const chatSnap = await db.collection("chats").doc(chatId).get();
    if (!chatSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const chat = chatSnap.data();

    // Authorization check
    if (!chat.participants || !chat.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const snapshot = await db
      .collection("messages")
      .where("chatId", "==", chatId)
      .orderBy("createdAt", "asc")
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error("❌ getMessages error:", err);
    return res.status(500).json({ success: false });
  }
};

/* ================= GET MY CHATS (DONOR + RECEIVER) ================= */
export const getMyChats = async (req, res) => {
  try {
    const { userId } = req.query; // ✅ IMPORTANT

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const snapshot = await db
      .collection("chats")
      .where("participants", "array-contains", userId)
      .orderBy("createdAt", "desc")
      .get();

    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      data: chats,
    });
  } catch (err) {
    console.error("❌ getMyChats error:", err);
    return res.status(500).json({ success: false });
  }
};
