
import prisma from "../config/database.js";

import {
  approveInternalTransfer,
  cancelInternalTransfer,
} from "../services/transferService.js";

import {
  markBankTransferProcessing,
  completeBankTransfer,
  failBankTransfer,
  cancelBankTransfer,
} from "../services/bankTransferProcessingService.js";

const serializeAdminTransfer = (transfer) => ({
  id: transfer.id,
  reference: transfer.reference,
  type: transfer.type,
  status: transfer.status,

  amount:
    transfer.amount !== null &&
    transfer.amount !== undefined
      ? transfer.amount.toString()
      : "0",

  fee:
    transfer.fee !== null &&
    transfer.fee !== undefined
      ? transfer.fee.toString()
      : "0",

  total:
    transfer.total !== null &&
    transfer.total !== undefined
      ? transfer.total.toString()
      : "0",

  currencyCode: transfer.currencyCode,
  description: transfer.description || null,

  sender: transfer.sender
    ? {
        id: transfer.sender.id,
        email: transfer.sender.email,
      }
    : null,

  receiver: transfer.receiver
    ? {
        id: transfer.receiver.id,
        email: transfer.receiver.email,
      }
    : null,

  beneficiary: transfer.beneficiary
    ? {
        id: transfer.beneficiary.id,
        accountName: transfer.beneficiary.accountName,
        accountNumber: transfer.beneficiary.accountNumber,
        bankName: transfer.beneficiary.bankName,
      }
    : null,

  metadata: transfer.metadata || {},
  createdAt: transfer.createdAt,
  updatedAt: transfer.updatedAt,
});

const transferInclude = {
  sender: {
    select: {
      id: true,
      email: true,
    },
  },

  receiver: {
    select: {
      id: true,
      email: true,
    },
  },

  beneficiary: {
    select: {
      id: true,
      accountName: true,
      accountNumber: true,
      bankName: true,
    },
  },
};

/**
 * GET /api/admin/transfers
 *
 * Global administrative transfer list.
 */
