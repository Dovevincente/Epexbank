import {
  getUserTransactions,
  getUserTransactionById,
  getAccountTransactions,
} from "../services/transactionService.js";

export const listTransactions = async (
  req,
  res,
  next,
) => {
  try {
    const {
      accountId,
      type,
      status,
      limit,
      cursor,
    } = req.query;

    const result =
      await getUserTransactions({
        userId: req.user.id,
        accountId,
        type,
        status,
        limit,
        cursor,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransaction = async (
  req,
  res,
  next,
) => {
  try {
    const transaction =
      await getUserTransactionById({
        userId: req.user.id,
        transactionId:
          req.params.transactionId,
      });

    return res.status(200).json({
      success: true,
      data: {
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listAccountTransactions =
  async (req, res, next) => {
    try {
      const {
        type,
        status,
        limit,
        cursor,
      } = req.query;

      const result =
        await getAccountTransactions({
          userId: req.user.id,
          accountId:
            req.params.accountId,
          type,
          status,
          limit,
          cursor,
        });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };