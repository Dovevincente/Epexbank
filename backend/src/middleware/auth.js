import prisma from "../config/database.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AUTH } from "../utils/constants.js";

/*
|--------------------------------------------------------------------------
| Extract access token
|--------------------------------------------------------------------------
*/

const extractAccessToken = (req) => {
  const authorization = req.headers.authorization;

  if (
    authorization &&
    authorization.startsWith("Bearer ")
  ) {
    return authorization
      .substring(7)
      .trim();
  }

  const cookieToken =
    req.cookies?.[
      AUTH.ACCESS_TOKEN_COOKIE
    ];

  if (cookieToken) {
    return cookieToken;
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| Authenticate user
|--------------------------------------------------------------------------
|
| Verifies the access token and loads the current user from PostgreSQL.
|
*/

export const authenticate = async (
  req,
  res,
  next,
) => {
  try {
    const token =
      extractAccessToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const payload =
      verifyAccessToken(token);

    if (
      !payload ||
      payload.type !== "access" ||
      !payload.sub
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message:
          "Account is not active",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    if (
      error.name ===
        "TokenExpiredError" ||
      error.name ===
        "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired authentication token",
      });
    }

    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Require administrator
|--------------------------------------------------------------------------
|
| This middleware MUST run after authenticate.
|
| It checks the role loaded from the database rather than trusting
| a role supplied by the client.
|
*/

export const requireAdmin = (
  req,
  res,
  next,
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication required",
    });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message:
        "Administrator access required",
    });
  }

  return next();
};
