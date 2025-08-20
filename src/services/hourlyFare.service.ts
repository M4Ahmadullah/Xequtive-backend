import { vehicleTypes, VehicleType } from "../config/vehicleTypes";
import { MapboxDistanceService } from "./mapboxDistance.service";
import { timeSurcharges } from "../config/timePricing";
import {
  FareEstimateRequest,
  FareEstimateResponse,
  HourlyVehicleOption,
  HourlyVehiclePriceInfo,
  EXECUTIVE_CARS_BRANDING,
  BookingType,
  ReturnType,
} from "../types/hourlyBooking";

// Executive Cars specific pricing for one-way and return bookings
const EXECUTIVE_CARS_PRICING = {
  'saloon': {
    minimumFare: 15.00,
    perAdditionalMile: 1.60,
    additionalStopFee: 2.50,
    waitingTimePerMinute: 0.42,
    waitingTimePerHour: 25.00,
    hourlyRates: {
      '3-6': 30.00,
      '6-12': 25.00
    },
    perMileRates: {
      '0-4': 5.00,
      '4.1-10': 4.50,
      '10.1-15': 4.00,
      '15.1-20': 3.20,
      '20.1-30': 2.60,
      '30.1-40': 2.20,
      '41.1-50': 2.10,
      '51.1-60': 1.85,
      '61.1-80': 1.80,
      '80.1-150': 1.75,
      '150.1-300': 1.70,
      '300+': 1.60
    }
  },
  'estate': {
    minimumFare: 18.00,
    perAdditionalMile: 1.80,
    additionalStopFee: 2.50,
    waitingTimePerMinute: 0.50,
    waitingTimePerHour: 30.00,
    hourlyRates: {
      '3-6': 35.00,
      '6-12': 30.00
    },
    perMileRates: {
      '0-4': 5.50,
      '4.1-10': 5.40,
      '10.1-15': 4.90,
      '15.1-20': 3.80,
      '20.1-30': 3.00,
      '30.1-40': 2.70,
      '41.1-50': 2.60,
      '51.1-60': 2.35,
      '61.1-80': 2.30,
      '80.1-150': 2.25,
      '150.1-300': 2.10,
      '300+': 1.80
    }
  },
  'mpv-6': {
    minimumFare: 35.00,
    perAdditionalMile: 2.40,
    additionalStopFee: 4.50,
    waitingTimePerMinute: 0.58,
    waitingTimePerHour: 35.00,
    hourlyRates: {
      '3-6': 35.00,
      '6-12': 35.00
    },
    perMileRates: {
      '0-4': 7.00,
      '4.1-10': 6.80,
      '10.1-15': 5.40,
      '15.1-20': 4.50,
      '20.1-30': 3.40,
      '30.1-40': 3.00,
      '41.1-50': 2.90,
      '51.1-60': 2.85,
      '61.1-80': 2.80,
      '80.1-150': 2.75,
      '150.1-300': 2.60,
      '300+': 2.40
    }
  },
  'mpv-8': {
    minimumFare: 45.00,
    perAdditionalMile: 2.60,
    additionalStopFee: 4.50,
    waitingTimePerMinute: 0.67,
    waitingTimePerHour: 40.00,
    hourlyRates: {
      '3-6': 40.00,
      '6-12': 35.00
    },
    perMileRates: {
      '0-4': 8.00,
      '4.1-10': 7.80,
      '10.1-15': 7.20,
      '15.1-20': 4.80,
      '20.1-30': 4.20,
      '30.1-40': 3.80,
      '41.1-50': 3.40,
      '51.1-60': 3.20,
      '61.1-80': 3.00,
      '80.1-150': 2.80,
      '150.1-300': 2.75,
      '300+': 2.60
    }
  },
  'executive': {
    minimumFare: 45.00,
    perAdditionalMile: 2.60,
    additionalStopFee: 5.50,
    waitingTimePerMinute: 0.75,
    waitingTimePerHour: 45.00,
    hourlyRates: {
      '3-6': 45.00,
      '6-12': 40.00
    },
    perMileRates: {
      '0-4': 8.00,
      '4.1-10': 7.80,
      '10.1-15': 7.20,
      '15.1-20': 4.80,
      '20.1-30': 4.20,
      '30.1-40': 3.80,
      '41.1-50': 3.40,
      '51.1-60': 3.20,
      '61.1-80': 3.00,
      '80.1-150': 2.80,
      '150.1-300': 2.75,
      '300+': 2.60
    }
  },
  'executive-mpv': {
    minimumFare: 65.00,
    perAdditionalMile: 3.05,
    additionalStopFee: 5.50,
    waitingTimePerMinute: 0.75,
    waitingTimePerHour: 55.00,
    hourlyRates: {
      '3-6': 55.00,
      '6-12': 50.00
    },
    perMileRates: {
      '0-4': 9.00,
      '4.1-10': 9.60,
      '10.1-15': 9.20,
      '15.1-20': 6.20,
      '20.1-30': 5.00,
      '30.1-40': 4.60,
      '41.1-50': 4.20,
      '51.1-60': 3.80,
      '61.1-80': 3.70,
      '80.1-150': 3.60,
      '150.1-300': 3.40,
      '300+': 3.05
    }
  },
  'vip-saloon': {
    minimumFare: 85.00,
    perAdditionalMile: 4.20,
    additionalStopFee: 6.50,
    waitingTimePerMinute: 1.08,
    waitingTimePerHour: 65.00,
    hourlyRates: {
      '3-6': 75.00,
      '6-12': 70.00
    },
    perMileRates: {
      '0-4': 11.00,
      '4.1-10': 13.80,
      '10.1-15': 11.20,
      '15.1-20': 7.80,
      '20.1-30': 6.40,
      '30.1-40': 6.20,
      '41.1-50': 5.60,
      '51.1-60': 4.90,
      '61.1-80': 4.60,
      '80.1-150': 4.50,
      '150.1-300': 4.40,
      '300+': 4.20
    }
  },
  'vip-suv': {
    minimumFare: 95.00,
    perAdditionalMile: 4.30,
    additionalStopFee: 6.50,
    waitingTimePerMinute: 0.75,
    waitingTimePerHour: 55.00,
    hourlyRates: {
      '3-6': 85.00,
      '6-12': 80.00
    },
    perMileRates: {
      '0-4': 12.00,
      '4.1-10': 13.90,
      '10.1-15': 12.40,
      '15.1-20': 8.00,
      '20.1-30': 7.20,
      '30.1-40': 6.80,
      '41.1-50': 5.70,
      '51.1-60': 4.95,
      '61.1-80': 4.75,
      '80.1-150': 4.60,
      '150.1-300': 4.50,
      '300+': 4.30
    }
  }
};

