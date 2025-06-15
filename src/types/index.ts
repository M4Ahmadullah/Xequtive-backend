import { Request } from "express";

export type UserRole = "user" | "admin";
export type AuthProvider = "email" | "google" | "apple";

export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  role: UserRole;
  profileComplete?: boolean;
  authProvider?: AuthProvider;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserData;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  address: string;
  coordinates: Coordinates;
}

export interface BookingData {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: {
    address: string;
    coordinates: Coordinates;
  };
  dropoffLocation: {
    address: string;
    coordinates: Coordinates;
  };
  additionalStops?: {
    address: string;
    coordinates: Coordinates;
  }[];
  passengers: number;
  checkedLuggage: number;
  handLuggage: number;
  preferredVehicle: string;
  specialRequests?: string;
  fareEstimate: number;
  createdByAdmin: boolean;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  travelInformation?: {
    type: "flight" | "train";
    details: FlightInformation | TrainInformation;
  };
}

// New types for enhanced fare calculation

export interface BookingLocationData {
  address: string;
  coordinates: Coordinates;
}

export interface BookingDateTimeData {
  date: string; // Format: YYYY-MM-DD
  time: string; // Format: HH:MM (24-hour)
}

export interface BookingPassengersData {
  count: number;
  checkedLuggage: number;
  handLuggage: number;
  mediumLuggage: number;
  babySeat: number;
  boosterSeat: number;
  childSeat: number;
  wheelchair: number;
}

export interface RouteDetails {
  distance_miles: number;
  duration_minutes: number;
  polyline?: any;
}

export interface EnhancedFareEstimateRequest {
  locations?: {
    pickup: BookingLocationData;
    dropoff: BookingLocationData;
    additionalStops?: BookingLocationData[];
  };
  datetime?: BookingDateTimeData;
  passengers?: BookingPassengersData;

  pickupLocation?: Coordinates;
  dropoffLocation?: Coordinates;
  additionalStops?: { location: Coordinates; [key: string]: any }[];
  date?: string | Date;
}

export interface VehicleCapacityInfo {
  passengers: number;
  luggage: number;
  wheelchair?: boolean;
}

export interface VehiclePriceInfo {
  amount: number;
  currency: string;
  message?: string; // Optional message for special cases (e.g., VIP vehicles)
  messages?: string[]; // Optional array of messages about special charges
  breakdown?: {
    baseFare: number;
    distanceFare: number;
    timeSurcharge?: number;
    additionalStopFees: number;
    specialFees: { name: string; amount: number }[]; // Contains airport fees, congestion charge, etc.
    additionalRequestFees: { name: string; amount: number }[]; // Contains baby seat, child seat, etc.
  };
}

export interface VehicleOption {
  id: string;
  name: string;
  description: string;
  capacity: VehicleCapacityInfo;
  price: VehiclePriceInfo;
  eta: number;
  imageUrl: string;
  features?: string[];
}

export interface EnhancedFareEstimateResponse {
  baseFare?: number;
  totalDistance?: number;
  estimatedTime?: number;
  currency?: string;
  vehicleOptions: VehicleOption[];

  routeDetails?: RouteDetails;
  notifications?: string[];
  journey?: {
    distance_miles: number;
    duration_minutes: number;
  };
}

// Legacy types maintained for backward compatibility
export interface FareEstimateRequest {
  pickupLocation: Coordinates;
  dropoffLocation: Coordinates;
  additionalStops?: Coordinates[];
  vehicleType: string;
  date?: string; // Optional date field for time-based pricing (ISO format)
  passengers?: {
    count: number;
    checkedLuggage: number;
    mediumLuggage: number;
    handLuggage: number;
    babySeat: number;
    childSeat: number;
    boosterSeat: number;
    wheelchair: number;
  };
}

export interface FareEstimateResponse {
  fareEstimate: number;
  distance_miles: number;
  duration_minutes: number;
}

export interface ValidationErrorDetails {
  field: string;
  message: string;
  expected: string;
  received: any;
  suggestion: string;
}

export interface GroupedValidationErrors {
  locations: ValidationErrorDetails[];
  datetime: ValidationErrorDetails[];
  passengers: ValidationErrorDetails[];
}

export interface MissingFields {
  [key: string]: string | { [key: string]: string | null };
}

