import { Router } from "express";

import {
  processBankTransfer,
  completeBankTransferRequest,
  failBankTransferRequest,
  cancelBankTransferRequest,
} from "../controllers/bankTransferProcessingController.js";

import {
  authenticate,
} from "../middleware/auth.js";

import {
  requireAdmin,
} from "../middleware/adminAuth.js";

const router =
  Router();

router.use(
  authenticate,
);

router.use(
  requireAdmin,
);

/*
 * ============================================================
 * PROCESS
 * ============================================================
 */

router.patch(
  "/:transferId/process",
  processBankTransfer,
);

/*
 * ============================================================
 * COMPLETE
 * ============================================================
 */

router.patch(
  "/:transferId/complete",
  completeBankTransferRequest,
);

/*
 * ============================================================
 * FAIL
 * ============================================================
 */

router.patch(
  "/:transferId/fail",
  failBankTransferRequest,
);

/*
 * ============================================================
 * CANCEL
 * ============================================================
 */

router.patch(
  "/:transferId/cancel",
  cancelBankTransferRequest,
);

export default router;