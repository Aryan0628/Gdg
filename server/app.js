import express from "express"
import cors from "cors"
import cookieparser from "cookie-parser"

const app=express();
console.log("cross origin",process.env.CORS_ORIGIN);
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(cookieparser());

app.use(express.json());


export{app}