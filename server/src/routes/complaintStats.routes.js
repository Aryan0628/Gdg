import express from "express";
import { getComplaintStatsForUser } from "../controllers/complaintStats.controller.js";
import { checkJwt } from "../auth/authMiddleware.js";

const router = express.Router();

router.get("/:userId",checkJwt, getComplaintStatsForUser);

export default router;
