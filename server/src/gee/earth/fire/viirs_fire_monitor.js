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
 * @param {number} [daysBack] 
 * @returns {Promise<Object>}
 */
export function runFireProtectionCheck(
  regionGeoJson,
  regionId,
  credentialsPath,
  daysBack
) {
  return new Promise((resolve, reject) => {
    
    const pythonExecutable = path.join(process.cwd(), "venv", "bin", "python3"); 
    const scriptFilename = "viirs_fire_monitor.py"; 
    const scriptPath = path.resolve(__dirname, scriptFilename);

    if (!fs.existsSync(scriptPath)) {
      return reject(
        new Error(`Python script not found at path: ${scriptPath}`)
      );
    }

    console.log(`Executing Python script: ${scriptPath}`);
    
    const pythonProcess = spawn(pythonExecutable, [
      scriptPath,
      credentialsPath,
    ]);

    const inputData = {
      geometry: regionGeoJson,
      region_id: regionId,
    };

    if (daysBack !== undefined && daysBack !== null) {
      inputData.days_back = daysBack;
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
          console.error("Raw Python output:", scriptOutput); 
          reject(new Error(`Failed to parse JSON output: ${parseError.message}`));
        }
      } else {
        console.error(`Python script failed with exit code ${code}`);
        reject(new Error(`Python script failed.`));
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

//test block , australia ka hai 
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const testGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [133.0, -23.0], 
          [134.0, -23.0],
          [134.0, -22.0],
          [133.0, -22.0],
          [133.0, -23.0],
        ],
      ],
    };
    const testRegionId = "test-fire-zone-australia";
    
    //checking credentials
    const rawCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!rawCredentialsPath) {
        console.error("❌ Error: GOOGLE_APPLICATION_CREDENTIALS env var is missing.");
        process.exit(1);
    }
    
    let credentialsPath = rawCredentialsPath.replace(/^["']|["']$/g, "").trim();

    console.log("🔥 Starting Fire Monitor Test...");
    
    try {
      const result = await runFireProtectionCheck(
        testGeoJson,
        testRegionId,
        credentialsPath,
        30
        
      );

      console.log("\n✅ Test Result:");
      console.log(JSON.stringify(result, null, 2));

    } catch (error) {
      console.error("\n❌ Test Failed:");
      console.error(error.message);
    }
  })();
}