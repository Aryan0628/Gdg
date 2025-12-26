import { auth } from "express-oauth2-jwt-bearer";
console.log(process.env.AUTH0_DOMAIN)
export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
});
