"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.verifyDashboardToken = exports.verifyToken = void 0;
const firebase_1 = require("../config/firebase");
const verifyToken = async (req, res, next) => {
    try {
        // Only log auth failures for debugging
        // console.log(`🔐 Auth check: ${req.method} ${req.path}`);
        // Check for token in cookies
        const tokenFromCookie = req.cookies?.token;
        // For backward compatibility only (will be removed in future)
        const authHeader = req.headers.authorization;
        let token;
        if (tokenFromCookie) {
            token = tokenFromCookie;
        }
        else if (authHeader?.startsWith("Bearer ")) {
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
            const decodedToken = await firebase_1.auth.verifyIdToken(token);
            const userRecord = await firebase_1.auth.getUser(decodedToken.uid);
            req.user = {
                uid: userRecord.uid,
                email: userRecord.email || "",
                role: "user",
            };
            next();
        }
        catch (error) {
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
    }
    catch (error) {
        console.error('Unexpected error in authentication middleware:', error);
        next(error);
    }
};
exports.verifyToken = verifyToken;
// Dashboard authentication middleware - supports both Firebase and hardcoded tokens
const verifyDashboardToken = async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication token required",
                    code: "auth/token-required",
                },
            });
        }
        // Check if it's a hardcoded session token (base64 encoded with email:timestamp format)
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            // Check if decoded string contains email format (contains @ and :)
            if (decoded.includes('@') && decoded.includes(':')) {
                const [email, timestamp] = decoded.split(':');
                // Check if it's one of the authorized admin emails
                const authorizedEmails = ["xequtivecars@gmail.com", "ahmadullahm4masoudy@gmail.com"];
                if (authorizedEmails.includes(email)) {
                    // Create admin user object
                    req.user = {
                        uid: `admin-${timestamp}`,
                        email: email,
                        role: "admin",
                    };
                    return next();
                }
            }
        }
        catch (error) {
            // Not a valid base64 token, continue to Firebase verification
        }
        // Fallback to Firebase token verification
        try {
            const decodedToken = await firebase_1.auth.verifyIdToken(token);
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email || "",
                role: decodedToken.role || "user",
            };
            next();
        }
        catch (firebaseError) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Invalid or expired token",
                    code: "auth/invalid-token",
                },
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: {
                message: "Authentication error",
                code: "auth/error",
            },
        });
    }
};
exports.verifyDashboardToken = verifyDashboardToken;
// This is only for the dashboard routes
const isAdmin = async (req, res, next) => {
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
        // Check if it's a hardcoded admin token (starts with "admin-")
        if (req.user.uid.startsWith("admin-") && req.user.role === "admin") {
            return next(); // Allow access for hardcoded admin tokens
        }
        // For Firebase users, verify admin status
        try {
            const userRecord = await firebase_1.auth.getUser(req.user.uid);
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
        }
        catch (firebaseError) {
            // If Firebase verification fails, check if it's a hardcoded admin
            if (req.user.role === "admin") {
                return next(); // Allow access for hardcoded admin tokens
            }
            return res.status(403).json({
                success: false,
                error: {
                    message: "Access denied. Admin privileges required.",
                    code: "auth/insufficient-permissions",
                },
            });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.isAdmin = isAdmin;
