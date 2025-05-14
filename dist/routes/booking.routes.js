"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authMiddleware_1 = require("../middleware/authMiddleware");
const firebase_1 = require("../config/firebase");
const booking_schema_1 = require("../validation/booking.schema");
const enhancedFare_service_1 = require("../services/enhancedFare.service");
const rateLimiter_1 = require("../middleware/rateLimiter");
const fare_service_1 = require("../services/fare.service");
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
                    phone: userData.phone || "",
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
            specialRequests: bookingData.booking.specialRequests,
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Save directly to bookings collection
        const bookingDoc = await firebase_1.firestore
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
// Get all bookings (Admin only) with optional filters
router.get("/", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        // Build query with filters
        let query = firebase_1.firestore.collection("bookings");
        // Filter by user ID if provided
        if (req.query.userId) {
            query = query.where("userId", "==", req.query.userId);
        }
        // Filter by date if provided
        if (req.query.date) {
            query = query.where("pickupDate", "==", req.query.date);
        }
        // Filter by status if provided
        if (req.query.status) {
            query = query.where("status", "==", req.query.status);
        }
        // Default order by creation date (newest first)
        query = query.orderBy("createdAt", "desc");
        // Execute query
        const snapshot = await query.get();
        // Map results to bookings array
        const bookings = [];
        snapshot.forEach((doc) => {
            bookings.push({
                id: doc.id,
                ...doc.data(),
            });
        });
        return res.json({
            success: true,
            data: bookings,
        });
    }
    catch (error) {
        console.error("Error fetching bookings:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to fetch bookings",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Get booking by ID (Admin only)
router.get("/:id", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const bookingDoc = await firebase_1.firestore
            .collection("bookings")
            .doc(req.params.id)
            .get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    message: "Booking not found",
                },
            });
        }
        const booking = {
            id: bookingDoc.id,
            ...bookingDoc.data(),
        };
        const fareEstimate = await fare_service_1.FareService.calculateFares({
            pickupLocation: booking.locations.pickup.coordinates,
            dropoffLocation: booking.locations.dropoff.coordinates,
            additionalStops: booking.locations.additionalStops?.map((stop) => stop.coordinates),
            vehicleType: booking.vehicle.id,
        });
        return res.json({
            success: true,
            data: {
                ...booking,
                journey: {
                    ...booking.journey,
                    distance_miles: fareEstimate.distance_miles,
                    duration_minutes: fareEstimate.duration_minutes,
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to fetch booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Update booking status (Admin only)
router.put("/:id", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const bookingDoc = await firebase_1.firestore
            .collection("bookings")
            .doc(req.params.id)
            .get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    message: "Booking not found",
                },
            });
        }
        // Validate the status if provided
        if (req.body.status && !booking_schema_1.bookingStatusValues.includes(req.body.status)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Invalid booking status",
                    details: `Status must be one of: ${booking_schema_1.bookingStatusValues.join(", ")}`,
                },
            });
        }
        // Add metadata
        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user?.uid,
        };
        // Update the document
        await bookingDoc.ref.update(updateData);
        return res.json({
            success: true,
            data: {
                id: req.params.id,
                message: "Booking updated successfully",
            },
        });
    }
    catch (error) {
        console.error("Error updating booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to update booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Delete booking by ID (Admin only)
router.delete("/:id", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const bookingDoc = await firebase_1.firestore
            .collection("bookings")
            .doc(req.params.id)
            .get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    message: "Booking not found",
                },
            });
        }
        // Delete the document
        await bookingDoc.ref.delete();
        return res.json({
            success: true,
            data: {
                message: "Booking deleted successfully",
            },
        });
    }
    catch (error) {
        console.error("Error deleting booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to delete booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// User endpoints for booking management
// Cancel a booking
router.post("/user/bookings/:id/cancel", authMiddleware_1.verifyToken, async (req, res) => {
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
        if (!["pending", "accepted", "confirmed"].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "CANNOT_CANCEL",
                    message: `Cannot cancel a booking with status: ${booking.status}`,
                    details: "Only bookings in pending, accepted, or confirmed status can be cancelled",
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
// Admin endpoints for booking management
// Accept a booking (Admin only)
router.post("/admin/bookings/:id/accept", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const bookingId = req.params.id;
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
        // Check if the booking is already accepted
        if (booking.status === "accepted") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "ALREADY_ACCEPTED",
                    message: "This booking has already been accepted",
                },
            });
        }
        // Check if the booking can be accepted
        if (!["pending", "confirmed"].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "CANNOT_ACCEPT",
                    message: `Cannot accept a booking with status: ${booking.status}`,
                    details: "Only bookings in pending or confirmed status can be accepted",
                },
            });
        }
        // Update the booking status to accepted
        await bookingDoc.ref.update({
            status: "accepted",
            acceptedBy: req.user?.uid,
            acceptedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        // Prepare the response
        const response = {
            message: "Booking accepted successfully",
            id: bookingId,
            status: "accepted",
        };
        return res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error("Error accepting booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to accept booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Decline a booking (Admin only)
router.post("/admin/bookings/:id/decline", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const bookingId = req.params.id;
        // Validate request body for decline reason
        const declineReason = req.body.reason || "Booking declined by administrator";
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
        // Check if the booking is already declined
        if (booking.status === "declined") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "ALREADY_DECLINED",
                    message: "This booking has already been declined",
                },
            });
        }
        // Check if the booking can be declined
        if (!["pending", "confirmed"].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "CANNOT_DECLINE",
                    message: `Cannot decline a booking with status: ${booking.status}`,
                    details: "Only bookings in pending or confirmed status can be declined",
                },
            });
        }
        // Update the booking status to declined
        await bookingDoc.ref.update({
            status: "declined",
            declinedBy: req.user?.uid,
            declineReason: declineReason,
            declinedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        // Prepare the response
        const response = {
            message: "Booking declined successfully",
            id: bookingId,
            status: "declined",
        };
        return res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error("Error declining booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to decline booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Start a booking (mark as in_progress) (Admin only)
router.post("/admin/bookings/:id/start", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const bookingId = req.params.id;
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
        // Check if the booking is already in progress
        if (booking.status === "in_progress") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "ALREADY_IN_PROGRESS",
                    message: "This booking is already in progress",
                },
            });
        }
        // Check if the booking can be started
        if (booking.status !== "accepted") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "CANNOT_START",
                    message: `Cannot start a booking with status: ${booking.status}`,
                    details: "Only bookings in accepted status can be started",
                },
            });
        }
        // Update the booking status to in_progress
        await bookingDoc.ref.update({
            status: "in_progress",
            startedBy: req.user?.uid,
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        // Prepare the response
        const response = {
            message: "Booking marked as in progress",
            id: bookingId,
            status: "in_progress",
        };
        return res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error("Error starting booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to start booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Complete a booking (Admin only)
router.post("/admin/bookings/:id/complete", authMiddleware_1.verifyToken, authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const bookingId = req.params.id;
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
        // Check if the booking is already completed
        if (booking.status === "completed") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "ALREADY_COMPLETED",
                    message: "This booking has already been completed",
                },
            });
        }
        // Check if the booking can be completed
        if (booking.status !== "in_progress") {
            return res.status(400).json({
                success: false,
                error: {
                    code: "CANNOT_COMPLETE",
                    message: `Cannot complete a booking with status: ${booking.status}`,
                    details: "Only bookings in in_progress status can be completed",
                },
            });
        }
        // Update the booking status to completed
        await bookingDoc.ref.update({
            status: "completed",
            completedBy: req.user?.uid,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        // Prepare the response
        const response = {
            message: "Booking completed successfully",
            id: bookingId,
            status: "completed",
        };
        return res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error("Error completing booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to complete booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
exports.default = router;