export class HourlyFareService {
  // Default currency
  private static readonly DEFAULT_CURRENCY = "GBP";

  /**
   * Calculate fare estimates for different vehicle types based on booking type
   */
  static async calculateFares(
    request: FareEstimateRequest
  ): Promise<FareEstimateResponse> {
    try {
      const { bookingType, datetime, passengers, numVehicles = 1 } = request;
      const requestDate = new Date(`${datetime.date}T${datetime.time}:00`);

      // Get all vehicle types
      const allVehicleTypes = Object.values(vehicleTypes);
      const vehicleOptions: HourlyVehicleOption[] = [];

      // Calculate fares based on booking type
      for (const vehicleType of allVehicleTypes) {
        let priceInfo: HourlyVehiclePriceInfo;

        switch (bookingType) {
          case "one-way":
            priceInfo = await this.calculateOneWayFare(vehicleType, request, requestDate);
            break;
          case "hourly":
            priceInfo = this.calculateHourlyFare(vehicleType, request, requestDate);
            break;
          case "return":
            priceInfo = await this.calculateReturnFare(vehicleType, request, requestDate);
            break;
          default:
            throw new Error(`Unsupported booking type: ${bookingType}`);
        }

        // Return vehicle option with calculated price
        vehicleOptions.push({
          id: vehicleType.id,
          name: vehicleType.name,
          description: vehicleType.description,
          capacity: {
            passengers: vehicleType.capacity.passengers,
            luggage: vehicleType.capacity.luggage,
          },
          price: priceInfo,
          imageUrl: vehicleType.imageUrl || "",
        });
      }

      // Sort vehicle options by price (ascending)
      vehicleOptions.sort((a, b) => a.price.amount - b.price.amount);

      // Generate notifications and pricing messages based on booking type
      const notifications = this.generateNotifications(bookingType, request);
      const pricingMessages = this.generatePricingMessages(bookingType, request);

      return {
        vehicleOptions,
        bookingType,
        notifications,
        pricingMessages,
        branding: EXECUTIVE_CARS_BRANDING,
      };
    } catch (error) {
      console.error("Error calculating fares:", error);
      throw new Error("Failed to calculate fare estimates");
    }
  }

