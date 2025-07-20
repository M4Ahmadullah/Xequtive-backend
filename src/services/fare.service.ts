import axios from "axios";
import {
  Coordinates,
  FareEstimateRequest,
  FareEstimateResponse,
  VehicleOption,
  VehiclePriceInfo,
  VehicleTypePricing,
  MileageRangeRate,
  VehicleClassConfig,
  TimeSurchargeConfig,
  VehicleClassPricing,
  TimeSurcharges
} from "../types";
import { env } from "../config/env";
import { vehicleTypes, VehicleType } from "../config/vehicleTypes";
import {
  AIRPORTS,
  SPECIAL_ZONES,
  isZoneActive,
  getZonesForRoute,
  getAirportsNearLocation,
} from "../config/specialZones";
import { 
  airportFees,
  vehicleClassPricing,
  timeSurcharges
} from '../config/timePricing';
import { EQUIPMENT_FEES } from '../config/serviceArea';

export interface FareCalculationParams {
  vehicleType: string;
  distance: number;
  additionalStops?: number;
  airport?: string;
  isWeekend?: boolean;
  timeOfDay?: string;
  isAirportPickup?: boolean;
  passengers?: {
    babySeat: number;
    childSeat: number;
    boosterSeat: number;
    wheelchair: number;
  };
}

export class FareCalculationService {
  /**
   * Calculate fare based on comprehensive pricing rules
   * @param params Fare calculation parameters
   * @returns Calculated fare details
   */
  calculateFare(params: FareCalculationParams): number {
    const { 
      vehicleType, 
      distance, 
      additionalStops = 0, 
      airport,
      isWeekend = false,
      timeOfDay = '12:00 AM',
      isAirportPickup = false
    } = params;

    // Find vehicle class configuration
    const vehicleClassConfig = this.findVehicleClassConfig(vehicleType);
    if (!vehicleClassConfig) {
      throw new Error(`Invalid vehicle type: ${vehicleType}`);
    }

    // Get specific vehicle pricing
    const vehiclePricing = vehicleClassConfig.pricing[vehicleType];
    if (!vehiclePricing) {
      throw new Error(`No pricing found for vehicle type: ${vehicleType}`);
    }
    
    // Step 1: Calculate distance-based fare using proper slab system
    const distanceFare = this.calculateDistanceFare(vehiclePricing, distance);

    // Step 2: Calculate additional stops charge
    const additionalStopsFare = this.calculateAdditionalStopsFare(
      vehicleClassConfig.additionalStopFees[vehicleType] || 0, 
      additionalStops
      );

    // Step 3: Calculate core fare (distance + stops)
    const coreFare = distanceFare + additionalStopsFare;

    // Step 4: Apply minimum fare rule to core fare
    const fareAfterMinimum = Math.max(coreFare, vehiclePricing.minimumFare);

    // Step 5: Calculate additional fees (applied after minimum fare check)
    const airportFee = this.calculateAirportFee(
      vehicleType, 
      airport, 
      isAirportPickup
    );

    // Step 6: Calculate time-based surcharge
    const timeSurcharge = this.calculateTimeSurcharge(
      vehicleType, 
      isWeekend, 
      timeOfDay
    );

    // Step 7: Calculate equipment charges
    let equipmentFees = 0;
    if (params.passengers) {
      if (params.passengers.babySeat > 0) {
        equipmentFees += params.passengers.babySeat * EQUIPMENT_FEES.BABY_SEAT;
      }
      if (params.passengers.childSeat > 0) {
        equipmentFees += params.passengers.childSeat * EQUIPMENT_FEES.CHILD_SEAT;
      }
      if (params.passengers.boosterSeat > 0) {
        equipmentFees += params.passengers.boosterSeat * EQUIPMENT_FEES.BOOSTER_SEAT;
      }
      if (params.passengers.wheelchair > 0) {
        equipmentFees += params.passengers.wheelchair * EQUIPMENT_FEES.WHEELCHAIR;
      }
    }

    // Step 8: Combine all components
    const totalFare = fareAfterMinimum + airportFee + timeSurcharge + equipmentFees;

    // Step 9: Round up to nearest whole number (e.g., 14.1 becomes 15, 14.9 becomes 15)
    const roundedFare = Math.ceil(totalFare);

    return roundedFare;
  }

