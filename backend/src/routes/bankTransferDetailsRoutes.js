import { Router } from "express";

import {
  getBankTransferDetails,
} from "../controllers/bankTransferDetailsController.js";

import {
  authenticate,
} from "../middleware/auth.js";

const router = Router();

/*
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 */

router.use(
  authenticate,
);

/*
 * ============================================================
 * GET ONE BANK TRANSFER
 * ============================================================
 *
 * GET /api/bank-transfers/:transferId
 *
 * Returns details only when the authenticated customer owns
 * the requested bank transfer.
 */

router.get(
  "/:transferId",
  getBankTransferDetails,
);

export default router;