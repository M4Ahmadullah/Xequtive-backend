import { Router, Request, Response } from "express";
import {
  ApiResponse,
  FareEstimateResponse,
  AuthenticatedRequest,
  EnhancedFareEstimateResponse,
} from "../types";
import { FareService } from "../services/fare.service";
import { EnhancedFareService } from "../services/enhancedFare.service";
import {
  fareEstimateSchema,
  enhancedFareEstimateSchema,
} from "../validation/booking.schema";
import { verifyToken } from "../middleware/authMiddleware";
import { ZodError } from "zod";

const router = Router();

// Legacy fare estimation endpoint
router.post(
  "/",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: "Authentication required",
          },
        } as ApiResponse<never>);
      }

      // Validate request body
      const fareRequest = fareEstimateSchema.parse(req.body);

      // Calculate fare estimate
      const fareEstimate = await FareService.calculateFares(fareRequest);

      res.status(200).json({
        success: true,
        data: {
          ...fareEstimate,
          userId: req.user.uid, // Include user ID in response
        },
      } as ApiResponse<FareEstimateResponse & { userId: string }>);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Validation error",
            details: error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", "),
          },
        } as ApiResponse<never>);
      }

      res.status(500).json({
        success: false,
        error: {
          message: "Failed to calculate fare estimate",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Enhanced fare estimation endpoint - returns fares for all vehicle types
router.post(
  "/enhanced",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: "Authentication required",
          },
        } as ApiResponse<never>);
      }

      // Validate request body against the enhanced schema
      const fareRequest = enhancedFareEstimateSchema.parse(req.body);

      // Calculate fare estimates for all vehicle types
      const fareEstimates = await EnhancedFareService.calculateFares(
        fareRequest
      );

      res.status(200).json({
        success: true,
        data: {
          fare: fareEstimates,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Validation error",
            details: error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", "),
            code: "VALIDATION_ERROR",
          },
        } as ApiResponse<never>);
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorCode = errorMessage.includes("No routes found")
        ? "INVALID_LOCATION"
        : (error as any)?.code || "FARE_CALCULATION_ERROR";

      res.status(500).json({
        success: false,
        error: {
          code: errorCode,
          message: "Failed to calculate fare estimate",
          details: errorMessage,
        },
      } as ApiResponse<never>);
    }
  }
);

export default router;
