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
            // Verify the Firebase ID token or custom token
            console.log('Attempting to verify token');
            let decodedToken;
            let userRecord;
            // Check if this is a custom token (starts with 'eyJ' and has 3 parts separated by '.')
            const isCustomToken = token.startsWith('eyJ') && token.split('.').length === 3;
            console.log('Token analysis:', {
                isCustomToken,
                tokenLength: token.length,
                tokenParts: token.split('.').length,
                tokenStart: token.substring(0, 10)
            });
            if (isCustomToken) {
                try {
                    // Parse custom token to get UID
                    const tokenParts = token.split('.');
                    const payload = tokenParts[1];
                    console.log('Token payload part:', payload.substring(0, 50) + '...');
                    const customTokenPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
                    console.log('Custom token payload:', customTokenPayload);
                    if (customTokenPayload.uid) {
                        userRecord = await firebase_1.auth.getUser(customTokenPayload.uid);
                        decodedToken = { uid: customTokenPayload.uid };
                        console.log('Custom token verified successfully');
                    }
                    else {
                        throw new Error('No UID found in custom token');
                    }
                }
                catch (customTokenError) {
                    console.error('Custom token verification failed:', customTokenError);
                    throw customTokenError;
                }
            }
            else {
                try {
                    // Try to verify as an ID token
                    decodedToken = await firebase_1.auth.verifyIdToken(token);
                    userRecord = await firebase_1.auth.getUser(decodedToken.uid);
                    console.log('ID token verified successfully');
                }
                catch (idTokenError) {
                    console.error('ID token verification failed:', idTokenError);
                    throw idTokenError;
                }
            }
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
