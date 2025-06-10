import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Define a schema for environment variables
const envSchema = z.object({
  // Server configuration
  PORT: z.string().default("8080"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Firebase configuration
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_PRIVATE_KEY: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string(),
  FIREBASE_API_KEY: z.string(),

  // Security
  JWT_SECRET: z.string(),
  ALLOWED_ORIGINS: z.string(),

  // Mapbox
  MAPBOX_TOKEN: z.string(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  BACKEND_GOOGLE_CALLBACK_URL: z.string(),

  // Resend (Email)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_SENDER_ADDRESS: z
    .string()
    .optional()
    .default("Xequtive <onboarding@resend.dev>"),

  // Frontend URLs for email templates
  FRONTEND_URL: z.string(),
  LOGO_URL: z.string(),
});

// Parse and validate environment variables
// If validation fails, it will throw an error
try {
  envSchema.parse(process.env);
} catch (error: any) {
  console.error(
    "❌ Invalid environment variables:",
    error.format ? error.format() : error
  );
  throw new Error("Invalid environment variables");
}

// Export validated environment variables
export const env = {
  server: {
    port: process.env.PORT || "8080",
    nodeEnv: process.env.NODE_ENV || "development",
    isDev: process.env.NODE_ENV !== "production",
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    apiKey: process.env.FIREBASE_API_KEY!,
  },
  security: {
    jwtSecret: process.env.JWT_SECRET!,
    allowedOrigins: process.env.ALLOWED_ORIGINS!.split(","),
  },
  mapbox: {
    token: process.env.MAPBOX_TOKEN!,
  },
  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.BACKEND_GOOGLE_CALLBACK_URL!,
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    senderAddress: process.env.EMAIL_SENDER_ADDRESS,
    frontendUrl: process.env.FRONTEND_URL!,
    logoUrl: process.env.LOGO_URL!,
  },
};

// Print the loaded environment configuration except for sensitive data
console.log("Environment configuration loaded:", {
  server: env.server,
  firebase: {
    projectId: env.firebase.projectId,
    // Omit private keys and sensitive data
  },
  security: {
    allowedOrigins: env.security.allowedOrigins,
    // Omit secrets
  },
  mapbox: { token: "***" }, // Redact token
  email: {
    senderAddress: env.email.senderAddress,
    frontendUrl: env.email.frontendUrl,
    // Omit API key
  },
});
