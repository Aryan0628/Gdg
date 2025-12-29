import admin from "firebase-admin";
import { createRequire } from "module";
const req = createRequire(import.meta.url);
const serviceAccount = req("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();
export const auth = admin.auth();
