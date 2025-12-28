import express from "express";
import axios from "axios";
import {db} from "../firebaseadmin/firebaseadmin.js";

import { checkJwt } from "../auth/authMiddleware.js";

const router = express.Router();

router.post("/sync-user", checkJwt, async (req, res) => {
  try {
    // Get access token from header
    const accessToken = req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      return res.status(401).json({ message: "Missing access token" });
    }

    // Fetch user profile from Auth0
    const { data: user } = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Firestore reference
const userRef = db.collection("users").doc(user.sub);

const doc = await userRef.get();

if (!doc.exists) {
  await userRef.set({
    uid: user.sub,
    email: user.email ?? null,
    name: user.name ?? null,
    picture: user.picture ?? null,
    createdAt: new Date(),
  });
}

    return res.json({ success: true });
  } catch (error) {
    console.error("SYNC USER ERROR:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;
