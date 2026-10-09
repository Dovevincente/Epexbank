import { Router } from "express";

import {
  listAccounts,
  getAccount,
  getAccountBalance,
} from "../controllers/accountController.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

/**
 * Every account endpoint requires authentication.
 */
router.use(authenticate);

/**
 * GET /api/accounts
 */
router.get("/", listAccounts);

/**
 * GET /api/accounts/:accountId/balance
 *
 * Must be declared before /:accountId.
 */
router.get(
  "/:accountId/balance",
  getAccountBalance,
);

/**
 * GET /api/accounts/:accountId
 */
router.get(
  "/:accountId",
  getAccount,
);

export default router;