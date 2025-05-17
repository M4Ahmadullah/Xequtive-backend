import { Router, Response } from "express";
import { z } from "zod";
import {
  ApiResponse,
  AuthenticatedRequest,
  EnhancedBookingCreateRequest,
  PermanentBookingData,
  EnhancedFareEstimateRequest,
  UserBookingData,
  BookingCancelRequest,
  BookingCancelResponse,
} from "../types";
import { verifyToken } from "../middleware/authMiddleware";
import { firestore } from "../config/firebase";
import {
  enhancedBookingCreateSchema,
  bookingCancelSchema,
  bookingStatusValues,
} from "../validation/booking.schema";
import { EnhancedFareService } from "../services/enhancedFare.service";
import { Query, DocumentData } from "firebase-admin/firestore";
import { bookingLimiter } from "../middleware/rateLimiter";
import { FareService } from "../services/fare.service";

const router = Router();

// Submit Booking - Single Step with Fare Verification
router.post(
  "/create-enhanced",
  verifyToken,
  bookingLimiter,
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

      console.log("Creating booking with fare verification");

      // Get or use customer information
      let bookingData: EnhancedBookingCreateRequest;

      try {
        // If customer info is missing, we'll get it from the user's profile
        if (!req.body.customer) {
          // Get user profile from Firestore
          const userDoc = await firestore
            .collection("users")
            .doc(req.user.uid)
            .get();
          const userData = userDoc.data();

          if (!userData) {
            return res.status(404).json({
              success: false,
              error: {
                code: "USER_PROFILE_NOT_FOUND",
                message: "User profile not found",
                details:
                  "Please provide customer information or update your profile",
              },
            } as ApiResponse<never>);
          }

          // Create customer object from user profile
          const customer = {
            fullName: userData.fullName || req.user.displayName || "Unknown",
            email: userData.email || req.user.email,
            phone: userData.phone || "",
          };

          // Add customer object to request body
          bookingData = {
            customer,
            booking: req.body.booking,
          };

          console.log("Using user profile for customer information:", customer);
        } else {
          bookingData = req.body;
        }

        // Validate the complete request
        enhancedBookingCreateSchema.parse(bookingData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid booking data",
              details: error.errors.map((e) => e.message).join(", "),
            },
          } as ApiResponse<never>);
        }
        throw error;
      }

      // Create fare estimation request from booking data
      const fareRequest: EnhancedFareEstimateRequest = {
        locations: bookingData.booking.locations,
        datetime: bookingData.booking.datetime,
        passengers: bookingData.booking.passengers,
      };

      // Calculate fares for all vehicles and find the selected one
      const fareEstimates = await EnhancedFareService.calculateFares(
        fareRequest
      );
      const selectedVehicle = fareEstimates.vehicleOptions.find(
        (vehicle) => vehicle.id === bookingData.booking.vehicle.id
      );

      if (!selectedVehicle) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VEHICLE_NOT_FOUND",
            message: "Could not find the selected vehicle type",
            details: "Please try again or select a different vehicle",
          },
        } as ApiResponse<never>);
      }

      // Extract verified fare details
      const verifiedFare = {
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.name,
        price: {
          amount: selectedVehicle.price.amount,
          currency: selectedVehicle.price.currency,
        },
        distance_miles: fareEstimates.routeDetails?.distance_miles || 0,
        duration_minutes: fareEstimates.routeDetails?.duration_minutes || 0,
      };

      // Create permanent booking directly
      const permanentBooking: PermanentBookingData = {
        userId: req.user.uid,
        customer: bookingData.customer,
        pickupDate: bookingData.booking.datetime.date,
        pickupTime: bookingData.booking.datetime.time,
        locations: bookingData.booking.locations,
        passengers: bookingData.booking.passengers,
        vehicle: {
          id: bookingData.booking.vehicle.id,
          name: bookingData.booking.vehicle.name,
          price: verifiedFare.price,
        },
        journey: {
          distance_miles: verifiedFare.distance_miles,
          duration_minutes: verifiedFare.duration_minutes,
        },
        specialRequests: bookingData.booking.specialRequests,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save directly to bookings collection
      const bookingDoc = await firestore
        .collection("bookings")
        .add(permanentBooking);

      // Prepare confirmation response
      const confirmationResponse = {
        bookingId: bookingDoc.id,
        message: "Booking successfully created",
        details: {
          fullName: permanentBooking.customer.fullName,
          pickupDate: permanentBooking.pickupDate,
          pickupTime: permanentBooking.pickupTime,
          pickupLocation: permanentBooking.locations.pickup.address,
          dropoffLocation: permanentBooking.locations.dropoff.address,
          vehicle: permanentBooking.vehicle.name,
          price: permanentBooking.vehicle.price,
          journey: {
            distance_miles: permanentBooking.journey.distance_miles,
            duration_minutes: permanentBooking.journey.duration_minutes,
          },
          status: "pending",
        },
      };

      // Return the confirmation response
      return res.status(201).json({
        success: true,
        data: confirmationResponse,
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "BOOKING_CREATION_FAILED",
          message: "Could not create booking",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Get current user's bookings - must be placed before /:id routes to avoid conflicts
router.get(
  "/user",
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

      // Build query for all user's bookings - temporarily remove ordering to avoid needing a composite index
      const query = firestore
        .collection("bookings")
        .where("userId", "==", req.user.uid)
        // Removed .orderBy("createdAt", "desc") to avoid needing a composite index
        .limit(100); // Limit to most recent 100 bookings

      // Execute query
      const snapshot = await query.get();

      // Map results to simplified booking array for user
      const bookings: UserBookingData[] = [];
      snapshot.forEach((doc) => {
        const booking = doc.data() as PermanentBookingData;
        bookings.push({
          id: doc.id,
          pickupDate: booking.pickupDate,
          pickupTime: booking.pickupTime,
          pickupLocation: {
            address: booking.locations.pickup.address,
          },
          dropoffLocation: {
            address: booking.locations.dropoff.address,
          },
          vehicleType: booking.vehicle.name,
          price: booking.vehicle.price.amount,
          status: booking.status,
          journey: {
            distance_miles: booking.journey.distance_miles,
            duration_minutes: booking.journey.duration_minutes,
          },
          createdAt: booking.createdAt,
        });
      });

      // Sort manually in memory instead of in the query
      bookings.sort((a, b) => {
        // Sort by creation date, newest first
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      // Apply status filter if specified in query parameters
      if (req.query.status) {
        const statusFilter = (req.query.status as string).split(",");
        const filteredBookings = bookings.filter((booking) =>
          statusFilter.includes(booking.status)
        );
        return res.json({
          success: true,
          data: filteredBookings,
        } as ApiResponse<UserBookingData[]>);
      }

      return res.json({
        success: true,
        data: bookings,
      } as ApiResponse<UserBookingData[]>);
    } catch (error) {
      console.error("Error fetching user's bookings:", error);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to fetch bookings",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// User endpoints for booking management

// Cancel a booking
router.post(
  "/user/bookings/:id/cancel",
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
      try {
        bookingCancelSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid cancellation data",
              details: error.errors.map((e) => e.message).join(", "),
            },
          } as ApiResponse<never>);
        }
        throw error;
      }

      const bookingId = req.params.id;
      const cancellationData = req.body as BookingCancelRequest;

      // Get the booking
      const bookingDoc = await firestore
        .collection("bookings")
        .doc(bookingId)
        .get();

      if (!bookingDoc.exists) {
        return res.status(404).json({
          success: false,
          error: {
            message: "Booking not found",
          },
        } as ApiResponse<never>);
      }

      const booking = bookingDoc.data() as PermanentBookingData;

      // Check if the booking belongs to the current user
      if (booking.userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You don't have permission to cancel this booking",
          },
        } as ApiResponse<never>);
      }

      // Check if the booking is already cancelled
      if (booking.status === "cancelled") {
        return res.status(400).json({
          success: false,
          error: {
            code: "ALREADY_CANCELLED",
            message: "This booking has already been cancelled",
          },
        } as ApiResponse<never>);
      }

      // Check if the booking can be cancelled
      if (!["pending", "accepted", "confirmed"].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "CANNOT_CANCEL",
            message: `Cannot cancel a booking with status: ${booking.status}`,
            details:
              "Only bookings in pending, accepted, or confirmed status can be cancelled",
          },
        } as ApiResponse<never>);
      }

      // Update the booking status to cancelled
      await bookingDoc.ref.update({
        status: "cancelled",
        cancellationReason:
          cancellationData.cancellationReason || "User cancelled",
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Prepare the response
      const response: BookingCancelResponse = {
        message: "Booking cancelled successfully",
        id: bookingId,
        status: "cancelled",
      };

      return res.json({
        success: true,
        data: response,
      } as ApiResponse<BookingCancelResponse>);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to cancel booking",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// NOTE: Admin-only routes removed for now
// These routes will be moved to dashboard.routes.ts

export default router;
