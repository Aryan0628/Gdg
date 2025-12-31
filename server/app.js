import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./src/routes/auth.js";
import donationRoutes from "./src/routes/donation.routes.js";
import interestRoutes from "./src/routes/interest.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";


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
app.use("/api/donations", donationRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/chats", chatRoutes);



export { app };
