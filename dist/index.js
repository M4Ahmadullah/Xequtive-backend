"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const errorHandler_1 = require("./middleware/errorHandler");
const index_routes_1 = __importDefault(require("./routes/index.routes"));
require("./config/firebase"); // This will initialize Firebase
const rateLimiter_1 = require("./middleware/rateLimiter");
// Load environment variables first
dotenv_1.default.config();
const app = (0, express_1.default)();
// Get allowed origins from environment and normalize them (remove trailing slashes)
// Also add both HTTP and HTTPS versions for localhost development
const allowedOrigins = process.env
    .ALLOWED_ORIGINS.split(",")
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
// Enhanced CORS configuration for cross-origin cookies
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // Normalize the request origin by removing trailing slash if present
        const normalizedOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalizedOrigin)) {
            console.log(`✅ CORS allowed for origin: ${origin}`);
            callback(null, true);
        }
        else {
            console.warn(`❌ CORS blocked request from origin: ${origin}`);
            console.warn(`📋 Allowed origins:`, allowedOrigins);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true, // Critical for cross-origin cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Cookie",
        "Set-Cookie",
        "X-Requested-With",
        "Accept",
        "Origin"
    ],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
}));
// Handle preflight requests explicitly with enhanced logging
app.options("*", (req, res) => {
    console.log(`🔄 Preflight request from: ${req.get('Origin')}`);
    console.log(`🔄 Requested method: ${req.get('Access-Control-Request-Method')}`);
    console.log(`🔄 Requested headers: ${req.get('Access-Control-Request-Headers')}`);
    (0, cors_1.default)({
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "Cookie",
            "Set-Cookie",
            "X-Requested-With",
            "Accept",
            "Origin"
        ],
    })(req, res, () => {
        res.status(200).end();
    });
});
// Other middleware
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use((0, cookie_parser_1.default)()); // Parse Cookie header and populate req.cookies
// Enhanced middleware to handle cross-origin cookies with aggressive headers
app.use((req, res, next) => {
    const origin = req.get('Origin');
    // For cross-origin requests, ensure proper headers are set
    if (origin && allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        // Set CORS headers explicitly
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD');
        res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie,Set-Cookie,X-Requested-With,Accept,Origin,Cache-Control,Pragma');
        res.header('Access-Control-Expose-Headers', 'Set-Cookie,Authorization');
        // Add headers to help with cookie handling
        res.header('Vary', 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method');
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        console.log(`🔧 Enhanced CORS headers set for origin: ${origin}`);
    }
    next();
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Root endpoint for Cloud Run health checks
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Hello from Cloud Run! Xequtive Backend is running.",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        version: "1.0.0"
    });
});
// Apply rate limiting to all API routes
app.use("/api", rateLimiter_1.apiLimiter);
// Routes
app.use("/api", index_routes_1.default);
// Error handling
app.use(errorHandler_1.errorHandler);
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
