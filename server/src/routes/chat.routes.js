import express from "express";
import { checkJwt } from "../auth/authMiddleware.js";
import {
  getChatsForRecipient,
  verifyChatAccess,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/recipient", checkJwt, getChatsForRecipient);
router.get("/:chatId", checkJwt, verifyChatAccess);

export default router;
