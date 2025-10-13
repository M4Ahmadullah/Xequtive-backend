import { z } from 'zod';

/**
 * Schema for requesting password reset (step 1)
 */
export const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required')
    .max(255, 'Email is too long')
});

/**
 * Schema for verifying OTP (step 2)
 */
export const verifyPasswordResetOTPSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required'),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers')
});

/**
 * Schema for resetting password (step 3)
 */
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required'),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(128, 'Password is too long'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * Type definitions for password reset
 */
export type RequestPasswordResetRequest = z.infer<typeof requestPasswordResetSchema>;
export type VerifyPasswordResetOTPRequest = z.infer<typeof verifyPasswordResetOTPSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
