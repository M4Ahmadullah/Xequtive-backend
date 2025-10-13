"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.verifyPasswordResetOTPSchema = exports.requestPasswordResetSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for requesting password reset (step 1)
 */
exports.requestPasswordResetSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Please provide a valid email address')
        .min(1, 'Email is required')
        .max(255, 'Email is too long')
});
/**
 * Schema for verifying OTP (step 2)
 */
exports.verifyPasswordResetOTPSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Please provide a valid email address')
        .min(1, 'Email is required'),
    otp: zod_1.z
        .string()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must contain only numbers')
});
/**
 * Schema for resetting password (step 3)
 */
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Please provide a valid email address')
        .min(1, 'Email is required'),
    otp: zod_1.z
        .string()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must contain only numbers'),
    newPassword: zod_1.z
        .string()
        .min(6, 'Password must be at least 6 characters long')
        .max(128, 'Password is too long'),
    confirmPassword: zod_1.z
        .string()
        .min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});
