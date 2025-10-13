"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminBookingUpdateSchema = void 0;
const zod_1 = require("zod");
// Schema for admin booking updates
exports.adminBookingUpdateSchema = zod_1.z.object({
    // Basic booking information
    bookingType: zod_1.z.enum(["one-way", "return", "hourly"]).optional(),
    status: zod_1.z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
    // Customer information (email cannot be changed)
    firstName: zod_1.z.string().min(1, "First name is required").optional(),
    lastName: zod_1.z.string().min(1, "Last name is required").optional(),
    phone: zod_1.z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional(),
    // Location information
    locations: zod_1.z.object({
        pickup: zod_1.z.object({
            address: zod_1.z.string().min(1, "Pickup address is required").optional(),
            coordinates: zod_1.z.object({
                lat: zod_1.z.number().min(-90).max(90, "Invalid latitude").optional(),
                lng: zod_1.z.number().min(-180).max(180, "Invalid longitude").optional(),
            }).optional(),
        }).optional(),
        dropoff: zod_1.z.object({
            address: zod_1.z.string().min(1, "Dropoff address is required").optional(),
            coordinates: zod_1.z.object({
                lat: zod_1.z.number().min(-90).max(90, "Invalid latitude").optional(),
                lng: zod_1.z.number().min(-180).max(180, "Invalid longitude").optional(),
            }).optional(),
        }).optional(),
        additionalStops: zod_1.z.array(zod_1.z.object({
            address: zod_1.z.string().min(1, "Stop address is required"),
            coordinates: zod_1.z.object({
                lat: zod_1.z.number().min(-90).max(90, "Invalid latitude"),
                lng: zod_1.z.number().min(-180).max(180, "Invalid longitude"),
            }),
        })).optional(),
    }).optional(),
    // Date and time information
    pickupDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
    pickupTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)").optional(),
    returnDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
    returnTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)").optional(),
    // Vehicle information
    vehicleType: zod_1.z.enum(["saloon", "executive-saloon", "executive-mpv", "luxury-vehicle", "mpv-6", "mpv-8"]).optional(),
    // Pricing information (admin can override all pricing)
    pricing: zod_1.z.object({
        baseFare: zod_1.z.number().min(0, "Base fare must be positive").optional(),
        distanceCharge: zod_1.z.number().min(0, "Distance charge must be positive").optional(),
        timeCharge: zod_1.z.number().min(0, "Time charge must be positive").optional(),
        airportFee: zod_1.z.number().min(0, "Airport fee must be positive").optional(),
        waitingCharge: zod_1.z.number().min(0, "Waiting charge must be positive").optional(),
        totalFare: zod_1.z.number().min(0, "Total fare must be positive").optional(),
        hourlyRate: zod_1.z.number().min(0, "Hourly rate must be positive").optional(),
    }).optional(),
    // Distance and duration (admin can override)
    distance: zod_1.z.object({
        miles: zod_1.z.number().min(0, "Distance must be positive").optional(),
        kilometers: zod_1.z.number().min(0, "Distance must be positive").optional(),
        duration: zod_1.z.number().min(0, "Duration must be positive").optional(), // in minutes
    }).optional(),
    // Hourly booking specific fields
    hours: zod_1.z.number().int().min(3).max(24, "Hours must be between 3 and 24").optional(),
    // Additional information
    passengers: zod_1.z.number().int().min(1, "At least 1 passenger required").optional(),
    luggage: zod_1.z.number().int().min(0, "Luggage count cannot be negative").optional(),
    specialRequests: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(), // Admin notes
    // Payment information
    paymentMethod: zod_1.z.enum(["cash", "card", "corporate"]).optional(),
    paymentStatus: zod_1.z.enum(["pending", "paid", "failed", "refunded"]).optional(),
    // Driver assignment
    driverId: zod_1.z.string().optional(),
    driverName: zod_1.z.string().optional(),
    driverPhone: zod_1.z.string().optional(),
    // Vehicle details (for confirmation messages)
    vehicleMake: zod_1.z.string().optional(),
    vehicleColor: zod_1.z.string().optional(),
    vehicleReg: zod_1.z.string().optional(),
    // Flight information (for airport transfers)
    flightNumber: zod_1.z.string().optional(),
    terminal: zod_1.z.string().optional(),
    // Travel information
    travelInformation: zod_1.z.object({
        type: zod_1.z.enum(["flight", "train"]).optional(),
        details: zod_1.z.object({
            flightNumber: zod_1.z.string().optional(),
            terminal: zod_1.z.string().optional(),
            trainNumber: zod_1.z.string().optional(),
            station: zod_1.z.string().optional(),
        }).optional(),
    }).optional(),
    // Payment methods
    paymentMethods: zod_1.z.object({
        cashOnArrival: zod_1.z.boolean().optional(),
        cardOnArrival: zod_1.z.boolean().optional(),
    }).optional(),
    // Additional booking details
    waitingTime: zod_1.z.number().min(0, "Waiting time cannot be negative").optional(),
    numVehicles: zod_1.z.number().int().min(1, "At least 1 vehicle required").optional(),
    // Admin override flags
    adminOverride: zod_1.z.object({
        pricingOverridden: zod_1.z.boolean().optional(),
        distanceOverridden: zod_1.z.boolean().optional(),
        timeOverridden: zod_1.z.boolean().optional(),
        reason: zod_1.z.string().optional(), // Reason for override
    }).optional(),
}).refine((data) => {
    // If return booking, ensure return date and time are provided
    if (data.bookingType === "return") {
        return data.returnDate && data.returnTime;
    }
    return true;
}, {
    message: "Return date and time are required for return bookings",
    path: ["returnDate", "returnTime"],
}).refine((data) => {
    // If hourly booking, ensure hours are provided
    if (data.bookingType === "hourly") {
        return data.hours !== undefined;
    }
    return true;
}, {
    message: "Hours are required for hourly bookings",
    path: ["hours"],
});
