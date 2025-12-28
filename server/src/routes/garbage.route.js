import express from "express"
import { upload } from "../../middlewares/upload.js"
import { db } from "../firebaseadmin/firebaseadmin.js"
import { uploadToCloudinary } from "../utils/uploadCloudinary.js"
import { checkJwt } from "../auth/authMiddleware.js"
import { geohashForLocation } from "geofire-common";

const router = express.Router()

router.post(
  "/",
  checkJwt,                  
  upload.single("image"),
  async (req, res) => {
    try {
      
      const userId = req.auth?.payload?.sub

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" })
      }

      const { title, lat, lng } = req.body

     
      if (!req.file) {
        return res.status(400).json({ message: "Image is required" })
      }
      if (!title || !lat || !lng) {
        return res.status(400).json({ message: "Missing required fields" })
      }

     
      const { imageUrl, publicId } = await uploadToCloudinary(
        req.file.buffer,
        "garbage-reports"
      )

      const geohash = geohashForLocation([Number(lat), Number(lng)]);
      const reportData = {
        title,
        imageUrl,
        publicId,
        location: {
          lat: Number(lat),
          lng: Number(lng),
        },
        geohash,
        upvotes: 0,
        downvotes: 0,
        userId,                
        status: "OPEN",
        createdAt: new Date(),
      }

      
      const docRef = await db.collection("garbageReports").add(reportData)

      const report = {
        id: docRef.id,
        ...reportData,
      }

      return res.status(201).json({
        success: true,
        report,
      })
    } catch (err) {
      console.error("Garbage upload error:", err)
      return res.status(500).json({ message: "Upload failed" })
    }
  }
)

import { getNearbyGarbageReports } from "../services/garbage.service.js"
router.get("/nearby", checkJwt, async (req, res) => {
  try {
    console.log(req.query);
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat & lng required" });
    }

    const reports = await getNearbyGarbageReports(
      Number(lat),
      Number(lng),
      10 
    );

    res.json({ success: true, reports });
  } catch (err) {
    console.error("Fetch nearby error:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

router.patch("/vote", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub; 
    console.log(userId);
    const { reportId, type } = req.body;

    if (!reportId || !["UP", "DOWN"].includes(type)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const reportRef = db.collection("garbageReports").doc(reportId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      return res.status(404).json({ message: "Report not found" });
    }

    const report = reportSnap.data();
    const votes = report.votes || {};

    const previousVote = votes[userId];

    let upvotes = report.upvotes || 0;
    let downvotes = report.downvotes || 0;

    
    if (!previousVote) {
      // first vote
      votes[userId] = type;
      type === "UP" ? upvotes++ : downvotes++;
    } else if (previousVote === type) {
      
      delete votes[userId];
      type === "UP" ? upvotes-- : downvotes--;
    } else {
     
      votes[userId] = type;
      previousVote === "UP" ? upvotes-- : downvotes--;
      type === "UP" ? upvotes++ : downvotes++;
    }

    await reportRef.update({
      votes,
      upvotes,
      downvotes,
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      upvotes,
      downvotes,
      userVote: votes[userId] || null,
    });
  } catch (err) {
    console.error("Vote error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.patch("/toggle-type", checkJwt, async (req, res) => {
  const { reportId, type } = req.body;

  if (!["GARBAGE", "DUSTBIN"].includes(type)) {
    return res.status(400).json({ message: "Invalid type" });
  }

  const ref = db.collection("garbageReports").doc(reportId);
  const snap = await ref.get();

  if (!snap.exists) {
    return res.status(404).json({ message: "Report not found" });
  }

  await ref.update({
    type,
    updatedAt: new Date(),
  });

  res.json({ success: true, type });
});
router.delete("/:reportId", checkJwt, async (req, res) => {
  const { reportId } = req.params;
  const userId = req.auth.payload.sub;

  const ref = db.collection("garbageReports").doc(reportId);
  const snap = await ref.get();

  if (!snap.exists) {
    return res.status(404).json({ message: "Not found" });
  }

  if (snap.data().userId !== userId) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await ref.delete();

  res.json({ success: true });
});

export default router
