import jwt from "jsonwebtoken";
import crypto from "crypto";

import env from "../config/env.js";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      issuer: "epex-bank",
      audience: "epex-bank-web",
    },
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret, {
    issuer: "epex-bank",
    audience: "epex-bank-web",
  });
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};