"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingStatusValues = exports.validVehicleIds = exports.bookingCancelSchema = exports.bookingConfirmSchema = exports.enhancedBookingCreateSchema = exports.bookingSchema = exports.enhancedFareEstimateSchema = exports.fareEstimateSchema = void 0;
const zod_1 = require("zod");
// Coordinates validation
const coordinatesSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
});
// Location validation
const locationSchema = zod_1.z.object({
    address: zod_1.z.string().min(1, "Address is required"),
    coordinates: coordinatesSchema,
});
// Vehicle types
const validVehicleTypes = [
    "Standard Saloon",
    "Executive Saloon",
    "Executive MPV",
    "Luxury Vehicle",
];
// Fare estimation request validation
exports.fareEstimateSchema = zod_1.z.object({
    pickupLocation: coordinatesSchema,
    dropoffLocation: coordinatesSchema,
    additionalStops: zod_1.z.array(coordinatesSchema).optional(),
    vehicleType: zod_1.z.enum(validVehicleTypes),
});
// Enhanced fare estimation request validation
exports.enhancedFareEstimateSchema = zod_1.z.object({
    locations: zod_1.z.object({
        pickup: zod_1.z.object({
            address: zod_1.z.string().min(1, "Pickup address is required"),
            coordinates: coordinatesSchema,
        }),
        dropoff: zod_1.z.object({
            address: zod_1.z.string().min(1, "Dropoff address is required"),
            coordinates: coordinatesSchema,
        }).optional(), // Make dropoff optional - will be validated conditionally
        stops: zod_1.z.array(zod_1.z.string()).optional(), // Stops allowed for one-way, not for return
    }),
    datetime: zod_1.z.object({
        date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
        time: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
    }),
    passengers: zod_1.z.object({
        count: zod_1.z.number().int().min(1).max(16),
        checkedLuggage: zod_1.z.number().int().min(0).max(8),
        handLuggage: zod_1.z.number().int().min(0).max(8),
        mediumLuggage: zod_1.z.number().int().min(0).max(8),
        babySeat: zod_1.z.number().int().min(0).max(5),
        boosterSeat: zod_1.z.number().int().min(0).max(5),
        childSeat: zod_1.z.number().int().min(0).max(5),
        wheelchair: zod_1.z.number().int().min(0).max(2),
    }),
    bookingType: zod_1.z.enum(["one-way", "hourly", "return"]).default("one-way"),
    hours: zod_1.z.number().int().min(3).max(24).optional(), // Required for hourly bookings
    returnDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid return date format (YYYY-MM-DD)").optional(), // Required for return bookings
    returnTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid return time format (HH:mm)").optional(), // Required for return bookings
}).refine((data) => {
    // Conditional validation based on booking type
    if (data.bookingType === "hourly") {
        // Hourly bookings don't need dropoff location but need hours
        if (data.hours === undefined || data.hours < 3 || data.hours > 24) {
            return false;
        }
        return true;
    }
    else if (data.bookingType === "return") {
        // Return bookings need dropoff location, return date, and return time
        if (!data.locations.dropoff || !data.returnDate || !data.returnTime) {
            return false;
        }
        // Return bookings should not have stops (will use smart reverse route)
        if (data.locations.stops && data.locations.stops.length > 0) {
            return false;
        }
        return true;
    }
    else {
        // One-way bookings need dropoff location
        if (!data.locations.dropoff) {
            return false;
        }
        return true;
    }
}, {
    message: "Validation failed based on booking type",
    path: ["bookingType"],
});
// Booking validation
exports.bookingSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1, "Full name is required"),
    email: zod_1.z.string().email("Invalid email format"),
    phoneNumber: zod_1.z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
    pickupDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    pickupTime: zod_1.z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
    pickupLocation: locationSchema,
    dropoffLocation: locationSchema,
    additionalStops: zod_1.z.array(locationSchema).optional(),
    passengers: zod_1.z.number().int().min(1).max(8),
    checkedLuggage: zod_1.z.number().int().min(0),
    handLuggage: zod_1.z.number().int().min(0),
    preferredVehicle: zod_1.z.enum(validVehicleTypes),
    specialRequests: zod_1.z.string().optional(),
    fareEstimate: zod_1.z.number().positive(),
});
// Flight information validation
const flightInformationSchema = zod_1.z.object({
    type: zod_1.z.literal("flight"),
    airline: zod_1.z.string().min(1, "Airline name is required"),
    flightNumber: zod_1.z.string().min(1, "Flight number is required"),
    departureAirport: zod_1.z.string().optional(),
    arrivalAirport: zod_1.z.string().optional(),
    scheduledDeparture: zod_1.z.string().datetime({ offset: true }),
    actualDeparture: zod_1.z.string().datetime({ offset: true }).optional(),
    status: zod_1.z.enum(["on-time", "delayed", "cancelled"]).optional(),
});
// Train information validation
const trainInformationSchema = zod_1.z.object({
    type: zod_1.z.literal("train"),
    trainOperator: zod_1.z.string().min(1, "Train operator is required"),
    trainNumber: zod_1.z.string().min(1, "Train number is required"),
    departureStation: zod_1.z.string().optional(),
    arrivalStation: zod_1.z.string().optional(),
    scheduledDeparture: zod_1.z.string().datetime({ offset: true }),
    actualDeparture: zod_1.z.string().datetime({ offset: true }).optional(),
    status: zod_1.z.enum(["on-time", "delayed", "cancelled"]).optional(),
});
// Update the enhanced booking create schema to include optional travel information
exports.enhancedBookingCreateSchema = zod_1.z.object({
    customer: zod_1.z.object({
        fullName: zod_1.z.string().min(1, "Full name is required"),
        email: zod_1.z.string().email("Invalid email format"),
        phoneNumber: zod_1.z
            .string()
            .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
    }),
    booking: zod_1.z.object({
        locations: zod_1.z.object({
            pickup: zod_1.z.object({
                address: zod_1.z.string().min(1, "Pickup address is required"),
                coordinates: coordinatesSchema,
            }),
            dropoff: zod_1.z.object({
                address: zod_1.z.string().min(1, "Dropoff address is required"),
                coordinates: coordinatesSchema,
            }).optional(), // Make dropoff optional for hourly bookings
            // Additional stops removed for return bookings - will use smart reverse route
            additionalStops: zod_1.z
                .array(zod_1.z.object({
                address: zod_1.z.string().min(1, "Additional stop address is required"),
                coordinates: coordinatesSchema,
            }))
                .optional(),
        }),
        datetime: zod_1.z.object({
            date: zod_1.z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
            time: zod_1.z
                .string()
                .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
        }),
        passengers: zod_1.z.object({
            count: zod_1.z.number().int().min(1).max(16),
            checkedLuggage: zod_1.z.number().int().min(0).max(8),
            handLuggage: zod_1.z.number().int().min(0).max(8),
            mediumLuggage: zod_1.z.number().int().min(0).max(8),
            babySeat: zod_1.z.number().int().min(0).max(5),
            childSeat: zod_1.z.number().int().min(0).max(5),
            boosterSeat: zod_1.z.number().int().min(0).max(5),
            wheelchair: zod_1.z.number().int().min(0).max(2),
        }),
        vehicle: zod_1.z.object({
            id: zod_1.z.string().min(1, "Vehicle ID is required"),
            name: zod_1.z.string().min(1, "Vehicle name is required"),
        }),
        specialRequests: zod_1.z.string().optional(),
        bookingType: zod_1.z.enum(["one-way", "hourly", "return"]).default("one-way"),
        hours: zod_1.z.number().int().min(3).max(24).optional(), // Required for hourly bookings
        returnDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid return date format (YYYY-MM-DD)").optional(), // Required for return bookings
        returnTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid return time format (HH:mm)").optional(), // Required for return bookings
        paymentMethods: zod_1.z.object({
            cashOnArrival: zod_1.z.boolean().default(false),
            cardOnArrival: zod_1.z.boolean().default(false),
        }).refine((data) => {
            // Only one payment method can be selected (or neither)
            const selectedCount = (data.cashOnArrival ? 1 : 0) + (data.cardOnArrival ? 1 : 0);
            return selectedCount <= 1;
        }, {
            message: "Only one payment method can be selected (Cash on Arrival OR Card on Arrival, not both)",
        }).optional(),
        travelInformation: zod_1.z
            .object({
            type: zod_1.z.enum(["flight", "train"]),
            details: zod_1.z.discriminatedUnion("type", [
                flightInformationSchema,
                trainInformationSchema,
            ]),
        })
            .optional(),
    }),
}).refine((data) => {
    // Conditional validation based on booking type
    if (data.booking.bookingType === "hourly") {
        // Hourly bookings don't need dropoff location but need hours
        if (data.booking.hours === undefined || data.booking.hours < 3 || data.booking.hours > 24) {
            return false;
        }
        return true;
    }
    else if (data.booking.bookingType === "return") {
        // Return bookings need dropoff location, return date, and return time
        if (!data.booking.locations.dropoff || !data.booking.returnDate || !data.booking.returnTime) {
            return false;
        }
        // Return bookings should not have additional stops (will use smart reverse route)
        if (data.booking.locations.additionalStops && data.booking.locations.additionalStops.length > 0) {
            return false;
        }
        return true;
    }
    else {
        // One-way bookings need dropoff location
        if (!data.booking.locations.dropoff) {
            return false;
        }
        return true;
    }
}, {
    message: "Validation failed based on booking type",
    path: ["booking", "bookingType"],
});
// Booking confirmation validation for second step
exports.bookingConfirmSchema = zod_1.z.object({
    bookingId: zod_1.z.string().min(1, "Booking ID is required"),
    verificationToken: zod_1.z.string().min(1, "Verification token is required"),
    customerConsent: zod_1.z.boolean().refine((val) => val === true, {
        message: "Customer consent is required to confirm booking",
    }),
});
// Booking cancellation validation
exports.bookingCancelSchema = zod_1.z.object({
    cancellationReason: zod_1.z.string().optional(),
});
// Updated vehicle types to match the enhanced fare calculation
exports.validVehicleIds = [
    "standard-saloon",
    "estate",
    "large-mpv",
    "extra-large-mpv",
    "executive-saloon",
    "executive-large-mpv",
    "vip",
    "vip-mpv",
    "wheelchair-accessible",
];
// All possible booking status values
exports.bookingStatusValues = [
    "pending",
    "accepted",
    "confirmed",
    "assigned",
    "in_progress",
    "completed",
    "cancelled",
    "declined",
    "no_show",
];
