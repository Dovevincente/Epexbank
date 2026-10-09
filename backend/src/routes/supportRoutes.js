import { Router } from "express";

import {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  closeTicket,
} from "../controllers/supportController.js";

import { generalRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/* =========================================================
   SUPPORT API RATE LIMITING
========================================================= */

router.use(generalRateLimiter);

/* =========================================================
   SUPPORT TICKETS
========================================================= */

router.post(
  "/",
  createTicket,
);

router.get(
  "/",
  listTickets,
);

router.get(
  "/:ticketId",
  getTicket,
);

/* =========================================================
   UPDATE TICKET
========================================================= */

router.patch(
  "/:ticketId",
  updateTicket,
);

/* =========================================================
   CLOSE TICKET
========================================================= */

router.post(
  "/:ticketId/close",
  closeTicket,
);

export default router;