  /**
   * Calculate fare with detailed breakdown for debugging and transparency
   * @param params Fare calculation parameters
   * @returns Detailed fare breakdown
   */
  calculateFareWithBreakdown(params: FareCalculationParams): {
    totalFare: number;
    breakdown: {
      distanceFare: number;
      additionalStopsFare: number;
      coreFare: number;
      minimumFareApplied: boolean;
      fareAfterMinimum: number;
      airportFee: number;
      timeSurcharge: number;
      equipmentFees: number;
      finalFare: number;
    };
  } {
    const { 
          vehicleType,
          distance,
      additionalStops = 0, 
      airport,
      isWeekend = false,
      timeOfDay = '12:00 AM',
      isAirportPickup = false
    } = params;

    // Find vehicle class configuration
    const vehicleClassConfig = this.findVehicleClassConfig(vehicleType);
    if (!vehicleClassConfig) {
      throw new Error(`Invalid vehicle type: ${vehicleType}`);
      }

    // Get specific vehicle pricing
    const vehiclePricing = vehicleClassConfig.pricing[vehicleType];
    if (!vehiclePricing) {
      throw new Error(`No pricing found for vehicle type: ${vehicleType}`);
    }
    
    // Step 1: Calculate distance-based fare using proper slab system
    const distanceFare = this.calculateDistanceFare(vehiclePricing, distance);

    // Step 2: Calculate additional stops charge
    const additionalStopsFare = this.calculateAdditionalStopsFare(
      vehicleClassConfig.additionalStopFees[vehicleType] || 0, 
      additionalStops
    );

    // Step 3: Calculate core fare (distance + stops)
    const coreFare = distanceFare + additionalStopsFare;

    // Step 4: Apply minimum fare rule to core fare
    const fareAfterMinimum = Math.max(coreFare, vehiclePricing.minimumFare);
    const minimumFareApplied = fareAfterMinimum > coreFare;

    // Step 5: Calculate additional fees (applied after minimum fare check)
    const airportFee = this.calculateAirportFee(
      vehicleType, 
      airport, 
      isAirportPickup
    );

    // Step 6: Calculate time-based surcharge
    const timeSurcharge = this.calculateTimeSurcharge(
      vehicleType, 
      isWeekend, 
      timeOfDay
    );

    // Step 7: Calculate equipment charges
    let equipmentFees = 0;
    if (params.passengers) {
      if (params.passengers.babySeat > 0) {
        equipmentFees += params.passengers.babySeat * EQUIPMENT_FEES.BABY_SEAT;
      }
      if (params.passengers.childSeat > 0) {
        equipmentFees += params.passengers.childSeat * EQUIPMENT_FEES.CHILD_SEAT;
      }
      if (params.passengers.boosterSeat > 0) {
        equipmentFees += params.passengers.boosterSeat * EQUIPMENT_FEES.BOOSTER_SEAT;
      }
      if (params.passengers.wheelchair > 0) {
        equipmentFees += params.passengers.wheelchair * EQUIPMENT_FEES.WHEELCHAIR;
      }
    }

    // Step 8: Combine all components
    const totalFare = fareAfterMinimum + airportFee + timeSurcharge + equipmentFees;

    // Step 9: Round up to nearest whole number (e.g., 14.1 becomes 15, 14.9 becomes 15)
    const finalFare = Math.ceil(totalFare);

      return {
      totalFare: finalFare,
      breakdown: {
        distanceFare,
        additionalStopsFare,
        coreFare,
        minimumFareApplied,
        fareAfterMinimum,
        airportFee,
        timeSurcharge,
        equipmentFees,
        finalFare
      }
    };
    }