  /**
   * Calculate One-Way fare (distance-based pricing)
   */
  private static async calculateOneWayFare(
    vehicleType: VehicleType,
    request: FareEstimateRequest,
    requestDate: Date
  ): Promise<HourlyVehiclePriceInfo> {
    if (!request.oneWayDetails) {
      throw new Error("One-Way details required for one-way booking");
    }

    const { pickupLocation, dropoffLocation, additionalStops } = request.oneWayDetails;
    const { passengers, numVehicles = 1 } = request;

    // Calculate distance using Mapbox
    const waypoints = additionalStops?.map(stop => `${stop.lat},${stop.lng}`) || [];
    const routeDetails = await MapboxDistanceService.getDistance(
      `${pickupLocation.lat},${pickupLocation.lng}`,
      `${dropoffLocation.lat},${dropoffLocation.lng}`,
      waypoints
    );

    const distance = routeDetails.distance; // Already in miles
    const duration = routeDetails.duration; // Already in minutes

    // Get Executive Cars pricing for this vehicle type
    const executivePricing = EXECUTIVE_CARS_PRICING[vehicleType.id as keyof typeof EXECUTIVE_CARS_PRICING];

    // Calculate distance-based fare using slab system
    const distanceCharge = this.calculateSlabBasedDistanceFare(vehicleType, distance);

    // Calculate additional stops charge using Executive Cars pricing
    const additionalStopFee = executivePricing ? executivePricing.additionalStopFee : vehicleType.additionalStopFee;
    const stopCharge = (additionalStops?.length || 0) * additionalStopFee;

    // Calculate base fare
    const baseFare = distanceCharge + stopCharge;

    // Apply minimum fare rule using Executive Cars pricing
    const minimumFare = executivePricing ? executivePricing.minimumFare : vehicleType.minimumFare;
    let totalFare = Math.max(baseFare, minimumFare);

    // Time surcharge
    const timeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
    totalFare += timeSurcharge;

    // Equipment charges
    const equipmentFees = this.calculateEquipmentFees(passengers, vehicleType);
    totalFare += equipmentFees;

    // Multiply by number of vehicles
    if (numVehicles > 1) {
      totalFare = totalFare * numVehicles;
    }

    // Round down to nearest whole number
    const roundedFare = Math.floor(totalFare);

    return {
      amount: roundedFare,
      currency: this.DEFAULT_CURRENCY,
      messages: this.generateOneWayMessages(distance, duration, additionalStops?.length || 0, timeSurcharge, equipmentFees, numVehicles),
      breakdown: {
        baseFare: 0,
        distanceCharge,
        equipmentFees,
        timeSurcharge,
      },
    };
  }

