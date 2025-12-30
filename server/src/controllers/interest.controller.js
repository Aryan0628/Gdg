import { db } from "../firebaseadmin/firebaseadmin.js";
import admin from "firebase-admin";

/* ================= CREATE INTEREST ================= */
export const createInterest = async (req, res) => {
  try {
    const { donationId, donorId, recipientId } = req.body;

    if (!donationId || !donorId || !recipientId) {
      return res.status(400).json({
        success: false,
        message: "donationId, donorId and recipientId are required",
      });
    }

    const interestRef = await db.collection("interests").add({
      donationId,
      donorId,
      recipientId,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      success: true,
      interestId: interestRef.id,
    });
  } catch (err) {
    console.error("❌ createInterest error:", err);
    return res.status(500).json({ success: false });
  }
};

/* ================= GET INTERESTS FOR DONOR ================= */
export const getInterestsForDonor = async (req, res) => {
  try {
    const { donorId } = req.params;

    if (!donorId) {
      return res.status(400).json({ success: false });
    }

    const snapshot = await db
      .collection("interests")
      .where("donorId", "==", donorId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();

    const interests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ success: true, data: interests });
  } catch (err) {
    console.error("❌ getInterestsForDonor error:", err);
    return res.status(500).json({ success: false });
  }
};

/* ================= ACCEPT INTEREST ================= */
export const acceptInterest = async (req, res) => {
  try {
    const { interestId } = req.params;

    if (!interestId) {
      return res.status(400).json({ success: false });
    }

    const interestRef = db.collection("interests").doc(interestId);
    const interestSnap = await interestRef.get();

    if (!interestSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "Interest not found",
      });
    }

    const interest = interestSnap.data();

    if (interest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Interest already processed",
      });
    }

    // Mark interest accepted
    await interestRef.update({
      status: "accepted",
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create chat
    const chatRef = await db.collection("chats").add({
      donationId: interest.donationId,
      donorId: interest.donorId,
      recipientId: interest.recipientId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      chatId: chatRef.id,
    });
  } catch (err) {
    console.error("❌ acceptInterest error:", err);
    return res.status(500).json({ success: false });
  }
};

/* ================= PREVIEW BEFORE CHAT ================= */
export const getInterestPreview = async (req, res) => {
  try {
    const { interestId } = req.params;

    const interestSnap = await db
      .collection("interests")
      .doc(interestId)
      .get();

    if (!interestSnap.exists) {
      return res.status(404).json({ success: false });
    }

    const interest = interestSnap.data();

    const [donationSnap, donorSnap, recipientSnap] = await Promise.all([
      db.collection("donations").doc(interest.donationId).get(),
      db.collection("users").doc(interest.donorId).get(),
      db.collection("users").doc(interest.recipientId).get(),
    ]);

    return res.json({
      success: true,
      data: {
        donation: donationSnap.exists ? donationSnap.data() : null,
        donor: donorSnap.exists ? donorSnap.data() : null,
        recipient: recipientSnap.exists ? recipientSnap.data() : null,
      },
    });
  } catch (err) {
    console.error("❌ getInterestPreview error:", err);
    return res.status(500).json({ success: false });
  }
};

