import { Router, Response } from "express";
import { z } from "zod";
import { DocumentData } from "firebase-admin/firestore";
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
import { Query } from "firebase-admin/firestore";
import { bookingLimiter } from "../middleware/rateLimiter";
import { FareCalculationService } from "../services/fare.service";
import { EmailService } from "../services/email.service";

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

      console.log(`📅 Creating booking for user: ${req.user.uid}`);

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
            phoneNumber: userData.phone || "",
          };

          // Add customer object to request body
          bookingData = {
            customer,
            booking: req.body.booking,
          };


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
      const fareEstimates =
        await EnhancedFareService.calculateFares(fareRequest);
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
        specialRequests: bookingData.booking.specialRequests || "",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add travelInformation to the permanentBooking object if it exists
      if (bookingData.booking.travelInformation) {
        permanentBooking.travelInformation = {
          type: bookingData.booking.travelInformation.type,
          details: bookingData.booking.travelInformation.details,
        };
      }

      // Save directly to bookings collection
      const bookingDoc = await firestore
        .collection("bookings")
        .add(permanentBooking);

      console.log(`📅 Booking created: ${bookingDoc.id} | User: ${req.user.uid} | From: ${permanentBooking.locations.pickup.address} | To: ${permanentBooking.locations.dropoff.address} | Vehicle: ${permanentBooking.vehicle.name} | Price: £${permanentBooking.vehicle.price.amount}`);

      // Send booking confirmation email (non-blocking)
      EmailService.sendBookingConfirmationEmail(
        permanentBooking.customer.email,
        {
          id: bookingDoc.id,
          fullName: permanentBooking.customer.fullName,
          pickupDate: permanentBooking.pickupDate,
          pickupTime: permanentBooking.pickupTime,
          pickupLocation: permanentBooking.locations.pickup.address,
          dropoffLocation: permanentBooking.locations.dropoff.address,
          vehicleType: permanentBooking.vehicle.name,
          price: permanentBooking.vehicle.price.amount,
        }
      ).catch((error) => {
        console.error("Failed to send booking confirmation email:", error);
      });

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
  "/:id/cancel",
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
      if (!["pending", "confirmed", "assigned"].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "CANNOT_CANCEL",
            message: `Cannot cancel a booking with status: ${booking.status}`,
            details:
              "Only bookings in pending, confirmed, or assigned status can be cancelled",
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

      // Send booking cancellation email (non-blocking)
      EmailService.sendBookingCancellationEmail(booking.customer.email, {
        id: bookingId,
        fullName: booking.customer.fullName,
        pickupDate: booking.pickupDate,
        pickupTime: booking.pickupTime,
        cancellationReason:
          cancellationData.cancellationReason || "User cancelled",
      }).catch((error: Error) => {
        console.error("Failed to send booking cancellation email:", error);
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

// Update Booking - Similar to Create Booking but with 24-hour constraint
router.post(
  "/update-booking/:id",
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

      const bookingId = req.params.id;

      // First, get the existing booking
      const existingBookingDoc = await firestore
        .collection("bookings")
        .doc(bookingId)
        .get();

      if (!existingBookingDoc.exists) {
        return res.status(404).json({
          success: false,
          error: {
            code: "BOOKING_NOT_FOUND",
            message: "Booking not found",
          },
        } as ApiResponse<never>);
      }

      const existingBooking = existingBookingDoc.data() as PermanentBookingData;

      // Check if the booking belongs to the current user
      if (existingBooking.userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You don't have permission to update this booking",
          },
        } as ApiResponse<never>);
      }

      // Check 24-hour constraint
      const bookingDateTime = new Date(
        `${existingBooking.pickupDate}T${existingBooking.pickupTime}`
      );
      const now = new Date();
      const hoursDifference =
        (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDifference <= 24) {
        return res.status(400).json({
          success: false,
          error: {
            code: "UPDATE_NOT_ALLOWED",
            message:
              "Bookings cannot be updated within 24 hours of the pickup time",
            details: `Booking is scheduled in ${hoursDifference.toFixed(2)} hours`,
          },
        } as ApiResponse<never>);
      }

      // Validate the update request using the same schema as create
      let bookingData: EnhancedBookingCreateRequest;

      try {
        // If customer info is missing, use existing customer data
        if (!req.body.customer) {
          bookingData = {
            customer: existingBooking.customer,
            booking: req.body.booking,
          };
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
      const fareEstimates =
        await EnhancedFareService.calculateFares(fareRequest);
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

      // Prepare updated booking data
      const updatedBooking: DocumentData = {
        ...existingBooking, // Preserve existing metadata
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
        specialRequests: bookingData.booking.specialRequests || "",
        updatedAt: new Date().toISOString(),
      };

      // Add travelInformation to the updated booking object if it exists
      if (bookingData.booking.travelInformation) {
        updatedBooking.travelInformation = {
          type: bookingData.booking.travelInformation.type,
          details: bookingData.booking.travelInformation.details,
        };
      }

      // Update the booking document
      await firestore
        .collection("bookings")
        .doc(bookingId)
        .update(updatedBooking);

      // Add an entry to the booking history
      await firestore
        .collection("bookings")
        .doc(bookingId)
        .collection("history")
        .add({
          action: "booking_updated",
          timestamp: new Date().toISOString(),
          updatedBy: req.user.uid,
        });

      // Send booking update confirmation email (non-blocking)
      try {
        await EmailService.sendBookingConfirmationEmail(
          updatedBooking.customer.email,
          {
            id: bookingId,
            fullName: updatedBooking.customer.fullName,
            pickupDate: updatedBooking.pickupDate,
            pickupTime: updatedBooking.pickupTime,
            pickupLocation: updatedBooking.locations.pickup.address,
            dropoffLocation: updatedBooking.locations.dropoff.address,
            vehicleType: updatedBooking.vehicle.name,
            price: updatedBooking.vehicle.price.amount,
          }
        );
      } catch (error) {
        console.error("Failed to send booking update email:", error);
      }

      // Prepare confirmation response
      const confirmationResponse = {
        bookingId: bookingId,
        message: "Booking successfully updated",
        details: {
          fullName: updatedBooking.customer.fullName,
          pickupDate: updatedBooking.pickupDate,
          pickupTime: updatedBooking.pickupTime,
          pickupLocation: updatedBooking.locations.pickup.address,
          dropoffLocation: updatedBooking.locations.dropoff.address,
          vehicle: updatedBooking.vehicle.name,
          price: updatedBooking.vehicle.price,
          journey: {
            distance_miles: updatedBooking.journey.distance_miles,
            duration_minutes: updatedBooking.journey.duration_minutes,
          },
          status: updatedBooking.status,
        },
      };

      // Return the confirmation response
      return res.status(200).json({
        success: true,
        data: confirmationResponse,
      });
    } catch (error) {
      console.error("Error updating booking:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "BOOKING_UPDATE_FAILED",
          message: "Could not update booking",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// NOTE: Admin-only routes removed for now
// These routes will be moved to dashboard.routes.ts

export default router;
