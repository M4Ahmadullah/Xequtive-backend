"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Basic rate limiter for API endpoints
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        error: {
            message: "Too many requests, please try again later.",
            code: "RATE_LIMIT_EXCEEDED",
            details: "You have exceeded the rate limit for API requests.",
        },
    },
});
// More strict limiter for auth endpoints to prevent brute force
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // limit each IP to 30 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            message: "Too many authentication attempts, please try again later.",
            code: "AUTH_RATE_LIMIT_EXCEEDED",
            details: "You have exceeded the rate limit for authentication requests.",
        },
    },
});
// Specific limiter for booking creation to prevent abuse
exports.bookingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 booking creations per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            message: "Too many booking requests, please try again later.",
            code: "BOOKING_RATE_LIMIT_EXCEEDED",
            details: "You have exceeded the rate limit for booking creation.",
        },
    },
});
