import { Router } from "express";

import {
  createPaymentRequest,
  listPayments,
  getPayment,
  cancelPaymentRequest,
} from "../controllers/paymentController.js";

import { financialRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/* =========================================================
   PAYMENT API RATE LIMITING
========================================================= */

router.use(financialRateLimiter);

/* =========================================================
   CUSTOMER PAYMENTS
========================================================= */

router.get(
  "/",
  listPayments,
);

router.get(
  "/:paymentId",
  getPayment,
);

/* =========================================================
   CREATE PAYMENT
========================================================= */

router.post(
  "/",
  createPaymentRequest,
);

/* =========================================================
   CANCEL PAYMENT
========================================================= */

router.post(
  "/:paymentId/cancel",
  cancelPaymentRequest,
);

export default router;
