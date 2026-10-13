import { Router } from "express";

import {
  createTransfer,
  createInternationalTransferController,
  listTransfers,
  getTransfer,
} from "../controllers/transferController.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", listTransfers);

// Keep this route before "/:transferId".
router.post(
  "/international",
  createInternationalTransferController,
);

router.post("/internal", createTransfer);

router.get("/:transferId", getTransfer);

export default router;