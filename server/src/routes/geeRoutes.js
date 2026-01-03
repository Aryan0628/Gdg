import express from "express";
import axios from "axios";
const router=express.Router()
import {generatefireReport } from "../controllers/viirs.js";
import {generateFloodReport} from "../controllers/sentinel1.js";
import { generateLandHeatReport } from "../controllers/landsat8_9.js";
import {generateDeforestationReport} from "../controllers/copernicus.js"
import {generatePollutantsReport} from "../controllers/sentinel5p.js"
import {generateCoastalReport} from "../controllers/landsat.js"
router.post('/generatefireReport',generatefireReport)
router.post('/generateFloodReport',generateFloodReport)
router.post('/generateLandHeatReport',generateLandHeatReport)
router.post('/generateDeforestationReport',generateDeforestationReport)
router.post('/generatePollutantsReport',generatePollutantsReport)
router.post('/generateCoastalReport',generateCoastalReport)

export default router