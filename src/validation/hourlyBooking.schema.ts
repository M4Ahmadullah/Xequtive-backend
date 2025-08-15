/**
 * XEQUTIVE CARS - Executive Cars Booking Validation Schemas
 * 
 * This file contains Zod validation schemas for the Executive Cars booking system,
 * which is separate from the standard Executive Taxi system.
 * 
 * Executive Cars supports three booking types:
 * 1. One-Way: Point-to-point journeys with Executive Cars pricing
 * 2. Hourly: 3-12 hours of continuous service with tiered pricing
 * 3. Return: Round-trip journeys with 10% discount
 * 
 * Key Features:
 * - Tiered hourly pricing (3-6 hours vs 6-12 hours)
 * - Return booking discount (10%)
 * - Time-based surcharges (weekday/weekend)
 * - Multiple vehicle support
 * - Group/Organisation booking support
 * 
 * @author Xequtive Development Team
 * @version 2.0.0
 * @since 2024-01-15
 */

import { z } from "zod";

// Coordinates validation
const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Location validation
const locationSchema = z.object({
  address: z.string().min(1, "Address is required"),
  coordinates: coordinatesSchema,
});

// Customer validation
const customerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email format"),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  groupName: z.string().optional(),
});

// DateTime validation
const dateTimeSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
});

// Passengers validation
const passengersSchema = z.object({
  count: z.number().min(1, "At least 1 passenger required"),
  luggage: z.number().min(0, "Luggage count cannot be negative"),
});

// Vehicle validation
const vehicleSchema = z.object({
  id: z.string().min(1, "Vehicle ID is required"),
  name: z.string().min(1, "Vehicle name is required"),
});

// One-Way booking details validation
const oneWayDetailsSchema = z.object({
  pickupLocation: locationSchema,
  dropoffLocation: locationSchema,
  additionalStops: z.array(locationSchema).optional(),
});

// Hourly booking details validation
// Supports tiered pricing: 3-6 hours (higher rates) vs 6-12 hours (lower rates)
const hourlyDetailsSchema = z.object({
  hours: z.number().min(3, "Minimum 3 hours required").max(12, "Maximum 12 hours allowed"),
  pickupLocation: locationSchema,
  dropoffLocation: locationSchema.optional(),
  additionalStops: z.array(locationSchema).optional(),
});

// Return booking details validation
// All return bookings receive a 10% discount on the total fare
const returnDetailsSchema = z.object({
  // Outbound journey
  outboundPickup: locationSchema,
  outboundDropoff: locationSchema,
  outboundDateTime: dateTimeSchema,
  outboundStops: z.array(locationSchema).optional(),
  
  // Return journey
  returnType: z.enum(["wait-and-return", "later-date"]),
  returnPickup: locationSchema.optional(),
  returnDropoff: locationSchema.optional(),
  returnDateTime: dateTimeSchema.optional(),
  waitDuration: z.number().min(0).optional(),
  returnStops: z.array(locationSchema).optional(),
});

// Fare estimate request validation for all booking types
export const fareEstimateSchema = z.object({
  bookingType: z.enum(["one-way", "hourly", "return"]),
  datetime: dateTimeSchema,
  passengers: passengersSchema,
  numVehicles: z.number().min(1).optional(),
  
  // One-Way specific
  oneWayDetails: z.object({
    pickupLocation: coordinatesSchema,
    dropoffLocation: coordinatesSchema,
    additionalStops: z.array(coordinatesSchema).optional(),
  }).optional(),
  
  // Hourly specific
  hourlyDetails: z.object({
    hours: z.number().min(3).max(12),
    pickupLocation: coordinatesSchema,
    dropoffLocation: coordinatesSchema.optional(),
    additionalStops: z.array(coordinatesSchema).optional(),
  }).optional(),
  
  // Return specific
  returnDetails: z.object({
    outboundPickup: coordinatesSchema,
    outboundDropoff: coordinatesSchema,
    outboundDateTime: dateTimeSchema,
    outboundStops: z.array(coordinatesSchema).optional(),
    returnType: z.enum(["wait-and-return", "later-date"]),
    returnPickup: coordinatesSchema.optional(),
    returnDropoff: coordinatesSchema.optional(),
    returnDateTime: dateTimeSchema.optional(),
    waitDuration: z.number().min(0).optional(),
    returnStops: z.array(coordinatesSchema).optional(),
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
export const bookingCreateSchema = z.object({
  customer: customerSchema,
  bookingType: z.enum(["one-way", "hourly", "return"]),
  datetime: dateTimeSchema,
  passengers: passengersSchema,
  vehicle: vehicleSchema,
  numVehicles: z.number().min(1).optional(),
  specialRequests: z.string().optional(),
  
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
export const bookingCancelSchema = z.object({
  cancellationReason: z.string().optional(),
});

// Export types
export type FareEstimateRequest = z.infer<typeof fareEstimateSchema>;
export type BookingCreateRequest = z.infer<typeof bookingCreateSchema>;
export type BookingCancelRequest = z.infer<typeof bookingCancelSchema>; 