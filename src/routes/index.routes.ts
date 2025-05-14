import { Router, Request, Response } from "express";
import authRoutes from "./auth.routes";
import bookingRoutes from "./booking.routes";
import fareRoutes from "./fare.routes";
import dashboardRoutes from "./dashboard.routes";
import { verifyToken } from "../middleware/authMiddleware";
import { AuthenticatedRequest, ApiResponse } from "../types";

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
    } as ApiResponse<{ status: string; timestamp: string; uptime: number; environment: string; user: string }>);
  }
);

// Auth routes
router.use("/auth", authRoutes);

// Booking and fare routes
router.use("/bookings", bookingRoutes);
router.use("/fare-estimate", fareRoutes);

// Dashboard routes (admin only)
router.use("/dashboard", dashboardRoutes);

export default router;
