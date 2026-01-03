import express from "express";
import { createComplaint } from "../controllers/complaint.controller.js";
import { checkJwt } from "../auth/authMiddleware.js";


const router = express.Router();

router.post("/", checkJwt, createComplaint);

export default router;
