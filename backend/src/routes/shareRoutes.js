import { Router } from "express";

import {
  listShares,
  getShare,
  buyShares,
  sellShares,
  listShareOrders,
  getShareOrder,
  listShareDividends,
  createShareProduct,
  updatePrice,
  updateStatus,
} from "../controllers/shareController.js";

import { requireStaff } from "../middleware/adminAuth.js";
import { financialRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/* =========================================================
   SHARE API RATE LIMITING
========================================================= */

router.use(financialRateLimiter);

/* =========================================================
   CUSTOMER SHARE PRODUCTS
========================================================= */

router.get(
  "/",
  listShares,
);

router.get(
  "/:shareId",
  getShare,
);

/* =========================================================
   CUSTOMER SHARE ORDERS
========================================================= */

router.post(
  "/orders/buy",
  buyShares,
);

router.post(
  "/orders/sell",
  sellShares,
);

router.get(
  "/orders",
  listShareOrders,
);

router.get(
  "/orders/:orderId",
  getShareOrder,
);

/* =========================================================
   SHARE DIVIDENDS
========================================================= */

router.get(
  "/:shareId/dividends",
  listShareDividends,
);

/* =========================================================
   STAFF SHARE MANAGEMENT
========================================================= */

router.post(
  "/",
  requireStaff,
  createShareProduct,
);

router.patch(
  "/:shareId/price",
  requireStaff,
  updatePrice,
);

router.patch(
  "/:shareId/status",
  requireStaff,
  updateStatus,
);

export default router;