  /**
   * Calculate Hourly fare (time-based pricing)
   */
  private static calculateHourlyFare(
    vehicleType: VehicleType,
    request: FareEstimateRequest,
    requestDate: Date
  ): HourlyVehiclePriceInfo {
    if (!request.hourlyDetails) {
      throw new Error("Hourly details required for hourly booking");
    }

    const { hours, pickupLocation, dropoffLocation, additionalStops } = request.hourlyDetails;
    const { passengers, numVehicles = 1 } = request;

    // Validate hours
    if (hours < 4 || hours > 24) {
      throw new Error("Hours must be between 4 and 24");
    }

    // Calculate hourly rate using Executive Cars tiered pricing
    const executivePricing = EXECUTIVE_CARS_PRICING[vehicleType.id as keyof typeof EXECUTIVE_CARS_PRICING];
    let hourlyRate: number;
    
    if (executivePricing && executivePricing.hourlyRates) {
      // Use tiered pricing: 3-6 hours vs 6-12 hours
      if (hours >= 3 && hours <= 6) {
        hourlyRate = executivePricing.hourlyRates['3-6'];
      } else if (hours > 6 && hours <= 12) {
        hourlyRate = executivePricing.hourlyRates['6-12'];
      } else {
        // Fallback for hours outside the 3-12 range
        hourlyRate = executivePricing.hourlyRates['6-12'];
      }
    } else {
      // Fallback to original method
      hourlyRate = this.getHourlyRate(vehicleType);
    }
    
    // Calculate base fare (hours × hourly rate)
    const baseFare = hours * hourlyRate;

    // Apply minimum fare rule for hourly bookings using Executive Cars pricing
    let minimumFare: number;
    if (executivePricing && executivePricing.hourlyRates) {
      // For tiered pricing, use the higher rate (3-6 hours) for minimum fare calculation
      const higherRate = executivePricing.hourlyRates['3-6'];
      minimumFare = Math.max(executivePricing.minimumFare * 2, higherRate * 3); // At least 3 hours at higher rate
    } else {
      minimumFare = executivePricing ? executivePricing.minimumFare * 2 : vehicleType.minimumFare * 2;
    }
    let totalFare = Math.max(baseFare, minimumFare);

    // Time surcharge
    const timeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
    totalFare += timeSurcharge;

    // Equipment charges
    const equipmentFees = this.calculateEquipmentFees(passengers, vehicleType);
    totalFare += equipmentFees;

    // Multiply by number of vehicles
    if (numVehicles > 1) {
      totalFare = totalFare * numVehicles;
    }

    // Round down to nearest whole number
    const roundedFare = Math.floor(totalFare);

    return {
      amount: roundedFare,
      currency: this.DEFAULT_CURRENCY,
      messages: this.generateHourlyMessages(hours, hourlyRate, timeSurcharge, equipmentFees, numVehicles),
      breakdown: {
        baseFare: 0,
        hourlyRate,
        totalHours: hours,
        equipmentFees,
        timeSurcharge,
      },
    };
  }

