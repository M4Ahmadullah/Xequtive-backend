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

// Vehicle types
const validVehicleTypes = [
  "Standard Saloon",
  "Executive Saloon",
  "Executive MPV",
  "Luxury Vehicle",
] as const;

// Fare estimation request validation
export const fareEstimateSchema = z.object({
  pickupLocation: coordinatesSchema,
  dropoffLocation: coordinatesSchema,
  additionalStops: z.array(coordinatesSchema).optional(),
  vehicleType: z.enum(validVehicleTypes),
});

// Enhanced fare estimation request validation
export const enhancedFareEstimateSchema = z.object({
  locations: z.object({
    pickup: z.object({
      address: z.string().min(1, "Pickup address is required"),
      coordinates: coordinatesSchema,
    }),
    dropoff: z.object({
      address: z.string().min(1, "Dropoff address is required"),
      coordinates: coordinatesSchema,
    }),
    stops: z.array(z.string()).optional(),
  }),
  datetime: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  }),
  passengers: z.object({
    count: z.number().int().min(1).max(16),
    checkedLuggage: z.number().int().min(0).max(8),
    handLuggage: z.number().int().min(0).max(8),
    mediumLuggage: z.number().int().min(0).max(8),
    babySeat: z.number().int().min(0).max(5),
    boosterSeat: z.number().int().min(0).max(5),
    childSeat: z.number().int().min(0).max(5),
    wheelchair: z.number().int().min(0).max(2),
  }),
});

// Booking validation
export const bookingSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email format"),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  pickupDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  pickupTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  pickupLocation: locationSchema,
  dropoffLocation: locationSchema,
  additionalStops: z.array(locationSchema).optional(),
  passengers: z.number().int().min(1).max(8),
  checkedLuggage: z.number().int().min(0),
  handLuggage: z.number().int().min(0),
  preferredVehicle: z.enum(validVehicleTypes),
  specialRequests: z.string().optional(),
  fareEstimate: z.number().positive(),
});

// Flight information validation
const flightInformationSchema = z.object({
  airline: z.string().min(1, "Airline name is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  departureAirport: z.string().optional(),
  arrivalAirport: z.string().optional(),
  scheduledDeparture: z.string().datetime({ offset: true }),
  actualDeparture: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["on-time", "delayed", "cancelled"]).optional(),
});

// Train information validation
const trainInformationSchema = z.object({
  trainOperator: z.string().min(1, "Train operator is required"),
  trainNumber: z.string().min(1, "Train number is required"),
  departureStation: z.string().optional(),
  arrivalStation: z.string().optional(),
  scheduledDeparture: z.string().datetime({ offset: true }),
  actualDeparture: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["on-time", "delayed", "cancelled"]).optional(),
});

// Update the enhanced booking create schema to include optional travel information
export const enhancedBookingCreateSchema = z.object({
  customer: z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email format"),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  }),
  booking: z.object({
    locations: z.object({
      pickup: z.object({
        address: z.string().min(1, "Pickup address is required"),
        coordinates: coordinatesSchema,
      }),
      dropoff: z.object({
        address: z.string().min(1, "Dropoff address is required"),
        coordinates: coordinatesSchema,
      }),
      additionalStops: z
        .array(
          z.object({
            address: z.string().min(1, "Additional stop address is required"),
            coordinates: coordinatesSchema,
          })
        )
        .optional(),
    }),
    datetime: z.object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
      time: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
    }),
    passengers: z.object({
      count: z.number().int().min(1).max(16),
      checkedLuggage: z.number().int().min(0).max(8),
      handLuggage: z.number().int().min(0).max(8),
      mediumLuggage: z.number().int().min(0).max(8),
      babySeat: z.number().int().min(0).max(5),
      childSeat: z.number().int().min(0).max(5),
      boosterSeat: z.number().int().min(0).max(5),
      wheelchair: z.number().int().min(0).max(2),
    }),
    vehicle: z.object({
      id: z.string().min(1, "Vehicle ID is required"),
      name: z.string().min(1, "Vehicle name is required"),
    }),
    specialRequests: z.string().optional(),
    travelInformation: z
      .object({
        type: z.enum(["flight", "train"]),
        details: z.discriminatedUnion("type", [
          flightInformationSchema.extend({ type: z.literal("flight") }),
          trainInformationSchema.extend({ type: z.literal("train") }),
        ]),
      })
      .optional(),
  }),
});

// Booking confirmation validation for second step
export const bookingConfirmSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  verificationToken: z.string().min(1, "Verification token is required"),
  customerConsent: z.boolean().refine((val) => val === true, {
    message: "Customer consent is required to confirm booking",
  }),
});

// Booking cancellation validation
export const bookingCancelSchema = z.object({
  cancellationReason: z.string().optional(),
});

// Updated vehicle types to match the enhanced fare calculation
export const validVehicleIds = [
  "standard-saloon",
  "estate",
  "large-mpv",
  "extra-large-mpv",
  "executive-saloon",
  "executive-large-mpv",
  "vip",
  "vip-mpv",
  "wheelchair-accessible",
] as const;

// All possible booking status values
export const bookingStatusValues = [
  "pending",
  "accepted",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "declined",
  "no_show",
] as const;

// Types for the schema
export type EnhancedBookingCreateRequest = z.infer<
  typeof enhancedBookingCreateSchema
>;
export type BookingConfirmRequest = z.infer<typeof bookingConfirmSchema>;
export type BookingStatus = (typeof bookingStatusValues)[number];
export type VehicleId = (typeof validVehicleIds)[number];
