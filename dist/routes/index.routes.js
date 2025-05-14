"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const booking_routes_1 = __importDefault(require("./booking.routes"));
const fare_routes_1 = __importDefault(require("./fare.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Basic health check - public
router.get("/ping", (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            message: "Server is up",
            timestamp: new Date().toISOString(),
        },
    });
});
// Detailed health check - protected
router.get("/health", authMiddleware_1.verifyToken, (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
            user: req.user?.email || "unknown",
        },
    });
});
// Auth routes
router.use("/auth", auth_routes_1.default);
// Booking and fare routes
router.use("/bookings", booking_routes_1.default);
router.use("/fare-estimate", fare_routes_1.default);
// Dashboard routes (admin only)
router.use("/dashboard", dashboard_routes_1.default);
exports.default = router;
