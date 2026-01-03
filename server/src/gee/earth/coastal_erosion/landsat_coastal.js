// backend/services/google-earth/landsat_coastal.js
import "dotenv/config";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the Python GEE Landsat Coastal Erosion script.
 * @param {Object} regionGeoJson - GeoJSON object for the region to analyze
 * @param {string} regionId - Identifier for the region
 * @param {string} credentialsPath - Path to GCP credentials file
 * @returns {Promise<Object>} - Analysis results
 */
export function runCoastalCheck(
  regionGeoJson,
  regionId,
  credentialsPath
) {
  return new Promise((resolve, reject) => {
    
    // FIX 1: Safer Python Path (Windows/Linux/Mac compatible)
    const pythonExecutable = process.platform === "win32" ? "python" : "python3"; 
    
    // Ensure filename matches your Python script
    const scriptFilename = "landsat_coastal.py";
    const scriptPath = path.resolve(__dirname, scriptFilename);

    // Verify script exists before attempting to run it
    if (!fs.existsSync(scriptPath)) {
      return reject(
        new Error(`Python script not found at path: ${scriptPath}`)
      );
    }

    console.log(`Executing Coastal Check Script: ${scriptPath}`);
    console.log(`For region: ${regionId}`);

    // --- Spawn Python Process ---
    const pythonProcess = spawn(pythonExecutable, [
      scriptPath,
      credentialsPath,
    ]);

    // --- Prepare Input Data ---
    const inputData = {
      geometry: regionGeoJson,
      region_id: regionId,
    };

    const inputJsonString = JSON.stringify(inputData);

    // --- Variables/Handlers ---
    let scriptOutput = "";
    let scriptError = "";

    // Handle stdout data (The JSON response)
    pythonProcess.stdout.on("data", (data) => {
      scriptOutput += data.toString();
    });

    // Handle stderr data (Logs & Debug info)
    pythonProcess.stderr.on("data", (data) => {
      scriptError += data.toString();
      // Optional: console.error(`Python Log: ${data}`);
    });

    // Handle process close
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const trimmedOutput = scriptOutput.trim();

          if (!trimmedOutput) {
            return reject(new Error("Python script returned empty output"));
          }

          const result = JSON.parse(trimmedOutput);
          
          // Check for logical errors from Python
          if (result.status === "error") {
            return reject(new Error(`GEE Script Error: ${result.message}`));
          }

          console.log("Successfully parsed Landsat Coastal data.");
          resolve(result);
        } catch (parseError) {
          console.error("Failed to parse Python JSON output:", parseError);
          if (scriptError) console.error("Python Stderr:", scriptError); 
          reject(
            new Error(`Failed to parse JSON output: ${parseError.message}`)
          );
        }
      } else {
        console.error(`Python script failed with exit code ${code}`);
        reject(
          new Error(
            `Python script failed with code ${code}. Error output: ${scriptError}`
          )
        );
      }
    });

    // Handle process error
    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python subprocess:", err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    // --- Send Input Data ---
    try {
      pythonProcess.stdin.write(inputJsonString);
      pythonProcess.stdin.end();
    } catch (stdinError) {
      console.error("Error writing to Python stdin:", stdinError);
      reject(new Error(`Error writing to Python stdin: ${stdinError.message}`));
    }
  });
}