  /**
   * Calculate Return fare (with wait charges or double pricing)
   */
  private static async calculateReturnFare(
    vehicleType: VehicleType,
    request: FareEstimateRequest,
    requestDate: Date
  ): Promise<HourlyVehiclePriceInfo> {
    if (!request.returnDetails) {
      throw new Error("Return details required for return booking");
    }

    const { outboundPickup, outboundDropoff, outboundStops, returnType, waitDuration, returnPickup, returnDropoff, returnStops } = request.returnDetails;
    const { passengers, numVehicles = 1 } = request;

    // Calculate outbound journey fare
    const outboundWaypoints = outboundStops?.map(stop => `${stop.lat},${stop.lng}`) || [];
    const outboundRoute = await MapboxDistanceService.getDistance(
      `${outboundPickup.lat},${outboundPickup.lng}`,
      `${outboundDropoff.lat},${outboundDropoff.lng}`,
      outboundWaypoints
    );

    const outboundDistance = outboundRoute.distance;
    const outboundDistanceCharge = this.calculateSlabBasedDistanceFare(vehicleType, outboundDistance);
    
    // Get Executive Cars pricing for additional stop fees
    const executivePricing = EXECUTIVE_CARS_PRICING[vehicleType.id as keyof typeof EXECUTIVE_CARS_PRICING];
    const additionalStopFee = executivePricing ? executivePricing.additionalStopFee : vehicleType.additionalStopFee;
    
    const outboundStopCharge = (outboundStops?.length || 0) * additionalStopFee;
    const outboundBaseFare = outboundDistanceCharge + outboundStopCharge;
    // Apply minimum fare rule using Executive Cars pricing
    const minimumFare = executivePricing ? executivePricing.minimumFare : vehicleType.minimumFare;
    const outboundFare = Math.max(outboundBaseFare, minimumFare);

    let totalFare = outboundFare;

    if (returnType === "wait-and-return") {
      // Wait-and-return: driver waits and returns
      if (!waitDuration) {
        throw new Error("Wait duration required for wait-and-return booking");
      }

      // Calculate return journey (same route back)
      const returnFare = outboundFare; // Same fare for return journey
      totalFare += returnFare;

      // Add wait charge (driver waiting time) using Executive Cars pricing
      let waitCharge;
      if (executivePricing) {
        // Use per minute rate if available, otherwise fall back to per hour rate
        if (executivePricing.waitingTimePerMinute) {
          waitCharge = waitDuration * 60 * executivePricing.waitingTimePerMinute; // Convert hours to minutes
        } else {
          waitCharge = waitDuration * executivePricing.waitingTimePerHour;
        }
      } else {
        waitCharge = waitDuration * this.getHourlyRate(vehicleType) * 0.5; // Fallback to original calculation
      }
      totalFare += waitCharge;

      // Time surcharge for outbound
      const outboundTimeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
      totalFare += outboundTimeSurcharge;

      // Equipment charges
      const equipmentFees = this.calculateEquipmentFees(passengers, vehicleType);
      totalFare += equipmentFees;

      // Apply 10% return booking discount
      totalFare = totalFare * 0.90;

      // Multiply by number of vehicles
      if (numVehicles > 1) {
        totalFare = totalFare * numVehicles;
      }

      const roundedFare = Math.floor(totalFare);

      return {
        amount: roundedFare,
        currency: this.DEFAULT_CURRENCY,
        messages: this.generateReturnWaitMessages(outboundDistance, waitDuration, outboundTimeSurcharge, equipmentFees, numVehicles, 'wait-and-return'),
        breakdown: {
          baseFare: outboundFare,
          distanceCharge: outboundDistanceCharge,
          equipmentFees,
          timeSurcharge: outboundTimeSurcharge,
          waitCharge,
        },
      };
    } else {
      // Later date return: two separate journeys
      if (!returnPickup || !returnDropoff || !request.returnDetails.returnDateTime) {
        throw new Error("Return pickup, dropoff, and datetime required for later-date return");
      }

      // Calculate return journey fare
      const returnWaypoints = returnStops?.map(stop => `${stop.lat},${stop.lng}`) || [];
      const returnRoute = await MapboxDistanceService.getDistance(
        `${returnPickup.lat},${returnPickup.lng}`,
        `${returnDropoff.lat},${returnDropoff.lng}`,
        returnWaypoints
      );

      const returnDistance = returnRoute.distance;
      const returnDistanceCharge = this.calculateSlabBasedDistanceFare(vehicleType, returnDistance);
      const returnStopCharge = (returnStops?.length || 0) * additionalStopFee;
      const returnBaseFare = returnDistanceCharge + returnStopCharge;
      const returnFare = Math.max(returnBaseFare, minimumFare);

      totalFare += returnFare;

      // Time surcharges for both journeys
      const outboundTimeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
      const returnDate = new Date(`${request.returnDetails.returnDateTime.date}T${request.returnDetails.returnDateTime.time}:00`);
      const returnTimeSurcharge = this.calculateTimeSurcharge(returnDate, vehicleType.id);
      totalFare += outboundTimeSurcharge + returnTimeSurcharge;

      // Equipment charges
      const equipmentFees = this.calculateEquipmentFees(passengers, vehicleType);
      totalFare += equipmentFees;

      // Apply 10% return booking discount
      totalFare = totalFare * 0.90;

      // Multiply by number of vehicles
      if (numVehicles > 1) {
        totalFare = totalFare * numVehicles;
      }

      const roundedFare = Math.floor(totalFare);

      return {
        amount: roundedFare,
        currency: this.DEFAULT_CURRENCY,
        messages: this.generateReturnLaterMessages(outboundDistance, returnDistance, outboundTimeSurcharge, returnTimeSurcharge, equipmentFees, numVehicles, returnType),
        breakdown: {
          baseFare: outboundFare + returnFare,
          distanceCharge: outboundDistanceCharge + returnDistanceCharge,
          equipmentFees,
          timeSurcharge: outboundTimeSurcharge + returnTimeSurcharge,
        },
      };
    }
  }

