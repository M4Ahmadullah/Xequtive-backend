import { z } from "zod";

// Schema for login validation
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

// Schema for signup validation - fullName and phoneNumber are now optional
export const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  fullName: z.string().optional().transform(val => val === "" ? undefined : val),
  phoneNumber: z.string().optional().transform(val => val === "" ? undefined : val),
});

// Schema for Google OAuth sign-in
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
});

// Schema for completing user profile after OAuth sign-in
export const completeProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters long"),
  phoneNumber: z.string().min(6, "Phone number is required"),
});

// Add Google callback schema
export const googleCallbackSchema = z.object({
  code: z.string().min(1, "Code is required"),
});

// Email verification request schema
export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email format"),
  fullName: z.string().min(2, "Full name must be at least 2 characters long"),
});

// Schema for updating user profile
export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters long").optional(),
  phoneNumber: z.string().min(6, "Phone number must be at least 6 characters long").optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
});

// Types for the schema
export type LoginRequest = z.infer<typeof loginSchema>;
export type SignupRequest = z.infer<typeof signupSchema>;
export type GoogleAuthRequest = z.infer<typeof googleAuthSchema>;
export type CompleteProfileRequest = z.infer<typeof completeProfileSchema>;
export type GoogleCallbackRequest = z.infer<typeof googleCallbackSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
