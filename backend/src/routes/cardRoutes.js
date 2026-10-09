import { Router } from "express";

import {
  listCards,
  getCard,
  getCardProducts,
  requestCard,
  issueCard,
  freezeUserCard,
  unfreezeUserCard,
  blockUserCard,
  cancelUserCard,
  updateContactless,
  updateOnlinePayments,
  updateLimits,
} from "../controllers/cardController.js";

import { financialRateLimiter } from "../middleware/rateLimiter.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(financialRateLimiter);
router.use(authenticate);

/* =========================================================
   CUSTOMER CARDS
========================================================= */

router.get("/", listCards);

/* =========================================================
   CARD PRODUCTS

   MUST BE BEFORE /:cardId
========================================================= */

router.get("/products", getCardProducts);

/* =========================================================
   CARD REQUEST
========================================================= */

router.post("/requests", requestCard);

/* =========================================================
   DIRECT CARD ISSUANCE
========================================================= */

router.post("/", issueCard);

/* =========================================================
   CUSTOMER CARD BY ID

   MUST COME AFTER /products
========================================================= */

router.get("/:cardId", getCard);

/* =========================================================
   CARD STATUS
========================================================= */

router.post("/:cardId/freeze", freezeUserCard);

router.post("/:cardId/unfreeze", unfreezeUserCard);

router.post("/:cardId/block", blockUserCard);

router.post("/:cardId/cancel", cancelUserCard);

/* =========================================================
   CARD CONTROLS
========================================================= */

router.patch(
  "/:cardId/contactless",
  updateContactless,
);

router.patch(
  "/:cardId/online-payments",
  updateOnlinePayments,
);

/* =========================================================
   CARD LIMITS
========================================================= */

router.patch(
  "/:cardId/limits",
  updateLimits,
);

export default router;