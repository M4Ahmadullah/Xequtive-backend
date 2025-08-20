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
const hourlyBooking_routes_1 = __importDefault(require("./hourlyBooking.routes"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const email_service_1 = require("../services/email.service");
const env_1 = require("../config/env");
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
// Email configuration check
router.get("/email-config", (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            senderAddress: process.env.EMAIL_SENDER_ADDRESS || "Not set in env",
            configuredSender: email_service_1.EmailService.getSenderAddress(),
            frontendUrl: env_1.env.email.frontendUrl,
            logoUrl: env_1.env.email.logoUrl,
        },
    });
});
// Hourly booking system health check
router.get("/hourly-booking-health", (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            message: "Hourly booking system is operational",
            endpoints: {
                fareEstimate: "/api/hourly-bookings/fare-estimate",
                createBooking: "/api/hourly-bookings/create",
                getUserBookings: "/api/hourly-bookings/user",
                cancelBooking: "/api/hourly-bookings/:id/cancel",
            },
            features: [
                "Hourly fare calculation (3-12 hours)",
                "Multiple vehicle types support",
                "Time-based surcharges",
                "Equipment fees for extra passengers/luggage",
                "Group/Organisation booking support",
                "Multiple vehicles booking",
            ],
            timestamp: new Date().toISOString(),
        },
    });
});
// Test email endpoint - development only
if (env_1.env.server.isDev) {
    router.post("/test-email", async (req, res) => {
        try {
            const { to, name, type } = req.body;
            if (!to || !name) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: "Missing required fields: to, name",
                    },
                });
            }
            let success = false;
            switch (type) {
                case "welcome":
                    success = await email_service_1.EmailService.sendWelcomeEmail(to, name);
                    break;
                case "booking":
                    success = await email_service_1.EmailService.sendBookingConfirmationEmail(to, {
                        id: "TEST-123456",
                        referenceNumber: "TEST-XEQ-001",
                        fullName: name,
                        pickupDate: "2023-06-01",
                        pickupTime: "14:30",
                        pickupLocation: "123 Main St, London",
                        dropoffLocation: "Heathrow Airport, London",
                        vehicleType: "Executive Saloon",
                        price: 85.5,
                    });
                    break;
                case "cancel":
                    success = await email_service_1.EmailService.sendBookingCancellationEmail(to, {
                        id: "TEST-123456",
                        fullName: name,
                        pickupDate: "2023-06-01",
                        pickupTime: "14:30",
                        cancellationReason: "Test cancellation",
                    });
                    break;
                case "reminder":
                    success = await email_service_1.EmailService.sendBookingReminderEmail(to, {
                        id: "TEST-123456",
                        fullName: name,
                        pickupDate: "2023-06-01",
                        pickupTime: "14:30",
                        pickupLocation: "123 Main St, London",
                        dropoffLocation: "Heathrow Airport, London",
                        vehicleType: "Executive Saloon",
                    });
                    break;
                case "profile":
                    success = await email_service_1.EmailService.sendProfileCompletionEmail(to, name);
                    break;
                case "verify":
                    success = await email_service_1.EmailService.sendVerificationEmail(to, name, `${env_1.env.email.frontendUrl}/verify?token=TEST123456789`);
                    break;
                case "password-reset":
                    success = await email_service_1.EmailService.sendForgotPasswordEmail(to, `${env_1.env.email.frontendUrl}/reset-password?token=TEST123456789`);
                    break;
                case "password-reset-confirm":
                    success = await email_service_1.EmailService.sendPasswordResetConfirmationEmail(to, name);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: {
                            message: "Invalid email type. Use: welcome, booking, cancel, reminder, profile, verify, password-reset, or password-reset-confirm",
                        },
                    });
            }
            if (!success) {
                return res.status(500).json({
                    success: false,
                    error: {
                        message: "Failed to send email",
                    },
                });
            }
            return res.status(200).json({
                success: true,
                data: {
                    message: `Test ${type} email sent to ${to}`,
                },
            });
        }
        catch (error) {
            console.error("Error sending test email:", error);
            return res.status(500).json({
                success: false,
                error: {
                    message: "Failed to send test email",
                    details: error instanceof Error ? error.message : "Unknown error",
                },
            });
        }
    });
}
// Auth routes
router.use("/auth", auth_routes_1.default);
// Booking and fare routes
router.use("/bookings", booking_routes_1.default);
router.use("/fare-estimate", fare_routes_1.default);
// Hourly booking routes
router.use("/hourly-bookings", hourlyBooking_routes_1.default);
// Dashboard routes (admin only)
router.use("/dashboard", dashboard_routes_1.default);
exports.default = router;