  /**
   * Generate notifications based on booking type
   */
  private static generateNotifications(bookingType: BookingType, request: FareEstimateRequest): string[] {
    const notifications = [];

    switch (bookingType) {
      case "one-way":
        notifications.push("One-Way journey: Point-to-point transfer");
        if (request.oneWayDetails?.additionalStops && request.oneWayDetails.additionalStops.length > 0) {
          notifications.push(`Additional stops: ${request.oneWayDetails.additionalStops.length} stops included`);
        }
        break;

      case "hourly":
        const hours = request.hourlyDetails?.hours || 0;
        notifications.push(`Hourly booking: ${hours} hours of service`);
        if (hours >= 8) {
          notifications.push("Long-term booking: Extended service period");
        }
        notifications.push("Driver stays with you and follows your itinerary");
        notifications.push("Congestion charges and airport fees will be charged during the journey");
        break;

      case "return":
        const returnType = request.returnDetails?.returnType;
        if (returnType === "wait-and-return") {
          const waitDuration = request.returnDetails?.waitDuration || 0;
          notifications.push(`Wait-and-return: Driver waits ${waitDuration} hours and returns`);
          notifications.push("Price includes driver waiting time");
        } else {
          notifications.push("Later date return: Two separate scheduled journeys");
          notifications.push("Price includes both outbound and return journeys");
        }
        break;
    }

    if (request.numVehicles && request.numVehicles > 1) {
      notifications.push(`Multiple vehicles: ${request.numVehicles} vehicles requested`);
    }

    return notifications;
  }

  /**
   * Generate pricing messages based on booking type
   */
  private static generatePricingMessages(bookingType: BookingType, request: FareEstimateRequest): string[] {
    const messages = [];

    switch (bookingType) {
      case "one-way":
        messages.push("One-Way pricing: Distance-based fare with time surcharges");
        messages.push("Additional stops add extra charges");
        break;

      case "hourly":
        const hours = request.hourlyDetails?.hours || 0;
        messages.push(`Hourly pricing: ${hours} hours × hourly rate`);
        messages.push("Driver and vehicle included for the full duration");
        messages.push("Congestion charges and airport fees apply during journey");
        break;

      case "return":
        const returnType = request.returnDetails?.returnType;
        if (returnType === "wait-and-return") {
          messages.push("Return pricing: Outbound + Return + Driver waiting time");
          messages.push("Driver waits at destination and returns you");
        } else {
          messages.push("Return pricing: Outbound journey + Return journey");
          messages.push("Two separate scheduled journeys");
        }
        break;
    }

    return messages;
  }

  /**
   * Generate messages for One-Way pricing
   */
  private static generateOneWayMessages(
    distance: number,
    duration: number,
    stops: number,
    timeSurcharge: number,
    equipmentFees: number,
    numVehicles: number
  ): string[] {
    const messages = [];
    
    messages.push(`Distance: ${distance.toFixed(1)} miles`);
    messages.push(`Duration: ${Math.round(duration)} minutes`);
    
    if (stops > 0) {
      messages.push(`Additional stops (${stops}): £${(stops * 5).toFixed(2)}`);
    }
    
    if (timeSurcharge > 0) {
      messages.push(`Time surcharge: £${timeSurcharge.toFixed(2)}`);
    }
    
    if (equipmentFees > 0) {
      messages.push(`Equipment fees: £${equipmentFees.toFixed(2)}`);
    }
    
    if (numVehicles > 1) {
      messages.push(`Multiple vehicles (${numVehicles}): Total × ${numVehicles}`);
    }
    
    return messages;
  }

