import rateLimit from "express-rate-limit";

// Basic rate limiter for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs (increased from 100)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      message: "Too many requests, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      details: "You have exceeded the rate limit for API requests. Please implement proper request caching and avoid excessive API calls.",
    },
  },
});

// More strict limiter for auth endpoints to prevent brute force
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 requests per windowMs (increased from 30)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many authentication attempts, please try again later.",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      details: "You have exceeded the rate limit for authentication requests. Please reduce the frequency of /auth/me calls and implement proper caching on the frontend.",
    },
  },
});

// Specific limiter for booking creation to prevent abuse
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 booking creations per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many booking requests, please try again later.",
      code: "BOOKING_RATE_LIMIT_EXCEEDED",
      details: "You have exceeded the rate limit for booking creation.",
    },
  },
});

// Less restrictive limiter for user session checks (/auth/me)
export const sessionCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 session checks per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many session check requests. Please implement frontend caching.",
      code: "SESSION_RATE_LIMIT_EXCEEDED",
      details: "You are checking user session too frequently. Please cache the user session on the frontend and only refresh when necessary (e.g., on page reload, after login/logout, or every 30+ minutes).",
    },
  },
});

// Contact form rate limiter - 5 messages per hour per IP
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 contact messages per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many contact messages sent. Please try again later.",
      code: "CONTACT_RATE_LIMIT_EXCEEDED",
      details: "You have exceeded the rate limit for contact form submissions. Please wait before sending another message.",
    },
  },
});
