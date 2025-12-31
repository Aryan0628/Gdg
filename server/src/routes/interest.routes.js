import express from "express";
import { checkJwt } from "../auth/authMiddleware.js";
import {
  createInterest,
  acceptInterest,
  getInterestsForDonor,
  getInterestsForRecipient,
} from "../controllers/interest.controller.js";

const router = express.Router();

router.post("/", checkJwt, createInterest);
router.post("/:interestId/accept", checkJwt, acceptInterest);
router.get("/donor", checkJwt, getInterestsForDonor);
router.get("/recipient", checkJwt, getInterestsForRecipient);

export default router;

