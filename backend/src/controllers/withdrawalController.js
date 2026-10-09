import {
  createWithdrawal,
  getUserWithdrawals,
  getUserWithdrawalById,
  cancelWithdrawal,
} from "../services/withdrawalService.js";

/* =========================================================
   CREATE WITHDRAWAL
========================================================= */

export const createWithdrawalRequest = async (
  req,
  res,
  next,
) => {
  try {
    const withdrawal = await createWithdrawal(
      req.user.id,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Withdrawal request created successfully",
      data: {
        withdrawal,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   LIST CURRENT USER WITHDRAWALS
========================================================= */

export const listWithdrawals = async (
  req,
  res,
  next,
) => {
  try {
    const withdrawals = await getUserWithdrawals(
      req.user.id,
      req.query,
    );

    return res.status(200).json({
      success: true,
      data: {
        withdrawals,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET SINGLE WITHDRAWAL
========================================================= */

export const getWithdrawal = async (
  req,
  res,
  next,
) => {
  try {
    const { withdrawalId } = req.params;

    const withdrawal = await getUserWithdrawalById(
      req.user.id,
      withdrawalId,
    );

    return res.status(200).json({
      success: true,
      data: {
        withdrawal,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CANCEL WITHDRAWAL
========================================================= */

export const cancelWithdrawalRequest = async (
  req,
  res,
  next,
) => {
  try {
    const { withdrawalId } = req.params;

    const withdrawal = await cancelWithdrawal(
      req.user.id,
      withdrawalId,
    );

    return res.status(200).json({
      success: true,
      message: "Withdrawal cancelled successfully",
      data: {
        withdrawal,
      },
    });
  } catch (error) {
    next(error);
  }
};
