import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { runFloodCheck } from "../gee/earth/flood/sentinel1_flood.js";
import dotenv from "dotenv";
// Make sure this path matches your project structure
import { db } from "../firebaseadmin/firebaseadmin.js"; 

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateFloodReport(req, res) {
    try {
        const {
            regionGeoJson,
            regionId,
            thresholdPercent, 
        } = req.body;

        if (!regionGeoJson || !regionId) {
            return res.status(400).json({ 
                success: false, 
                error: "Missing required fields: regionGeoJson or regionId" 
            });
        }

        let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        
        if (credentialsPath && credentialsPath.startsWith('"') && credentialsPath.endsWith('"')) {
            credentialsPath = credentialsPath.slice(1, -1);
        }

        if (!credentialsPath) {
            return res.status(500).json({ success: false, error: "GEE credentials path env error" });
        }

        if (!path.isAbsolute(credentialsPath)) {
            credentialsPath = path.resolve(process.cwd(), credentialsPath);
        }

        if (!fs.existsSync(credentialsPath)) {
            return res.status(500).json({ success: false, error: "GEE credentials file not found" });
        }

        let flood_analysis_result = null;
        try {
            flood_analysis_result = await runFloodCheck(
                regionGeoJson, 
                regionId, 
                credentialsPath, 
                thresholdPercent,
            );

            if (!flood_analysis_result) {
                throw new Error("Analysis script returned no data");
            }

        } catch (innerError) {
            console.error("GEE Script Error:", innerError);
            return res.status(500).json({
                success: false,
                result: {
                    status: "error",
                    message: innerError.message,
                    alert_triggered: false,
                }
            });
        }

        // --- FIREBASE LOGIC ---
        // FIX: Ensure we check and save the correct variable 'flood_analysis_result'
        if (flood_analysis_result.status === 'success') {
            try {
                await db.collection('flood_reports').add({
                    regionId: regionId,
                    timestamp: new Date(),
                    ...flood_analysis_result // <--- FIXED: Was 'deforestation_analysis_result'
                });

                console.log(`Report saved to Firestore for region: ${regionId}`);

            } catch (dbError) {
                console.error("Firebase Save Error:", dbError);
            }
        }

        return res.json({
            success: true,
            result: {
                ...flood_analysis_result,
            }
        });
        
    } catch (error) {
        console.error("Controller Error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            details: error.message
        });
    }
}