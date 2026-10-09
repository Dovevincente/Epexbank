import { Router } from "express";

import {
  listTransactions,
  getTransaction,
  listAccountTransactions,
} from "../controllers/transactionController.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", listTransactions);

router.get(
  "/:transactionId",
  getTransaction,
);

export const accountTransactionRouter =
  Router();

accountTransactionRouter.use(
  authenticate,
);

accountTransactionRouter.get(
  "/:accountId/transactions",
  listAccountTransactions,
);

export default router;