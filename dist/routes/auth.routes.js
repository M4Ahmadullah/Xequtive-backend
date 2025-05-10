"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const auth_service_1 = require("../services/auth.service");
const firebase_1 = require("../config/firebase");
const router = (0, express_1.Router)();
// Test endpoint to get token (FOR TESTING ONLY - REMOVE IN PRODUCTION)
router.post("/test-signin", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Email is required",
                },
            });
        }
        // Get user and create a test token
        const userRecord = await firebase_1.auth.getUserByEmail(email);
        // Create a session cookie instead of a custom token
        const sessionCookie = await firebase_1.auth.createSessionCookie(userRecord.uid, {
            expiresIn: 24 * 60 * 60 * 1000, // 24 hours
        });
        res.status(200).json({
            success: true,
            data: {
                token: sessionCookie,
                uid: userRecord.uid,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: {
                message: "Failed to sign in",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Frontend user registration
router.post("/register", async (req, res) => {
    try {
        const { fullName, email, password, confirmPassword } = req.body;
        // Validate required fields
        if (!fullName || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "All fields are required: Full Name, Email, Password, and Confirm Password",
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
        });
        // Set custom claims for regular user
        await firebase_1.auth.setCustomUserClaims(userRecord.uid, { role: "user" });
        // Create user document in Firestore
        await firebase_1.firestore.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            role: "user",
            createdAt: new Date().toISOString(),
        });
        res.status(201).json({
            success: true,
            data: {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
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
// Admin registration (no protection for now)
router.post("/register-admin", async (req, res) => {
    try {
        const { fullName, email, password, confirmPassword } = req.body;
        // Validate required fields
        if (!fullName || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "All fields are required: Full Name, Email, Password, and Confirm Password",
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
        // Create admin user in Firebase Authentication
        const userRecord = await firebase_1.auth.createUser({
            email,
            password,
            displayName: fullName,
        });
        // Set custom claims for admin
        await firebase_1.auth.setCustomUserClaims(userRecord.uid, { role: "admin" });
        // Create admin document in Firestore
        await firebase_1.firestore.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            role: "admin",
            createdAt: new Date().toISOString(),
        });
        res.status(201).json({
            success: true,
            data: {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                role: "admin",
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: {
                message: "Failed to create admin user",
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
// Dashboard admin login verification
router.post("/dashboard/admin-login", async (req, res) => {
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
        const isUserAdmin = await auth_service_1.AuthService.isAdmin(userData.uid);
        if (!isUserAdmin) {
            return res.status(403).json({
                success: false,
                error: {
                    message: "Access denied. Admin privileges required.",
                },
            });
        }
        res.status(200).json({
            success: true,
            data: {
                ...userData,
                role: "admin",
            },
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
// Direct signin endpoint for testing
router.post("/signin", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Email is required",
                },
            });
        }
        // Get user from Firebase
        const userRecord = await firebase_1.auth.getUserByEmail(email);
        // Get user role from Firestore
        const userDoc = await firebase_1.firestore
            .collection("users")
            .doc(userRecord.uid)
            .get();
        const userData = userDoc.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                error: {
                    message: "User data not found",
                },
            });
        }
        // Create a custom token
        const customToken = await firebase_1.auth.createCustomToken(userRecord.uid);
        res.status(200).json({
            success: true,
            data: {
                uid: userRecord.uid,
                email: userRecord.email,
                role: userData.role,
                token: customToken,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: {
                message: "Failed to sign in",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
exports.default = router;