export interface ValidationErrorResponse {
  summary: string;
  receivedData: any;
  missingFields?: MissingFields;
  validationErrors: GroupedValidationErrors;
  requiredFormat: {
    locations: {
      pickup: {
        address: string;
        coordinates: { lat: string; lng: string };
      };
      dropoff: {
        address: string;
        coordinates: { lat: string; lng: string };
      };
    };
    datetime: {
      date: string;
      time: string;
    };
    passengers: {
      count: string;
      checkedLuggage: string;
      handLuggage: string;
      mediumLuggage: string;
      babySeat: string;
      boosterSeat: string;
      childSeat: string;
      wheelchair: string;
    };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: string | ValidationErrorResponse;
  };
}

// Types for enhanced two-step booking process
export interface CustomerData {
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface BookingVehicleData {
  id: string;
  name: string;
}

export interface EnhancedBookingData {
  locations: {
    pickup: BookingLocationData;
    dropoff: BookingLocationData;
    additionalStops?: BookingLocationData[];
  };
  datetime: BookingDateTimeData;
  passengers: BookingPassengersData;
  vehicle: BookingVehicleData;
  specialRequests?: string;
}

export interface EnhancedBookingCreateRequest {
  customer: CustomerData;
  booking: EnhancedBookingData & {
    travelInformation?: {
      type: "flight" | "train";
      details: FlightInformation | TrainInformation;
    };
  };
}

export interface VerifiedFareData {
  vehicleId: string;
  vehicleName: string;
  price: {
    amount: number;
    currency: string;
  };
  distance_miles: number;
  duration_minutes: number;
}

export interface TemporaryBookingData {
  userId: string;
  customer: CustomerData;
  booking: EnhancedBookingData;
  verificationToken: string;
  verifiedFare: VerifiedFareData;
  status: "pending_verification";
  expiresAt: string; // ISO date when the verification expires
  createdAt: string;
}

export interface VerificationResponseData {
  bookingId: string;
  verificationToken: string;
  verifiedFare: VerifiedFareData;
  expiresIn: number; // seconds until expiration
}

export interface BookingConfirmRequest {
  bookingId: string;
  verificationToken: string;
  customerConsent: boolean;
}

export interface BookingConfirmResponse {
  bookingId: string;
  message: string;
  details: {
    fullName: string;
    pickupDate: string;
    pickupTime: string;
    pickupLocation: string;
    dropoffLocation: string;
    vehicle: string;
    price: {
      amount: number;
      currency: string;
    };
    status: string;
  };
}

export interface PermanentBookingData {
  userId: string;
  customer: CustomerData;
  pickupDate: string;
  pickupTime: string;
  locations: {
    pickup: BookingLocationData;
    dropoff: BookingLocationData;
    additionalStops?: BookingLocationData[];
  };
  passengers: BookingPassengersData;
  vehicle: {
    id: string;
    name: string;
    price: {
      amount: number;
      currency: string;
    };
  };
  journey: {
    distance_miles: number;
    duration_minutes: number;
  };
  specialRequests?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  temporaryBookingId?: string;
  travelInformation?: {
    type: "flight" | "train";
    details: FlightInformation | TrainInformation;
  };
}

// User booking management types
export interface UserBookingData {
  id: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: {
    address: string;
  };
  dropoffLocation: {
    address: string;
  };
  vehicleType: string;
  price: number;
  status: string;
  journey?: {
    distance_miles: number;
    duration_minutes: number;
  };
  createdAt: string;
}

export interface BookingCancelRequest {
  cancellationReason?: string;
}

export interface BookingCancelResponse {
  message: string;
  id: string;
  status: string;
}

export interface FlightInformation {
  airline: string;
  flightNumber: string;
  departureAirport?: string;
  arrivalAirport?: string;
  scheduledDeparture: string; // ISO datetime
  actualDeparture?: string; // ISO datetime
  status?: "on-time" | "delayed" | "cancelled";
}

export interface TrainInformation {
  trainOperator: string;
  trainNumber: string;
  departureStation?: string;
  arrivalStation?: string;
  scheduledDeparture: string; // ISO datetime
  actualDeparture?: string; // ISO datetime
  status?: "on-time" | "delayed" | "cancelled";
}
