import dotenv from "dotenv";
import express, { Express, Request, Response, Router } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes/index.routes";
import "./config/firebase"; // This will initialize Firebase
import { apiLimiter } from "./middleware/rateLimiter";

// Load environment variables first
dotenv.config();

const app: Express = express();

// Get allowed origins from environment and normalize them (remove trailing slashes)
// Also add both HTTP and HTTPS versions for localhost development
const allowedOrigins = process.env
  .ALLOWED_ORIGINS!.split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .flatMap((origin) => {
    // For localhost, add both http and https versions
    if (origin.includes('localhost')) {
      const httpVersion = origin.replace('https://', 'http://');
      const httpsVersion = origin.replace('http://', 'https://');
      return [httpVersion, httpsVersion];
    }
    return [origin];
  });

console.log("CORS enabled for origins:", allowedOrigins);

// Enhanced CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Normalize the request origin by removing trailing slash if present
      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Handle preflight requests explicitly
app.options("*", cors());

// Other middleware
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser()); // Parse Cookie header and populate req.cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint for Cloud Run health checks
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Hello from Cloud Run! Xequtive Backend is running.",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0"
  });
});

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

// Routes
app.use("/api", routes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT || '8080', 10);

// Add startup error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode`);
  console.log(`📍 Health check available at http://0.0.0.0:${PORT}/`);
  console.log(`🏥 API health check at http://0.0.0.0:${PORT}/api/ping`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