  /**
   * Generate messages for Hourly pricing
   */
  private static generateHourlyMessages(
    hours: number,
    hourlyRate: number,
    timeSurcharge: number,
    equipmentFees: number,
    numVehicles: number
  ): string[] {
    const messages = [];
    
    messages.push(`Hours: ${hours} × £${hourlyRate.toFixed(2)}/hour`);
    
    // Add tiered pricing information
    if (hours >= 3 && hours <= 6) {
      messages.push('3-6 hour rate applied');
    } else if (hours > 6 && hours <= 12) {
      messages.push('6-12 hour rate applied');
    }
    
    if (timeSurcharge > 0) {
      messages.push(`Time surcharge: £${timeSurcharge.toFixed(2)}`);
    }
    
    if (equipmentFees > 0) {
      messages.push(`Equipment fees: £${equipmentFees.toFixed(2)}`);
    }
    
    if (numVehicles > 1) {
      messages.push(`Multiple vehicles (${numVehicles}): Total × ${numVehicles}`);
    }
    
    return messages;
  }

  /**
   * Generate messages for Return Wait-and-Return pricing
   */
  private static generateReturnWaitMessages(
    distance: number,
    waitDuration: number,
    timeSurcharge: number,
    equipmentFees: number,
    numVehicles: number,
    returnType?: 'wait-and-return' | 'later-date'
  ): string[] {
    const messages = [];
    
    messages.push(`Outbound: ${distance.toFixed(1)} miles`);
    messages.push(`Return: ${distance.toFixed(1)} miles (same route)`);
    
    if (returnType === 'wait-and-return') {
      messages.push("Return journey: Driver waits at destination and returns");
      messages.push(`Driver wait time: ${waitDuration} hours`);
    } else if (returnType === 'later-date') {
      messages.push("Return journey: Scheduled return on different date/time");
    }
    
    messages.push(`Return booking: 10% discount applied`);
    
    if (timeSurcharge > 0) {
      messages.push(`Time surcharge: £${timeSurcharge.toFixed(2)}`);
    }
    
    if (equipmentFees > 0) {
      messages.push(`Equipment fees: £${equipmentFees.toFixed(2)}`);
    }
    
    if (numVehicles > 1) {
      messages.push(`Multiple vehicles (${numVehicles}): Total × ${numVehicles}`);
    }
    
    return messages;
  }

  /**
   * Generate messages for Return Later-Date pricing
   */
  private static generateReturnLaterMessages(
    outboundDistance: number,
    returnDistance: number,
    outboundTimeSurcharge: number,
    returnTimeSurcharge: number,
    equipmentFees: number,
    numVehicles: number,
    returnType?: 'wait-and-return' | 'later-date'
  ): string[] {
    const messages = [];
    
    messages.push(`Outbound: ${outboundDistance.toFixed(1)} miles`);
    messages.push(`Return: ${returnDistance.toFixed(1)} miles`);
    
    if (returnType === 'later-date') {
      messages.push("Return journey: Scheduled return on different date/time");
    }
    
    messages.push(`Return booking: 10% discount applied`);
    
    if (outboundTimeSurcharge > 0 || returnTimeSurcharge > 0) {
      messages.push(`Time surcharges: £${(outboundTimeSurcharge + returnTimeSurcharge).toFixed(2)}`);
    }
    
    if (equipmentFees > 0) {
      messages.push(`Equipment fees: £${equipmentFees.toFixed(2)}`);
    }
    
    if (numVehicles > 1) {
      messages.push(`Multiple vehicles (${numVehicles}): Total × ${numVehicles}`);
    }
    
    return messages;
  }

  /**
   * Calculate equipment fees for extra passengers/luggage
   */
  private static calculateEquipmentFees(passengers: { count: number; luggage: number }, vehicleType: VehicleType): number {
    let equipmentFees = 0;
    
    if (passengers.count > vehicleType.capacity.passengers) {
      const extraPassengers = passengers.count - vehicleType.capacity.passengers;
      equipmentFees += extraPassengers * 5; // £5 per extra passenger
    }
    
    if (passengers.luggage > vehicleType.capacity.luggage) {
      const extraLuggage = passengers.luggage - vehicleType.capacity.luggage;
      equipmentFees += extraLuggage * 3; // £3 per extra luggage
    }
    
    return equipmentFees;
  }

