import express from "express"
import { upload } from "../../middlewares/upload.js"
import { db } from "../firebaseadmin/firebaseadmin.js"
import { uploadToCloudinary } from "../utils/uploadCloudinary.js"
import { checkJwt } from "../auth/authMiddleware.js"

const router = express.Router()
import { GoogleGenerativeAI } from "@google/generative-ai";
import { geohashForLocation } from "geofire-common";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


router.post("/", checkJwt, upload.single("image"), async (req, res) => {
  try {
    const userId = req.auth?.payload?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { title, lat, lng } = req.body;

    
    if (!req.file) return res.status(400).json({ message: "Image is required" });
    if (!title || !lat || !lng) return res.status(400).json({ message: "Missing fields" });

    const [cloudinaryResult, aiAnalysisResult] = await Promise.allSettled([
      uploadToCloudinary(req.file.buffer, "garbage-reports"),
      analyzeImageWithAI(req.file.buffer, req.file.mimetype)
    ]);

    
    if (cloudinaryResult.status === "rejected") {
      throw new Error("Cloudinary upload failed");
    }
    const { imageUrl, publicId } = cloudinaryResult.value;

    
    const aiData = aiAnalysisResult.status === "fulfilled" 
      ? aiAnalysisResult.value 
      : { type: "GARBAGE", severity: 1, hazard: "Low", analysis: "AI analysis unavailable" };

    
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
      userId,
      
      type: aiData.type,
      severity: aiData.severity,
      hazard: aiData.hazard,
      aiAnalysis: aiData.analysis,
      
      upvotes: 0,
      downvotes: 0,
      votes: {}, // To track user-specific votes
      status: "OPEN",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    
    const docRef = await db.collection("garbageReports").add(reportData);
    
    return res.status(201).json({
      success: true,
      report: { id: docRef.id, ...reportData },
    });

  } catch (err) {
    console.error("Critical Upload Error:", err);
    return res.status(500).json({ message: "Server failed to process report" });
  }
});
import { VertexAI } from '@google-cloud/vertexai';

  const vertex_ai = new VertexAI({
  project: 'your-project-id', // Found in Cloud Console
  location: 'us-central1'
});
async function analyzeImageWithAI(buffer, mimeType) {
  console.log(genAI)
  const vertex_ai = new VertexAI({
  project: 'urbanflow-41ce2',
  location: 'us-central1'
});
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" } 
  });

  const imagePart = {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType: mimeType,
    },
  };

  const prompt = `Analyze this environmental report image. Return a JSON object with:
    {
      "type": "DUSTBIN" | "GARBAGE",
      "severity": number (1-10),
      "hazard": "Low" | "Medium" | "High",
      "analysis": "one short sentence description"
    }
    Criteria: If it's a public trash bin, type is DUSTBIN and severity is 1. 
    If it's loose litter/dumping, type is GARBAGE.
    Severity is 10 for massive piles. Hazard is High if there are needles, chemicals, or broken glass.`;

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  return JSON.parse(response.candidates[0].content.parts[0].text);
}


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

  // If toggled to DUSTBIN, we reset severity/hazard because it's no longer "trash"
  const updates = {
    type,
    updatedAt: new Date(),
    ...(type === "DUSTBIN" && {
      severity: 1,
      hazard: "Low",
      aiAnalysis: "Manually reclassified as Dustbin"
    })
  };

  await ref.update(updates);
  res.json({ success: true, ...updates });
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
