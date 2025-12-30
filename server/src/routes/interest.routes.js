import express from "express";
import {
  createInterest,
  getInterestsForDonor,
  acceptInterest,
  getInterestPreview,
} from "../controllers/interest.controller.js";

const router = express.Router();

/* ================= Recipient ================= */
// Recipient → "I'm Interested"
router.post("/", createInterest);

/* ================= Donor ================= */
// Donor → view pending interests
router.get("/donor/:donorId", getInterestsForDonor);

/* ================= Shared ================= */
// Preview before chat
router.get("/:interestId/preview", getInterestPreview);

// Donor → accept interest
router.post("/:interestId/accept", acceptInterest);

export default router;


