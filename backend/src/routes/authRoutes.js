import express from "express";

import {
  register,
  login,
  refresh,
  logout,
} from "../controllers/authController.js";

import { validate } from "../middleware/validate.js";

import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "../utils/validationSchemas.js";

const router = express.Router();

router.post(
  "/register",
  validate(registerSchema),
  register,
);

router.post(
  "/login",
  validate(loginSchema),
  login,
);

router.post(
  "/refresh",
  validate(refreshSchema),
  refresh,
);

router.post(
  "/logout",
  logout,
);

export default router;