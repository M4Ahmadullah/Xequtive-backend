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
    dropoff?: BookingLocationData; // Optional for hourly bookings
    additionalStops?: BookingLocationData[];
  };
  datetime?: BookingDateTimeData;
  passengers?: BookingPassengersData;
  bookingType?: "one-way" | "hourly" | "return";
  hours?: number; // Required for hourly bookings (3-24 hours)
  returnDate?: string; // Required for later-date returns (YYYY-MM-DD)
  returnTime?: string; // Required for later-date returns (HH:MM)

  pickupLocation?: Coordinates;
  dropoffLocation?: Coordinates;
  additionalStops?: { location: Coordinates; [key: string]: any }[];
  date?: string | Date;
}

export interface VehicleCapacityInfo {
  passengers: number;
  luggage: number;
  wheelchair?: boolean;
  class?: VehicleClass;
}

export type VehicleClass = 'Standard Comfort' | 'Business';

export interface VehiclePriceInfo {
  amount: number;
  currency: string;
  messages?: string[]; // Optional array of messages about fees and charges
  breakdown: {
    baseFare: number;
    distanceCharge: number;
    minimumFare: number;
    additionalStopFee: number;
    timeSurcharge: number;
    airportFee: number;
    specialZoneFees: number;
    equipmentFees: number;
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
  price: {
    amount: number;
    currency: string;
  };
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
  bookingType?: "one-way" | "hourly" | "return";
  hours?: number;
  returnDate?: string;
  returnTime?: string;
  paymentMethods?: {
    cashOnArrival: boolean;
    cardOnArrival: boolean;
  };
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
  id: string;
  referenceNumber: string; // XEQ_100, XEQ_101, etc.
  userId: string;
  customer: CustomerData;
  pickupDate: string;
  pickupTime: string;
  locations: {
    pickup: BookingLocationData;
    dropoff: BookingLocationData;
    additionalStops?: BookingLocationData[];
  };
  vehicle: BookingVehicleData;
  price: {
    amount: number;
    currency: string;
  };
  additionalStops: string[];
  waitingTime: number;
  specialRequests?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  bookingType: 'one-way' | 'hourly' | 'return';
  hours?: number;
  returnDate?: string;
  returnTime?: string;
  returnDiscount?: number;
  passengers?: BookingPassengersData;
  travelInformation?: {
    type: "flight" | "train";
    details: FlightInformation | TrainInformation;
  };
  journey?: {
    distance_miles: number;
    duration_minutes: number;
  };
  paymentMethods?: {
    cashOnArrival: boolean;
    cardOnArrival: boolean;
  };
  createdAt: string;
  updatedAt: string;
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

export interface TimePricingPeriod {
  startTime: string;
  endTime?: string;
  surchargeRanges: {
    [vehicleType: string]: number;
  };
}

export interface WeekdayTimePricing {
  nonPeak: TimePricingPeriod;
  peakMedium: TimePricingPeriod;
  peakHigh: TimePricingPeriod;
  offPeak?: TimePricingPeriod;
}

export interface WeekendTimePricing {
  nonPeak: TimePricingPeriod;
  peakMedium: TimePricingPeriod;
  peakHigh: TimePricingPeriod;
  allDay?: TimePricingPeriod;
}

export interface ReservationFeesPricing {
  nonPeak: TimePricingPeriod;
  peakHigh: TimePricingPeriod;
}

export interface PerMilePricing {
  nonPeak: {
    [vehicleType: string]: number;
  };
  peakMediumHigh: {
    [vehicleType: string]: number;
  };
}

export interface AirportPickupPricing {
  [distance: string]: {
    [vehicleType: string]: number;
  };
}

export interface TimePricing {
  weekdays: WeekdayTimePricing;
  weekends: {
    friday: WeekendTimePricing;
    satSun: WeekendTimePricing;
  };
  reservationFees: ReservationFeesPricing;
  perMilePricing: PerMilePricing;
  airportPickupPricing: AirportPickupPricing;
}

export interface MileageRange {
  range: {
    min: number;
    max: number;
  };
  rates: {
    [vehicleType: string]: number;
  };
}

export interface MileageRangeRate {
  range: {
    min: number;
    max: number;
  };
  rate: number;
}

export interface VehicleTypePricing {
  reservationFee: number;
  minimumFare: number;
  perMilePricing: {
    overall: number;
    mileageRanges: MileageRangeRate[];
  };
}

export interface VehicleClassConfig {
  vehicles: string[];
  additionalStopFees: {
    [vehicleType: string]: number;
  };
  pricing: {
    [vehicleType: string]: VehicleTypePricing;
  };
}

export interface AirportFees {
  dropoffFees: {
    standard: {
      [airport: string]: number;
    };
    executive?: {
      [airport: string]: number;
    };
  };
  pickupFees: {
    standard: {
      [airport: string]: number;
    };
    executive: {
      [airport: string]: number;
    };
  };
}

export interface TimeSurchargeConfig {
  startTime: string;
  endTime: string;
  surcharges: {
    [vehicleType: string]: number;
  };
}

export interface TimeSurcharges {
  weekdays: {
    nonPeak: TimeSurchargeConfig;
    peakMedium: TimeSurchargeConfig;
    peakHigh: TimeSurchargeConfig;
  };
  weekends: {
    nonPeak: TimeSurchargeConfig;
    peakMedium: TimeSurchargeConfig;
    peakHigh: TimeSurchargeConfig;
  };
}

// Add index signatures to resolve type checking issues
export interface VehicleClassPricing {
  [className: string]: VehicleClassConfig;
}

export interface VehicleAdditionalStopFees {
  [className: string]: {
    [vehicleType: string]: number;
  };
}

export interface VehicleTimeSurcharges {
  [timeCategory: string]: {
    [period: string]: TimeSurchargeConfig;
  };
}

export interface EnhancedBookingRequest {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  vehicleTypeId: string;
  additionalStops?: string[];
  waitingTime?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialInstructions?: string;
  bookingType: 'one-way' | 'hourly' | 'return';
  hours?: number;
  returnDate?: string;
  returnTime?: string;
  returnDiscount?: number;
}

export interface HourlyBookingRequest {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  hours: number; // 3-24 hours
  vehicleTypeId: string;
  additionalStops?: string[];
  waitingTime?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialInstructions?: string;
  returnDate?: string;
  returnTime?: string;
  returnDiscount?: number;
}

export interface HourlyBookingData {
  id: string;
  referenceNumber: string; // XEQ_100, XEQ_101, etc.
  userId: string;
  customer: CustomerData;
  pickupDate: string;
  pickupTime: string;
  hours: number;
  locations: {
    pickup: BookingLocationData;
    dropoff: BookingLocationData;
    additionalStops?: BookingLocationData[];
  };
  vehicle: BookingVehicleData;
  price: {
    amount: number;
    currency: string;
  };
  additionalStops: string[];
  waitingTime: number;
  specialRequests?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  returnDate?: string;
  returnTime?: string;
  returnDiscount?: number;
  createdAt: string;
  updatedAt: string;
}
