import "dotenv/config"
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the Python GEE Air Quality detection script (Sentinel-5P).
 * @param {Object} regionGeoJson - GeoJSON object
 * @param {string} regionId - Identifier for the region
 * @param {string} credentialsPath - Path to GCP credentials file
 * @param {string} [pollutant] - 'NO2', 'CO', 'SO2', 'O3', 'AEROSOL' (Default: NO2)
 * @param {number} [threshold] - Optional custom threshold
 * @param {number} [bufferMeters] - Optional buffer for points (Default: 5000)
 * @returns {Promise<Object>} - Analysis results
 */

export function runAirQualityCheck(
  regionGeoJson,
  regionId,
  credentialsPath,
  pollutant,
  threshold,
) {
  return new Promise((resolve, reject) => {
    const pythonExecutable = process.platform === "win32" ? "python" : "python3";
    
    const scriptFilename = "sentinel5p_air_quality.py"; 
    const scriptPath = path.resolve(__dirname, scriptFilename);
    if (!fs.existsSync(scriptPath)) {
      return reject(
        new Error(`Python script not found at path: ${scriptPath}`)
      );
    }
    console.log(`Executing AQ Check: ${scriptPath}`);
    console.log(`Region: ${regionId} | Pollutant: ${pollutant}`);
    
    const pythonProcess = spawn(pythonExecutable, [
      scriptPath,
      credentialsPath,
    ]);

    const inputData = {
      geometry: regionGeoJson,
      region_id: regionId,
      pollutant: pollutant,
    };

    if (threshold !== undefined && threshold !== null && !isNaN(parseFloat(threshold))) {
      inputData.threshold = parseFloat(threshold);
    }
    const inputJsonString = JSON.stringify(inputData);

    let scriptOutput = "";
    let scriptError = "";

    pythonProcess.stdout.on("data", (data) => {
      scriptOutput += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      scriptError += data.toString();
    });
    
    pythonProcess.on("close", (code) => {
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

          console.log(`Successfully parsed ${pollutant} data.`);
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

    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python subprocess:", err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    try {
      pythonProcess.stdin.write(inputJsonString);
      pythonProcess.stdin.end();
    } catch (stdinError) {
      console.error("Error writing to Python stdin:", stdinError);
      reject(new Error(`Error writing to Python stdin: ${stdinError.message}`));
    }
  });
}