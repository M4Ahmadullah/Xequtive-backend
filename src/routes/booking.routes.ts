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

// Generate sequential reference number
async function generateReferenceNumber(): Promise<string> {
  try {
    // Get the counter document
    const counterRef = firestore.collection("counters").doc("bookingReference");
    const counterDoc = await counterRef.get();

    let nextNumber: number;

    if (!counterDoc.exists) {
      // Initialize counter starting from 100
      nextNumber = 100;
      await counterRef.set({ nextNumber: nextNumber + 1 });
    } else {
      // Get next number and increment
      const counterData = counterDoc.data();
      nextNumber = counterData?.nextNumber || 100;
      await counterRef.update({ nextNumber: nextNumber + 1 });
    }

    return `XEQ_${nextNumber}`;
  } catch (error) {
    console.error("Error generating reference number:", error);
    // Fallback to timestamp-based reference
    return `XEQ_${Date.now()}`;
  }
}

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
        bookingType: bookingData.booking.bookingType || "one-way",
        hours: bookingData.booking.hours,
        returnType: bookingData.booking.returnType,
        returnDate: bookingData.booking.returnDate,
        returnTime: bookingData.booking.returnTime,
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
        id: "", // Will be set by Firestore
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
        price: verifiedFare.price,
        additionalStops: bookingData.booking.locations.additionalStops?.map(stop => stop.address) || [],
        waitingTime: 0,
        bookingType: bookingData.booking.bookingType || "one-way",
        journey: {
          distance_miles: verifiedFare.distance_miles,
          duration_minutes: verifiedFare.duration_minutes,
        },
        specialRequests: bookingData.booking.specialRequests || "",
        status: "pending",
        referenceNumber: "TEMP", // Temporary, will be updated
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add optional fields only if they have values (to avoid undefined in Firestore)
      if (bookingData.booking.hours !== undefined) {
        permanentBooking.hours = bookingData.booking.hours;
      }
      if (bookingData.booking.returnType !== undefined) {
        permanentBooking.returnType = bookingData.booking.returnType;
      }
      if (bookingData.booking.returnDate !== undefined) {
        permanentBooking.returnDate = bookingData.booking.returnDate;
      }
      if (bookingData.booking.returnTime !== undefined) {
        permanentBooking.returnTime = bookingData.booking.returnTime;
      }

      // Add travelInformation to the permanentBooking object if it exists
      if (bookingData.booking.travelInformation) {
        permanentBooking.travelInformation = {
          type: bookingData.booking.travelInformation.type,
          details: bookingData.booking.travelInformation.details,
        };
      }

      // Generate reference number
      const referenceNumber = await generateReferenceNumber();

      // Update reference number in the permanentBooking object
      permanentBooking.referenceNumber = referenceNumber;

      // Save directly to bookings collection
      const bookingDoc = await firestore
        .collection("bookings")
        .add(permanentBooking);

              const destination = permanentBooking.bookingType === "hourly" ? "Hourly booking" : permanentBooking.locations?.dropoff?.address || "Dropoff not specified";
        console.log(`📅 Booking created: ${referenceNumber} (${bookingDoc.id}) | User: ${req.user.uid} | Type: ${permanentBooking.bookingType} | From: ${permanentBooking.locations?.pickup?.address || "Pickup not specified"} | To: ${destination} | Vehicle: ${permanentBooking.vehicle?.name || "Vehicle not specified"} | Price: £${permanentBooking.vehicle?.price?.amount || 0}`);

      // Send booking confirmation email (non-blocking)
      EmailService.sendBookingConfirmationEmail(
        permanentBooking.customer.email,
        {
          id: bookingDoc.id,
          referenceNumber: referenceNumber,
          fullName: permanentBooking.customer.fullName,
          pickupDate: permanentBooking.pickupDate,
          pickupTime: permanentBooking.pickupTime,
          pickupLocation: permanentBooking.locations?.pickup?.address || "Pickup location not specified",
          dropoffLocation: permanentBooking.bookingType === "hourly" ? "Hourly booking - driver stays with you" : permanentBooking.locations?.dropoff?.address || "Dropoff location not specified",
          vehicleType: permanentBooking.vehicle.name,
          price: permanentBooking.vehicle.price.amount,
        }
      ).catch((error) => {
        console.error("Failed to send booking confirmation email:", error);
      });

      // Prepare confirmation response
      const confirmationResponse = {
        bookingId: bookingDoc.id,
        referenceNumber: referenceNumber,
        message: "Booking successfully created",
        details: {
          fullName: permanentBooking.customer.fullName,
          pickupDate: permanentBooking.pickupDate,
          pickupTime: permanentBooking.pickupTime,
          pickupLocation: permanentBooking.locations?.pickup?.address || "Pickup location not specified",
          dropoffLocation: permanentBooking.bookingType === "hourly" ? "Hourly booking - driver stays with you" : permanentBooking.locations?.dropoff?.address || "Dropoff location not specified",
          vehicle: permanentBooking.vehicle.name,
          price: permanentBooking.vehicle.price,
          journey: {
            distance_miles: permanentBooking.journey?.distance_miles || 0,
            duration_minutes: permanentBooking.journey?.duration_minutes || 0,
          },
          status: "pending",
          bookingType: permanentBooking.bookingType,
          ...(permanentBooking.hours !== undefined && { hours: permanentBooking.hours }),
          ...(permanentBooking.returnType !== undefined && { returnType: permanentBooking.returnType }),
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

      console.log(`📋 Found ${snapshot.size} bookings for user ${req.user.uid}`);

      // Map results to simplified booking array for user
      const bookings: UserBookingData[] = [];
      snapshot.forEach((doc) => {
        try {
          const booking = doc.data() as PermanentBookingData;
          
          // Handle missing or malformed data gracefully
          const pickupAddress = booking.locations?.pickup?.address || "Pickup location not specified";
          const dropoffAddress = booking.locations?.dropoff?.address || "Dropoff location not specified";
          const vehicleName = booking.vehicle?.name || "Vehicle not specified";
          const vehiclePrice = booking.vehicle?.price?.amount || 0;
          const bookingStatus = booking.status || "unknown";
          const createdAt = booking.createdAt || new Date().toISOString();
          
          // Skip bookings with completely missing critical data
          if (!booking.pickupDate || !booking.pickupTime) {
            console.warn(`Skipping booking ${doc.id} - missing pickup date/time`);
            return;
          }
          
          bookings.push({
            id: doc.id,
            pickupDate: booking.pickupDate,
            pickupTime: booking.pickupTime,
            pickupLocation: {
              address: pickupAddress,
            },
            dropoffLocation: {
              address: dropoffAddress,
            },
            vehicleType: vehicleName,
            price: vehiclePrice,
            status: bookingStatus,
            journey: {
              distance_miles: booking.journey?.distance_miles || 0,
              duration_minutes: booking.journey?.duration_minutes || 0,
            },
            createdAt: createdAt,
          });
        } catch (bookingError) {
          console.error(`Error processing booking ${doc.id}:`, bookingError);
          console.error(`Booking data:`, doc.data());
          // Continue with other bookings instead of failing completely
        }
      });

      console.log(`✅ Successfully processed ${bookings.length} bookings out of ${snapshot.size} total`);

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
        bookingType: bookingData.booking.bookingType || "one-way",
        hours: bookingData.booking.hours,
        returnType: bookingData.booking.returnType,
        returnDate: bookingData.booking.returnDate,
        returnTime: bookingData.booking.returnTime,
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
            referenceNumber: existingBooking.referenceNumber || "N/A",
            fullName: updatedBooking.customer.fullName,
            pickupDate: updatedBooking.pickupDate,
            pickupTime: updatedBooking.pickupTime,
            pickupLocation: updatedBooking.locations?.pickup?.address || "Pickup location not specified",
            dropoffLocation: updatedBooking.locations?.dropoff?.address || "Dropoff location not specified",
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
          pickupLocation: updatedBooking.locations?.pickup?.address || "Pickup location not specified",
          dropoffLocation: updatedBooking.locations?.dropoff?.address || "Dropoff location not specified",
          vehicle: updatedBooking.vehicle.name,
          price: updatedBooking.vehicle.price,
          journey: {
            distance_miles: updatedBooking.journey?.distance_miles || 0,
            duration_minutes: updatedBooking.journey?.duration_minutes || 0,
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
