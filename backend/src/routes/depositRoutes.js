import { Router } from "express";

import {
  createDepositRequest,
  listDeposits,
  getDeposit,
  cancelDepositRequest,
} from "../controllers/depositController.js";

import { financialRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/* =========================================================
   DEPOSIT API RATE LIMITING
========================================================= */

router.use(financialRateLimiter);

/* =========================================================
   CUSTOMER DEPOSITS
========================================================= */

router.get(
  "/",
  listDeposits,
);

router.get(
  "/:depositId",
  getDeposit,
);

/* =========================================================
   CREATE DEPOSIT REQUEST
========================================================= */

router.post(
  "/",
  createDepositRequest,
);

/* =========================================================
   CANCEL DEPOSIT REQUEST
========================================================= */

router.post(
  "/:depositId/cancel",
  cancelDepositRequest,
);

export default router;
