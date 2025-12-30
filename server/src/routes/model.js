import express from "express"
const router=express.Router()
import orchestrate_agent_1 from "../controllers/women_model_layer1.js"
import orchestrate_agent_2 from "../controllers/agent2.js";
import throttle_agent from "../controllers/throttle_agent.js"
router.post('/agent1',orchestrate_agent_1)
router.post('/agent2',orchestrate_agent_2)
router.post('/throttle',throttle_agent)
export default router