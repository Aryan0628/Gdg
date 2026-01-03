import "dotenv/config";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Executes the Python GEE deforestation script (Copernicus Sentinel-2).
 * @param {Object} regionGeoJson  
 * @param {string} regionId 
 * @param {string} credentialsPath 
 * @param {number} [threshold]  
 * @returns {Promise<Object>} 
 */
export function runDeforestationCheck(
  regionGeoJson,
  regionId,
  credentialsPath,
  threshold,
) {
  return new Promise((resolve, reject) => {
    const pythonExecutable = path.join(process.cwd(), "venv", "bin", "python3"); 
    
    const scriptFilename = "copernicus_deforestation.py";
    const scriptPath = path.resolve(__dirname, scriptFilename);

    if (!fs.existsSync(scriptPath)) {
      return reject(
        new Error(`Python script not found at path: ${scriptPath}`)
      );
    }

    console.log(`Executing Python script: ${scriptPath}`);
    console.log(`For region: ${regionId}`);

    const pythonProcess = spawn(pythonExecutable, [
      scriptPath,
      credentialsPath,
    ]);

    const inputData = {
      geometry: regionGeoJson,
      region_id: regionId,
    };

    if (threshold !== undefined && threshold !== null) {
      inputData.threshold = threshold;
    }

    const inputJsonString = JSON.stringify(inputData);

    let scriptOutput = "";
    
    pythonProcess.stderr.on("data", (data) => {
      const message = data.toString();
      console.error(`[Python Log]: ${message.trim()}`); 
    });

    pythonProcess.stdout.on("data", (data) => {
      scriptOutput += data.toString();
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

          console.log("Successfully parsed Copernicus data.");
          resolve(result);
        } catch (parseError) {
          console.error("Failed to parse Python JSON output:", parseError);
          console.error("Raw Python output:", scriptOutput); 
          reject(
            new Error(`Failed to parse JSON output: ${parseError.message}`)
          );
        }
      } else {
        console.error(`Python script failed with exit code ${code}`);
        reject(new Error(`Python script failed with code ${code}.`));
      }
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python subprocess:", err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    try {
      console.log("Writing input data to Python stdin...");
      pythonProcess.stdin.write(inputJsonString);
      pythonProcess.stdin.end();
    } catch (stdinError) {
      console.error("Error writing to Python stdin:", stdinError);
      reject(new Error(`Error writing to Python stdin: ${stdinError.message}`));
    }
  });
}