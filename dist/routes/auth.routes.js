"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const auth_service_1 = require("../services/auth.service");
const firebase_1 = require("../config/firebase");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const rateLimiter_1 = require("../middleware/rateLimiter");
const auth_schema_1 = require("../validation/auth.schema");
// Force reload env variables for this file
dotenv.config({ path: path_1.default.resolve(process.cwd(), ".env") });
const router = (0, express_1.Router)();
// Frontend user registration
router.post("/register", async (req, res) => {
    try {
        const { fullName, email, phone, password, confirmPassword } = req.body;
        // Validate required fields
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "All fields are required: Full Name, Email, Phone, Password, and Confirm Password",
                },
            });
        }
        // Validate password match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Passwords do not match",
                },
            });
        }
        // Create user in Firebase Authentication
        const userRecord = await firebase_1.auth.createUser({
            email,
            password,
            displayName: fullName,
            phoneNumber: phone,
        });
        // Set custom claims for regular user
        await firebase_1.auth.setCustomUserClaims(userRecord.uid, { role: "user" });
        // Create user document in Firestore with full profile data
        await firebase_1.firestore.collection("users").doc(userRecord.uid).set({
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
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: {
                message: "Failed to create user",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Frontend user login verification
router.post("/user-login", async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Token is required",
                },
            });
        }
        const userData = await auth_service_1.AuthService.verifyToken(token);
        // Verify this is not an admin trying to use the user login
        const isUserAdmin = await auth_service_1.AuthService.isAdmin(userData.uid);
        if (isUserAdmin) {
            return res.status(403).json({
                success: false,
                error: {
                    message: "Admin users should use the admin login endpoint",
                },
            });
        }
        res.status(200).json({
            success: true,
            data: userData,
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: {
                message: "Invalid token",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Verify current session
router.get("/verify-session", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        if (!req.user?.uid) {
            throw new Error("User not found in request");
        }
        const isUserAdmin = await auth_service_1.AuthService.isAdmin(req.user.uid);
        res.status(200).json({
            success: true,
            data: {
                user: {
                    ...req.user,
                    role: isUserAdmin ? "admin" : "user",
                },
            },
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: {
                message: "Session verification failed",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// User login
router.post("/signin", rateLimiter_1.authLimiter, async (req, res) => {
    try {
        // Validate request
        try {
            auth_schema_1.loginSchema.parse(req.body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: "Invalid login data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        const { email, password } = req.body;
        // Signin service
        const authResult = await auth_service_1.AuthService.loginWithEmail(email, password);
        return res.json({
            success: true,
            data: authResult,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        // Provide appropriate error response
        return res.status(401).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Authentication failed",
            },
        });
    }
});
// User sign up
router.post("/signup", rateLimiter_1.authLimiter, async (req, res) => {
    try {
        // Validate request
        try {
            auth_schema_1.signupSchema.parse(req.body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: "Invalid signup data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        const { email, password, fullName, phone } = req.body;
        // Registration service
        const userData = await auth_service_1.AuthService.registerWithEmail(email, password, fullName, phone);
        return res.status(201).json({
            success: true,
            data: userData,
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        // Determine appropriate error code
        const statusCode = error instanceof Error && error.message.includes("already exists")
            ? 409
            : 500;
        return res.status(statusCode).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Registration failed",
            },
        });
    }
});
// Sign out endpoint
router.post("/signout", async (req, res) => {
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
router.post("/grant-admin", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "User ID is required",
                },
            });
        }
        await auth_service_1.AuthService.grantAdminRole(uid);
        res.status(200).json({
            success: true,
            data: {
                message: "Admin privileges granted successfully",
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: {
                message: "Failed to grant admin privileges",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Revoke admin privileges (Admin only)
router.post("/revoke-admin", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "User ID is required",
                },
            });
        }
        await auth_service_1.AuthService.revokeAdminRole(uid);
        res.status(200).json({
            success: true,
            data: {
                message: "Admin privileges revoked successfully",
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: {
                message: "Failed to revoke admin privileges",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
exports.default = router;
