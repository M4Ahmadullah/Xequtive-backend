import { Router, Request, Response } from 'express';
import { 
  requestEmailVerificationSchema, 
  verifyEmailVerificationSchema,
  resendEmailVerificationSchema,
  RequestEmailVerificationRequest,
  VerifyEmailVerificationRequest,
  ResendEmailVerificationRequest
} from '../validation/emailVerification.schema';
import { OTPService } from '../services/otp.service';
import { EmailService } from '../services/email.service';
import { ApiResponse } from '../types';
import logger from '../utils/logger';
import { auth } from '../config/firebase';

const router = Router();

/**
 * Request email verification code
 * Used during account creation
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = requestEmailVerificationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: JSON.stringify(validationResult.error.errors)
        }
      } as ApiResponse<null>);
    }

    const { email } = validationResult.data as RequestEmailVerificationRequest;

    // Check if email already exists in Firebase Auth
    try {
      await auth.getUserByEmail(email);
      // If we get here, the user already exists
      return res.status(400).json({
        success: false,
        error: {
          message: 'An account with this email already exists. Please use the login page instead.'
        }
      } as ApiResponse<null>);
    } catch (error: any) {
      // If error is 'auth/user-not-found', that's good - email doesn't exist
      if (error.code !== 'auth/user-not-found') {
        logger.error('Error checking if email exists:', error);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Internal server error. Please try again.'
          }
        } as ApiResponse<null>);
      }
      // Email doesn't exist, continue with OTP generation
    }

    // Generate and store OTP
    const otp = await OTPService.createEmailVerificationOTP(email);

    // Send OTP email
    const emailSent = await EmailService.sendEmailVerificationOTPEmail(email, otp);

    if (!emailSent) {
      logger.error(`Failed to send email verification OTP email to: ${email}`);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send verification email. Please try again.'
        }
      } as ApiResponse<null>);
    }

    logger.info(`Email verification OTP sent to: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Email verification code sent to your email address'
    } as ApiResponse<{ message: string }>);

  } catch (error: any) {
    logger.error('Error in email verification request:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error. Please try again.'
      }
    } as ApiResponse<null>);
  }
});

/**
 * Verify email verification code
 * Used to complete account registration
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = verifyEmailVerificationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: JSON.stringify(validationResult.error.errors)
        }
      } as ApiResponse<null>);
    }

    const { email, otp } = validationResult.data as VerifyEmailVerificationRequest;

    // Verify OTP
    const isValid = await OTPService.verifyEmailVerificationOTP(email, otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired verification code. Please request a new one.'
        }
      } as ApiResponse<null>);
    }

    logger.info(`Email verification successful for: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now complete your account registration.'
    } as ApiResponse<{ message: string }>);

  } catch (error) {
    logger.error('Error in email verification:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error. Please try again.'
      }
    } as ApiResponse<null>);
  }
});

/**
 * Resend email verification code
 * Used when user needs a new verification code
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = resendEmailVerificationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: JSON.stringify(validationResult.error.errors)
        }
      } as ApiResponse<null>);
    }

    const { email } = validationResult.data as ResendEmailVerificationRequest;

    // Generate and store new OTP
    const otp = await OTPService.createEmailVerificationOTP(email);

    // Send OTP email
    const emailSent = await EmailService.sendEmailVerificationOTPEmail(email, otp);

    if (!emailSent) {
      logger.error(`Failed to resend email verification OTP email to: ${email}`);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send verification email. Please try again.'
        }
      } as ApiResponse<null>);
    }

    logger.info(`Email verification OTP resent to: ${email}`);

    res.status(200).json({
      success: true,
      message: 'New email verification code sent to your email address'
    } as ApiResponse<{ message: string }>);

  } catch (error: any) {
    logger.error('Error in resending email verification:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error. Please try again.'
      }
    } as ApiResponse<null>);
  }
});

/**
 * Check if email verification is still valid
 */
router.post('/check-status', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email is required'
        }
      } as ApiResponse<null>);
    }

    const isVerified = await OTPService.isEmailVerificationOTPVerified(email);

    res.status(200).json({
      success: true,
      data: {
        isVerified,
        message: isVerified ? 'Email verification is valid' : 'Email verification has expired or is invalid'
      }
    } as ApiResponse<{ isVerified: boolean; message: string }>);

  } catch (error) {
    logger.error('Error checking email verification status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error. Please try again.'
      }
    } as ApiResponse<null>);
  }
});

export default router;
