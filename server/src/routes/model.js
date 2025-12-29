import axios from "axios"
import express from "express"
const router=express.Router()
import analyzechat from "../controllers/women_model_layer1"
router.route('/layer1',analyzechat);

export default router