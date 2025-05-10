import { Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { AuthenticatedRequest } from "../types";
import { auth } from "../config/firebase";

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          message: "No token provided",
        },
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(token);
      const userRecord = await auth.getUser(decodedToken.uid);

      // Check if user has admin role in custom claims
      const isUserAdmin = userRecord.customClaims?.admin === true;

      req.user = {
        uid: userRecord.uid,
        email: userRecord.email || "",
        role: isUserAdmin ? "admin" : "user",
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid or expired token",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

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
          message: "Authentication required",
        },
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: {
          message: "Access denied. Admin privileges required.",
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
