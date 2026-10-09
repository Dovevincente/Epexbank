import {
  openSavingsAccount,
  depositToSavingsAccount,
  withdrawFromSavingsAccount,
  applyInterestToSavingsAccount,
} from "../services/savingsOperationsService.js";

import { getSavingsProducts as fetchSavingsProducts } from "../services/savingsProductService.js";

import {
  getUserSavingsAccounts,
  getUserSavingsAccount,
  matureSavingsAccounts,
  completeSavingsAccount,
  cancelSavingsAccount,
} from "../services/savingsService.js";

const getSavingsId = (req, res) => {
  const savingsId =
    req.params?.savingsId ||
    req.params?.id ||
    req.body?.savingsId;

  if (!savingsId) {
    res.status(400).json({
      success: false,
      message: "Savings account ID is required.",
    });

    return null;
  }

  return savingsId;
};

export const createSavings = async (
  req,
  res,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const body = req.body || {};

    const productId =
      body.productId ||
      body.savingsProductId ||
      body.type;

    const accountId =
      body.accountId ||
      body.fundingAccountId;

    const name =
      body.name ||
      body.savingsName ||
      `My ${productId || "Savings"}`;

    const targetAmount =
      body.targetAmount;

    const maturityDate =
      body.maturityDate;

    const initialDeposit =
      body.initialDeposit ??
      body.openingAmount ??
      body.amount ??
      0;

    const result =
      await openSavingsAccount({
        userId,
        productId,
        accountId,
        name,
        targetAmount,
        maturityDate,
        initialDeposit,
      });

    return res.status(201).json({
      success: true,
      message:
        "Savings account opened successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "[Savings] Create error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to create savings account.",
    });
  }
};

export const listSavings = async (
  req,
  res,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (
      String(req.query?.products || "")
        .toLowerCase() === "true"
    ) {
      return res.status(200).json({
        success: true,
        data: {
          products:
            fetchSavingsProducts(),
        },
      });
    }

    const savings =
      await getUserSavingsAccounts({
        userId,
        ...req.query,
      });

    return res.status(200).json({
      success: true,
      data: savings,
    });
  } catch (error) {
    console.error(
      "[Savings] List error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to load savings accounts.",
    });
  }
};

export const getSavings = async (
  req,
  res,
) => {
  try {
    const userId = req.user?.id;
    const savingsId =
      getSavingsId(req, res);

    if (!savingsId) return;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const savings =
      await getUserSavingsAccount({
        userId,
        savingsId,
      });

    return res.status(200).json({
      success: true,
      data: savings,
    });
  } catch (error) {
    console.error(
      "[Savings] Get error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to load savings account.",
    });
  }
};

export const depositSavings = async (
  req,
  res,
) => {
  try {
    const userId = req.user?.id;
    const savingsId =
      getSavingsId(req, res);

    if (!savingsId) return;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result =
      await depositToSavingsAccount({
        userId,
        savingsId,
        accountId:
          req.body?.accountId ||
          req.body?.fundingAccountId,
        amount:
          req.body?.amount,
      });

    return res.status(200).json({
      success: true,
      message:
        "Savings deposit completed successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "[Savings] Deposit error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to deposit into savings.",
    });
  }
};

export const withdrawSavings = async (
  req,
  res,
) => {
  try {
    const userId = req.user?.id;
    const savingsId =
      getSavingsId(req, res);

    if (!savingsId) return;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result =
      await withdrawFromSavingsAccount({
        userId,
        savingsId,
        accountId:
          req.body?.accountId ||
          req.body?.destinationAccountId,
        amount:
          req.body?.amount,
      });

    return res.status(200).json({
      success: true,
      message:
        "Savings withdrawal completed successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "[Savings] Withdrawal error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to withdraw from savings.",
    });
  }
};

export const applyInterest = async (
  req,
  res,
) => {
  try {
    const savingsId =
      getSavingsId(req, res);

    if (!savingsId) return;

    const result =
      await applyInterestToSavingsAccount({
        savingsId,
        days:
          req.body?.days ??
          req.query?.days ??
          365,
      });

    return res.status(200).json({
      success: true,
      message:
        "Savings interest applied successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "[Savings] Interest error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to apply savings interest.",
    });
  }
};

export const matureSavings = async (
  req,
  res,
) => {
  try {
    const result =
      await matureSavingsAccounts();

    return res.status(200).json({
      success: true,
      message:
        "Savings maturity processing completed.",
      data: result,
    });
  } catch (error) {
    console.error(
      "[Savings] Maturity error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to mature savings accounts.",
    });
  }
};

export const completeSavings = async (
  req,
  res,
) => {
  try {
    const userId = req.user?.id;
    const savingsId =
      getSavingsId(req, res);

    if (!savingsId) return;

    const savings =
      await completeSavingsAccount({
        userId,
        savingsId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Savings account completed successfully.",
      data: savings,
    });
  } catch (error) {
    console.error(
      "[Savings] Complete error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to complete savings account.",
    });
  }
};

export const cancelSavings = async (
  req,
  res,
) => {
  try {
    const userId = req.user?.id;
    const savingsId =
      getSavingsId(req, res);

    if (!savingsId) return;

    const savings =
      await cancelSavingsAccount({
        userId,
        savingsId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Savings account cancelled successfully.",
      data: savings,
    });
  } catch (error) {
    console.error(
      "[Savings] Cancel error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to cancel savings account.",
    });
  }
};

export const getSavingsProducts = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        products: fetchSavingsProducts(),
      },
    });
  } catch (error) {
    console.error(
      "[Savings] Products error:",
      error,
    );

    return res.status(
      error.statusCode || 400,
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to load savings products.",
    });
  }
};

