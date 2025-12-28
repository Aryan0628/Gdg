import { createRequire } from "module";
const require = createRequire(import.meta.url);

const admin = require("firebase-admin");
import serviceAccount from "../../serviceAccountKey.json" assert { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
