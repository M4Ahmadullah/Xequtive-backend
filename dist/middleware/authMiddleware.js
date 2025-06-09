"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.verifyToken = void 0;
const firebase_1 = require("../config/firebase");
const verifyToken = async (req, res, next) => {
    try {
        // Log all incoming request details
        console.log('Authentication Middleware - Request Details:', {
            path: req.path,
            method: req.method,
            headers: {
                authorization: req.headers.authorization ? 'Present' : 'Not Present',
                cookie: req.headers.cookie ? 'Present' : 'Not Present'
            },
            cookies: Object.keys(req.cookies || {})
        });
        // Check for token in cookies
        const tokenFromCookie = req.cookies?.token;
        // For backward compatibility only (will be removed in future)
        const authHeader = req.headers.authorization;
        let token;
        if (tokenFromCookie) {
            token = tokenFromCookie;
            console.log('Token source: Cookie');
        }
        else if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
            console.log('Token source: Authorization Header');
        }
        if (!token) {
            console.warn('No token found in request');
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
            console.log('Attempting to verify token');
            const decodedToken = await firebase_1.auth.verifyIdToken(token);
            const userRecord = await firebase_1.auth.getUser(decodedToken.uid);
            console.log('Token verified successfully', {
                uid: userRecord.uid,
                email: userRecord.email
            });
            req.user = {
                uid: userRecord.uid,
                email: userRecord.email || "",
                role: "user",
            };
            next();
        }
        catch (error) {
            console.error('Token verification failed:', error);
            return res.status(401).json({
                success: false,
                error: {
                    message: "Invalid or expired session",
                    code: "auth/invalid-session",
                    details: error instanceof Error ? error.message : "Unknown error",
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
