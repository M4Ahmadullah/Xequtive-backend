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
const allowedOrigins = process.env
  .ALLOWED_ORIGINS!.split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""));

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

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

// Routes
app.use("/api", routes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT || '8080', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