  /**
   * Find the vehicle class configuration
   * @param vehicleType 
   * @returns Vehicle class configuration or undefined
   */
  private findVehicleClassConfig(vehicleType: string): VehicleClassConfig | undefined {
    // Iterate through vehicle types in the pricing configuration
    for (const [className, config] of Object.entries(vehicleClassPricing)) {
      if (config.vehicles.includes(vehicleType)) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * Calculate fare based on tiered mileage pricing (FIXED SLAB SYSTEM)
   * @param vehiclePricing Vehicle-specific pricing details
   * @param distance Total trip distance
   * @returns Calculated distance-based fare
   */
  private calculateDistanceFare(
    vehiclePricing: VehicleTypePricing, 
    distance: number
  ): number {
    let totalDistanceFare = 0;
    let remainingDistance = distance;

    // Sort mileage ranges from lowest to highest
    const sortedRanges = [...vehiclePricing.perMilePricing.mileageRanges]
      .sort((a, b) => a.range.min - b.range.min);

    for (const range of sortedRanges) {
      if (remainingDistance <= 0) break;

      // Calculate the distance that applies to this range
      const rangeStart = range.range.min;
      const rangeEnd = range.range.max === Infinity ? Infinity : range.range.max;
      
      // For each range, calculate how much of the trip falls within it
      let rangeDistance = 0;
      
      if (distance <= rangeStart) {
        // Trip doesn't reach this range
        continue;
      } else if (distance <= rangeEnd) {
        // Trip ends within this range
        rangeDistance = distance - rangeStart;
      } else {
        // Trip goes beyond this range
        rangeDistance = rangeEnd - rangeStart;
      }

      // Make sure we don't exceed remaining distance
      rangeDistance = Math.min(rangeDistance, remainingDistance);

      if (rangeDistance > 0) {
        totalDistanceFare += rangeDistance * range.rate;
        remainingDistance -= rangeDistance;
      }
    }

    return totalDistanceFare;
      }

  /**
   * Calculate additional stops fare
   * @param stopFee Fee per additional stop
   * @param additionalStops Number of additional stops
   * @returns Total additional stops fare
   */
  private calculateAdditionalStopsFare(
    stopFee: number, 
    additionalStops: number
  ): number {
    return stopFee * additionalStops;
    }

  /**
   * Calculate airport-related fees
   * @param vehicleType 
   * @param airport 
   * @param isPickup 
   * @returns Airport fee
   */
  private calculateAirportFee(
    vehicleType: string, 
    airport?: string, 
    isPickup = false
  ): number {
    if (!airport) return 0;

    // Determine if it's standard or executive class
    const vehicleClass = this.findVehicleClassConfig(vehicleType);
    const classType = vehicleClass?.vehicles.some((v: string) => 
      ['executive-saloon', 'executive-mpv', 'vip-saloon', 'vip-suv'].includes(v)
    ) ? 'executive' : 'standard';

    // Get appropriate fee based on pickup/dropoff
    const feeType = isPickup ? 'pickupFees' : 'dropoffFees';
    
    // Safely handle airport fee lookup
    const airportFeesByClass = airportFees[feeType][classType];
    return airportFeesByClass && airport in airportFeesByClass 
      ? airportFeesByClass[airport as keyof typeof airportFeesByClass]
      : 0;
      }

  /**
   * Calculate time-based surcharge
   * @param vehicleType 
   * @param isWeekend 
   * @param timeOfDay 
   * @returns Surcharge amount
   */
  private calculateTimeSurcharge(
    vehicleType: string, 
    isWeekend: boolean, 
    timeOfDay: string
  ): number {
    const timeCategory = isWeekend ? 'weekends' : 'weekdays';
    
    // Determine time period
    const getPeriod = () => {
      const time = this.parseTime(timeOfDay);
      if (time >= this.parseTime('12:00 AM') && time < this.parseTime('06:00 AM')) 
        return 'nonPeak';
      if (time >= this.parseTime('06:00 AM') && time < this.parseTime('03:00 PM')) 
        return 'peakMedium';
      return 'peakHigh';
    };

    const period = getPeriod();
    
    // Safely access surcharges
    const timeSurchargesData = isWeekend ? timeSurcharges.weekends : timeSurcharges.weekdays;

    return timeSurchargesData[period as keyof typeof timeSurcharges.weekdays].surcharges[vehicleType] || 0;
  }

  /**
   * Parse time string to minutes since midnight
   * @param timeStr Time in format 'HH:MM AM/PM'
   * @returns Minutes since midnight
   */
  private parseTime(timeStr: string): number {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }
}

// Export a singleton instance
export const fareCalculationService = new FareCalculationService();
