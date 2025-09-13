import { Request } from "express";
import { Coordinates } from "./index";

// Booking types for Executive Cars
export type BookingType = "one-way" | "hourly" | "return";

// Return booking subtypes
export type ReturnType = "wait-and-return" | "later-date";

// Branding information for Executive Cars
export const EXECUTIVE_CARS_BRANDING = {
  name: "Executive Cars",
  description: "Premium event and group transportation services",
  type: "executive-cars",
  category: "event-group-booking"
} as const;

export interface HourlyBookingCustomer {
  fullName: string;
  email: string;
  phoneNumber: string;
  groupName?: string; // Group/Organisation name
}

export interface HourlyBookingLocation {
  address: string;
  coordinates: Coordinates;
}

export interface HourlyBookingDateTime {
  date: string; // Format: YYYY-MM-DD
  time: string; // Format: HH:MM (24-hour)
}

export interface HourlyBookingPassengers {
  count: number;
  luggage: number; // Total luggage count
}

export interface HourlyBookingVehicle {
  id: string;
  name: string;
}

// One-Way booking details
export interface OneWayBookingDetails {
  pickupLocation: HourlyBookingLocation;
  dropoffLocation: HourlyBookingLocation;
  additionalStops?: HourlyBookingLocation[];
}

// Hourly booking details
export interface HourlyBookingDetails {
  hours: number; // 3-24 hours
  pickupLocation: HourlyBookingLocation;
  dropoffLocation?: HourlyBookingLocation; // Optional for hourly bookings
  additionalStops?: HourlyBookingLocation[];
}

// Return booking details
export interface ReturnBookingDetails {
  // Outbound journey
  outboundPickup: HourlyBookingLocation;
  outboundDropoff: HourlyBookingLocation;
  outboundDateTime: HourlyBookingDateTime;
  outboundStops?: HourlyBookingLocation[];
  
  // Return journey
  returnType: ReturnType;
  returnPickup?: HourlyBookingLocation; // For later-date returns
  returnDropoff?: HourlyBookingLocation; // For later-date returns
  returnDateTime?: HourlyBookingDateTime; // For later-date returns
  waitDuration?: number; // Hours for wait-and-return
  returnStops?: HourlyBookingLocation[];
}

export interface HourlyBookingData {
  userId: string;
  customer: HourlyBookingCustomer;
  bookingType: BookingType;
  pickupDate: string;
  pickupTime: string;
  passengers: HourlyBookingPassengers;
  vehicle: {
    id: string;
    name: string;
    price: {
      amount: number;
      currency: string;
    };
  };
  // Booking details based on type
  oneWayDetails?: OneWayBookingDetails;
  hourlyDetails?: HourlyBookingDetails;
  returnDetails?: ReturnBookingDetails;
  numVehicles?: number;
  specialRequests?: string;
  status: string;
  referenceNumber: string; // XEQ_100, XEQ_101, etc.
  createdAt: string;
  updatedAt: string;
  // Executive Cars specific fields
  branding: typeof EXECUTIVE_CARS_BRANDING;
}

export interface HourlyBookingCancelRequest {
  cancellationReason?: string;
}

export interface HourlyBookingCancelResponse {
  message: string;
  id: string;
  status: string;
}

// Request types for Express
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    displayName?: string;
    role: string;
  };
}

// Fare estimate request for all booking types
export interface FareEstimateRequest {
  bookingType: BookingType;
  
  // Common fields
  datetime: HourlyBookingDateTime;
  passengers: HourlyBookingPassengers;
  numVehicles?: number;
  
  // One-Way specific
  oneWayDetails?: {
    pickupLocation: Coordinates;
    dropoffLocation: Coordinates;
    additionalStops?: Coordinates[];
  };
  
  // Hourly specific
  hourlyDetails?: {
    hours: number; // 4-24
    pickupLocation: Coordinates;
    dropoffLocation?: Coordinates; // Optional
    additionalStops?: Coordinates[];
  };
  
  // Return specific
  returnDetails?: {
    outboundPickup: Coordinates;
    outboundDropoff: Coordinates;
    outboundDateTime: HourlyBookingDateTime;
    outboundStops?: Coordinates[];
    returnType: ReturnType;
    returnPickup?: Coordinates;
    returnDropoff?: Coordinates;
    returnDateTime?: HourlyBookingDateTime;
    waitDuration?: number; // Hours for wait-and-return
    returnStops?: Coordinates[];
  };
}

export interface HourlyVehiclePriceInfo {
  amount: number;
  currency: string;
  messages?: string[];
  breakdown: {
    baseFare: number;
    distanceCharge?: number;
    hourlyRate?: number;
    totalHours?: number;
    equipmentFees: number;
    timeSurcharge: number;
    returnMultiplier?: number;
    waitCharge?: number;
  };
}

export interface HourlyVehicleOption {
  id: string;
  name: string;
  description: string;
  capacity: {
    passengers: number;
    luggage: number;
  };
  price: HourlyVehiclePriceInfo;
  imageUrl: string;
}

export interface FareEstimateResponse {
  vehicleOptions: HourlyVehicleOption[];
  bookingType: BookingType;
  notifications?: string[];
  pricingMessages?: string[];
  branding: typeof EXECUTIVE_CARS_BRANDING;
}

// Booking create request for all types
export interface BookingCreateRequest {
  customer: HourlyBookingCustomer;
  bookingType: BookingType;
  datetime: HourlyBookingDateTime;
  passengers: HourlyBookingPassengers;
  vehicle: HourlyBookingVehicle;
  numVehicles?: number;
  specialRequests?: string;
  
  // Booking details based on type
  oneWayDetails?: OneWayBookingDetails;
  hourlyDetails?: HourlyBookingDetails;
  returnDetails?: ReturnBookingDetails;
}

// Booking response
export interface BookingResponse {
  bookingId: string;
  message: string;
  details: {
    customerName: string;
    bookingType: BookingType;
    pickupDate: string;
    pickupTime: string;
    pickupLocation: string;
    vehicle: string;
    price: {
      amount: number;
      currency: string;
    };
    status: string;
    branding: typeof EXECUTIVE_CARS_BRANDING;
    // Additional details based on booking type
    hours?: number;
    dropoffLocation?: string;
    returnDetails?: {
      returnType: ReturnType;
      returnDateTime?: string;
      waitDuration?: number;
    };
  };
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: string;
  };
} 