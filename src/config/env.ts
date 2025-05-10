import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Define a schema for environment variables
const envSchema = z.object({
  // Server configuration
  PORT: z.string().default("5555"),
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
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  // Mapbox
  MAPBOX_TOKEN: z.string(),
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
    port: process.env.PORT || "5555",
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
    allowedOrigins: (process.env.ALLOWED_ORIGINS || "").split(","),
  },
  mapbox: {
    token: process.env.MAPBOX_TOKEN!,
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
});
