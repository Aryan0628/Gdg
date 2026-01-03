import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./src/routes/auth.js";
import roomRoutes from "./src/routes/room.js";
import modelRoutes from "./src/routes/model.js"
import geeRoutes from "./src/routes/geeRoutes.js"
const app = express();

console.log("CORS ORIGIN:", process.env.CORS_ORIGIN);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/room",roomRoutes);
app.use("/api/model",modelRoutes);
app.use("/api/gee",geeRoutes)
export { app };
