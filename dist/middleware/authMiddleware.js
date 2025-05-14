"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.verifyToken = void 0;
const firebase_1 = require("../config/firebase");
const verifyToken = async (req, res, next) => {
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
            const decodedToken = await firebase_1.auth.verifyIdToken(token);
            const userRecord = await firebase_1.auth.getUser(decodedToken.uid);
            // Check if user has admin role in custom claims
            const isUserAdmin = userRecord.customClaims?.admin === true;
            req.user = {
                uid: userRecord.uid,
                email: userRecord.email || "",
                role: isUserAdmin ? "admin" : "user",
            };
            next();
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Invalid or expired token",
                    details: error instanceof Error ? error.message : "Unknown error",
                },
            });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.verifyToken = verifyToken;
const isAdmin = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.isAdmin = isAdmin;
