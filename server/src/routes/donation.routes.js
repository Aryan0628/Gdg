import express from "express";
import {
  createDonation,
  getDonations,
} from "../controllers/donation.controller.js";
import { checkJwt } from "../auth/authMiddleware.js";

const router = express.Router();

// Create a donation
router.post("/", checkJwt, createDonation);

// Get donations (optionally by category)
router.get("/", getDonations);

export default router;




