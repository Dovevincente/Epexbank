import { Router } from "express";

import {
  createExternalBankTransfer,
  listBankTransfersController,
  verifyBankTransferCompliance,
} from "../controllers/bankTransferController.js";

import {
  authenticate,
} from "../middleware/auth.js";

const router = Router();

router.use(authenticate);


/*
 * ============================================================
 * LIST CUSTOMER BANK TRANSFERS
 * ============================================================
 */

router.get(
  "/",
  listBankTransfersController,
);


/*
 * ============================================================
 * VERIFY COMPLIANCE CODE
 * ============================================================
 *
 * One code per request:
 *
 * TIN → AML → CFT
 *
 * POST /api/bank-transfers/compliance/verify
 */

router.post(
  "/compliance/verify",
  verifyBankTransferCompliance,
);


/*
 * ============================================================
 * CREATE BANK TRANSFER
 * ============================================================
 */

router.post(
  "/",
  createExternalBankTransfer,
);

export default router;