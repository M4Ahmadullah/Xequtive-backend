import axios from "axios";
import {
  Coordinates,
  EnhancedFareEstimateRequest,
  EnhancedFareEstimateResponse,
  VehicleOption,
  VehiclePriceInfo,
  VerifiedFareData,
} from "../types";
import { env } from "../config/env";
import { vehicleTypes, VehicleType } from "../config/vehicleTypes";

export class EnhancedFareService {
  private static readonly BASE_URL =
    "https://api.mapbox.com/directions/v5/mapbox/driving";

  // Time-based multipliers
  private static readonly TIME_MULTIPLIERS = {
    PEAK_HOURS: 1.5, // 50% increase during peak hours
    OFF_PEAK: 1.0,
    NIGHT: 1.3, // 30% increase for night rides
    WEEKEND: 1.2, // 20% increase during weekends
    HOLIDAY: 1.4, // 40% increase during holidays
  };

  // Additional stop fee (in GBP)
  private static readonly STOP_FEE = 5.0; // £5.00 per additional stop

  // Default currency
  private static readonly DEFAULT_CURRENCY = "GBP";

  /**
   * Formats coordinates for Mapbox API
   */
  private static formatCoordinates(coords: Coordinates): string {
    return `${coords.lng},${coords.lat}`;
  }

  /**
   * Format a date to ISO string without milliseconds
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split(".")[0] + "Z";
  }

  /**
   * Determines if the given time is during peak hours
   */
  private static isPeakHour(date: Date): boolean {
    const hour = date.getHours();
    const day = date.getDay();

    // Weekday peak hours: 7-10 AM and 4-7 PM
    if (day >= 1 && day <= 5) {
      return (hour >= 7 && hour <= 10) || (hour >= 16 && hour <= 19);
    }

    // Weekend peak hours: 10 AM - 8 PM
    if (day === 0 || day === 6) {
      return hour >= 10 && hour <= 20;
    }

    return false;
  }

  /**
   * Determines if the given hour is night time
   */
  private static isNightHour(hour: number): boolean {
    // Night hours: 10 PM - 5 AM
    return hour >= 22 || hour <= 5;
  }

  /**
   * Determines if the given date is a weekend
   */
  private static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * Calculates time-based multiplier for fare
   */
  private static getTimeMultiplier(date: Date = new Date()): number {
    let multiplier = this.TIME_MULTIPLIERS.OFF_PEAK;

    if (this.isPeakHour(date)) {
      multiplier = this.TIME_MULTIPLIERS.PEAK_HOURS;
    } else if (this.isNightHour(date.getHours())) {
      multiplier = this.TIME_MULTIPLIERS.NIGHT;
    }

    if (this.isWeekend(date)) {
      multiplier *= this.TIME_MULTIPLIERS.WEEKEND;
    }

    return multiplier;
  }

  /**
   * Gets route details from Mapbox API
   */
  private static async getRouteDetails(
    pickupLocation: Coordinates,
    dropoffLocation: Coordinates,
    additionalStops?: Coordinates[],
    departureTime?: Date
  ): Promise<{
    distance: number;
    duration: number;
    legs: any[];
  }> {
    try {
      const coordinates = [
        pickupLocation,
        ...(additionalStops || []),
        dropoffLocation,
      ]
        .map((coord) => this.formatCoordinates(coord))
        .join(";");

      console.log("Making Mapbox API request with coordinates:", coordinates);

      const params: any = {
        access_token: env.mapbox.token,
        geometries: "geojson",
        overview: "full",
        annotations: "duration,distance",
        steps: "true",
      };

      // Add departure time if provided
      if (departureTime) {
        params.depart_at = this.formatDate(departureTime);
      }

      const response = await axios.get(`${this.BASE_URL}/${coordinates}`, {
        params,
      });

      if (!response.data.routes || response.data.routes.length === 0) {
        throw new Error("No routes found between the specified locations");
      }

      const route = response.data.routes[0];
      const legs = route.legs;

      return {
        // Convert distance from meters to kilometers
        distance: route.distance / 1000,
        // Convert duration from seconds to minutes
        duration: route.duration / 60,
        legs: legs,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Mapbox API Error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      } else {
        console.error("Unknown error:", error);
      }
      throw new Error("Failed to calculate route details");
    }
  }

  /**
   * Calculates ETA based on vehicle type and current conditions
   */
  private static calculateETA(
    vehicleType: VehicleType,
    baseETA: number
  ): number {
    // For now, just return the base ETA from the vehicle type
    // This could be enhanced with time-of-day or traffic adjustments
    return vehicleType.eta;
  }

