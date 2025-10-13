"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const hourlyBooking_1 = require("../types/hourlyBooking");
const authMiddleware_1 = require("../middleware/authMiddleware");
const firebase_1 = require("../config/firebase");
const hourlyBooking_schema_1 = require("../validation/hourlyBooking.schema");
const hourlyFare_service_1 = require("../services/hourlyFare.service");
const rateLimiter_1 = require("../middleware/rateLimiter");
const email_service_1 = require("../services/email.service");
const whatsapp_service_1 = require("../services/whatsapp.service");
const router = (0, express_1.Router)();
// Generate sequential reference number
async function generateReferenceNumber() {
    try {
        // Get the counter document
        const counterRef = firebase_1.firestore.collection("counters").doc("bookingReference");
        const counterDoc = await counterRef.get();
        let nextNumber;
        if (!counterDoc.exists) {
            // Initialize counter starting from 100
            nextNumber = 100;
            await counterRef.set({ nextNumber: nextNumber + 1 });
        }
        else {
            // Get next number and increment
            const counterData = counterDoc.data();
            nextNumber = counterData?.nextNumber || 100;
            await counterRef.update({ nextNumber: nextNumber + 1 });
        }
        return `XEQ_${nextNumber}`;
    }
    catch (error) {
        console.error("Error generating reference number:", error);
        // Fallback to timestamp-based reference
        return `XEQ_${Date.now()}`;
    }
}
// Fare estimation endpoint for all booking types
router.post("/fare-estimate", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                    code: "AUTH_REQUIRED",
                },
            });
        }
        // Validate request body
        try {
            const fareRequest = hourlyBooking_schema_1.fareEstimateSchema.parse(req.body);
            // Calculate fare estimates for all vehicle types based on booking type
            const fareEstimates = await hourlyFare_service_1.HourlyFareService.calculateFares(fareRequest);
            res.status(200).json({
                success: true,
                data: {
                    fare: fareEstimates,
                },
            });
        }
        catch (validationError) {
            if (validationError instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid request format",
                        details: validationError.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw validationError;
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorCode = error?.code || "FARE_CALCULATION_ERROR";
        res.status(500).json({
            success: false,
            error: {
                code: errorCode,
                message: "Failed to calculate fare estimate",
                details: errorMessage,
            },
        });
    }
});
// Create booking for all types
router.post("/create", authMiddleware_1.verifyToken, rateLimiter_1.bookingLimiter, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                },
            });
        }
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
                    email: userData.email || req.user.email || "",
                    phoneNumber: userData.phone || "",
                    groupName: req.body.groupName,
                };
                // Add customer object to request body
                bookingData = {
                    customer,
                    bookingType: req.body.bookingType,
                    datetime: req.body.datetime,
                    passengers: req.body.passengers,
                    vehicle: req.body.vehicle,
                    numVehicles: req.body.numVehicles,
                    specialRequests: req.body.specialRequests,
                    oneWayDetails: req.body.oneWayDetails,
                    hourlyDetails: req.body.hourlyDetails,
                    returnDetails: req.body.returnDetails,
                };
            }
            else {
                bookingData = req.body;
            }
            // Validate the complete request
            hourlyBooking_schema_1.bookingCreateSchema.parse(bookingData);
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
        // Check minimum advance booking time (8 hours for one-way and return bookings)
        if (bookingData.bookingType === "one-way" || bookingData.bookingType === "return") {
            const bookingDateTime = new Date(`${bookingData.datetime.date}T${bookingData.datetime.time}`);
            const now = new Date();
            const hoursDifference = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursDifference < 8) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "MINIMUM_ADVANCE_BOOKING_TIME",
                        message: "Bookings must be made at least 8 hours in advance",
                        details: `Booking is scheduled in ${hoursDifference.toFixed(2)} hours. Minimum advance time is 8 hours.`,
                    },
                });
            }
        }
        // Create fare estimation request from booking data
        const fareRequest = {
            bookingType: bookingData.bookingType,
            datetime: bookingData.datetime,
            passengers: bookingData.passengers,
            numVehicles: bookingData.numVehicles,
            oneWayDetails: bookingData.oneWayDetails ? {
                pickupLocation: bookingData.oneWayDetails.pickupLocation.coordinates,
                dropoffLocation: bookingData.oneWayDetails.dropoffLocation.coordinates,
                additionalStops: bookingData.oneWayDetails.additionalStops?.map(stop => stop.coordinates),
            } : undefined,
            hourlyDetails: bookingData.hourlyDetails ? {
                hours: bookingData.hourlyDetails.hours,
                pickupLocation: bookingData.hourlyDetails.pickupLocation.coordinates,
                dropoffLocation: bookingData.hourlyDetails.dropoffLocation?.coordinates,
                additionalStops: bookingData.hourlyDetails.additionalStops?.map(stop => stop.coordinates),
            } : undefined,
            returnDetails: bookingData.returnDetails ? {
                outboundPickup: bookingData.returnDetails.outboundPickup.coordinates,
                outboundDropoff: bookingData.returnDetails.outboundDropoff.coordinates,
                outboundDateTime: bookingData.returnDetails.outboundDateTime,
                outboundStops: bookingData.returnDetails.outboundStops?.map(stop => stop.coordinates),
                returnType: bookingData.returnDetails.returnType,
                returnPickup: bookingData.returnDetails.returnPickup?.coordinates,
                returnDropoff: bookingData.returnDetails.returnDropoff?.coordinates,
                returnDateTime: bookingData.returnDetails.returnDateTime,
                waitDuration: bookingData.returnDetails.waitDuration,
                returnStops: bookingData.returnDetails.returnStops?.map(stop => stop.coordinates),
            } : undefined,
        };
        // Calculate fares for all vehicles and find the selected one
        const fareEstimates = await hourlyFare_service_1.HourlyFareService.calculateFares(fareRequest);
        const selectedVehicle = fareEstimates.vehicleOptions.find((vehicle) => vehicle.id === bookingData.vehicle.id);
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
        // Create permanent booking with Executive Cars branding
        const permanentBooking = {
            userId: req.user.uid,
            customer: bookingData.customer,
            bookingType: bookingData.bookingType,
            pickupDate: bookingData.datetime.date,
            pickupTime: bookingData.datetime.time,
            passengers: bookingData.passengers,
            vehicle: {
                id: bookingData.vehicle.id,
                name: bookingData.vehicle.name,
                price: selectedVehicle.price,
            },
            numVehicles: bookingData.numVehicles,
            specialRequests: bookingData.specialRequests || "",
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            branding: hourlyBooking_1.EXECUTIVE_CARS_BRANDING,
        };
        // Add booking details based on type
        if (bookingData.oneWayDetails) {
            permanentBooking.oneWayDetails = bookingData.oneWayDetails;
        }
        if (bookingData.hourlyDetails) {
            permanentBooking.hourlyDetails = bookingData.hourlyDetails;
        }
        if (bookingData.returnDetails) {
            permanentBooking.returnDetails = bookingData.returnDetails;
        }
        // Generate reference number
        const referenceNumber = await generateReferenceNumber();
        // Add reference number to the permanentBooking object
        permanentBooking.referenceNumber = referenceNumber;
        // Save to hourly bookings collection
        const bookingDoc = await firebase_1.firestore
            .collection("hourlyBookings")
            .add(permanentBooking);
        console.log(`📅 Executive Cars booking created: ${referenceNumber} (${bookingDoc.id}) | User: ${req.user.uid} | Type: ${permanentBooking.bookingType} | Vehicle: ${permanentBooking.vehicle.name} | Price: £${permanentBooking.vehicle.price.amount}`);
        // Send booking confirmation email (non-blocking) - COMMENTED OUT
        // EmailService.sendBookingCreationEmail(
        //   permanentBooking.customer.email,
        //   {
        //     id: bookingDoc.id,
        //     referenceNumber: referenceNumber,
        //     fullName: permanentBooking.customer.fullName,
        //     pickupDate: permanentBooking.pickupDate,
        //     pickupTime: permanentBooking.pickupTime,
        //     pickupLocation: getPickupLocation(permanentBooking),
        //     dropoffLocation: getDropoffLocation(permanentBooking) || "Hourly booking",
        //     vehicleType: permanentBooking.vehicle.name,
        //     price: permanentBooking.vehicle.price.amount,
        //   }
        // ).catch((error) => {
        //   console.error("Failed to send Executive Cars booking confirmation email:", error);
        // });
        // Send WhatsApp notification to group (non-blocking)
        whatsapp_service_1.WhatsAppService.sendBookingNotification({
            id: bookingDoc.id,
            referenceNumber: referenceNumber,
            fullName: permanentBooking.customer.fullName,
            pickupDate: permanentBooking.pickupDate,
            pickupTime: permanentBooking.pickupTime,
            pickupLocation: getPickupLocation(permanentBooking),
            dropoffLocation: getDropoffLocation(permanentBooking) || "Hourly booking",
            vehicleType: permanentBooking.vehicle.name,
            price: permanentBooking.vehicle.price.amount,
            bookingType: permanentBooking.bookingType,
            phoneNumber: permanentBooking.customer.phoneNumber,
            email: permanentBooking.customer.email,
            passengers: permanentBooking.passengers,
            specialRequests: permanentBooking.specialRequests,
            hours: permanentBooking.hourlyDetails?.hours,
            returnDate: permanentBooking.returnDetails?.returnDateTime?.date,
            returnTime: permanentBooking.returnDetails?.returnDateTime?.time,
        }).catch((error) => {
            console.error("Failed to send WhatsApp notification:", error);
        });
        // Prepare confirmation response
        const confirmationResponse = {
            bookingId: bookingDoc.id,
            referenceNumber: referenceNumber,
            message: `Executive Cars ${bookingData.bookingType} booking successfully created`,
            details: {
                customerName: permanentBooking.customer.fullName,
                bookingType: permanentBooking.bookingType,
                pickupDate: permanentBooking.pickupDate,
                pickupTime: permanentBooking.pickupTime,
                pickupLocation: getPickupLocation(permanentBooking),
                vehicle: permanentBooking.vehicle.name,
                price: permanentBooking.vehicle.price,
                status: "pending",
                branding: hourlyBooking_1.EXECUTIVE_CARS_BRANDING,
                hours: permanentBooking.hourlyDetails?.hours,
                dropoffLocation: getDropoffLocation(permanentBooking) || undefined,
                returnDetails: permanentBooking.returnDetails ? {
                    returnType: permanentBooking.returnDetails.returnType,
                    returnDateTime: permanentBooking.returnDetails.returnDateTime ?
                        `${permanentBooking.returnDetails.returnDateTime.date} ${permanentBooking.returnDetails.returnDateTime.time}` : undefined,
                    waitDuration: permanentBooking.returnDetails.waitDuration,
                } : undefined,
            },
        };
        return res.status(201).json({
            success: true,
            data: confirmationResponse,
        });
    }
    catch (error) {
        console.error("Error creating Executive Cars booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "BOOKING_CREATION_FAILED",
                message: "Could not create Executive Cars booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Get current user's Executive Cars bookings
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
        // Build query for all user's Executive Cars bookings
        const query = firebase_1.firestore
            .collection("hourlyBookings")
            .where("userId", "==", req.user.uid)
            .limit(100);
        // Execute query
        const snapshot = await query.get();
        // Map results to simplified booking array for user
        const bookings = [];
        snapshot.forEach((doc) => {
            const booking = doc.data();
            bookings.push({
                id: doc.id,
                bookingType: booking.bookingType,
                pickupDate: booking.pickupDate,
                pickupTime: booking.pickupTime,
                pickupLocation: {
                    address: getPickupLocation(booking),
                },
                vehicleType: booking.vehicle.name,
                price: booking.vehicle.price.amount,
                status: booking.status,
                createdAt: booking.createdAt,
                branding: booking.branding,
                hours: booking.hourlyDetails?.hours,
                dropoffLocation: getDropoffLocation(booking) ? { address: getDropoffLocation(booking) } : undefined,
                returnDetails: booking.returnDetails ? {
                    returnType: booking.returnDetails.returnType,
                    returnDateTime: booking.returnDetails.returnDateTime ?
                        `${booking.returnDetails.returnDateTime.date} ${booking.returnDetails.returnDateTime.time}` : undefined,
                    waitDuration: booking.returnDetails.waitDuration,
                } : undefined,
            });
        });
        // Sort by creation date, newest first
        bookings.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
        console.error("Error fetching user's Executive Cars bookings:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to fetch Executive Cars bookings",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Cancel an Executive Cars booking
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
            hourlyBooking_schema_1.bookingCancelSchema.parse(req.body);
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
            .collection("hourlyBookings")
            .doc(bookingId)
            .get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    message: "Executive Cars booking not found",
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
                    message: "This Executive Cars booking has already been cancelled",
                },
            });
        }
        // Check if the booking can be cancelled
        if (!["pending", "confirmed", "assigned"].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "CANNOT_CANCEL",
                    message: `Cannot cancel an Executive Cars booking with status: ${booking.status}`,
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
            console.error("Failed to send Executive Cars booking cancellation email:", error);
        });
        // Prepare the response
        const response = {
            message: "Executive Cars booking cancelled successfully",
            id: bookingId,
            status: "cancelled",
        };
        return res.json({
            success: true,
            data: response,
        });
    }
    catch (error) {
        console.error("Error cancelling Executive Cars booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to cancel Executive Cars booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Helper methods to get pickup and dropoff locations based on booking type
function getPickupLocation(booking) {
    switch (booking.bookingType) {
        case "one-way":
            return booking.oneWayDetails?.pickupLocation.address || "Unknown";
        case "hourly":
            return booking.hourlyDetails?.pickupLocation.address || "Unknown";
        case "return":
            return booking.returnDetails?.outboundPickup.address || "Unknown";
        default:
            return "Unknown";
    }
}
function getDropoffLocation(booking) {
    switch (booking.bookingType) {
        case "one-way":
            return booking.oneWayDetails?.dropoffLocation.address || null;
        case "hourly":
            return booking.hourlyDetails?.dropoffLocation?.address || null;
        case "return":
            return booking.returnDetails?.outboundDropoff.address || null;
        default:
            return null;
    }
}
exports.default = router;
