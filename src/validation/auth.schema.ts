import { z } from "zod";

// Schema for login validation
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

// Schema for signup validation
export const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  fullName: z.string().min(2, "Full name must be at least 2 characters long"),
  phone: z.string().optional(),
});

// Schema for Google OAuth sign-in
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
});

// Schema for completing user profile after OAuth sign-in
export const completeProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters long"),
  phone: z.string().min(6, "Phone number is required"),
});

// Add Google callback schema
export const googleCallbackSchema = z.object({
  code: z.string().min(1, "Code is required"),
});

// Types for the schema
export type LoginRequest = z.infer<typeof loginSchema>;
export type SignupRequest = z.infer<typeof signupSchema>;
export type GoogleAuthRequest = z.infer<typeof googleAuthSchema>;
export type CompleteProfileRequest = z.infer<typeof completeProfileSchema>;
export type GoogleCallbackRequest = z.infer<typeof googleCallbackSchema>;
