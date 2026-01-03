// backend/services/google-earth/copernicus_deforestation.js
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
 * @param {number} [bufferMeters] 
 * @returns {Promise<Object>} 
 */
export function runDeforestationCheck(
  regionGeoJson,
  regionId,
  credentialsPath,
  threshold,
  bufferMeters
) {
  return new Promise((resolve, reject) => {
    // 1. FIX: Point to the 'venv' python to ensure dependencies are found
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
    if (bufferMeters !== undefined && bufferMeters !== null) {
      inputData.buffer_meters = bufferMeters;
    }

    const inputJsonString = JSON.stringify(inputData);

    let scriptOutput = "";
    
    // 2. FIX: Enable Python Logging so we can debug errors
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

// --- STANDALONE TEST BLOCK ---
// Run this with: node src/gee/earth/deforestation/copernicus_deforestation.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    
    // 3. TEST DATA: Amazon Rainforest (Rondonia, Brazil)
    // This is a "Deforestation Hotspot" so it's a good place to test.
    const sampleRegionGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [-62.00, -9.00], 
          [-61.90, -9.00],
          [-61.90, -8.90],
          [-62.00, -8.90],
          [-62.00, -9.00],
        ],
      ],
    };
    const sampleRegionId = "test-amazon-rainforest";
    const customThreshold = -0.15; 

    console.log("--- Starting Copernicus Deforestation Check ---");

    const rawCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!rawCredentialsPath) {
      console.error("\nERROR: GOOGLE_APPLICATION_CREDENTIALS env var not set.");
      process.exit(1);
    }

    let credentialsPath = rawCredentialsPath.replace(/^["']|["']$/g, "").trim();

    if (!fs.existsSync(credentialsPath)) {
      console.error(`\nERROR: Credentials file not found at: ${credentialsPath}`);
      process.exit(1);
    }

    try {
      const result = await runDeforestationCheck(
        sampleRegionGeoJson,
        sampleRegionId,
        credentialsPath,
        customThreshold,
        1500 
      );

      console.log("\n--- Copernicus Result ---");
      console.log(JSON.stringify(result, null, 2));

      if (result.status === "success") {
        if (result.alert_triggered) {
          console.log(`\n🚨 ALERT! Significant forest loss detected (${result.mean_ndvi_change.toFixed(4)})`);
        } else {
          console.log(`\n✅ Stable. NDVI change: ${result.mean_ndvi_change.toFixed(4)}`);
        }
      }
    } catch (error) {
      console.error("\n--- Error ---");
      console.error(error.message);
    }
  })();
}