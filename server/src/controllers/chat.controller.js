import { db } from "../firebaseadmin/firebaseadmin.js";

/* ================= RECEIVER CHATS ================= */
export const getChatsForRecipient = async (req, res) => {
  try {
    const recipientId = req.auth.payload.sub; // ✅ Auth0 user

    const snap = await db
      .collection("chats")
      .where("recipientId", "==", recipientId)
      .orderBy("createdAt", "desc")
      .get();

    res.json({
      data: snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch chats" });
  }
};



/* ================= VERIFY CHAT ACCESS ================= */
export const verifyChatAccess = async (req, res) => {
  const userId = req.auth.payload.sub;
  const { chatId } = req.params;

  const snap = await db.collection("chats").doc(chatId).get();

  if (!snap.exists) {
    return res.status(404).json({ message: "Chat not found" });
  }

  const chat = snap.data();

  if (chat.donorId !== userId && chat.recipientId !== userId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  res.json({ success: true });
};
