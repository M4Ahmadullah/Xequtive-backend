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
    PORT: zod_1.z.string().default("5555"),
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
    ALLOWED_ORIGINS: zod_1.z.string().default("http://localhost:3000"),
    // Mapbox
    MAPBOX_TOKEN: zod_1.z.string(),
    // Google OAuth
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    BACKEND_GOOGLE_CALLBACK_URL: zod_1.z
        .string()
        .optional()
        .default("http://localhost:5555/api/auth/google/callback"),
});
// Parse and validate environment variables
// If validation fails, it will throw an error
try {
    envSchema.parse(process.env);
}
catch (error) {
    console.error("❌ Invalid environment variables:", error.format ? error.format() : error);
    throw new Error("Invalid environment variables");
}
// Export validated environment variables
exports.env = {
    server: {
        port: process.env.PORT || "5555",
        nodeEnv: process.env.NODE_ENV || "development",
        isDev: process.env.NODE_ENV !== "production",
    },
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        apiKey: process.env.FIREBASE_API_KEY,
    },
    security: {
        jwtSecret: process.env.JWT_SECRET,
        allowedOrigins: (process.env.ALLOWED_ORIGINS || "").split(","),
    },
    mapbox: {
        token: process.env.MAPBOX_TOKEN,
    },
    googleOAuth: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.BACKEND_GOOGLE_CALLBACK_URL,
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
    mapbox: { token: "***" }, // Redact token
});
