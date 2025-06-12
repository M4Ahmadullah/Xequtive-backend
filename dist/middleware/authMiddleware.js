"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.verifyToken = void 0;
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
        // Get user from Firebase Auth
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
    catch (error) {
        next(error);
    }
};
exports.isAdmin = isAdmin;
