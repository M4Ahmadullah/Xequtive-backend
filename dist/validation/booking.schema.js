"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingSchema = exports.fareEstimateSchema = void 0;
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
// Booking validation
exports.bookingSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1, "Full name is required"),
    email: zod_1.z.string().email("Invalid email format"),
    phone: zod_1.z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
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
