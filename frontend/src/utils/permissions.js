import { USER_ROLES } from "./constants.js";

const ROLE_HIERARCHY = {
  [USER_ROLES.CUSTOMER]: 10,
  [USER_ROLES.SUPPORT]: 20,
  [USER_ROLES.LOAN_OFFICER]: 30,
  [USER_ROLES.INVESTMENT_MANAGER]: 30,
  [USER_ROLES.COMPLIANCE_OFFICER]: 40,
  [USER_ROLES.ADMIN]: 50,
  [USER_ROLES.SUPER_ADMIN]: 100,
};

export const hasRole = (
  user,
  ...allowedRoles
) => {
  if (!user?.role || !allowedRoles.length) {
    return false;
  }

  return allowedRoles.includes(user.role);
};

export const hasMinimumRole = (
  user,
  minimumRole,
) => {
  if (!user?.role || !minimumRole) {
    return false;
  }

  return (
    (ROLE_HIERARCHY[user.role] || 0) >=
    (ROLE_HIERARCHY[minimumRole] || Infinity)
  );
};

export const isCustomer = (user) =>
  hasRole(user, USER_ROLES.CUSTOMER);

export const isAdmin = (user) =>
  hasRole(
    user,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  );

export const isSuperAdmin = (user) =>
  hasRole(user, USER_ROLES.SUPER_ADMIN);

export const isStaff = (user) =>
  hasRole(
    user,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.SUPPORT,
    USER_ROLES.LOAN_OFFICER,
    USER_ROLES.INVESTMENT_MANAGER,
    USER_ROLES.COMPLIANCE_OFFICER,
  );

export const canManageUsers = (user) =>
  isAdmin(user);

export const canManageSystem = (user) =>
  isSuperAdmin(user);

export const canReviewKyc = (user) =>
  hasRole(
    user,
    USER_ROLES.COMPLIANCE_OFFICER,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  );

export const canManageLoans = (user) =>
  hasRole(
    user,
    USER_ROLES.LOAN_OFFICER,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  );

export const canManageInvestments = (user) =>
  hasRole(
    user,
    USER_ROLES.INVESTMENT_MANAGER,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  );