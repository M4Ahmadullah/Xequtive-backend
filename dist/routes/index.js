"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const booking_routes_1 = __importDefault(require("./booking.routes"));
const fare_routes_1 = __importDefault(require("./fare.routes"));
const router = (0, express_1.Router)();
// Health check route
router.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Auth routes
router.use("/auth", auth_routes_1.default);
// Booking and fare routes
router.use("/bookings", booking_routes_1.default);
router.use("/fare-estimate", fare_routes_1.default);
// Future route modules will be added here
// router.use('/fare', fareRoutes);
exports.default = router;
