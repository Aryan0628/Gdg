import { db } from "../firebaseadmin/firebaseadmin.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Recipient sends interest
 * recipientId comes from Auth0
 */
export const createInterest = async (req, res) => {
  try {
    const { donationId } = req.body;

    const recipientId = req.auth.payload.sub;

    // get donation to find donor
    const donationSnap = await db
      .collection("donations")
      .doc(donationId)
      .get();

    if (!donationSnap.exists) {
      return res.status(404).json({ message: "Donation not found" });
    }

    const donation = donationSnap.data();
    const donorId = donation.donorId;

    const ref = await db.collection("interests").add({
      donationId,
      donorId,
      recipientId,
      status: "pending",
      chatId: null,
      createdAt: new Date(),
    });

    res.json({ success: true, interestId: ref.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Donor accepts interest → chat created
 */
export const acceptInterest = async (req, res) => {
  try {
    const { interestId } = req.params;
    const donorId = req.auth.payload.sub;

    const interestRef = db.collection("interests").doc(interestId);
    const snap = await interestRef.get();

    if (!snap.exists) {
      return res.status(404).json({ message: "Interest not found" });
    }

    const interest = snap.data();

    // 🔐 only correct donor can accept
    if (interest.donorId !== donorId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // prevent duplicate chats
    if (interest.chatId) {
      return res.json({ chatId: interest.chatId });
    }

    const chatId = uuidv4();

    // store chat metadata
    await db.collection("chats").doc(chatId).set({
      chatId,
      donorId: interest.donorId,
      recipientId: interest.recipientId,
      donationId: interest.donationId,
      createdAt: new Date(),
    });

    await interestRef.update({
      status: "accepted",
      chatId,
    });

    res.json({ success: true, chatId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Logged-in donor views their interests
 */
export const getInterestsForDonor = async (req, res) => {
  try {
    const donorId = req.auth.payload.sub;

    const snap = await db
  .collection("interests")
  .where("donorId", "==", donorId)
  .get();
    res.json({
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Logged-in recipient views their interests
 */
export const getInterestsForRecipient = async (req, res) => {
  try {
    const recipientId = req.auth.payload.sub;

    const snap = await db
      .collection("interests")
      .where("recipientId", "==", recipientId)
      .get();

    res.json({
      data: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