  /**
   * Calculates fare for a specific vehicle type
   */
  private static calculateVehicleOptionFare(
    vehicleType: VehicleType,
    distance: number,
    duration: number,
    additionalStops: number,
    timeMultiplier: number
  ): VehiclePriceInfo {
    console.log(`\n===== Calculating fare for ${vehicleType.name} =====`);
    console.log(`Base rate: £${vehicleType.baseRate}/km`);
    console.log(`Distance: ${distance.toFixed(2)} km`);
    console.log(`Additional stops: ${additionalStops}`);
    console.log(`Time multiplier: ${timeMultiplier}`);

    // Calculate base fare
    let baseFare = vehicleType.baseRate;
    let distanceFare = vehicleType.baseRate * distance;
    console.log(`Base fare: £${baseFare.toFixed(2)}`);
    console.log(`Distance charge: £${distanceFare.toFixed(2)}`);

    let fareAmount = baseFare + distanceFare;
    console.log(`Initial fare (base + distance): £${fareAmount.toFixed(2)}`);

    // Apply time multiplier
    const originalFare = fareAmount;
    fareAmount *= timeMultiplier;
    console.log(
      `After time multiplier: £${fareAmount.toFixed(
        2
      )} (${timeMultiplier}x increase from £${originalFare.toFixed(2)})`
    );

    // Add additional stop fees
    if (additionalStops > 0) {
      const stopFee = additionalStops * this.STOP_FEE;
      fareAmount += stopFee;
      console.log(
        `After stop fees: £${fareAmount.toFixed(2)} (added £${stopFee.toFixed(
          2
        )} for ${additionalStops} stops)`
      );
    }

    // Apply minimum fare if needed
    if (fareAmount < vehicleType.minimumFare) {
      console.log(
        `Fare £${fareAmount.toFixed(
          2
        )} is below minimum fare £${vehicleType.minimumFare.toFixed(
          2
        )}, using minimum fare`
      );
      fareAmount = vehicleType.minimumFare;
    }

    // Round to nearest 0.5
    const roundedFare = Math.ceil(fareAmount * 2) / 2;
    console.log(`Final rounded fare: £${roundedFare.toFixed(2)}`);
    console.log("=============================================");

    return {
      amount: roundedFare,
      currency: this.DEFAULT_CURRENCY,
    };
  }

  /**
   * Converts a VehicleType to a VehicleOption with pricing information
   */
  private static vehicleTypeToOption(
    vehicleType: VehicleType,
    distance: number,
    duration: number,
    additionalStops: number,
    timeMultiplier: number
  ): VehicleOption {
    const price = this.calculateVehicleOptionFare(
      vehicleType,
      distance,
      duration,
      additionalStops,
      timeMultiplier
    );

    const eta = this.calculateETA(vehicleType, vehicleType.eta);

    return {
      id: vehicleType.id,
      name: vehicleType.name,
      description: vehicleType.description,
      capacity: {
        passengers: vehicleType.capacity.passengers,
        luggage: vehicleType.capacity.luggage,
        wheelchair: vehicleType.capacity.wheelchair,
      },
      price,
      eta,
      imageUrl: vehicleType.imageUrl,
      features: vehicleType.features,
    };
  }

