import { Router, Request, Response } from "express";
import authRoutes from "./auth.routes";
import bookingRoutes from "./booking.routes";
import fareRoutes from "./fare.routes";
import dashboardRoutes from "./dashboard.routes";
import hourlyBookingRoutes from "./hourlyBooking.routes";
import { verifyToken } from "../middleware/authMiddleware";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { EmailService } from "../services/email.service";
import { env } from "../config/env";

const router: Router = Router();

// Basic health check - public
router.get("/ping", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      message: "Server is up",
      timestamp: new Date().toISOString(),
    },
  } as ApiResponse<{ message: string; timestamp: string }>);
});

// Detailed health check - protected
router.get(
  "/health",
  verifyToken,
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        user: req.user?.email || "unknown",
      },
    } as ApiResponse<{
      status: string;
      timestamp: string;
      uptime: number;
      environment: string;
      user: string;
    }>);
  }
);

// Email configuration check
router.get("/email-config", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      senderAddress: process.env.EMAIL_SENDER_ADDRESS || "Not set in env",
      configuredSender: EmailService.getSenderAddress(),
      frontendUrl: env.email.frontendUrl,
      logoUrl: env.email.logoUrl,
    },
  });
});

// Hourly booking system health check
router.get("/hourly-booking-health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      message: "Hourly booking system is operational",
      endpoints: {
        fareEstimate: "/api/hourly-bookings/fare-estimate",
        createBooking: "/api/hourly-bookings/create",
        getUserBookings: "/api/hourly-bookings/user",
        cancelBooking: "/api/hourly-bookings/:id/cancel",
      },
      features: [
        "Hourly fare calculation (3-12 hours)",
        "Multiple vehicle types support",
        "Time-based surcharges",
        "Equipment fees for extra passengers/luggage",
        "Group/Organisation booking support",
        "Multiple vehicles booking",
      ],
      timestamp: new Date().toISOString(),
    },
  });
});

// Test email endpoint - development only
if (env.server.isDev) {
  router.post("/test-email", async (req: Request, res: Response) => {
    try {
      const { to, name, type } = req.body;

      if (!to || !name) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Missing required fields: to, name",
          },
        });
      }

      let success = false;

      switch (type) {
        case "welcome":
          success = await EmailService.sendWelcomeEmail(to, name);
          break;
        case "booking":
          success = await EmailService.sendBookingConfirmationEmail(to, {
            id: "TEST-123456",
            fullName: name,
            pickupDate: "2023-06-01",
            pickupTime: "14:30",
            pickupLocation: "123 Main St, London",
            dropoffLocation: "Heathrow Airport, London",
            vehicleType: "Executive Saloon",
            price: 85.5,
          });
          break;
        case "cancel":
          success = await EmailService.sendBookingCancellationEmail(to, {
            id: "TEST-123456",
            fullName: name,
            pickupDate: "2023-06-01",
            pickupTime: "14:30",
            cancellationReason: "Test cancellation",
          });
          break;
        case "reminder":
          success = await EmailService.sendBookingReminderEmail(to, {
            id: "TEST-123456",
            fullName: name,
            pickupDate: "2023-06-01",
            pickupTime: "14:30",
            pickupLocation: "123 Main St, London",
            dropoffLocation: "Heathrow Airport, London",
            vehicleType: "Executive Saloon",
          });
          break;
        case "profile":
          success = await EmailService.sendProfileCompletionEmail(to, name);
          break;
        case "verify":
          success = await EmailService.sendVerificationEmail(
            to,
            name,
            `${env.email.frontendUrl}/verify?token=TEST123456789`
          );
          break;
        case "password-reset":
          success = await EmailService.sendForgotPasswordEmail(
            to,
            `${env.email.frontendUrl}/reset-password?token=TEST123456789`
          );
          break;
        case "password-reset-confirm":
          success = await EmailService.sendPasswordResetConfirmationEmail(
            to,
            name
          );
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              message:
                "Invalid email type. Use: welcome, booking, cancel, reminder, profile, verify, password-reset, or password-reset-confirm",
            },
          });
      }

      if (!success) {
        return res.status(500).json({
          success: false,
          error: {
            message: "Failed to send email",
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          message: `Test ${type} email sent to ${to}`,
        },
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to send test email",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  });
}

// Auth routes
router.use("/auth", authRoutes);

// Booking and fare routes
router.use("/bookings", bookingRoutes);
router.use("/fare-estimate", fareRoutes);

// Hourly booking routes
router.use("/hourly-bookings", hourlyBookingRoutes);

// Dashboard routes (admin only)
router.use("/dashboard", dashboardRoutes);

export default router;
