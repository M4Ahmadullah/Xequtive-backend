"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.verifyToken = void 0;
const auth_service_1 = require("../services/auth.service");
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
            const userData = await auth_service_1.AuthService.verifyToken(token);
            req.user = userData;
            next();
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Invalid or expired token",
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
        const isUserAdmin = await auth_service_1.AuthService.isAdmin(req.user.uid);
        if (!isUserAdmin) {
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
