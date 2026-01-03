import "dotenv/config";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

// --- Calculate __dirname equivalent in ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the Python GEE Coastal Erosion script (Landsat 7 vs 8).
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
    // --- Configuration ---
    // Use 'python3' to match standard GEE environments
    const pythonExecutable = "python3"; 
    
    // --- UPDATED FILENAME: Pointing to the Landsat Script ---
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
      console.log(`Python script exited with code ${code}`);
      
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
          console.error("Raw Python output:", scriptOutput); 
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

// --- Example Usage (Test Block) ---
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    // Example: Coastal area in Odisha (prone to erosion)
    const sampleRegionGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [88.0645, 21.8835], 
          [88.1055, 21.8835],
          [88.1055, 21.9285],
          [88.0645, 21.9285],
          [88.0645, 21.8835]
        ],
      ],
    };
    const sampleRegionId = "india-ghoramara-island-sundarbans";

    console.log("--- Starting UrbanFlow Coastal Check ---");

    const rawCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!rawCredentialsPath) {
      console.error("\nERROR: GOOGLE_APPLICATION_CREDENTIALS env var not set.");
      process.exit(1);
    }

    let credentialsPath = rawCredentialsPath.trim();
    if (
      (credentialsPath.startsWith('"') && credentialsPath.endsWith('"')) ||
      (credentialsPath.startsWith("'") && credentialsPath.endsWith("'"))
    ) {
      credentialsPath = credentialsPath.substring(1, credentialsPath.length - 1);
    }

    if (!fs.existsSync(credentialsPath)) {
      console.error(`\nERROR: Credentials file not found at: ${credentialsPath}`);
      process.exit(1);
    }

    try {
      const result = await runCoastalCheck(
        sampleRegionGeoJson,
        sampleRegionId,
        credentialsPath
      );

      console.log("\n--- UrbanFlow Coastal Result ---");
      console.log(JSON.stringify(result, null, 2));

      if (result.status === "success") {
        if (result.erosion_detected) {
          console.log(`\n⚠️ EROSION ALERT! ${Math.abs(result.net_land_change_hectares)} Hectares of land lost since 2000.`);
        } else {
          console.log(`\n✅ Stable Coastline. Net change: ${result.net_land_change_hectares} Ha.`);
        }
      }
    } catch (error) {
      console.error("\n--- Error ---");
      console.error(error.message);
    }
  })();
}