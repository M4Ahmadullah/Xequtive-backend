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
const env_1 = require("../config/env"); // Import the env configuration
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const rateLimiter_1 = require("../middleware/rateLimiter");
const auth_schema_1 = require("../validation/auth.schema");
const crypto_1 = __importDefault(require("crypto"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const email_service_1 = require("../services/email.service");
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
        res.status(200).json({
            success: true,
            data: {
                user: {
                    ...req.user,
                    role: "user",
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
                        code: "auth/invalid-data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        const { email, password } = req.body;
        // Signin service
        const authResult = await auth_service_1.AuthService.loginWithEmail(email, password);
        // Exchange custom token for ID token (same as OAuth flow)
        const idTokenResponse = await (0, node_fetch_1.default)(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env_1.env.firebase.apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: authResult.token,
                returnSecureToken: true,
            }),
        });
        const tokenData = await idTokenResponse.json();
        if (!tokenData.idToken) {
            console.error("Failed to get ID token from Firebase:", tokenData);
            return res.status(500).json({
                success: false,
                error: {
                    message: "Failed to generate authentication token",
                    code: "auth/token-generation-failed",
                },
            });
        }
        // Set the ID token as HttpOnly cookie with consistent cross-origin support
        const cookieOptions = {
            httpOnly: true,
            secure: true, // Always secure for cross-origin compatibility
            sameSite: "none", // Always none for cross-origin compatibility
            maxAge: 432000 * 1000, // 5 days in milliseconds
            path: "/", // Ensure cookie is available for all paths
        };
        res.cookie("token", tokenData.idToken, cookieOptions);
        // Add explicit Set-Cookie header logging
        const setCookieHeaders = res.getHeaders()['set-cookie'];
        console.log(`✅ User signed in: ${email} (${authResult.uid})`);
        // Return user data (cookies-only approach)
        return res.json({
            success: true,
            data: {
                uid: authResult.uid,
                email: authResult.email,
                displayName: authResult.displayName,
                phoneNumber: authResult.phone, // Changed from phone to phoneNumber
                role: "user",
                profileComplete: authResult.profileComplete,
            },
        });
    }
    catch (error) {
        console.error("❌ Login failed:", error instanceof Error ? error.message : "Unknown error");
        // Provide appropriate error response
        return res.status(401).json({
            success: false,
            error: {
                message: "Invalid email or password",
                code: "auth/invalid-credentials",
                details: error instanceof Error ? error.message : "Authentication failed",
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
                        code: "auth/invalid-data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        const { email, password, fullName, phoneNumber } = req.body;
        try {
            // Registration service
            const userData = await auth_service_1.AuthService.registerWithEmail(email, password, fullName, phoneNumber);
            // Exchange custom token for ID token (same as OAuth flow)
            const idTokenResponse = await (0, node_fetch_1.default)(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env_1.env.firebase.apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: userData.token,
                    returnSecureToken: true,
                }),
            });
            const tokenData = await idTokenResponse.json();
            if (!tokenData.idToken) {
                console.error("Failed to get ID token from Firebase:", tokenData);
                return res.status(500).json({
                    success: false,
                    error: {
                        message: "Failed to generate authentication token",
                        code: "auth/token-generation-failed",
                    },
                });
            }
            // Set the ID token as HttpOnly cookie with consistent cross-origin support
            const cookieOptions = {
                httpOnly: true,
                secure: true, // Always secure for cross-origin compatibility
                sameSite: "none", // Always none for cross-origin compatibility
                maxAge: 432000 * 1000, // 5 days in milliseconds
                path: "/", // Ensure cookie is available for all paths
            };
            res.cookie("token", tokenData.idToken, cookieOptions);
            // Add explicit Set-Cookie header logging
            const setCookieHeaders = res.getHeaders()['set-cookie'];
            console.log(`🆕 User signed up: ${email} (${userData.uid})`);
            // Return user data (cookies-only approach)
            return res.status(201).json({
                success: true,
                data: {
                    uid: userData.uid,
                    email: userData.email,
                    displayName: userData.displayName,
                    phoneNumber: userData.phoneNumber, // Changed from phone to phoneNumber
                    role: "user",
                    profileComplete: !!(userData.displayName && userData.phoneNumber),
                },
            });
        }
        catch (registrationError) {
            console.error("❌ Signup failed:", registrationError instanceof Error ? registrationError.message : "Unknown error");
            return res.status(500).json({
                success: false,
                error: {
                    message: "Failed to create user",
                    code: "auth/registration-failed",
                    details: registrationError instanceof Error
                        ? registrationError.message
                        : "Unknown error",
                },
            });
        }
    }
    catch (error) {
        console.error("❌ Signup failed:", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({
            success: false,
            error: {
                message: "An unexpected error occurred during signup",
                code: "auth/unexpected-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Sign out endpoint
router.post("/signout", async (req, res) => {
    // Clear the auth cookie with same settings as when it was set
    res.clearCookie("token", {
        httpOnly: true,
        secure: true, // Must match the settings used when setting the cookie
        sameSite: "none", // Must match the settings used when setting the cookie
        path: "/",
    });
    return res.status(200).json({
        success: true,
        message: "Successfully logged out",
    });
});
// Comprehensive cookie testing endpoint
router.get("/debug-cookies", async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`🐛 [${requestId}] Cookie debug request`, {
        timestamp: new Date().toISOString(),
        origin: req.get('Origin'),
        host: req.get('Host'),
        userAgent: req.get('User-Agent'),
        secFetchSite: req.get('Sec-Fetch-Site'),
        secFetchMode: req.get('Sec-Fetch-Mode'),
        secFetchDest: req.get('Sec-Fetch-Dest'),
        rawCookieHeader: req.headers.cookie,
        parsedCookies: req.cookies,
        cookieNames: req.cookies ? Object.keys(req.cookies) : [],
        hasToken: !!req.cookies?.token,
        allHeaders: Object.keys(req.headers),
        responseHeaders: res.getHeaders(),
    });
    // Set multiple test cookies with different configurations
    const testValue = "test-value-" + Date.now();
    // Test cookie 1: Standard cross-origin settings
    res.cookie("debug-test-1", testValue, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 300000, // 5 minutes
        path: "/",
    });
    // Test cookie 2: Less restrictive (for comparison)
    res.cookie("debug-test-2", testValue, {
        httpOnly: false,
        secure: true,
        sameSite: "none",
        maxAge: 300000, // 5 minutes
        path: "/",
    });
    // Test cookie 3: Session cookie
    res.cookie("debug-test-3", testValue, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    });
    console.log(`🍪 [${requestId}] Test cookies set`, {
        testValue,
        cookiesSet: 3,
        responseHeaders: res.getHeaders(),
    });
    return res.json({
        success: true,
        data: {
            message: "Cookie debug info logged - check server logs",
            requestId,
            cookiesReceived: req.cookies || {},
            cookieHeader: req.headers.cookie || null,
            origin: req.get('Origin'),
            secFetchSite: req.get('Sec-Fetch-Site'),
            testCookiesSet: 3,
            testValue,
            instructions: "Call this endpoint again to see if cookies were received",
        },
    });
});
// Test endpoint that mimics exact auth cookie behavior
router.post("/test-auth-cookie", async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`🧪 [${requestId}] Testing auth cookie behavior`, {
        origin: req.get('Origin'),
        secFetchSite: req.get('Sec-Fetch-Site'),
        userAgent: req.get('User-Agent'),
        existingCookies: req.cookies,
    });
    // Set a cookie with EXACTLY the same settings as our auth cookies
    const testToken = "test-jwt-token-" + Date.now() + "-" + Math.random().toString(36);
    const cookieOptions = {
        httpOnly: true,
        secure: true, // Always secure for cross-origin compatibility
        sameSite: "none", // Always none for cross-origin compatibility
        maxAge: 432000 * 1000, // 5 days in milliseconds (same as auth)
        path: "/", // Ensure cookie is available for all paths
    };
    res.cookie("test-token", testToken, cookieOptions);
    console.log(`🧪 [${requestId}] Test auth cookie set`, {
        testToken: testToken.substring(0, 20) + '...',
        cookieOptions,
        responseHeaders: res.getHeaders(),
    });
    return res.json({
        success: true,
        data: {
            message: "Test auth cookie set with exact same settings as real auth",
            requestId,
            testToken: testToken.substring(0, 20) + '...',
            cookieOptions,
            instructions: "Now call /api/auth/me to see if this test cookie is received",
        },
    });
});
// Get current user from cookie
router.get("/me", rateLimiter_1.sessionCheckLimiter, async (req, res) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    try {
        // console.log(`🔍 [${requestId}] Auth/me request started`, {
        //   timestamp: new Date().toISOString(),
        //   userAgent: req.get('User-Agent'),
        //   origin: req.get('Origin'),
        //   referer: req.get('Referer'),
        //   host: req.get('Host'),
        //   hasCookies: !!req.cookies,
        //   cookieNames: req.cookies ? Object.keys(req.cookies) : [],
        //   hasToken: !!req.cookies?.token,
        //   tokenLength: req.cookies?.token ? req.cookies.token.length : 0,
        //   environment: process.env.NODE_ENV,
        //   // Enhanced cookie debugging
        //   rawCookieHeader: req.headers.cookie,
        //   allHeaders: Object.keys(req.headers),
        //   cookieParserResult: req.cookies,
        // });
        const token = req.cookies?.token;
        if (!token) {
            // console.log(`❌ [${requestId}] No token found in cookies`, {
            //   cookies: req.cookies,
            //   cookieHeaders: req.headers.cookie,
            //   allCookieHeaders: req.headers,
            //   // Check if cookie-parser is working
            //   cookieParserWorking: typeof req.cookies === 'object',
            //   // Enhanced cross-origin debugging
            //   origin: req.get('Origin'),
            //   referer: req.get('Referer'),
            //   userAgent: req.get('User-Agent'),
            //   secFetchSite: req.get('Sec-Fetch-Site'),
            //   secFetchMode: req.get('Sec-Fetch-Mode'),
            // });
            return res.status(401).json({
                success: false,
                error: {
                    message: "Not authenticated",
                    code: "auth/not-authenticated",
                },
            });
        }
        // console.log(`🔑 [${requestId}] Token found, verifying...`, {
        //   tokenPreview: token.substring(0, 20) + '...',
        //   tokenLength: token.length,
        // });
        // Verify the Firebase ID token and get user data in parallel
        try {
            const decodedToken = await firebase_1.auth.verifyIdToken(token);
            // Make Firebase calls in parallel for better performance
            const [userRecord, userDoc] = await Promise.all([
                firebase_1.auth.getUser(decodedToken.uid),
                firebase_1.firestore.collection("users").doc(decodedToken.uid).get()
            ]);
            const userData = userDoc.data();
            // console.log(`📄 [${requestId}] Firestore data retrieved`, {
            //   exists: userDoc.exists,
            //   hasFullName: !!userData?.fullName,
            //   hasPhone: !!userData?.phone,
            //   profileComplete: userData?.profileComplete,
            // });
            const responseData = {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userData?.fullName || userRecord.displayName,
                phoneNumber: userData?.phone || null, // Changed from phone to phoneNumber
                role: "user",
                profileComplete: userData?.profileComplete || false,
                createdAt: userData?.createdAt || null,
                updatedAt: userData?.updatedAt || null,
            };
            // console.log(`✅ [${requestId}] Success response prepared`, {
            //   responseData: {
            //     uid: !!responseData.uid,
            //     email: !!responseData.email,
            //     displayName: !!responseData.displayName,
            //     phoneNumber: !!responseData.phoneNumber,
            //     role: responseData.role,
            //     profileComplete: responseData.profileComplete,
            //   },
            //   processingTime: Date.now() - startTime,
            // });
            console.log(`👤 Auth/me: ${responseData.displayName || 'Unknown'} (${responseData.email})`);
            return res.json({
                success: true,
                data: responseData,
            });
        }
        catch (error) {
            console.error(`❌ [${requestId}] Token verification failed`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                errorCode: error.code,
                errorStack: error instanceof Error ? error.stack : undefined,
                tokenPreview: token.substring(0, 20) + '...',
                processingTime: Date.now() - startTime,
            });
            // Token is invalid - clear it and return not authenticated
            res.clearCookie("token", {
                httpOnly: true,
                secure: true, // Must match the settings used when setting the cookie
                sameSite: "none", // Must match the settings used when setting the cookie
                path: "/",
            });
            return res.status(401).json({
                success: false,
                error: {
                    message: "Invalid or expired session",
                    code: "auth/invalid-session",
                },
            });
        }
    }
    catch (error) {
        console.error(`💥 [${requestId}] Unexpected error in auth/me`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            processingTime: Date.now() - startTime,
        });
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to verify authentication",
                code: "auth/server-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Update user profile endpoint
router.put("/update-profile", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        if (!req.user?.uid) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                    code: "auth/not-authenticated",
                },
            });
        }
        // Validate request body
        try {
            auth_schema_1.updateProfileSchema.parse(req.body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: "Invalid profile data",
                        code: "auth/invalid-data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        // Update user profile
        const updatedProfile = await auth_service_1.AuthService.updateUserProfile(req.user.uid, req.body);
        return res.json({
            success: true,
            data: updatedProfile,
        });
    }
    catch (error) {
        console.error("Profile update error:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to update profile",
                code: "auth/profile-update-failed",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Google OAuth sign-in endpoint
router.post("/google", rateLimiter_1.authLimiter, async (req, res) => {
    try {
        // Validate request
        try {
            auth_schema_1.googleAuthSchema.parse(req.body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: "Invalid Google auth data",
                        code: "auth/invalid-data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        const { idToken } = req.body;
        // Process Google sign-in
        const authResult = await auth_service_1.AuthService.processGoogleSignIn(idToken);
        // Set the token as HttpOnly cookie
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", authResult.token, {
            httpOnly: true,
            secure: isProduction, // Only send over HTTPS in production
            sameSite: isProduction ? "none" : "lax",
            maxAge: 432000 * 1000, // 5 days in milliseconds
            path: "/",
        });
        // Return user data without the token
        return res.json({
            success: true,
            data: {
                uid: authResult.uid,
                email: authResult.email,
                displayName: authResult.displayName,
                phoneNumber: authResult.phone, // Changed from phone to phoneNumber
                role: authResult.role,
                profileComplete: authResult.profileComplete,
                authProvider: authResult.authProvider,
            },
        });
    }
    catch (error) {
        console.error("Google sign-in error:", error);
        // Provide appropriate error response
        return res.status(401).json({
            success: false,
            error: {
                message: "Google authentication failed",
                code: "auth/google-auth-failed",
                details: error instanceof Error ? error.message : "Authentication failed",
            },
        });
    }
});
// Complete user profile after OAuth sign-in
router.post("/complete-profile", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        if (!req.user?.uid) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                },
            });
        }
        // Validate request
        try {
            auth_schema_1.completeProfileSchema.parse(req.body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: "Invalid profile data",
                        code: "auth/invalid-profile-data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        const { fullName, phoneNumber } = req.body;
        // Complete user profile
        const updatedProfile = await auth_service_1.AuthService.completeUserProfile(req.user.uid, fullName, phoneNumber);
        return res.json({
            success: true,
            data: updatedProfile,
        });
    }
    catch (error) {
        console.error("Profile completion error:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to update profile",
                code: "auth/profile-update-failed",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Google OAuth Initiation
router.get("/google/login", async (req, res) => {
    try {
        const redirectUrl = req.query.redirect_url;
        if (!redirectUrl) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Missing redirect_url parameter",
                },
            });
        }
        // Generate a state token to prevent CSRF
        const state = crypto_1.default.randomBytes(20).toString("hex");
        // Store state in session (in a production app, you'd use Redis or similar)
        // For simplicity, we encode the redirect URL in the state
        const stateWithRedirect = `${state}|${redirectUrl}`;
        // Construct Google OAuth URL
        const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${env_1.env.googleOAuth.clientId || ""}&` +
            `redirect_uri=${encodeURIComponent(env_1.env.googleOAuth.callbackUrl)}&` +
            `response_type=code&` +
            `scope=email%20profile&` +
            `state=${encodeURIComponent(stateWithRedirect)}`;
        // Redirect to Google OAuth page
        res.redirect(googleOAuthUrl);
    }
    catch (error) {
        console.error("OAuth initiation error:", error);
        res.status(500).json({
            success: false,
            error: {
                message: "Failed to initiate OAuth flow",
            },
        });
    }
});
// Google OAuth Callback (from Google)
router.get("/google/callback", async (req, res) => {
    try {
        const { code, state: encodedState } = req.query;
        console.log("🔑 Authorization code:", code ? "Present" : "Missing");
        console.log("🏷️ State parameter:", encodedState ? "Present" : "Missing");
        if (!code || !encodedState) {
            console.error("❌ Missing required parameters (code or state)");
            return res.redirect(`/?error=invalid_request`);
        }
        const state = decodeURIComponent(encodedState);
        console.log("🔓 Decoded state:", state);
        // Extract redirect URL from state
        const [stateToken, redirectUrl] = state.split("|");
        console.log("🎯 Redirect URL:", redirectUrl);
        console.log("🎲 State token:", stateToken);
        // In a production app, validate the state token against stored value
        // Exchange the code for tokens
        // console.log("✅ Step 1: Exchanging authorization code for access token");
        console.log("🔗 Google OAuth client ID:", env_1.env.googleOAuth.clientId ? "Present" : "Missing");
        console.log("🔗 Google OAuth client secret:", env_1.env.googleOAuth.clientSecret ? "Present" : "Missing");
        console.log("🔗 Callback URL:", env_1.env.googleOAuth.callbackUrl);
        const tokenResponse = await (0, node_fetch_1.default)("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code: code,
                client_id: env_1.env.googleOAuth.clientId || "",
                client_secret: env_1.env.googleOAuth.clientSecret || "",
                redirect_uri: env_1.env.googleOAuth.callbackUrl,
                grant_type: "authorization_code",
            }),
        });
        console.log("📡 Token response status:", tokenResponse.status);
        const tokenData = await tokenResponse.json();
        console.log("📡 Token response data:", {
            hasAccessToken: !!tokenData.access_token,
            hasRefreshToken: !!tokenData.refresh_token,
            error: tokenData.error,
            errorDescription: tokenData.error_description
        });
        if (!tokenData.access_token) {
            console.error("❌ Failed to get access token from Google");
            console.error("❌ Token response:", tokenData);
            return res.redirect(`${redirectUrl}?error=token_exchange_failed`);
        }
        // Get user info using the access token
        // console.log("✅ Step 2: Getting user info from Google");
        const userInfoResponse = await (0, node_fetch_1.default)("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });
        console.log("📡 User info response status:", userInfoResponse.status);
        const googleUser = await userInfoResponse.json();
        console.log("👤 Google user data:", {
            email: googleUser.email,
            name: googleUser.name,
            picture: !!googleUser.picture,
            verified_email: googleUser.verified_email
        });
        if (!googleUser.email) {
            console.error("❌ No email received from Google user info");
            return res.redirect(`${redirectUrl}?error=invalid_user_data`);
        }
        // Create or get the user in Firebase
        // console.log("✅ Step 3: Creating or getting Firebase user");
        let firebaseUser;
        try {
            // Check if user exists by email
            console.log("🔍 Checking if user exists in Firebase:", googleUser.email);
            firebaseUser = await firebase_1.auth.getUserByEmail(googleUser.email);
            console.log("👤 Existing Firebase user found:", firebaseUser.uid);
        }
        catch (error) {
            // User doesn't exist, create a new one
            firebaseUser = await firebase_1.auth.createUser({
                email: googleUser.email,
                displayName: googleUser.name,
                photoURL: googleUser.picture,
            });
            console.log(`🆕 OAuth user created: ${googleUser.email} (${firebaseUser.uid})`);
            // Set custom claims for regular user
            console.log("🏷️ Setting custom claims for new user");
            await firebase_1.auth.setCustomUserClaims(firebaseUser.uid, { role: "user" });
        }
        // Create or update user document in Firestore
        // console.log("✅ Step 4: Managing Firestore user document");
        const userDoc = firebase_1.firestore.collection("users").doc(firebaseUser.uid);
        const userSnapshot = await userDoc.get();
        console.log("📄 User document exists:", userSnapshot.exists);
        // Check if profile data needs to be completed (e.g., phone number)
        const profileComplete = userSnapshot.exists && userSnapshot.data()?.phone;
        console.log("✅ Profile complete:", profileComplete);
        if (!userSnapshot.exists) {
            // Create new user document
            console.log("➕ Creating new Firestore user document");
            await userDoc.set({
                email: firebaseUser.email,
                fullName: googleUser.name,
                phone: null,
                role: "user",
                profileComplete: false,
                authProvider: "google",
                createdAt: new Date().toISOString(),
            });
            console.log("📄 User document created successfully");
        }
        // Generate a temporary code for the frontend
        // console.log("✅ Step 5: Generating temporary code for frontend");
        const tempCode = await auth_service_1.AuthService.storeTemporaryCode(firebaseUser.uid, firebaseUser.email || "");
        console.log("🎫 Temporary code generated:", tempCode);
        // Redirect to frontend with temp code
        const finalRedirectUrl = `${redirectUrl}?code=${tempCode}`;
        console.log("🎯 Final redirect URL:", finalRedirectUrl);
        console.log("🎉 OAuth callback successful, redirecting to frontend");
        res.redirect(finalRedirectUrl);
    }
    catch (error) {
        console.error("💥 OAuth callback error - Full details:");
        console.error("Error name:", error instanceof Error ? error.name : "Unknown");
        console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
        console.error("Error object:", error);
        // Extract the redirect URL from state or use default
        const redirectUrl = req.query.state
            ? decodeURIComponent(req.query.state).split("|")[1]
            : "/";
        // Redirect to frontend with error
        console.log("❌ Redirecting to frontend with error");
        res.redirect(`${redirectUrl}?error=auth_failed`);
    }
});
// Frontend Code Exchange Endpoint
router.post("/google/callback", async (req, res) => {
    console.log("🔍 POST /api/auth/google/callback - Starting request processing");
    console.log("📥 Request body:", JSON.stringify(req.body, null, 2));
    try {
        // Validate request
        // console.log("✅ Step 1: Validating request schema");
        try {
            auth_schema_1.googleCallbackSchema.parse(req.body);
            console.log("✅ Schema validation passed");
        }
        catch (error) {
            console.error("❌ Schema validation failed:", error);
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: "Invalid callback data",
                        code: "auth/invalid-data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        const { code } = req.body;
        console.log("🔑 Temporary code received:", code);
        // Validate the temporary code
        // console.log("✅ Step 2: Validating temporary code");
        const userData = await auth_service_1.AuthService.validateTemporaryCode(code);
        console.log("👤 User data from temp code:", userData);
        if (!userData) {
            console.error("❌ Invalid or expired temporary code");
            return res.status(401).json({
                success: false,
                error: {
                    message: "Invalid or expired code",
                },
            });
        }
        // Get user data
        // console.log("✅ Step 3: Getting user record from Firebase");
        const userRecord = await firebase_1.auth.getUser(userData.uid);
        console.log("👤 Firebase user record:", {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName
        });
        // console.log("✅ Step 4: Getting user profile from Firestore");
        const userDoc = await firebase_1.firestore.collection("users").doc(userData.uid).get();
        const userProfile = userDoc.data();
        console.log("📄 User profile data:", userProfile);
        // Create a custom token with extended expiration
        // console.log("✅ Step 5: Creating custom token");
        const customToken = await firebase_1.auth.createCustomToken(userRecord.uid, {
            role: userProfile?.role || "user",
            expiresIn: 432000, // 5 days in seconds
        });
        console.log("🎫 Custom token created successfully (length:", customToken.length, ")");
        // Exchange custom token for ID token
        // console.log("✅ Step 6: Exchanging custom token for ID token");
        console.log("🔗 Firebase API Key available:", !!env_1.env.firebase.apiKey);
        console.log("🔗 API URL:", `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env_1.env.firebase.apiKey?.substring(0, 10)}...`);
        const idTokenResponse = await (0, node_fetch_1.default)(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env_1.env.firebase.apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: customToken,
                returnSecureToken: true,
            }),
        });
        console.log("📡 ID token response status:", idTokenResponse.status);
        const tokenData = await idTokenResponse.json();
        console.log("📡 ID token response data:", {
            hasIdToken: !!tokenData.idToken,
            hasRefreshToken: !!tokenData.refreshToken,
            error: tokenData.error
        });
        if (!tokenData.idToken) {
            console.error("❌ Failed to get ID token from Firebase");
            console.error("❌ Token response:", tokenData);
            return res.status(500).json({
                success: false,
                error: {
                    message: "Failed to generate authentication token",
                    details: tokenData.error?.message || "No ID token received"
                },
            });
        }
        // Set cookie with the ID token
        // console.log("✅ Step 7: Setting authentication cookie");
        const isProduction = process.env.NODE_ENV === "production";
        const requestOrigin = req.get('Origin');
        const isCrossOrigin = requestOrigin && !requestOrigin.includes('localhost:5555');
        const cookieOptions = {
            httpOnly: true,
            secure: Boolean(isProduction || isCrossOrigin), // Use HTTPS for production or cross-origin
            sameSite: (isProduction || isCrossOrigin) ? "none" : "lax", // Force none for cross-origin
            maxAge: 432000 * 1000, // 5 days in milliseconds
            path: "/", // Ensure cookie is available for all paths
        };
        console.log("🍪 Google OAuth - Cookie options:", cookieOptions);
        console.log("🌍 Environment:", process.env.NODE_ENV);
        console.log("🔗 Request origin:", req.get('origin'));
        console.log("🔗 Request host:", req.get('host'));
        console.log("🔗 Request referer:", req.get('referer'));
        console.log("🔗 Is cross-origin:", isCrossOrigin);
        res.cookie("token", tokenData.idToken, cookieOptions);
        // console.log("✅ Step 8: Preparing response data");
        const responseData = {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userProfile?.fullName || userRecord.displayName,
            phoneNumber: userProfile?.phone || null, // Changed from phone to phoneNumber
            role: userProfile?.role || "user",
            profileComplete: !!userProfile?.profileComplete,
            authProvider: userProfile?.authProvider || "google",
        };
        console.log("📤 Response data:", responseData);
        // Return user data
        console.log(`🎉 Auth: ${userProfile?.fullName || userRecord.displayName || 'Unknown'} (${userRecord.email})`);
        return res.json({
            success: true,
            data: responseData,
        });
    }
    catch (error) {
        console.error("💥 Code exchange error - Full details:");
        console.error("Error name:", error instanceof Error ? error.name : "Unknown");
        console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
        console.error("Error object:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Authentication failed",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Email verification request
router.post("/verify-email", rateLimiter_1.authLimiter, async (req, res) => {
    try {
        // Validate request body
        try {
            auth_schema_1.verifyEmailSchema.parse(req.body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: "Invalid email verification data",
                        code: "auth/invalid-data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        const { email, fullName } = req.body;
        // Check if the email is already registered
        try {
            await firebase_1.auth.getUserByEmail(email);
            // If no error, the email already exists
            return res.status(400).json({
                success: false,
                error: {
                    message: "Email is already registered",
                    code: "auth/email-already-in-use",
                },
            });
        }
        catch (error) {
            // If error code is auth/user-not-found, the email is not registered
            // which is what we want
            if (error.code !== "auth/user-not-found") {
                throw error;
            }
        }
        // Send verification email
        const success = await auth_service_1.AuthService.sendVerificationEmail(email, fullName);
        if (!success) {
            return res.status(500).json({
                success: false,
                error: {
                    message: "Failed to send verification email",
                    code: "auth/email-send-failed",
                },
            });
        }
        // Return success response
        return res.status(200).json({
            success: true,
            data: {
                message: "Verification email sent successfully",
                email,
            },
        });
    }
    catch (error) {
        console.error("Email verification error:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to process email verification",
                code: "auth/server-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Verify email token
router.get("/verify-token", async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== "string") {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Token is required",
                    code: "auth/missing-token",
                },
            });
        }
        // Validate the token
        const verificationData = await auth_service_1.AuthService.validateEmailVerificationToken(token);
        if (!verificationData) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Invalid or expired token",
                    code: "auth/invalid-token",
                },
            });
        }
        // Return the verification data
        return res.status(200).json({
            success: true,
            data: {
                email: verificationData.email,
                fullName: verificationData.fullName,
            },
        });
    }
    catch (error) {
        console.error("Token verification error:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to verify token",
                code: "auth/server-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Forgot password endpoint - sends password reset link
router.post("/forgot-password", rateLimiter_1.authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        // Basic validation
        if (!email || typeof email !== "string") {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Email is required",
                    code: "auth/missing-email",
                },
            });
        }
        // Check if the email is registered
        try {
            await firebase_1.auth.getUserByEmail(email);
        }
        catch (error) {
            // Don't reveal if email exists or not for security
            // Just return success regardless
            return res.status(200).json({
                success: true,
                data: {
                    message: "If the email exists, a password reset link has been sent",
                },
            });
        }
        // Generate a password reset token that expires in 1 hour
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        // Store the token in Firestore with expiration
        await firebase_1.firestore
            .collection("passwordResetTokens")
            .doc(resetToken)
            .set({
            email,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        });
        // Create the reset URL with the token
        const resetUrl = `${env_1.env.email.frontendUrl}/reset-password?token=${resetToken}`;
        // Send the password reset email
        const success = await email_service_1.EmailService.sendForgotPasswordEmail(email, resetUrl);
        if (!success) {
            // If email fails to send, delete the token
            await firebase_1.firestore
                .collection("passwordResetTokens")
                .doc(resetToken)
                .delete();
            return res.status(500).json({
                success: false,
                error: {
                    message: "Failed to send password reset email",
                    code: "auth/email-send-failed",
                },
            });
        }
        // Return success regardless of outcome for security
        return res.status(200).json({
            success: true,
            data: {
                message: "If the email exists, a password reset link has been sent",
            },
        });
    }
    catch (error) {
        console.error("Password reset error:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to process password reset request",
                code: "auth/server-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Reset password endpoint - verifies token and sets new password
router.post("/reset-password", rateLimiter_1.authLimiter, async (req, res) => {
    try {
        const { token, password } = req.body;
        // Basic validation
        if (!token || typeof token !== "string") {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Reset token is required",
                    code: "auth/missing-token",
                },
            });
        }
        if (!password || typeof password !== "string" || password.length < 6) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Password must be at least 6 characters",
                    code: "auth/invalid-password",
                },
            });
        }
        // Get token document from Firestore
        const tokenDoc = await firebase_1.firestore
            .collection("passwordResetTokens")
            .doc(token)
            .get();
        if (!tokenDoc.exists) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Invalid or expired token",
                    code: "auth/invalid-token",
                },
            });
        }
        const tokenData = tokenDoc.data();
        if (!tokenData) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Invalid token data",
                    code: "auth/invalid-token-data",
                },
            });
        }
        // Check if token has expired
        const expiresAt = new Date(tokenData.expiresAt);
        if (expiresAt < new Date()) {
            // Token expired, delete it
            await firebase_1.firestore.collection("passwordResetTokens").doc(token).delete();
            return res.status(400).json({
                success: false,
                error: {
                    message: "Password reset token has expired",
                    code: "auth/token-expired",
                },
            });
        }
        // Get the user by email
        try {
            const userRecord = await firebase_1.auth.getUserByEmail(tokenData.email);
            // Update the user's password
            await firebase_1.auth.updateUser(userRecord.uid, {
                password,
            });
            // Get user profile for name
            const userDoc = await firebase_1.firestore
                .collection("users")
                .doc(userRecord.uid)
                .get();
            const userData = userDoc.data();
            const name = userData?.fullName || userRecord.displayName || "User";
            // Delete the token as it's now been used
            await firebase_1.firestore.collection("passwordResetTokens").doc(token).delete();
            // Send password reset confirmation email (non-blocking)
            email_service_1.EmailService.sendPasswordResetConfirmationEmail(tokenData.email, name).catch((error) => {
                console.error("Failed to send password reset confirmation email:", error);
            });
            return res.status(200).json({
                success: true,
                data: {
                    message: "Password has been reset successfully",
                },
            });
        }
        catch (error) {
            console.error("Error resetting password:", error);
            return res.status(400).json({
                success: false,
                error: {
                    message: "Failed to reset password",
                    code: "auth/reset-failed",
                    details: error instanceof Error ? error.message : "Unknown error",
                },
            });
        }
    }
    catch (error) {
        console.error("Password reset error:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to process password reset",
                code: "auth/server-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
exports.default = router;
