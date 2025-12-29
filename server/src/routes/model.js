import express from "express"
const router=express.Router()
import orchestrate_agent_1 from "../controllers/women_model_layer1"
import orchestrate_agent_2 from "../controllers/agent2";
router.route('/agent1',orchestrate_agent_1)
router.route('/agent2',orchestrate_agent_2)
export default router