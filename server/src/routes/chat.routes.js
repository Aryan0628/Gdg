import express from "express";
import { checkJwt } from "../auth/authMiddleware.js";
import { db } from "../firebaseadmin/firebaseadmin.js";

const router = express.Router();

/**
 * Verify user can access chat
 */
router.get("/:chatId", checkJwt, async (req, res) => {
  const userId = req.auth.payload.sub;
  const { chatId } = req.params;

  const chatSnap = await db.collection("chats").doc(chatId).get();
  if (!chatSnap.exists) {
    return res.status(404).json({ message: "Chat not found" });
  }

  const chat = chatSnap.data();

  if (chat.donorId !== userId && chat.recipientId !== userId) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json(chat);
});

export default router;
