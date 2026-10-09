import {
  getUserAccounts,
  getUserAccountById,
  getUserAccountBalance,
} from "../services/accountService.js";

/*
 * GET /api/accounts
 *
 * Return all accounts belonging to the authenticated
 * customer.
 */
export const listAccounts = async (
  req,
  res,
  next,
) => {
  try {
    const accounts = await getUserAccounts(
      req.user.id,
    );

    return res.status(200).json({
      success: true,

      data: {
        accounts,
        count: accounts.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/accounts/:accountId
 *
 * Return one account belonging to the authenticated
 * customer.
 */
export const getAccount = async (
  req,
  res,
  next,
) => {
  try {
    const account = await getUserAccountById(
      req.user.id,
      req.params.accountId,
    );

    return res.status(200).json({
      success: true,

      data: {
        account,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/accounts/:accountId/balance
 *
 * Return the latest balance information for an
 * authenticated customer's account.
 */
export const getAccountBalance = async (
  req,
  res,
  next,
) => {
  try {
    const balance =
      await getUserAccountBalance(
        req.user.id,
        req.params.accountId,
      );

    return res.status(200).json({
      success: true,

      data: {
        balance,
      },
    });
  } catch (error) {
    next(error);
  }
};