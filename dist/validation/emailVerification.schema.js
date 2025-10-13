"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendEmailVerificationSchema = exports.verifyEmailVerificationSchema = exports.requestEmailVerificationSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for requesting email verification code
 */
exports.requestEmailVerificationSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Please provide a valid email address')
        .min(1, 'Email is required')
        .max(255, 'Email is too long')
});
/**
 * Schema for verifying email verification code
 */
exports.verifyEmailVerificationSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Please provide a valid email address')
        .min(1, 'Email is required'),
    otp: zod_1.z
        .string()
        .length(6, 'Verification code must be exactly 6 digits')
        .regex(/^\d{6}$/, 'Verification code must contain only numbers')
});
/**
 * Schema for resending email verification code
 */
exports.resendEmailVerificationSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Please provide a valid email address')
        .min(1, 'Email is required')
        .max(255, 'Email is too long')
});
