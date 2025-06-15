"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.verifyEmailSchema = exports.googleCallbackSchema = exports.completeProfileSchema = exports.googleAuthSchema = exports.signupSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
// Schema for login validation
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters long"),
});
// Schema for signup validation - fullName and phoneNumber are now optional
exports.signupSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters long"),
    fullName: zod_1.z.string().optional().transform(val => val === "" ? undefined : val),
    phoneNumber: zod_1.z.string().optional().transform(val => val === "" ? undefined : val),
});
// Schema for Google OAuth sign-in
exports.googleAuthSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(1, "ID token is required"),
});
// Schema for completing user profile after OAuth sign-in
exports.completeProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, "Full name must be at least 2 characters long"),
    phoneNumber: zod_1.z.string().min(6, "Phone number is required"),
});
// Add Google callback schema
exports.googleCallbackSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, "Code is required"),
});
// Email verification request schema
exports.verifyEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    fullName: zod_1.z.string().min(2, "Full name must be at least 2 characters long"),
});
// Schema for updating user profile
exports.updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2, "Full name must be at least 2 characters long").optional(),
    phoneNumber: zod_1.z.string().min(6, "Phone number must be at least 6 characters long").optional(),
    notifications: zod_1.z.object({
        email: zod_1.z.boolean().optional(),
        sms: zod_1.z.boolean().optional(),
    }).optional(),
});
