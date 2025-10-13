"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passwordReset_schema_1 = require("../validation/passwordReset.schema");
const otp_service_1 = require("../services/otp.service");
const email_service_1 = require("../services/email.service");
const firebase_1 = require("../config/firebase");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * Step 1: Request password reset
 * User enters email, system sends OTP
 */
router.post('/request', async (req, res) => {
    try {
        // Validate request body
        const validationResult = passwordReset_schema_1.requestPasswordResetSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Validation failed',
                    details: JSON.stringify(validationResult.error.errors)
                }
            });
        }
        const { email } = validationResult.data;
        // Check if user exists
        try {
            await firebase_1.auth.getUserByEmail(email);
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                // For security, don't reveal if email exists or not
                logger_1.default.info(`Password reset requested for non-existent email: ${email}`);
                return res.status(200).json({
                    success: true,
                    message: 'If an account with this email exists, you will receive a password reset OTP'
                });
            }
            throw error;
        }
        // Generate and store OTP
        const otp = await otp_service_1.OTPService.createPasswordResetOTP(email);
        // Send OTP email
        const emailSent = await email_service_1.EmailService.sendPasswordResetOTPEmail(email, otp);
        if (!emailSent) {
            logger_1.default.error(`Failed to send password reset OTP email to: ${email}`);
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to send OTP email. Please try again.'
                }
            });
        }
        logger_1.default.info(`Password reset OTP sent to: ${email}`);
        res.status(200).json({
            success: true,
            message: 'Password reset OTP sent to your email address'
        });
    }
    catch (error) {
        logger_1.default.error('Error in password reset request:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error. Please try again.'
            }
        });
    }
});
/**
 * Step 2: Verify OTP
 * User enters OTP, system validates it
 */
router.post('/verify-otp', async (req, res) => {
    try {
        // Validate request body
        const validationResult = passwordReset_schema_1.verifyPasswordResetOTPSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Validation failed',
                    details: JSON.stringify(validationResult.error.errors)
                }
            });
        }
        const { email, otp } = validationResult.data;
        // Verify OTP
        const isValid = await otp_service_1.OTPService.verifyPasswordResetOTP(email, otp);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid or expired OTP. Please request a new one.'
                }
            });
        }
        logger_1.default.info(`OTP verified successfully for: ${email}`);
        res.status(200).json({
            success: true,
            message: 'OTP verified successfully. You can now reset your password.'
        });
    }
    catch (error) {
        logger_1.default.error('Error in OTP verification:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error. Please try again.'
            }
        });
    }
});
/**
 * Step 3: Reset password
 * User enters new password, system updates it
 */
router.post('/reset', async (req, res) => {
    try {
        // Validate request body
        const validationResult = passwordReset_schema_1.resetPasswordSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Validation failed',
                    details: JSON.stringify(validationResult.error.errors)
                }
            });
        }
        const { email, otp, newPassword } = validationResult.data;
        // Check if OTP is verified (from previous step)
        const isOTPVerified = await otp_service_1.OTPService.isOTPVerified(email);
        if (!isOTPVerified) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'OTP not verified or has expired. Please complete the verification step first.'
                }
            });
        }
        // Get user by email
        let user;
        try {
            user = await firebase_1.auth.getUserByEmail(email);
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'User not found'
                    }
                });
            }
            throw error;
        }
        // Update password
        await firebase_1.auth.updateUser(user.uid, {
            password: newPassword
        });
        // Invalidate OTP
        await otp_service_1.OTPService.invalidateOTP(email);
        // Send confirmation email
        await email_service_1.EmailService.sendPasswordResetConfirmationEmail(email, user.displayName || 'User');
        logger_1.default.info(`Password reset successfully for: ${email}`);
        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });
    }
    catch (error) {
        logger_1.default.error('Error in password reset:', error);
        if (error.code === 'auth/weak-password') {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Password is too weak. Please choose a stronger password.'
                }
            });
        }
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error. Please try again.'
            }
        });
    }
});
/**
 * Check if OTP is still valid (for frontend validation)
 */
router.post('/check-otp-status', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Email is required'
                }
            });
        }
        const isVerified = await otp_service_1.OTPService.isOTPVerified(email);
        res.status(200).json({
            success: true,
            data: {
                isVerified,
                message: isVerified ? 'OTP is valid' : 'OTP has expired or is invalid'
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error checking OTP status:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error. Please try again.'
            }
        });
    }
});
exports.default = router;
