import express from "express";
import room_data from "../controllers/room_data.js";
import flag_room from "../controllers/flag_room.js";
const router = express.Router();

router.post("/room_data",room_data)
router.post("/flag-room",flag_room)

export default router;

