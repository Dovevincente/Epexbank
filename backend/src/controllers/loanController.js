import {
  createLoanApplication,
  getUserLoans,
  getUserLoan,
  startLoanReview,
  approveLoan,
  rejectLoan,
  disburseLoan,
  processLoanRepayment,
  getLoanRepaymentSchedule,
  markOverdueRepayments,
  listLoanApplications,
} from "../services/loanService.js";

const getUserId = (req) => {
  if (!req.user?.id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return req.user.id;
};

const getRequestIp = (req) => {
  return (
    req.ip ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
};

const getId = (req, name = "loanId") => {
  const value = String(
    req.params?.[name] || "",
  ).trim();

  if (!value) {
    const error = new Error(`${name} is required`);
    error.statusCode = 400;
    throw error;
  }

  return value;
};

export const applyForLoan = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const {
      type,
      requestedAmount,
      interestRate,
      termMonths,
      purpose,
    } = req.body || {};

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Loan type is required",
      });
    }

    if (
      requestedAmount === undefined ||
      requestedAmount === null ||
      requestedAmount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Requested loan amount is required",
      });
    }

    if (
      interestRate === undefined ||
      interestRate === null ||
      interestRate === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Interest rate is required",
      });
    }

    if (
      termMonths === undefined ||
      termMonths === null ||
      termMonths === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Loan term is required",
      });
    }

    const loan = await createLoanApplication({
      userId,
      type,
      requestedAmount,
      interestRate,
      termMonths,
      purpose,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Loan application submitted successfully",
      data: loan,
    });
  } catch (error) {
    return next(error);
  }
};

export const listMyLoans = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const loans = await getUserLoans({
      userId,
      ...(req.query || {}),
    });

    return res.status(200).json({
      success: true,
      data: loans,
    });
  } catch (error) {
    return next(error);
  }
};

export const getMyLoan = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const loanId = getId(req);

    const loan = await getUserLoan(
      userId,
      loanId,
    );

    return res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    return next(error);
  }
};

export const makeLoanRepayment = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const loanId = getId(req);
    const ipAddress = getRequestIp(req);

    const {
      amount,
      accountId,
      idempotencyKey,
    } = req.body || {};

    if (
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Repayment amount is required",
      });
    }

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "Repayment account is required",
      });
    }

    const repayment = await processLoanRepayment({
      userId,
      loanId,
      amount,
      accountId,
      idempotencyKey,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Loan repayment processed successfully",
      data: repayment,
    });
  } catch (error) {
    return next(error);
  }
};

export const getRepaymentSchedule = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const loanId = getId(req);

    const schedule =
      await getLoanRepaymentSchedule(
        userId,
        loanId,
      );

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    return next(error);
  }
};

export const reviewLoanApplication = async (
  req,
  res,
  next,
) => {
  try {
    const reviewerId = getUserId(req);
    const loanId = getId(req);
    const ipAddress = getRequestIp(req);

    const loan = await startLoanReview({
      reviewerId,
      loanId,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Loan moved to review",
      data: loan,
    });
  } catch (error) {
    return next(error);
  }
};

export const approveLoanApplication = async (
  req,
  res,
  next,
) => {
  try {
    const approverId = getUserId(req);
    const loanId = getId(req);
    const ipAddress = getRequestIp(req);

    const {
      approvedAmount,
      interestRate,
      termMonths,
    } = req.body || {};

    if (
      approvedAmount === undefined ||
      approvedAmount === null ||
      approvedAmount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Approved amount is required",
      });
    }

    const loan = await approveLoan({
      approverId,
      loanId,
      approvedAmount,
      interestRate,
      termMonths,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Loan approved successfully",
      data: loan,
    });
  } catch (error) {
    return next(error);
  }
};

export const rejectLoanApplication = async (
  req,
  res,
  next,
) => {
  try {
    const reviewerId = getUserId(req);
    const loanId = getId(req);
    const ipAddress = getRequestIp(req);

    const {
      rejectionReason,
    } = req.body || {};

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Loan rejection reason is required",
      });
    }

    const loan = await rejectLoan({
      reviewerId,
      loanId,
      rejectionReason,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Loan rejected",
      data: loan,
    });
  } catch (error) {
    return next(error);
  }
};

export const disburseLoanApplication = async (
  req,
  res,
  next,
) => {
  try {
    const adminId = getUserId(req);
    const loanId = getId(req);
    const ipAddress = getRequestIp(req);

    const {
      accountId,
      idempotencyKey,
    } = req.body || {};

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message:
          "Destination account is required for loan disbursement",
      });
    }

    const loan = await disburseLoan({
      adminId,
      loanId,
      accountId,
      idempotencyKey,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Loan disbursed successfully",
      data: loan,
    });
  } catch (error) {
    return next(error);
  }
};

export const listAllLoans = async (
  req,
  res,
  next,
) => {
  try {
    const adminId = getUserId(req);

    const loans = await listLoanApplications({
      adminId,
      ...(req.query || {}),
    });

    return res.status(200).json({
      success: true,
      data: loans,
    });
  } catch (error) {
    return next(error);
  }
};

export const processOverdueLoanAccounts = async (
  req,
  res,
  next,
) => {
  try {
    const adminId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const result = await markOverdueRepayments({
      adminId,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Overdue loan repayments processed successfully",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};