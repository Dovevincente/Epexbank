import { Router } from "express";

import {
  createWithdrawalRequest,
  listWithdrawals,
  getWithdrawal,
  cancelWithdrawalRequest,
} from "../controllers/withdrawalController.js";

import { financialRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/* =========================================================
   WITHDRAWAL API RATE LIMITING
========================================================= */

router.use(financialRateLimiter);

/* =========================================================
   CUSTOMER WITHDRAWALS
========================================================= */

router.post(
  "/",
  createWithdrawalRequest,
);

router.get(
  "/",
  listWithdrawals,
);

router.get(
  "/:withdrawalId",
  getWithdrawal,
);

/* =========================================================
   CANCEL WITHDRAWAL
========================================================= */

router.post(
  "/:withdrawalId/cancel",
  cancelWithdrawalRequest,
);

export default router;
