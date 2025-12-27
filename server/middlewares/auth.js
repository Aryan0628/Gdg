const domain=process.env.DOMAIN;
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: `https://${domain}.auth0.com/.well-known/jwks.json`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export function authMiddleware(
  req,
  res,
  next
) {
  const token = req.cookies["__session"];
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const secret = process.env.JWT_SECRET_KEY;
  const decodedToken = jwt.verify(token, secret)
  console.log(decodedToken);
}

