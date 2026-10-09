import {
  getUserWallets,
  getWalletById,
  createWallet,
  activateWallet,
  deactivateWallet,
  creditWallet,
  debitWallet,
} from "../services/walletService.js";

/*
 * ============================================================
 * GET CURRENT USER WALLETS
 * ============================================================
 *
 * GET /api/wallets
 *
 * Returns all wallets belonging to the authenticated user.
 * ============================================================
 */

export const listWallets = async (
  req,
  res,
  next,
) => {
  try {
    const wallets = await getUserWallets({
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data: {
        wallets,
        count: wallets.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * ============================================================
 * GET SINGLE WALLET
 * ============================================================
 *
 * GET /api/wallets/:walletId
 * ============================================================
 */

export const getWallet = async (
  req,
  res,
  next,
) => {
  try {
    const { walletId } = req.params;

    const wallet = await getWalletById({
      userId: req.user.id,
      walletId,
    });

    return res.status(200).json({
      success: true,
      data: {
        wallet,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * ============================================================
 * CREATE WALLET
 * ============================================================
 *
 * POST /api/wallets
 *
 * Body:
 *
 * {
 *   "currencyId": "...",
 *   "type": "FIAT"
 * }
 *
 * Customer-created wallets always begin with zero balance.
 * ============================================================
 */

export const createUserWallet = async (
  req,
  res,
  next,
) => {
  try {
    const {
      currencyId,
      type,
    } = req.body;

    const wallet = await createWallet({
      userId: req.user.id,
      currencyId,
      type,
      initialBalance: 0,
      ipAddress:
        req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message:
        "Wallet created successfully.",
      data: {
        wallet,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * ============================================================
 * CHANGE WALLET STATUS
 * ============================================================
 *
 * PATCH /api/wallets/:walletId/status
 *
 * Body:
 *
 * {
 *   "isActive": true
 * }
 * ============================================================
 */

export const changeWalletStatus = async (
  req,
  res,
  next,
) => {
  try {
    const { walletId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      const error = new Error(
        "isActive must be a boolean.",
      );

      error.statusCode = 400;

      throw error;
    }

    let wallet;

    if (isActive) {
      wallet = await activateWallet({
        walletId,
        userId: req.user.id,
        ipAddress:
          req.ip || null,
      });
    } else {
      wallet = await deactivateWallet({
        walletId,
        userId: req.user.id,
        ipAddress:
          req.ip || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Wallet activated successfully."
        : "Wallet deactivated successfully.",
      data: {
        wallet,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * ============================================================
 * CREDIT WALLET
 * ============================================================
 *
 * POST /api/wallets/:walletId/credit
 *
 * This is retained for controlled internal operations.
 * Production deposit flows should use the appropriate deposit
 * and payment/reconciliation workflow.
 * ============================================================
 */

export const creditUserWallet = async (
  req,
  res,
  next,
) => {
  try {
    const { walletId } = req.params;

    const {
      amount,
      description,
    } = req.body;

    const result = await creditWallet({
      walletId,
      amount,
      description:
        description || "Wallet credit",
      userId: req.user.id,
      ipAddress:
        req.ip || null,
    });

    return res.status(200).json({
      success: true,
      message:
        "Wallet credited successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * ============================================================
 * DEBIT WALLET
 * ============================================================
 *
 * POST /api/wallets/:walletId/debit
 * ============================================================
 */

export const debitUserWallet = async (
  req,
  res,
  next,
) => {
  try {
    const { walletId } = req.params;

    const {
      amount,
      description,
    } = req.body;

    const result = await debitWallet({
      walletId,
      amount,
      description:
        description || "Wallet debit",
      userId: req.user.id,
      ipAddress:
        req.ip || null,
    });

    return res.status(200).json({
      success: true,
      message:
        "Wallet debited successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};