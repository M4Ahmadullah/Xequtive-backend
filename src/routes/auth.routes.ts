import { Router, Request, Response } from "express";
import { verifyToken, isAdmin } from "../middleware/authMiddleware";
import { AuthenticatedRequest, ApiResponse, UserData } from "../types";
import { AuthService } from "../services/auth.service";
import { auth, firestore } from "../config/firebase";
import { env } from "../config/env"; // Import the env configuration
import * as dotenv from "dotenv";
import path from "path";
import { z } from "zod";
import { authLimiter } from "../middleware/rateLimiter";
import { loginSchema, signupSchema } from "../validation/auth.schema";

// Force reload env variables for this file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const router = Router();

// Frontend user registration
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "All fields are required: Full Name, Email, Phone, Password, and Confirm Password",
        },
      } as ApiResponse<never>);
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Passwords do not match",
        },
      } as ApiResponse<never>);
    }

    // Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
      phoneNumber: phone,
    });

    // Set custom claims for regular user
    await auth.setCustomUserClaims(userRecord.uid, { role: "user" });

    // Create user document in Firestore with full profile data
    await firestore.collection("users").doc(userRecord.uid).set({
      email: userRecord.email,
      fullName: fullName,
      phone: phone,
      role: "user",
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        phone: phone,
        role: "user",
      },
    } as ApiResponse<UserData>);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: "Failed to create user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Frontend user login verification
router.post("/user-login", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Token is required",
        },
      } as ApiResponse<never>);
    }

    const userData = await AuthService.verifyToken(token);

    // Verify this is not an admin trying to use the user login
    const isUserAdmin = await AuthService.isAdmin(userData.uid);
    if (isUserAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Admin users should use the admin login endpoint",
        },
      } as ApiResponse<never>);
    }

    res.status(200).json({
      success: true,
      data: userData,
    } as ApiResponse<UserData>);
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: "Invalid token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Verify current session
router.get(
  "/verify-session",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.uid) {
        throw new Error("User not found in request");
      }

      const isUserAdmin = await AuthService.isAdmin(req.user.uid);

      res.status(200).json({
        success: true,
        data: {
          user: {
            ...req.user,
            role: isUserAdmin ? "admin" : "user",
          },
        },
      } as ApiResponse<{ user: UserData }>);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          message: "Session verification failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// User login
router.post("/signin", authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request
    try {
      loginSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid login data",
            details: error.errors.map((e) => e.message).join(", "),
          },
        } as ApiResponse<never>);
      }
      throw error;
    }

    const { email, password } = req.body;

    // Signin service
    const authResult = await AuthService.loginWithEmail(email, password);

    return res.json({
      success: true,
      data: authResult,
    } as ApiResponse<typeof authResult>);
  } catch (error) {
    console.error("Login error:", error);

    // Provide appropriate error response
    return res.status(401).json({
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : "Authentication failed",
      },
    } as ApiResponse<never>);
  }
});

// User sign up
router.post("/signup", authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request
    try {
      signupSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid signup data",
            details: error.errors.map((e) => e.message).join(", "),
          },
        } as ApiResponse<never>);
      }
      throw error;
    }

    const { email, password, fullName, phone } = req.body;

    // Registration service
    const userData = await AuthService.registerWithEmail(
      email,
      password,
      fullName,
      phone
    );

    return res.status(201).json({
      success: true,
      data: userData,
    } as ApiResponse<typeof userData>);
  } catch (error) {
    console.error("Registration error:", error);

    // Determine appropriate error code
    const statusCode =
      error instanceof Error && error.message.includes("already exists")
        ? 409
        : 500;

    return res.status(statusCode).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Registration failed",
      },
    } as ApiResponse<never>);
  }
});

// Sign out endpoint
router.post("/signout", async (req: Request, res: Response) => {
  // Since Firebase authentication is token-based and stateless on the server,
  // we just need to return a success response
  // The actual token invalidation happens on the client side by removing the token

  return res.status(200).json({
    success: true,
    data: {
      message: "Signed out successfully",
    },
  });
});

// Grant admin privileges to a user (Admin only)
router.post(
  "/grant-admin",
  verifyToken,
  isAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { uid } = req.body;

      if (!uid) {
        return res.status(400).json({
          success: false,
          error: {
            message: "User ID is required",
          },
        } as ApiResponse<never>);
      }

      await AuthService.grantAdminRole(uid);

      res.status(200).json({
        success: true,
        data: {
          message: "Admin privileges granted successfully",
        },
      } as ApiResponse<{ message: string }>);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          message: "Failed to grant admin privileges",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Revoke admin privileges (Admin only)
router.post(
  "/revoke-admin",
  verifyToken,
  isAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { uid } = req.body;

      if (!uid) {
        return res.status(400).json({
          success: false,
          error: {
            message: "User ID is required",
          },
        } as ApiResponse<never>);
      }

      await AuthService.revokeAdminRole(uid);

      res.status(200).json({
        success: true,
        data: {
          message: "Admin privileges revoked successfully",
        },
      } as ApiResponse<{ message: string }>);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          message: "Failed to revoke admin privileges",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

export default router;
