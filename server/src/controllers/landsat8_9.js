import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { runHeatCheck } from "../gee/earth/surfaceHeat/landsat_surface_temp.js";
import dotenv from "dotenv";
import { db } from "../firebaseadmin/firebaseadmin.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateLandHeatReport(req, res) {
    try {
        const {
            regionGeoJson,
            regionId,
            thresholdCelsius,
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

        let landheat_analysis_result = null;
        try {
            
            landheat_analysis_result = await runHeatCheck(
                regionGeoJson, 
                regionId, 
                credentialsPath, 
                thresholdCelsius,
            );

            
            if (!landheat_analysis_result) {
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

       
        if (landheat_analysis_result === 'success') {
            try {
                await db.collection('landheat_reports').add({
                    regionId: regionId,
                    timestamp: new Date(), 
                    ...landheat_analysis_result
                });

                console.log(`Report saved to Firestore for region: ${regionId}`);

            } catch (dbError) {
                console.error("Firebase Save Error:", dbError);
               
            }
        }

        return res.json({
            success: true,
            result: {
                ...landheat_analysis_result,
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