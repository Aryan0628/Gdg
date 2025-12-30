import express from "express";
import {
  createDonation,
  getDonations,
} from "../controllers/donation.controller.js";

const router = express.Router();

// Create a donation
router.post("/", createDonation);

// Get donations (optionally by category)
router.get("/", getDonations);

export default router;


