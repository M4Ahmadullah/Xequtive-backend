import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { auth } from "../config/firebase";

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only log auth failures for debugging
    // console.log(`🔐 Auth check: ${req.method} ${req.path}`);

    // Check for token in cookies
    const tokenFromCookie = req.cookies?.token;

    // For backward compatibility only (will be removed in future)
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (tokenFromCookie) {
      token = tokenFromCookie;
    } else if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          code: "auth/not-authenticated",
        },
      });
    }

    try {
      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(token);
      const userRecord = await auth.getUser(decodedToken.uid);

      req.user = {
        uid: userRecord.uid,
        email: userRecord.email || "",
        role: "user",
      };

      next();
    } catch (error) {
      // Only log authentication errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Auth error:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid or expired session",
          code: "auth/invalid-session",
        },
      });
    }
  } catch (error) {
    console.error('Unexpected error in authentication middleware:', error);
    next(error);
  }
};

// This is only for the dashboard routes
export const isAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          code: "auth/not-authenticated",
        },
      });
    }

    // Get user from Firebase Auth
    const userRecord = await auth.getUser(req.user.uid);

    // Check admin custom claim
    const isUserAdmin = userRecord.customClaims?.admin === true;

    if (!isUserAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Access denied. Admin privileges required.",
          code: "auth/insufficient-permissions",
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
