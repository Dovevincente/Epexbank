export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

export const requireAdmin = requireRoles(
  "ADMIN",
  "SUPER_ADMIN",
);

export const requireSuperAdmin = requireRoles(
  "SUPER_ADMIN",
);

export const requireStaff = requireRoles(
  "ADMIN",
  "SUPER_ADMIN",
  "SUPPORT",
  "LOAN_OFFICER",
  "INVESTMENT_MANAGER",
  "COMPLIANCE_OFFICER",
);