  /**
   * Get hourly rate for a vehicle type
   */
  private static getHourlyRate(vehicleType: VehicleType): number {
    // Define hourly rates based on vehicle type
    const hourlyRates: { [key: string]: number } = {
      'saloon': 25.00,        // £25/hour
      'estate': 30.00,        // £30/hour
      'mpv-6': 45.00,        // £45/hour
      'mpv-8': 60.00,        // £60/hour
      'executive': 50.00,     // £50/hour
      'executive-mpv': 75.00, // £75/hour
      'vip-saloon': 80.00,    // £80/hour
      'vip-suv': 100.00,      // £100/hour
    };

    return hourlyRates[vehicleType.id] || 25.00; // Default to £25/hour
  }

  /**
   * Calculate distance fare using Executive Cars slab system
   */
  private static calculateSlabBasedDistanceFare(vehicleType: VehicleType, distance: number): number {
    const pricing = EXECUTIVE_CARS_PRICING[vehicleType.id as keyof typeof EXECUTIVE_CARS_PRICING];
    if (!pricing) {
      throw new Error(`No pricing found for vehicle type: ${vehicleType.id}`);
    }

    const rates = pricing.perMileRates;
    let ratePerMile = 0;

    // Determine which rate applies based on total distance
    if (distance <= 4) {
      ratePerMile = rates['0-4'];
    } else if (distance <= 10) {
      ratePerMile = rates['4.1-10'];
    } else if (distance <= 15) {
      ratePerMile = rates['10.1-15'];
    } else if (distance <= 20) {
      ratePerMile = rates['15.1-20'];
    } else if (distance <= 30) {
      ratePerMile = rates['20.1-30'];
    } else if (distance <= 40) {
      ratePerMile = rates['30.1-40'];
    } else if (distance <= 50) {
      ratePerMile = rates['41.1-50'];
    } else if (distance <= 60) {
      ratePerMile = rates['51.1-60'];
    } else if (distance <= 80) {
      ratePerMile = rates['61.1-80'];
    } else if (distance <= 150) {
      ratePerMile = rates['80.1-150'];
    } else if (distance <= 300) {
      ratePerMile = rates['150.1-300'];
    } else {
      ratePerMile = rates['300+'];
    }

    return distance * ratePerMile;
  }

  /**
   * Calculate time-based surcharge
   */
  private static calculateTimeSurcharge(date: Date, vehicleTypeId: string): number {
    const day = date.getDay();
    const hours = date.getHours();

    // Map vehicle type IDs to surcharge keys
    const vehicleMap: { [key: string]: string } = {
      'saloon': 'saloon',
      'estate': 'estate',
      'mpv-6': 'mpv-6',
      'mpv-8': 'mpv-8',
      'executive': 'executive',
      'executive-mpv': 'executive-mpv',
      'vip-saloon': 'vip-saloon',
      'vip-suv': 'vip-suv'
    };

    const mappedVehicleType = vehicleMap[vehicleTypeId] || 'saloon';

    // Determine if it's weekend (Friday, Saturday, Sunday)
    const isWeekend = day === 5 || day === 6 || day === 0;

    // Determine time period
    let period = 'nonPeak';
    if (hours >= 6 && hours < 15) {
      period = 'peakMedium';
    } else if (hours >= 15) {
      period = 'peakHigh';
    }

    try {
      // Get surcharge from timeSurcharges configuration
      const timeCategory = isWeekend ? 'weekends' : 'weekdays';
      const timePeriod = timeSurcharges[timeCategory][period as keyof typeof timeSurcharges.weekdays];
      
      return timePeriod?.surcharges[mappedVehicleType] || 0;
    } catch (error) {
      console.error(`Error calculating time surcharge for ${vehicleTypeId}:`, error);
      return 0; // Default to no surcharge on error
    }
  }
} 