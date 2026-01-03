import { db } from "../firebaseadmin/firebaseadmin.js";

export const createComplaint = async (req, res) => {
  try {
    if (!req.auth || !req.auth.payload?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const complainantId = req.auth.payload.sub;
    const {
      chatId,
      donationId,
      againstUserId,
      role,
      donorName,
      receiverName,
      reason,
      description,
    } = req.body;

    if (!chatId || !againstUserId || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await db.collection("complaints").add({
      chatId,
      donationId: donationId || null,
      complainantId,
      againstUserId,
      role,
      donorName: donorName || null,
      receiverName: receiverName || null,
      reason,
      description: description || "",
      status: "pending",
      createdAt: new Date(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit complaint" });
  }
};
