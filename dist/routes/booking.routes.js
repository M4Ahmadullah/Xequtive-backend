"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authMiddleware_1 = require("../middleware/authMiddleware");
const firebase_1 = require("../config/firebase");
const booking_schema_1 = require("../validation/booking.schema");
const enhancedFare_service_1 = require("../services/enhancedFare.service");
const rateLimiter_1 = require("../middleware/rateLimiter");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
// Submit Booking - Single Step with Fare Verification
router.post("/create-enhanced", authMiddleware_1.verifyToken, rateLimiter_1.bookingLimiter, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                },
            });
        }
        console.log("Creating booking with fare verification");
        // Get or use customer information
        let bookingData;
        try {
            // If customer info is missing, we'll get it from the user's profile
            if (!req.body.customer) {
                // Get user profile from Firestore
                const userDoc = await firebase_1.firestore
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
                            details: "Please provide customer information or update your profile",
                        },
                    });
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
                console.log("Using user profile for customer information:", customer);
            }
            else {
                bookingData = req.body;
            }
            // Validate the complete request
            booking_schema_1.enhancedBookingCreateSchema.parse(bookingData);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid booking data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        // Create fare estimation request from booking data
        const fareRequest = {
            locations: bookingData.booking.locations,
            datetime: bookingData.booking.datetime,
            passengers: bookingData.booking.passengers,
        };
        // Calculate fares for all vehicles and find the selected one
        const fareEstimates = await enhancedFare_service_1.EnhancedFareService.calculateFares(fareRequest);
        const selectedVehicle = fareEstimates.vehicleOptions.find((vehicle) => vehicle.id === bookingData.booking.vehicle.id);
        if (!selectedVehicle) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VEHICLE_NOT_FOUND",
                    message: "Could not find the selected vehicle type",
                    details: "Please try again or select a different vehicle",
                },
            });
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
        const permanentBooking = {
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
        const bookingDoc = await firebase_1.firestore
            .collection("bookings")
            .add(permanentBooking);
        // Send booking confirmation email (non-blocking)
        email_service_1.EmailService.sendBookingConfirmationEmail(permanentBooking.customer.email, {
            id: bookingDoc.id,
            fullName: permanentBooking.customer.fullName,
            pickupDate: permanentBooking.pickupDate,
            pickupTime: permanentBooking.pickupTime,
            pickupLocation: permanentBooking.locations.pickup.address,
            dropoffLocation: permanentBooking.locations.dropoff.address,
            vehicleType: permanentBooking.vehicle.name,
            price: permanentBooking.vehicle.price.amount,
        }).catch((error) => {
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
    }
    catch (error) {
        console.error("Error creating booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "BOOKING_CREATION_FAILED",
                message: "Could not create booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Get current user's bookings - must be placed before /:id routes to avoid conflicts
router.get("/user", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                },
            });
        }
        // Build query for all user's bookings - temporarily remove ordering to avoid needing a composite index
        const query = firebase_1.firestore
            .collection("bookings")
            .where("userId", "==", req.user.uid)
            // Removed .orderBy("createdAt", "desc") to avoid needing a composite index
            .limit(100); // Limit to most recent 100 bookings
        // Execute query
        const snapshot = await query.get();
        // Map results to simplified booking array for user
        const bookings = [];
        snapshot.forEach((doc) => {
            const booking = doc.data();
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
            return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
        // Apply status filter if specified in query parameters
        if (req.query.status) {
            const statusFilter = req.query.status.split(",");
            const filteredBookings = bookings.filter((booking) => statusFilter.includes(booking.status));
            return res.json({
                success: true,
                data: filteredBookings,
            });
        }
        return res.json({
            success: true,
            data: bookings,
        });
    }
    catch (error) {
        console.error("Error fetching user's bookings:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to fetch bookings",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// User endpoints for booking management
// Cancel a booking
router.post("/:id/cancel", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                },
            });
        }
        // Validate request body
        try {
            booking_schema_1.bookingCancelSchema.parse(req.body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid cancellation data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        const bookingId = req.params.id;
        const cancellationData = req.body;
        // Get the booking
        const bookingDoc = await firebase_1.firestore
            .collection("bookings")
            .doc(bookingId)
            .get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    message: "Booking not found",
                },
            });
        }
        const booking = bookingDoc.data();
        // Check if the booking belongs to the current user
        if (booking.userId !== req.user.uid) {
            return res.status(403).json({
                success: false,
                error: {
                    code: "PERMISSION_DENIED",
                    message: "You don't have permission to cancel this booking",
                },
            });
        }
        // Check if the booking is already cancelled
        if (booking.status === "cancelled") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "ALREADY_CANCELLED",
                    message: "This booking has already been cancelled",
                },
            });
        }
        // Check if the booking can be cancelled
        if (!["pending", "confirmed", "assigned"].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "CANNOT_CANCEL",
                    message: `Cannot cancel a booking with status: ${booking.status}`,
                    details: "Only bookings in pending, confirmed, or assigned status can be cancelled",
                },
            });
        }
        // Update the booking status to cancelled
        await bookingDoc.ref.update({
            status: "cancelled",
            cancellationReason: cancellationData.cancellationReason || "User cancelled",
            cancelledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        // Send booking cancellation email (non-blocking)
        email_service_1.EmailService.sendBookingCancellationEmail(booking.customer.email, {
            id: bookingId,
            fullName: booking.customer.fullName,
            pickupDate: booking.pickupDate,
            pickupTime: booking.pickupTime,
            cancellationReason: cancellationData.cancellationReason || "User cancelled",
        }).catch((error) => {
            console.error("Failed to send booking cancellation email:", error);
        });
        // Prepare the response
        const response = {
            message: "Booking cancelled successfully",
            id: bookingId,
            status: "cancelled",
        };
        return res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error("Error cancelling booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to cancel booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Update Booking - Similar to Create Booking but with 24-hour constraint
router.post("/update-booking/:id", authMiddleware_1.verifyToken, rateLimiter_1.bookingLimiter, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                },
            });
        }
        const bookingId = req.params.id;
        // First, get the existing booking
        const existingBookingDoc = await firebase_1.firestore
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
            });
        }
        const existingBooking = existingBookingDoc.data();
        // Check if the booking belongs to the current user
        if (existingBooking.userId !== req.user.uid) {
            return res.status(403).json({
                success: false,
                error: {
                    code: "PERMISSION_DENIED",
                    message: "You don't have permission to update this booking",
                },
            });
        }
        // Check 24-hour constraint
        const bookingDateTime = new Date(`${existingBooking.pickupDate}T${existingBooking.pickupTime}`);
        const now = new Date();
        const hoursDifference = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursDifference <= 24) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "UPDATE_NOT_ALLOWED",
                    message: "Bookings cannot be updated within 24 hours of the pickup time",
                    details: `Booking is scheduled in ${hoursDifference.toFixed(2)} hours`,
                },
            });
        }
        // Validate the update request using the same schema as create
        let bookingData;
        try {
            // If customer info is missing, use existing customer data
            if (!req.body.customer) {
                bookingData = {
                    customer: existingBooking.customer,
                    booking: req.body.booking,
                };
            }
            else {
                bookingData = req.body;
            }
            // Validate the complete request
            booking_schema_1.enhancedBookingCreateSchema.parse(bookingData);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid booking data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        // Create fare estimation request from booking data
        const fareRequest = {
            locations: bookingData.booking.locations,
            datetime: bookingData.booking.datetime,
            passengers: bookingData.booking.passengers,
        };
        // Calculate fares for all vehicles and find the selected one
        const fareEstimates = await enhancedFare_service_1.EnhancedFareService.calculateFares(fareRequest);
        const selectedVehicle = fareEstimates.vehicleOptions.find((vehicle) => vehicle.id === bookingData.booking.vehicle.id);
        if (!selectedVehicle) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VEHICLE_NOT_FOUND",
                    message: "Could not find the selected vehicle type",
                    details: "Please try again or select a different vehicle",
                },
            });
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
        const updatedBooking = {
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
        await firebase_1.firestore
            .collection("bookings")
            .doc(bookingId)
            .update(updatedBooking);
        // Add an entry to the booking history
        await firebase_1.firestore
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
            await email_service_1.EmailService.sendBookingConfirmationEmail(updatedBooking.customer.email, {
                id: bookingId,
                fullName: updatedBooking.customer.fullName,
                pickupDate: updatedBooking.pickupDate,
                pickupTime: updatedBooking.pickupTime,
                pickupLocation: updatedBooking.locations.pickup.address,
                dropoffLocation: updatedBooking.locations.dropoff.address,
                vehicleType: updatedBooking.vehicle.name,
                price: updatedBooking.vehicle.price.amount,
            });
        }
        catch (error) {
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
    }
    catch (error) {
        console.error("Error updating booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "BOOKING_UPDATE_FAILED",
                message: "Could not update booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// NOTE: Admin-only routes removed for now
// These routes will be moved to dashboard.routes.ts
exports.default = router;
