import { Router } from "express";

import {
  createTransfer,
  listTransfers,
  getTransfer,
} from "../controllers/transferController.js";

import {
  authenticate,
} from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  listTransfers,
);

router.post(
  "/internal",
  createTransfer,
);

router.get(
  "/:transferId",
  getTransfer,
);

export default router;