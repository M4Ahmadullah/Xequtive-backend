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
            code: "AUTH_REQUIRED",
          },
        } as ApiResponse<never>);
      }

      // Validate request body against the enhanced schema
      try {
        const fareRequest = enhancedFareEstimateSchema.parse(req.body);

        // Calculate fare estimates for all vehicle types
        const fareEstimates =
          await EnhancedFareService.calculateFares(fareRequest);

        res.status(200).json({
          success: true,
          data: {
            fare: fareEstimates,
          },
        });
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          // Create a more structured validation error response
          const validationErrors = validationError.errors.map((err) => {
            const path = err.path.join(".");
            let suggestion = "";
            let expectedType = "";
            let receivedValue: any = undefined;

            // Add specific suggestions based on the error code
            switch (err.code) {
              case "invalid_type":
                suggestion = `Expected ${err.expected}, received ${typeof err.received}`;
                expectedType = err.expected as string;
                receivedValue = err.received;
                break;
              case "invalid_string":
                if (err.validation === "regex") {
                  if (path.includes("date")) {
                    suggestion = "Date must be in YYYY-MM-DD format";
                    expectedType = "YYYY-MM-DD";
                  } else if (path.includes("time")) {
                    suggestion = "Time must be in HH:mm format (24-hour)";
                    expectedType = "HH:mm";
                  }
                  receivedValue = (err as any).received;
                }
                break;
              case "too_small":
                suggestion = `Minimum value is ${(err as any).minimum}`;
                expectedType = `number >= ${(err as any).minimum}`;
                receivedValue = (err as any).received;
                break;
              case "too_big":
                suggestion = `Maximum value is ${(err as any).maximum}`;
                expectedType = `number <= ${(err as any).maximum}`;
                receivedValue = (err as any).received;
                break;
            }

            return {
              field: path,
              message: err.message,
              expected: expectedType,
              received: receivedValue,
              suggestion:
                suggestion ||
                "Please check the API documentation for correct format",
            };
          });

          // Group errors by main sections
          const groupedErrors = {
            locations: validationErrors.filter((e) =>
              e.field.startsWith("locations")
            ),
            datetime: validationErrors.filter((e) =>
              e.field.startsWith("datetime")
            ),
            passengers: validationErrors.filter((e) =>
              e.field.startsWith("passengers")
            ),
          };

          // Create a summary of missing/invalid fields
          interface MissingFieldsType {
            locations?: string | { pickup?: string; dropoff?: string };
            datetime?: string | { date?: string; time?: string };
            passengers?:
              | string
              | {
                  count?: string;
                  checkedLuggage?: string;
                  handLuggage?: string;
                };
          }

          const missingFields: MissingFieldsType = {};

          // Check locations
          if (!req.body.locations) {
            missingFields.locations = "Missing entirely";
          } else {
            const locationFields: { pickup?: string; dropoff?: string } = {};
            if (!req.body.locations.pickup)
              locationFields.pickup = "Missing pickup location";
            if (!req.body.locations.dropoff)
              locationFields.dropoff = "Missing dropoff location";
            if (Object.keys(locationFields).length > 0)
              missingFields.locations = locationFields;
          }

          // Check datetime
          if (!req.body.datetime) {
            missingFields.datetime = "Missing entirely";
          } else {
            const datetimeFields: { date?: string; time?: string } = {};
            if (!req.body.datetime.date) datetimeFields.date = "Missing date";
            if (!req.body.datetime.time) datetimeFields.time = "Missing time";
            if (Object.keys(datetimeFields).length > 0)
              missingFields.datetime = datetimeFields;
          }

          // Check passengers
          if (!req.body.passengers) {
            missingFields.passengers = "Missing entirely";
          } else {
            const passengerFields: {
              count?: string;
              checkedLuggage?: string;
              handLuggage?: string;
            } = {};
            if (req.body.passengers.count === undefined)
              passengerFields.count = "Missing passenger count";
            if (req.body.passengers.checkedLuggage === undefined)
              passengerFields.checkedLuggage = "Missing checked luggage count";
            if (req.body.passengers.handLuggage === undefined)
              passengerFields.handLuggage = "Missing hand luggage count";
            if (Object.keys(passengerFields).length > 0)
              missingFields.passengers = passengerFields;
          }

          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request format",
              details: {
                summary:
                  "The request contains validation errors. Please check the error details below.",
                receivedData: req.body,
                missingFields:
                  Object.keys(missingFields).length > 0
                    ? missingFields
                    : undefined,
                validationErrors: groupedErrors,
                requiredFormat: {
                  locations: {
                    pickup: {
                      address: "string",
                      coordinates: {
                        lat: "number (-90 to 90)",
                        lng: "number (-180 to 180)",
                      },
                    },
                    dropoff: {
                      address: "string",
                      coordinates: {
                        lat: "number (-90 to 90)",
                        lng: "number (-180 to 180)",
                      },
                    },
                  },
                  datetime: {
                    date: "YYYY-MM-DD",
                    time: "HH:mm",
                  },
                  passengers: {
                    count: "number (1-16)",
                    checkedLuggage: "number (0-8)",
                    handLuggage: "number (0-8)",
                    mediumLuggage: "number (0-8)",
                    babySeat: "number (0-5)",
                    boosterSeat: "number (0-5)",
                    childSeat: "number (0-5)",
                    wheelchair: "number (0-2)",
                  },
                },
              },
            },
          } as ApiResponse<never>);
        }
        throw validationError;
      }
    } catch (error) {
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
