import { z } from "zod";

// Schema for admin booking updates
export const adminBookingUpdateSchema = z.object({
  // Basic booking information
  bookingType: z.enum(["one-way", "return", "hourly"]).optional(),
  status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
  
  // Customer information (email cannot be changed)
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional(),
  
  // Location information
  locations: z.object({
    pickup: z.object({
      address: z.string().min(1, "Pickup address is required").optional(),
      coordinates: z.object({
        lat: z.number().min(-90).max(90, "Invalid latitude").optional(),
        lng: z.number().min(-180).max(180, "Invalid longitude").optional(),
      }).optional(),
    }).optional(),
    dropoff: z.object({
      address: z.string().min(1, "Dropoff address is required").optional(),
      coordinates: z.object({
        lat: z.number().min(-90).max(90, "Invalid latitude").optional(),
        lng: z.number().min(-180).max(180, "Invalid longitude").optional(),
      }).optional(),
    }).optional(),
    additionalStops: z.array(z.object({
      address: z.string().min(1, "Stop address is required"),
      coordinates: z.object({
        lat: z.number().min(-90).max(90, "Invalid latitude"),
        lng: z.number().min(-180).max(180, "Invalid longitude"),
      }),
    })).optional(),
  }).optional(),
  
  // Date and time information
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)").optional(),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
  returnTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)").optional(),
  
  // Vehicle information
  vehicleType: z.enum(["saloon", "executive-saloon", "executive-mpv", "luxury-vehicle", "mpv-6", "mpv-8"]).optional(),
  
  // Pricing information (admin can override all pricing)
  pricing: z.object({
    baseFare: z.number().min(0, "Base fare must be positive").optional(),
    distanceCharge: z.number().min(0, "Distance charge must be positive").optional(),
    timeCharge: z.number().min(0, "Time charge must be positive").optional(),
    airportFee: z.number().min(0, "Airport fee must be positive").optional(),
    waitingCharge: z.number().min(0, "Waiting charge must be positive").optional(),
    totalFare: z.number().min(0, "Total fare must be positive").optional(),
    hourlyRate: z.number().min(0, "Hourly rate must be positive").optional(),
  }).optional(),
  
  // Distance and duration (admin can override)
  distance: z.object({
    miles: z.number().min(0, "Distance must be positive").optional(),
    kilometers: z.number().min(0, "Distance must be positive").optional(),
    duration: z.number().min(0, "Duration must be positive").optional(), // in minutes
  }).optional(),
  
  // Hourly booking specific fields
  hours: z.number().int().min(3).max(24, "Hours must be between 3 and 24").optional(),
  
  // Additional information
  passengers: z.number().int().min(1, "At least 1 passenger required").optional(),
  luggage: z.number().int().min(0, "Luggage count cannot be negative").optional(),
  specialRequests: z.string().optional(),
  notes: z.string().optional(), // Admin notes
  
  // Payment information
  paymentMethod: z.enum(["cash", "card", "corporate"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  
  // Driver assignment
  driverId: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  
  // Vehicle details (for confirmation messages)
  vehicleMake: z.string().optional(),
  vehicleColor: z.string().optional(),
  vehicleReg: z.string().optional(),
  
  // Flight information (for airport transfers)
  flightNumber: z.string().optional(),
  terminal: z.string().optional(),
  
  // Travel information
  travelInformation: z.object({
    type: z.enum(["flight", "train"]).optional(),
    details: z.object({
      flightNumber: z.string().optional(),
      terminal: z.string().optional(),
      trainNumber: z.string().optional(),
      station: z.string().optional(),
    }).optional(),
  }).optional(),
  
  // Payment methods
  paymentMethods: z.object({
    cashOnArrival: z.boolean().optional(),
    cardOnArrival: z.boolean().optional(),
  }).optional(),
  
  // Additional booking details
  waitingTime: z.number().min(0, "Waiting time cannot be negative").optional(),
  numVehicles: z.number().int().min(1, "At least 1 vehicle required").optional(),
  
  // Admin override flags
  adminOverride: z.object({
    pricingOverridden: z.boolean().optional(),
    distanceOverridden: z.boolean().optional(),
    timeOverridden: z.boolean().optional(),
    reason: z.string().optional(), // Reason for override
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

export type AdminBookingUpdateRequest = z.infer<typeof adminBookingUpdateSchema>;
