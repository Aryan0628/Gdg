import express from "express";
import { db, FieldValue } from "../firebaseadmin/firebaseadmin.js";
import { checkJwt } from "../auth/authMiddleware.js";
import ngeohash from "ngeohash";
const router = express.Router();

router.post("/", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { title, description, amount, time, location } = req.body;

    if (!title || !description || !amount || !time || !location) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Invalid location" });
    }

    const geohash = ngeohash.encode(lat, lng, 4);
    const jobRef = await db.collection("jobs").add({
      title,
      description,
      amount: Number(amount),
      time,
      geohash,
      location,
      employerId: userId,
      status: "OPEN",
      createdAt: new Date(),
    });

    // 🔥 create chat room
    await db
      .collection("jobChats")
      .doc(jobRef.id)
      .set({
        participants: [userId],
        closed: false,
        createdAt: new Date(),
      });

    res.json({
      success: true,
      job: { id: jobRef.id },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create job" });
  }
});


router.get("/nearby", async (req, res) => {
  try {
    console.log(req)
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    console.log(lat,lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const centerHash = ngeohash.encode(lat, lng, 4);

    const neighbors = ngeohash.neighbors(centerHash);
    const hashes = [centerHash, ...neighbors];

    const jobs = [];

   
    for (const hash of hashes) {
      const snap = await db
        .collection("jobs")
        .where("geohash", "==", hash)
        .where("status", "==", "OPEN")
        .get();

      snap.docs.forEach((doc) => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
    }
    console.log(jobs);
    res.json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch nearby jobs" });
  }
});

router.get("/my", checkJwt, async (req, res) => {
  const userId = req.auth.payload.sub;

  const snap = await db
    .collection("jobs")
    .where("employerId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  const jobs = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.json({ jobs });
});
router.post("/:jobId/join", checkJwt, async (req, res) => {
  const userId = req.auth?.payload?.sub;
  const { jobId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const jobRef = db.collection("jobs").doc(jobId);
  const chatRef = db.collection("jobChats").doc(jobId);

  const [jobSnap, chatSnap] = await Promise.all([jobRef.get(), chatRef.get()]);

  if (!jobSnap.exists || !chatSnap.exists) {
    return res.status(404).json({ message: "Job not found" });
  }

  if (jobSnap.data().status === "CLOSED") {
    return res.status(403).json({ message: "Job closed" });
  }

  await chatRef.update({
    participants: FieldValue.arrayUnion(userId),
  });

  res.json({ success: true });
});
router.patch("/:jobId/close", checkJwt, async (req, res) => {
  const userId = req.auth.payload.sub;
  const { jobId } = req.params;

  const jobRef = db.collection("jobs").doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    return res.status(404).json({ message: "Job not found" });
  }

  if (jobSnap.data()?.employerId !== userId) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await jobRef.update({ status: "CLOSED" });
  await db.collection("jobChats").doc(jobId).update({ closed: true });

  res.json({ success: true });
});

export default router;
