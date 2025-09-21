import { z } from "zod";

// Contact form validation schema
export const contactMessageSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
  
  lastName: z.string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
  
  email: z.string()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  
  phone: z.string()
    .min(1, "Phone number is required")
    .max(50, "Phone number must be less than 50 characters")
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{7,20}$/, "Invalid phone number format"),
  
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters")
    .regex(/^[a-zA-Z0-9\s\.,!?\-\(\)\[\]{}@#$%^&*+=<>:"';\\/|`~]*$/, "Message contains invalid characters"),
  
  agreeToTerms: z.boolean()
    .refine((val) => val === true, {
      message: "You must agree to the terms and conditions"
    })
});

// Export the type
export type ContactMessageRequest = z.infer<typeof contactMessageSchema>;

