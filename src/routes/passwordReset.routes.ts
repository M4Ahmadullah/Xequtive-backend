import { Router, Request, Response } from 'express';
import { 
  requestPasswordResetSchema, 
  verifyPasswordResetOTPSchema, 
  resetPasswordSchema,
  RequestPasswordResetRequest,
  VerifyPasswordResetOTPRequest,
  ResetPasswordRequest
} from '../validation/passwordReset.schema';
import { OTPService } from '../services/otp.service';
import { EmailService } from '../services/email.service';
import { auth } from '../config/firebase';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

const router = Router();

/**
 * Step 1: Request password reset
 * User enters email, system sends OTP
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = requestPasswordResetSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: JSON.stringify(validationResult.error.errors)
        }
      } as ApiResponse<null>);
    }

    const { email } = validationResult.data as RequestPasswordResetRequest;

    // Check if user exists
    try {
      await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // For security, don't reveal if email exists or not
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return res.status(200).json({
          success: true,
          message: 'If an account with this email exists, you will receive a password reset OTP'
        } as ApiResponse<{ message: string }>);
      }
      throw error;
    }

    // Generate and store OTP
    const otp = await OTPService.createPasswordResetOTP(email);

    // Send OTP email
    const emailSent = await EmailService.sendPasswordResetOTPEmail(email, otp);

    if (!emailSent) {
      logger.error(`Failed to send password reset OTP email to: ${email}`);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send OTP email. Please try again.'
        }
      } as ApiResponse<null>);
    }

    logger.info(`Password reset OTP sent to: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email address'
    } as ApiResponse<{ message: string }>);

  } catch (error: any) {
    logger.error('Error in password reset request:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error. Please try again.'
      }
    } as ApiResponse<null>);
  }
});

/**
 * Step 2: Verify OTP
 * User enters OTP, system validates it
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = verifyPasswordResetOTPSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: JSON.stringify(validationResult.error.errors)
        }
      } as ApiResponse<null>);
    }

    const { email, otp } = validationResult.data as VerifyPasswordResetOTPRequest;

    // Verify OTP
    const isValid = await OTPService.verifyPasswordResetOTP(email, otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired OTP. Please request a new one.'
        }
      } as ApiResponse<null>);
    }

    logger.info(`OTP verified successfully for: ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.'
    } as ApiResponse<{ message: string }>);

  } catch (error) {
    logger.error('Error in OTP verification:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error. Please try again.'
      }
    } as ApiResponse<null>);
  }
});

/**
 * Step 3: Reset password
 * User enters new password, system updates it
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: JSON.stringify(validationResult.error.errors)
        }
      } as ApiResponse<null>);
    }

    const { email, otp, newPassword } = validationResult.data as ResetPasswordRequest;

    // Check if OTP is verified (from previous step)
    const isOTPVerified = await OTPService.isOTPVerified(email);
    if (!isOTPVerified) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'OTP not verified or has expired. Please complete the verification step first.'
        }
      } as ApiResponse<null>);
    }

    // Get user by email
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found'
          }
        } as ApiResponse<null>);
      }
      throw error;
    }

    // Update password
    await auth.updateUser(user.uid, {
      password: newPassword
    });

    // Invalidate OTP
    await OTPService.invalidateOTP(email);

    // Send confirmation email
    await EmailService.sendPasswordResetConfirmationEmail(email, user.displayName || 'User');

    logger.info(`Password reset successfully for: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    } as ApiResponse<{ message: string }>);

  } catch (error: any) {
    logger.error('Error in password reset:', error);
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password is too weak. Please choose a stronger password.'
        }
      } as ApiResponse<null>);
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error. Please try again.'
      }
    } as ApiResponse<null>);
  }
});

/**
 * Check if OTP is still valid (for frontend validation)
 */
router.post('/check-otp-status', async (req: Request, res: Response) => {
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

    const isVerified = await OTPService.isOTPVerified(email);

    res.status(200).json({
      success: true,
      data: {
        isVerified,
        message: isVerified ? 'OTP is valid' : 'OTP has expired or is invalid'
      }
    } as ApiResponse<{ isVerified: boolean; message: string }>);

  } catch (error) {
    logger.error('Error checking OTP status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error. Please try again.'
      }
    } as ApiResponse<null>);
  }
});

export default router;
