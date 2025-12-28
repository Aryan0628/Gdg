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

export default router