  /**
   * Calculates fare estimates for all vehicle types
   */
  static async calculateFares(
    request: EnhancedFareEstimateRequest
  ): Promise<EnhancedFareEstimateResponse> {
    try {
      console.log("\n\n============ ENHANCED FARE CALCULATION ============");
      console.log("Request:", JSON.stringify(request, null, 2));

      const {
        locations: { pickup, dropoff, additionalStops },
        datetime,
        passengers,
      } = request;

      console.log(
        `Calculating fares for journey from ${pickup.address} to ${dropoff.address}`
      );
      console.log(
        `Passengers: ${passengers.count}, Luggage: ${
          passengers.checkedLuggage + passengers.handLuggage
        } items`
      );

      // Parse the datetime
      const requestDate = datetime
        ? new Date(`${datetime.date}T${datetime.time}:00`)
        : new Date();
      console.log(`Journey date/time: ${requestDate.toLocaleString()}`);

      // Get time-based multiplier
      const timeMultiplier = this.getTimeMultiplier(requestDate);
      console.log(`Time multiplier: ${timeMultiplier}`);

      // Get route details from Mapbox
      console.log("Getting route details from Mapbox...");
      const routeDetails = await this.getRouteDetails(
        pickup.coordinates,
        dropoff.coordinates,
        additionalStops?.map((stop) => stop.coordinates),
        requestDate
      );

      console.log(
        `Route details: Distance: ${routeDetails.distance.toFixed(
          2
        )} km, Duration: ${routeDetails.duration.toFixed(1)} min`
      );

      console.log(
        `\nCalculating fares for all ${vehicleTypes.length} vehicle types...`
      );

      // Calculate fare for each vehicle type
      const vehicleOptions = vehicleTypes.map((vehicleType) =>
        this.vehicleTypeToOption(
          vehicleType,
          routeDetails.distance,
          routeDetails.duration,
          additionalStops?.length || 0,
          timeMultiplier
        )
      );

      // Sort by price
      vehicleOptions.sort((a, b) => a.price.amount - b.price.amount);

      console.log("\n===== Fare Summary =====");
      vehicleOptions.forEach((vehicle) => {
        console.log(
          `${vehicle.name}: £${vehicle.price.amount} (ETA: ${vehicle.eta} min)`
        );
      });

      // Calculate the base fare (average of standard vehicle types)
      const standardVehicles = vehicleOptions.filter((v) =>
        ["standard-saloon", "estate"].includes(v.id)
      );

      const baseFare =
        standardVehicles.length > 0
          ? standardVehicles.reduce((sum, v) => sum + v.price.amount, 0) /
            standardVehicles.length
          : vehicleOptions[0].price.amount;

      console.log(
        `Base fare (avg of standard vehicles): £${baseFare.toFixed(2)}`
      );
      console.log("=============================================\n\n");

      console.log("Fare details:", vehicleOptions);
      console.log("=============================================\n\n");

      return {
        baseFare: Math.round(baseFare * 100) / 100,
        totalDistance: Math.round(routeDetails.distance * 10) / 10,
        estimatedTime: Math.ceil(routeDetails.duration),
        currency: this.DEFAULT_CURRENCY,
        vehicleOptions,
        journey: {
          distance_km: Math.round(routeDetails.distance * 10) / 10,
          duration_min: Math.ceil(routeDetails.duration),
        },
      };
    } catch (error) {
      console.error("Error calculating fares:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to calculate fare estimates"
      );
    }
  }

  /**
   * Calculate fare for a specific vehicle type (for booking verification)
   * This method is used in the booking verification process to recalculate the fare
   * for a specific vehicle type using the same algorithm as the enhanced fare calculation
   */
  static async calculateSingleVehicleFare(
    request: EnhancedFareEstimateRequest,
    vehicleId: string
  ): Promise<VerifiedFareData | null> {
    try {
      console.log(
        `\n============ FARE VERIFICATION FOR ${vehicleId} ============`
      );

      const {
        locations: { pickup, dropoff, additionalStops },
        datetime,
      } = request;

      // Find the requested vehicle type
      const vehicleType = vehicleTypes.find((v) => v.id === vehicleId);
      if (!vehicleType) {
        console.error(`Vehicle type not found: ${vehicleId}`);
        return null;
      }

      // Parse the datetime
      const requestDate = datetime
        ? new Date(`${datetime.date}T${datetime.time}:00`)
        : new Date();

      // Get time-based multiplier
      const timeMultiplier = this.getTimeMultiplier(requestDate);

      // Get route details from Mapbox
      const routeDetails = await this.getRouteDetails(
        pickup.coordinates,
        dropoff.coordinates,
        additionalStops?.map((stop) => stop.coordinates),
        requestDate
      );

      // Calculate fare for the specific vehicle type
      const fare = this.calculateVehicleOptionFare(
        vehicleType,
        routeDetails.distance,
        routeDetails.duration,
        additionalStops?.length || 0,
        timeMultiplier
      );

      console.log(
        `Verified fare for ${vehicleType.name}: £${fare.amount.toFixed(2)}`
      );
      console.log(
        `Distance: ${routeDetails.distance.toFixed(
          2
        )} km, Duration: ${routeDetails.duration.toFixed(1)} min`
      );
      console.log("=============================================\n");

      // Return the verified fare data
      return {
        vehicleId: vehicleType.id,
        vehicleName: vehicleType.name,
        price: fare,
        distance_km: Math.round(routeDetails.distance * 10) / 10,
        duration_min: Math.ceil(routeDetails.duration),
      };
    } catch (error) {
      console.error("Error calculating single vehicle fare:", error);
      return null;
    }
  }
}
