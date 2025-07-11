"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
// Define a schema for environment variables
const envSchema = zod_1.z.object({
    // Server configuration
    PORT: zod_1.z.string().default("8080"),
    NODE_ENV: zod_1.z
        .enum(["development", "production", "test"])
        .default("development"),
    // Firebase configuration
    FIREBASE_PROJECT_ID: zod_1.z.string(),
    FIREBASE_PRIVATE_KEY: zod_1.z.string(),
    FIREBASE_CLIENT_EMAIL: zod_1.z.string(),
    FIREBASE_API_KEY: zod_1.z.string(),
    // Security
    JWT_SECRET: zod_1.z.string(),
    ALLOWED_ORIGINS: zod_1.z.string(),
    // Google APIs
    GOOGLE_PLACES_API_KEY: zod_1.z.string(),
    // Google OAuth
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    BACKEND_GOOGLE_CALLBACK_URL: zod_1.z.string(),
    // Resend (Email)
    RESEND_API_KEY: zod_1.z.string().optional(),
    EMAIL_SENDER_ADDRESS: zod_1.z
        .string()
        .optional()
        .default("Xequtive <onboarding@resend.dev>"),
    // Frontend URLs for email templates
    FRONTEND_URL: zod_1.z.string(),
    LOGO_URL: zod_1.z.string(),
});
// Parse and validate environment variables
// In production, provide defaults for optional services
let validatedEnv;
try {
    validatedEnv = envSchema.parse(process.env);
}
catch (error) {
    console.error("❌ Invalid environment variables:", error.format ? error.format() : error);
    // In production, don't crash if only optional services are missing
    if (process.env.NODE_ENV === "production") {
        console.warn("⚠️  Some environment variables are missing. App will start with limited functionality.");
        // Create a minimal valid environment for basic functionality
        validatedEnv = {
            PORT: process.env.PORT || "8080",
            NODE_ENV: process.env.NODE_ENV || "production",
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "missing",
            FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "missing",
            FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "missing",
            FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || "missing",
            JWT_SECRET: process.env.JWT_SECRET || "missing",
            ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "https://localhost:3000",
            GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || "missing",
            BACKEND_GOOGLE_CALLBACK_URL: process.env.BACKEND_GOOGLE_CALLBACK_URL || "missing",
            FRONTEND_URL: process.env.FRONTEND_URL || "https://localhost:3000",
            LOGO_URL: process.env.LOGO_URL || "https://example.com/logo.png",
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
            RESEND_API_KEY: process.env.RESEND_API_KEY,
            EMAIL_SENDER_ADDRESS: process.env.EMAIL_SENDER_ADDRESS || "Xequtive <onboarding@resend.dev>",
        };
    }
    else {
        throw new Error("Invalid environment variables");
    }
}
// Export validated environment variables
exports.env = {
    server: {
        port: validatedEnv.PORT || "8080",
        nodeEnv: validatedEnv.NODE_ENV || "development",
        isDev: validatedEnv.NODE_ENV !== "production",
    },
    firebase: {
        projectId: validatedEnv.FIREBASE_PROJECT_ID,
        privateKey: (validatedEnv.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        clientEmail: validatedEnv.FIREBASE_CLIENT_EMAIL,
        apiKey: validatedEnv.FIREBASE_API_KEY,
    },
    security: {
        jwtSecret: validatedEnv.JWT_SECRET,
        allowedOrigins: (validatedEnv.ALLOWED_ORIGINS || "").split(","),
    },
    googleOAuth: {
        clientId: validatedEnv.GOOGLE_CLIENT_ID,
        clientSecret: validatedEnv.GOOGLE_CLIENT_SECRET,
        callbackUrl: validatedEnv.BACKEND_GOOGLE_CALLBACK_URL,
    },
    email: {
        resendApiKey: validatedEnv.RESEND_API_KEY,
        senderAddress: validatedEnv.EMAIL_SENDER_ADDRESS,
        frontendUrl: validatedEnv.FRONTEND_URL,
        logoUrl: validatedEnv.LOGO_URL,
    },
    googlePlaces: {
        apiKey: validatedEnv.GOOGLE_PLACES_API_KEY,
    },
};
// Print the loaded environment configuration except for sensitive data
console.log("Environment configuration loaded:", {
    server: exports.env.server,
    firebase: {
        projectId: exports.env.firebase.projectId,
        // Omit private keys and sensitive data
    },
    security: {
        allowedOrigins: exports.env.security.allowedOrigins,
        // Omit secrets
    },
    email: {
        senderAddress: exports.env.email.senderAddress,
        frontendUrl: exports.env.email.frontendUrl,
        // Omit API key
    },
});
