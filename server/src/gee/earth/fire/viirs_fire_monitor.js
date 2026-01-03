import "dotenv/config";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the Python GEE fire detection script.
 * @param {Object} regionGeoJson 
 * @param {string} regionId 
 * @param {string} credentialsPath
 * @returns {Promise<Object>}
 */
export function runFireProtectionCheck(
  regionGeoJson,
  regionId,
  credentialsPath
) {
  return new Promise((resolve, reject) => {
    
    // Use system python (safer for cross-platform)
    const pythonExecutable = process.platform === "win32" ? "python" : "python3"; 
    
    const scriptFilename = "viirs_fire_monitor.py"; 
    const scriptPath = path.resolve(__dirname, scriptFilename);

    if (!fs.existsSync(scriptPath)) {
      return reject(
        new Error(`Python script not found at path: ${scriptPath}`)
      );
    }

    console.log(`Executing Fire Check: ${scriptPath}`);
    
    const pythonProcess = spawn(pythonExecutable, [
      scriptPath,
      credentialsPath,
    ]);

    // We only send the required data. 
    // Python will handle defaults for buffer (5000m) and days_back (5).
    const inputData = {
      geometry: regionGeoJson,
      region_id: regionId,
    };

    const inputJsonString = JSON.stringify(inputData);

    let scriptOutput = "";
    let scriptError = "";

    pythonProcess.stderr.on("data", (data) => {
      scriptError += data.toString();
    });

    pythonProcess.stdout.on("data", (data) => {
      scriptOutput += data.toString();
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

          console.log("Successfully parsed Python output.");
          resolve(result);
        } catch (parseError) {
          console.error("Failed to parse Python JSON output:", parseError);
          if (scriptError) console.error("Python Stderr:", scriptError);
          reject(new Error(`Failed to parse JSON output: ${parseError.message}`));
        }
      } else {
        console.error(`Python script failed with exit code ${code}`);
        reject(new Error(`Python script failed: ${scriptError}`));
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