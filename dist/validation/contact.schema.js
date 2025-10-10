"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactMessageSchema = void 0;
const zod_1 = require("zod");
// Contact form validation schema
exports.contactMessageSchema = zod_1.z.object({
    firstName: zod_1.z.string()
        .min(1, "First name is required")
        .max(100, "First name must be less than 100 characters")
        .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
    lastName: zod_1.z.string()
        .min(1, "Last name is required")
        .max(100, "Last name must be less than 100 characters")
        .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
    email: zod_1.z.string()
        .email("Invalid email format")
        .max(255, "Email must be less than 255 characters"),
    inquiryType: zod_1.z.enum(["bookings", "payments", "business-account", "lost-property", "other"], {
        errorMap: () => ({ message: "Please select a valid inquiry type" })
    }),
    otherInquiryType: zod_1.z.string()
        .max(100, "Other inquiry type must be less than 100 characters")
        .optional(),
    phone: zod_1.z.string()
        .min(1, "Phone number is required")
        .max(50, "Phone number must be less than 50 characters")
        .regex(/^[\+]?[1-9][\d\s\-\(\)]{7,20}$/, "Invalid phone number format"),
    message: zod_1.z.string()
        .min(10, "Message must be at least 10 characters")
        .max(2000, "Message must be less than 2000 characters")
        .regex(/^[a-zA-Z0-9\s\.,!?\-\(\)\[\]{}@#$%^&*+=<>:"';\\/|`~]*$/, "Message contains invalid characters"),
    agreeToTerms: zod_1.z.boolean()
        .refine((val) => val === true, {
        message: "You must agree to the terms and conditions"
    })
}).refine((data) => {
    // If inquiryType is "other", then otherInquiryType is required
    if (data.inquiryType === "other" && (!data.otherInquiryType || data.otherInquiryType.trim() === "")) {
        return false;
    }
    return true;
}, {
    message: "Please specify the inquiry type when selecting 'Other'",
    path: ["otherInquiryType"]
});