export const getAdminTransfers = async (req, res, next) => {
  try {
    const {
      status,
      type,
      limit = 25,
      cursor,
      search,
    } = req.query;

    const safeLimit = Math.min(
      Math.max(Number(limit) || 25, 1),
      100,
    );

    const where = {
      ...(status
        ? {
            status: String(status).trim().toUpperCase(),
          }
        : {}),

      ...(type
        ? {
            type: String(type).trim().toUpperCase(),
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                reference: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: String(search),
                  mode: "insensitive",
                },
              },
              {
                sender: {
                  email: {
                    contains: String(search),
                    mode: "insensitive",
                  },
                },
              },
              {
                receiver: {
                  email: {
                    contains: String(search),
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const transfers = await prisma.transfer.findMany({
      where,
      include: transferInclude,

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],

      take: safeLimit + 1,

      ...(cursor
        ? {
            cursor: {
              id: String(cursor),
            },
            skip: 1,
          }
        : {}),
    });

    const hasMore = transfers.length > safeLimit;

    const rows = hasMore
      ? transfers.slice(0, safeLimit)
      : transfers;

    return res.status(200).json({
      success: true,
      data: {
        transfers: rows.map(serializeAdminTransfer),

        nextCursor: hasMore
          ? rows[rows.length - 1]?.id || null
          : null,

        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/transfers/:transferId
 */
export const getAdminTransfer = async (req, res, next) => {
  try {
    const { transferId } = req.params;

    const transfer = await prisma.transfer.findUnique({
      where: {
        id: transferId,
      },
      include: transferInclude,
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        transfer: serializeAdminTransfer(transfer),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/transfers/:transferId/status
 *
 * INTERNAL transfers:
 *   COMPLETED / APPROVED -> approve and settle
 *   CANCELLED / REJECTED / FAILED -> cancel and release reservation
 *
 * BANK transfers:
 *   PROCESSING -> mark as processing
 *   COMPLETED -> complete without another debit
 *   FAILED -> fail and restore funds once
 *   CANCELLED / REJECTED -> cancel and restore funds once
 */
export const updateAdminTransferStatus = async (
  req,
  res,
  next,
) => {
  try {
    const { transferId } = req.params;

    const {
      status,
      reason,
      externalReference,
    } = req.body || {};

    const requestedStatus = String(status || "")
      .trim()
      .toUpperCase();

    if (!transferId) {
      return res.status(400).json({
        success: false,
        message: "Transfer ID is required",
      });
    }

    if (!requestedStatus) {
      return res.status(400).json({
        success: false,
        message: "Transfer status is required",
      });
    }

    const allowedStatuses = [
      "PROCESSING",
      "COMPLETED",
      "APPROVED",
      "CANCELLED",
      "REJECTED",
      "FAILED",
    ];

    if (!allowedStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported status. Use PROCESSING, COMPLETED, APPROVED, CANCELLED, REJECTED, or FAILED.",
      });
    }

    const existingTransfer = await prisma.transfer.findUnique({
      where: {
        id: transferId,
      },
      select: {
        id: true,
        type: true,
        status: true,
        reference: true,
      },
    });

    if (!existingTransfer) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Administrator authentication is required",
      });
    }

    /*
     * ----------------------------------------------------------
     * EXTERNAL BANK TRANSFER
     * ----------------------------------------------------------
     *
     * The bank transfer service debits funds at creation.
     * Do not debit the sender again when completing it.
     */
    if (existingTransfer.type === "BANK") {
      let result;

      if (requestedStatus === "PROCESSING") {
        result = await markBankTransferProcessing({
          transferId,
          adminId,
          ipAddress: req.ip,
        });
      } else if (
        requestedStatus === "COMPLETED" ||
        requestedStatus === "APPROVED"
      ) {
        result = await completeBankTransfer({
          transferId,
          adminId,
          ipAddress: req.ip,
          externalReference:
            typeof externalReference === "string"
              ? externalReference.trim() || null
              : null,
        });
      } else if (requestedStatus === "FAILED") {
        result = await failBankTransfer({
          transferId,
          reason:
            typeof reason === "string" && reason.trim()
              ? reason.trim()
              : "External bank transfer failed",
          adminId,
          ipAddress: req.ip,
        });
      } else if (
        requestedStatus === "CANCELLED" ||
        requestedStatus === "REJECTED"
      ) {
        result = await cancelBankTransfer({
          transferId,
          reason:
            typeof reason === "string" && reason.trim()
              ? reason.trim()
              : "Bank transfer cancelled by administrator",
          adminId,
          ipAddress: req.ip,
        });
      }

      const updatedTransfer = await prisma.transfer.findUnique({
        where: {
          id: transferId,
        },
        include: transferInclude,
      });

      return res.status(200).json({
        success: true,
        message: `Bank transfer status is now ${
          updatedTransfer?.status || result?.status || requestedStatus
        }.`,
        data: {
          transfer: updatedTransfer
            ? serializeAdminTransfer(updatedTransfer)
            : result,
        },
      });
    }

    /*
     * ----------------------------------------------------------
     * INTERNAL TRANSFER
     * ----------------------------------------------------------
     *
     * Internal transfers have a separate settlement workflow.
     */
    if (existingTransfer.type === "INTERNAL") {
      let result;

      if (
        requestedStatus === "COMPLETED" ||
        requestedStatus === "APPROVED"
      ) {
        result = await approveInternalTransfer({
          transferId,
          adminUserId: adminId,
        });
      } else if (
        requestedStatus === "CANCELLED" ||
        requestedStatus === "REJECTED" ||
        requestedStatus === "FAILED"
      ) {
        result = await cancelInternalTransfer({
          transferId,
          adminUserId: adminId,
          reason:
            typeof reason === "string" && reason.trim()
              ? reason.trim()
              : "Transfer cancelled by administrator",
        });
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Internal transfers can only be completed or cancelled through this endpoint.",
        });
      }

      const updatedTransfer = await prisma.transfer.findUnique({
        where: {
          id: transferId,
        },
        include: transferInclude,
      });

      return res.status(200).json({
        success: true,
        message: `Internal transfer status is now ${
          updatedTransfer?.status || requestedStatus
        }.`,
        data: {
          transfer: updatedTransfer
            ? serializeAdminTransfer(updatedTransfer)
            : result?.transfer || result,
          alreadyCompleted: result?.alreadyCompleted ?? false,
          alreadyCancelled: result?.alreadyCancelled ?? false,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: `Admin status updates are not configured for transfer type ${existingTransfer.type}.`,
    });
  } catch (error) {
    next(error);
  }
};