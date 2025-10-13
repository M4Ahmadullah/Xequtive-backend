"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emailVerification_schema_1 = require("../validation/emailVerification.schema");
const otp_service_1 = require("../services/otp.service");
const email_service_1 = require("../services/email.service");
const logger_1 = __importDefault(require("../utils/logger"));
const firebase_1 = require("../config/firebase");
const router = (0, express_1.Router)();
/**
 * Request email verification code
 * Used during account creation
 */
router.post('/request', async (req, res) => {
    try {
        // Validate request body
        const validationResult = emailVerification_schema_1.requestEmailVerificationSchema.safeParse(req.body);
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
        // Check if email already exists in Firebase Auth
        try {
            await firebase_1.auth.getUserByEmail(email);
            // If we get here, the user already exists
            return res.status(400).json({
                success: false,
                error: {
                    message: 'An account with this email already exists. Please use the login page instead.'
                }
            });
        }
        catch (error) {
            // If error is 'auth/user-not-found', that's good - email doesn't exist
            if (error.code !== 'auth/user-not-found') {
                logger_1.default.error('Error checking if email exists:', error);
                return res.status(500).json({
                    success: false,
                    error: {
                        message: 'Internal server error. Please try again.'
                    }
                });
            }
            // Email doesn't exist, continue with OTP generation
        }
        // Generate and store OTP
        const otp = await otp_service_1.OTPService.createEmailVerificationOTP(email);
        // Send OTP email
        const emailSent = await email_service_1.EmailService.sendEmailVerificationOTPEmail(email, otp);
        if (!emailSent) {
            logger_1.default.error(`Failed to send email verification OTP email to: ${email}`);
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to send verification email. Please try again.'
                }
            });
        }
        logger_1.default.info(`Email verification OTP sent to: ${email}`);
        res.status(200).json({
            success: true,
            message: 'Email verification code sent to your email address'
        });
    }
    catch (error) {
        logger_1.default.error('Error in email verification request:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error. Please try again.'
            }
        });
    }
});
/**
 * Verify email verification code
 * Used to complete account registration
 */
router.post('/verify', async (req, res) => {
    try {
        // Validate request body
        const validationResult = emailVerification_schema_1.verifyEmailVerificationSchema.safeParse(req.body);
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
        const isValid = await otp_service_1.OTPService.verifyEmailVerificationOTP(email, otp);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid or expired verification code. Please request a new one.'
                }
            });
        }
        logger_1.default.info(`Email verification successful for: ${email}`);
        res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now complete your account registration.'
        });
    }
    catch (error) {
        logger_1.default.error('Error in email verification:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error. Please try again.'
            }
        });
    }
});
/**
 * Resend email verification code
 * Used when user needs a new verification code
 */
router.post('/resend', async (req, res) => {
    try {
        // Validate request body
        const validationResult = emailVerification_schema_1.resendEmailVerificationSchema.safeParse(req.body);
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
        // Generate and store new OTP
        const otp = await otp_service_1.OTPService.createEmailVerificationOTP(email);
        // Send OTP email
        const emailSent = await email_service_1.EmailService.sendEmailVerificationOTPEmail(email, otp);
        if (!emailSent) {
            logger_1.default.error(`Failed to resend email verification OTP email to: ${email}`);
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to send verification email. Please try again.'
                }
            });
        }
        logger_1.default.info(`Email verification OTP resent to: ${email}`);
        res.status(200).json({
            success: true,
            message: 'New email verification code sent to your email address'
        });
    }
    catch (error) {
        logger_1.default.error('Error in resending email verification:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error. Please try again.'
            }
        });
    }
});
/**
 * Check if email verification is still valid
 */
router.post('/check-status', async (req, res) => {
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
        const isVerified = await otp_service_1.OTPService.isEmailVerificationOTPVerified(email);
        res.status(200).json({
            success: true,
            data: {
                isVerified,
                message: isVerified ? 'Email verification is valid' : 'Email verification has expired or is invalid'
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error checking email verification status:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error. Please try again.'
            }
        });
    }
});
exports.default = router;
