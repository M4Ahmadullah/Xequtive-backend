import { z } from 'zod';

/**
 * Schema for requesting email verification code
 */
export const requestEmailVerificationSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required')
    .max(255, 'Email is too long')
});

/**
 * Schema for verifying email verification code
 */
export const verifyEmailVerificationSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required'),
  otp: z
    .string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers')
});

/**
 * Schema for resending email verification code
 */
export const resendEmailVerificationSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required')
    .max(255, 'Email is too long')
});

/**
 * Type definitions for email verification
 */
export type RequestEmailVerificationRequest = z.infer<typeof requestEmailVerificationSchema>;
export type VerifyEmailVerificationRequest = z.infer<typeof verifyEmailVerificationSchema>;
export type ResendEmailVerificationRequest = z.infer<typeof resendEmailVerificationSchema>;
