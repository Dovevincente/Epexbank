import { Router } from "express";

import {
  authenticate,
} from "../middleware/auth.js";

import {
  financialRateLimiter,
} from "../middleware/rateLimiter.js";

import {
  uploadInvestmentPaymentProof,
} from "../middleware/investmentPaymentUpload.js";

import {
  getInvestmentAccount,
  getInvestmentAccountDetails,
  listInvestmentProducts,
  getInvestmentProduct,
  buyInvestment,
  sellInvestment,
  listInvestmentOrders,
  getInvestmentOrder,
  getPortfolio,
  refreshPortfolio,
  listInvestmentPlans,
  getInvestmentPlan,
  getBitcoinPaymentConfigController,
  createFixedTermInvestment,
  listFixedTermInvestments,
  getFixedTermInvestment,
  submitFixedTermInvestmentPayment,
} from "../controllers/investmentController.js";

const router = Router();

router.use(financialRateLimiter);

router.get(
  "/plans",
  listInvestmentPlans,
);

router.get(
  "/plans/:planId",
  getInvestmentPlan,
);

router.get(
  "/btc/payment-config",
  getBitcoinPaymentConfigController,
);

router.use(authenticate);

router.get(
  "/account",
  getInvestmentAccount,
);

router.get(
  "/account/details",
  getInvestmentAccountDetails,
);

router.get(
  "/products",
  listInvestmentProducts,
);

router.get(
  "/products/:productId",
  getInvestmentProduct,
);

router.post(
  "/orders/buy",
  buyInvestment,
);

router.post(
  "/orders/sell",
  sellInvestment,
);

router.get(
  "/orders",
  listInvestmentOrders,
);

router.get(
  "/orders/:orderId",
  getInvestmentOrder,
);

router.get(
  "/portfolio",
  getPortfolio,
);

router.post(
  "/portfolio/refresh",
  refreshPortfolio,
);

router.post(
  "/fixed",
  createFixedTermInvestment,
);

router.get(
  "/fixed",
  listFixedTermInvestments,
);

router.get(
  "/fixed/:investmentId",
  getFixedTermInvestment,
);

router.post(
  "/fixed/:investmentId/payment",
  uploadInvestmentPaymentProof,
  submitFixedTermInvestmentPayment,
);

export default router;
