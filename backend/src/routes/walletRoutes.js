import { Router } from "express";

import {
  listWallets,
  getWallet,
  createUserWallet,
  changeWalletStatus,
  creditUserWallet,
  debitUserWallet,
} from "../controllers/walletController.js";

import {
  authenticate,
} from "../middleware/auth.js";

import {
  financialRateLimiter,
} from "../middleware/rateLimiter.js";

const router = Router();

/*
 * ============================================================
 * WALLET SECURITY
 * ============================================================
 *
 * Every wallet endpoint requires:
 *
 * 1. Financial rate limiting
 * 2. A valid authenticated access token
 *
 * authenticate() verifies the JWT and attaches the
 * authenticated customer to req.user.
 * ============================================================
 */

router.use(
  financialRateLimiter,
);

router.use(
  authenticate,
);

/*
 * ============================================================
 * CUSTOMER WALLETS
 * ============================================================
 *
 * GET /api/wallets
 *
 * Returns wallets belonging to the authenticated customer.
 * ============================================================
 */

router.get(
  "/",
  listWallets,
);

/*
 * ============================================================
 * SINGLE WALLET
 * ============================================================
 *
 * GET /api/wallets/:walletId
 * ============================================================
 */

router.get(
  "/:walletId",
  getWallet,
);

/*
 * ============================================================
 * CREATE WALLET
 * ============================================================
 *
 * POST /api/wallets
 * ============================================================
 */

router.post(
  "/",
  createUserWallet,
);

/*
 * ============================================================
 * WALLET STATUS
 * ============================================================
 *
 * PATCH /api/wallets/:walletId/status
 * ============================================================
 */

router.patch(
  "/:walletId/status",
  changeWalletStatus,
);

/*
 * ============================================================
 * WALLET CREDIT
 * ============================================================
 *
 * POST /api/wallets/:walletId/credit
 * ============================================================
 */

router.post(
  "/:walletId/credit",
  creditUserWallet,
);

/*
 * ============================================================
 * WALLET DEBIT
 * ============================================================
 *
 * POST /api/wallets/:walletId/debit
 * ============================================================
 */

router.post(
  "/:walletId/debit",
  debitUserWallet,
);

export default router;