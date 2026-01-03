import express from "express";
import { checkJwt } from "../auth/authMiddleware.js";
const router=express.Router()
import {generatefireReport } from "../controllers/viirs.js";
import {generateFloodReport} from "../controllers/sentinel1.js";
import { generateLandHeatReport } from "../controllers/landsat8_9.js";
import {generateDeforestationReport} from "../controllers/copernicus.js"
import {generatePollutantsReport} from "../controllers/sentinel5p.js"
import {generateCoastalReport} from "../controllers/landsat.js"
router.post('/generatefireReport',checkJwt,generatefireReport)
router.post('/generateFloodReport',checkJwt,generateFloodReport)
router.post('/generateLandHeatReport',checkJwt,generateLandHeatReport)
router.post('/generateDeforestationReport',checkJwt,generateDeforestationReport)
router.post('/generatePollutantsReport',checkJwt,generatePollutantsReport)
router.post('/generateCoastalReport',checkJwt,generateCoastalReport)

export default router;