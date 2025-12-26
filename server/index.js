import dotenv from "dotenv"
import {app} from "./app.js"
import { auth } from 'express-openid-connect';

dotenv.config({
    path:'./.env'
})

app.get("/api/health", (req, res) => res.json("server is running good "));

const domain = process.env.DOMAIN;
const clientId=process.env.CLIENT_ID
const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: 'http://localhost:3000',
  clientID: `${clientId}`,
  issuerBaseURL: `https://${domain}`,
  secret: `${process.env.JWT_SECRET_KEY}`,
};

app.use(auth(config));

app.get("/api/me", (req, res) => console.log(req));

const port = process.env.PORT || 5000
app.listen(port, () => console.log(`Server running on port ${port}`));