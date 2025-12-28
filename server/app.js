import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./src/routes/auth.js";

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


import {checkJwt} from "./src/auth/authMiddleware.js"


app.use("/api/auth", authRoutes);

import garbage from "./src/routes/garbage.route.js"
app.use("/api/garbage",garbage);



export { app };
