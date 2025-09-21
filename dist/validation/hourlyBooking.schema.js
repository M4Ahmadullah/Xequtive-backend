"use strict";
/**
 * XEQUTIVE CARS - Executive Cars Booking Validation Schemas
 *
 * This file contains Zod validation schemas for the Executive Cars booking system,
 * which is separate from the standard Executive Taxi system.
 *
 * Executive Cars supports three booking types:
 * 1. One-Way: Point-to-point journeys with Executive Cars pricing
 * 2. Hourly: 3-24 hours of continuous service with tiered pricing
 * 3. Return: Round-trip journeys with 10% discount
 *
 * Key Features:
 * - Tiered hourly pricing (3-6 hours vs 6-24 hours)
 * - Return booking discount (10%)
 * - Time-based surcharges (weekday/weekend)
 * - Multiple vehicle support
 * - Group/Organisation booking support
 *
 * @author Xequtive Development Team
 * @version 2.0.0
 * @since 2024-01-15
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingCancelSchema = exports.bookingCreateSchema = exports.fareEstimateSchema = void 0;
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
// Customer validation
const customerSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1, "Full name is required"),
    email: zod_1.z.string().email("Invalid email format"),
    phoneNumber: zod_1.z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
    groupName: zod_1.z.string().optional(),
});
// DateTime validation
const dateTimeSchema = zod_1.z.object({
    date: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    time: zod_1.z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
});
// Passengers validation
const passengersSchema = zod_1.z.object({
    count: zod_1.z.number().min(1, "At least 1 passenger required"),
    luggage: zod_1.z.number().min(0, "Luggage count cannot be negative"),
});
// Vehicle validation
const vehicleSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "Vehicle ID is required"),
    name: zod_1.z.string().min(1, "Vehicle name is required"),
});
// One-Way booking details validation
const oneWayDetailsSchema = zod_1.z.object({
    pickupLocation: locationSchema,
    dropoffLocation: locationSchema,
    additionalStops: zod_1.z.array(locationSchema).optional(),
});
// Hourly booking details validation
// Supports tiered pricing: 3-6 hours (higher rates) vs 6-24 hours (lower rates)
// Hourly bookings don't need a dropoff location - driver stays with passenger
const hourlyDetailsSchema = zod_1.z.object({
    hours: zod_1.z.number().min(3, "Minimum 3 hours required").max(24, "Maximum 24 hours allowed"),
    pickupLocation: locationSchema,
    // No dropoff location needed for hourly bookings
    additionalStops: zod_1.z.array(locationSchema).optional(),
});
// Return booking details validation
const returnDetailsSchema = zod_1.z.object({
    // Outbound journey
    outboundPickup: locationSchema,
    outboundDropoff: locationSchema,
    outboundDateTime: dateTimeSchema,
    outboundStops: zod_1.z.array(locationSchema).optional(),
    // Return journey
    returnType: zod_1.z.enum(["wait-and-return", "later-date"]),
    returnPickup: locationSchema.optional(), // For later-date returns
    returnDropoff: locationSchema.optional(), // For later-date returns
    returnDateTime: dateTimeSchema.optional(), // For later-date returns
    waitDuration: zod_1.z.number().min(0).optional(), // Hours for wait-and-return
    returnStops: zod_1.z.array(locationSchema).optional(),
});
// Fare estimate request validation for all booking types
exports.fareEstimateSchema = zod_1.z.object({
    bookingType: zod_1.z.enum(["one-way", "hourly", "return"]),
    datetime: dateTimeSchema,
    passengers: passengersSchema,
    numVehicles: zod_1.z.number().min(1).optional(),
    // One-Way specific
    oneWayDetails: zod_1.z.object({
        pickupLocation: coordinatesSchema,
        dropoffLocation: coordinatesSchema,
        additionalStops: zod_1.z.array(coordinatesSchema).optional(),
    }).optional(),
    // Hourly specific
    hourlyDetails: zod_1.z.object({
        hours: zod_1.z.number().min(3).max(24),
        pickupLocation: coordinatesSchema,
        // No dropoff location needed for hourly bookings
        additionalStops: zod_1.z.array(coordinatesSchema).optional(),
    }).optional(),
    // Return specific
    returnDetails: zod_1.z.object({
        outboundPickup: coordinatesSchema,
        outboundDropoff: coordinatesSchema,
        outboundDateTime: dateTimeSchema,
        outboundStops: zod_1.z.array(coordinatesSchema).optional(),
        returnType: zod_1.z.enum(["wait-and-return", "later-date"]),
        returnPickup: coordinatesSchema.optional(),
        returnDropoff: coordinatesSchema.optional(),
        returnDateTime: dateTimeSchema.optional(),
        waitDuration: zod_1.z.number().min(0).optional(),
        returnStops: zod_1.z.array(coordinatesSchema).optional(),
    }).optional(),
}).refine((data) => {
    // Validate that the appropriate details are provided based on booking type
    switch (data.bookingType) {
        case "one-way":
            return !!data.oneWayDetails;
        case "hourly":
            return !!data.hourlyDetails;
        case "return":
            return !!data.returnDetails;
        default:
            return false;
    }
}, {
    message: "Booking details must match the selected booking type",
    path: ["bookingType"],
});
// Booking create request validation
exports.bookingCreateSchema = zod_1.z.object({
    customer: customerSchema,
    bookingType: zod_1.z.enum(["one-way", "hourly", "return"]),
    datetime: dateTimeSchema,
    passengers: passengersSchema,
    vehicle: vehicleSchema,
    numVehicles: zod_1.z.number().min(1).optional(),
    specialRequests: zod_1.z.string().optional(),
    // Booking details based on type
    oneWayDetails: oneWayDetailsSchema.optional(),
    hourlyDetails: hourlyDetailsSchema.optional(),
    returnDetails: returnDetailsSchema.optional(),
}).refine((data) => {
    // Validate that the appropriate details are provided based on booking type
    switch (data.bookingType) {
        case "one-way":
            return !!data.oneWayDetails;
        case "hourly":
            return !!data.hourlyDetails;
        case "return":
            return !!data.returnDetails;
        default:
            return false;
    }
}, {
    message: "Booking details must match the selected booking type",
    path: ["bookingType"],
});
// Booking cancellation validation
exports.bookingCancelSchema = zod_1.z.object({
    cancellationReason: zod_1.z.string().optional(),
});
