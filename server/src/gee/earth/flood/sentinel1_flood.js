import path from "path";
import "dotenv/config"
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the Python GEE Flood Detection script (Sentinel-1 SAR).
 * @param {Object} regionGeoJson - GeoJSON object for the region to analyze
 * @param {string} regionId - Identifier for the region
 * @param {string} credentialsPath - Path to GCP credentials file
 * @param {number} [thresholdPercent] - Optional: Flood alert threshold (default 5.0%)
 * @returns {Promise<Object>} - Analysis results
 */
export function runFloodCheck(
  regionGeoJson,
  regionId,
  credentialsPath,
  thresholdPercent,
) {
  return new Promise((resolve, reject) => {
    const pythonExecutable = process.platform === "win32" ? "python" : "python3";
    
    const scriptFilename = "sentinel1_flood.py"; 
    const scriptPath = path.resolve(__dirname, scriptFilename);

    if (!fs.existsSync(scriptPath)) {
      return reject(
        new Error(`Python script not found at path: ${scriptPath}`)
      );
    }

    console.log(`Executing Flood Check: ${scriptPath}`);
    console.log(`Region ID: ${regionId}`);

    const pythonProcess = spawn(pythonExecutable, [
      scriptPath,
      credentialsPath,
    ]);

    const inputData = {
      geometry: regionGeoJson,
      region_id: regionId,
    };

    if (thresholdPercent !== undefined && thresholdPercent !== null && !isNaN(parseFloat(thresholdPercent))) {
      inputData.threshold_percent = parseFloat(thresholdPercent);
    }


    const inputJsonString = JSON.stringify(inputData);

    let scriptOutput = "";
    let scriptError = "";

    pythonProcess.stdout.on("data", (data) => {
      scriptOutput += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      scriptError += data.toString();
      console.error(`Python Log: ${data}`);
    });


    pythonProcess.on("close", (code) => {
      console.log(`Python script exited with code ${code}`);
      
      if (code === 0) {
        try {
          const trimmedOutput = scriptOutput.trim();
          
          if (!trimmedOutput) {
            return reject(new Error("Python script returned empty output"));
          }

          const result = JSON.parse(trimmedOutput);
          
          if (result.status === "error") {
            return reject(new Error(`GEE Script Error: ${result.message}`));
          }

          console.log("Successfully parsed Sentinel-1 Flood data.");
          resolve(result);

        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError);
          if (scriptError) console.error("Python Stderr Log:", scriptError);
          reject(new Error(`Failed to parse JSON: ${parseError.message}`));
        }
      } else {
        console.error(`Python failed with code ${code}`);
        reject(new Error(`Script failed with code ${code}. Error: ${scriptError}`));
      }
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python subprocess:", err);
      reject(new Error(`Failed to start Python: ${err.message}`));
    });

    try {
      pythonProcess.stdin.write(inputJsonString);
      pythonProcess.stdin.end();
    } catch (stdinError) {
      console.error("Error writing to stdin:", stdinError);
      reject(new Error(`Error writing input: ${stdinError.message}`));
    }
  });
}