import axios from "axios";
import {
  Coordinates,
  FareEstimateRequest,
  FareEstimateResponse,
} from "../types";
import { env } from "../config/env";

export class FareService {
  private static readonly BASE_URL =
    "https://api.mapbox.com/directions/v5/mapbox/driving-traffic";

  // Base rates for different vehicle types (in GBP)
  private static readonly VEHICLE_BASE_RATES: { [key: string]: number } = {
    "Standard Saloon": 3.5, // £3.50 base rate
    "Executive Saloon": 4.5, // £4.50 base rate
    "Executive MPV": 5.5, // £5.50 base rate
    "Luxury Vehicle": 6.5, // £6.50 base rate
  };

  // Minimum fare for each vehicle type
  private static readonly MINIMUM_FARES: { [key: string]: number } = {
    "Standard Saloon": 15,
    "Executive Saloon": 20,
    "Executive MPV": 25,
    "Luxury Vehicle": 30,
  };

  // Per mile rates for different vehicle types
  private static readonly PER_MILE_RATES: { [key: string]: number } = {
    "Standard Saloon": 3.2, // £3.20 per mile
    "Executive Saloon": 4.0, // £4.00 per mile
    "Executive MPV": 4.8, // £4.80 per mile
    "Luxury Vehicle": 5.6, // £5.60 per mile
  };

  // Per minute rates for different vehicle types
  private static readonly PER_MINUTE_RATES: { [key: string]: number } = {
    "Standard Saloon": 0.4, // £0.40 per minute
    "Executive Saloon": 0.5, // £0.50 per minute
    "Executive MPV": 0.6, // £0.60 per minute
    "Luxury Vehicle": 0.7, // £0.70 per minute
  };

  // Time-based multipliers
  private static readonly TIME_MULTIPLIERS = {
    PEAK_HOURS: 1.5, // 50% increase during peak hours
    OFF_PEAK: 1.0,
    NIGHT: 1.3, // 30% increase for night rides
    WEEKEND: 1.2, // 20% increase during weekends
    HOLIDAY: 1.4, // 40% increase during holidays
  };

  // Traffic condition multipliers based on Mapbox congestion data
  private static readonly TRAFFIC_MULTIPLIERS = {
    low: 1.0, // No traffic
    moderate: 1.2, // Some traffic
    heavy: 1.4, // Heavy traffic
    severe: 1.6, // Severe traffic
  };

  // Additional stop fee
  private static readonly STOP_FEE = 5.0; // £5.00 per additional stop

  private static formatCoordinates(coords: Coordinates): string {
    return `${coords.lng},${coords.lat}`;
  }

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

  private static isNightHour(hour: number): boolean {
    // Night hours: 10 PM - 5 AM
    return hour >= 22 || hour <= 5;
  }

  private static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

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

    // TODO: Add holiday check and multiply by HOLIDAY multiplier if applicable

    return multiplier;
  }

  private static getTrafficMultiplier(congestion: string): number {
    return (
      this.TRAFFIC_MULTIPLIERS[
        congestion as keyof typeof this.TRAFFIC_MULTIPLIERS
      ] || this.TRAFFIC_MULTIPLIERS.low
    );
  }

  private static async getRouteDetails(
    pickupLocation: Coordinates,
    dropoffLocation: Coordinates,
    additionalStops?: Coordinates[]
  ): Promise<{
    distance: number;
    duration: number;
    congestion: string;
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
      console.log(
        "Using Mapbox token:",
        env.mapbox.token ? "***TOKEN EXISTS***" : "TOKEN MISSING!"
      );

      const response = await axios.get(`${this.BASE_URL}/${coordinates}`, {
        params: {
          access_token: env.mapbox.token,
          geometries: "geojson",
          overview: "full",
          annotations: "congestion,duration,distance",
          steps: "true",
        },
      });

      console.log("Mapbox API response:", response.data);

      const route = response.data.routes[0];
      const legs = route.legs;

      // Calculate average congestion level from all route segments
      const congestionLevels = legs.flatMap((leg: any) =>
        leg.steps.map((step: any) => step.congestion || "low")
      );

      const avgCongestion = congestionLevels.reduce(
        (acc: string, level: string) => {
          if (level === "severe" || acc === "severe") return "severe";
          if (level === "heavy" || acc === "heavy") return "heavy";
          if (level === "moderate" || acc === "moderate") return "moderate";
          return "low";
        },
        "low"
      );

      return {
        // Distance is already in miles from Mapbox API
        distance: route.distance,
        // Convert duration from seconds to minutes
        duration: route.duration / 60,
        congestion: avgCongestion,
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

  static async calculateFare(
    request: FareEstimateRequest
  ): Promise<FareEstimateResponse> {
    try {
      const { pickupLocation, dropoffLocation, additionalStops, vehicleType } =
        request;

      console.log("Calculating fare for request:", request);

      // Get base rate and per-unit rates for vehicle type
      const baseRate =
        this.VEHICLE_BASE_RATES[vehicleType] ||
        this.VEHICLE_BASE_RATES["Standard Saloon"];
      const perMileRate =
        this.PER_MILE_RATES[vehicleType] ||
        this.PER_MILE_RATES["Standard Saloon"];
      const perMinuteRate =
        this.PER_MINUTE_RATES[vehicleType] ||
        this.PER_MINUTE_RATES["Standard Saloon"];
      const minimumFare =
        this.MINIMUM_FARES[vehicleType] ||
        this.MINIMUM_FARES["Standard Saloon"];

      // Get route details from Mapbox
      const routeDetails = await this.getRouteDetails(
        pickupLocation,
        dropoffLocation,
        additionalStops
      );

      console.log("Route details:", routeDetails);

      // Calculate base fare components
      const distanceFare = routeDetails.distance * perMileRate;
      const timeFare = routeDetails.duration * perMinuteRate;

      // Get time-based multiplier
      const timeMultiplier = this.getTimeMultiplier();
      console.log("Time multiplier:", timeMultiplier);

      // Get traffic-based multiplier
      const trafficMultiplier = this.getTrafficMultiplier(
        routeDetails.congestion
      );
      console.log("Traffic multiplier:", trafficMultiplier);

      // Calculate initial fare
      let fareEstimate = baseRate + distanceFare + timeFare;
      console.log("Initial fare estimate:", fareEstimate);

      // Apply time and traffic multipliers
      fareEstimate *= timeMultiplier * trafficMultiplier;
      console.log("Fare after multipliers:", fareEstimate);

      // Add surcharge for additional stops
      if (additionalStops && additionalStops.length > 0) {
        fareEstimate += additionalStops.length * this.STOP_FEE;
        console.log("Fare after additional stops:", fareEstimate);
      }

      // Round to 2 decimal places
      fareEstimate = Math.round(fareEstimate * 100) / 100;

      // Apply minimum fare if calculated fare is less
      fareEstimate = Math.max(fareEstimate, minimumFare);
      console.log("Final fare estimate:", fareEstimate);

      return {
        fareEstimate,
        distance_miles: Math.round(routeDetails.distance * 10) / 10,
        duration_minutes: Math.round(routeDetails.duration),
      };
    } catch (error) {
      console.error("Error in calculateFare:", error);
      throw error;
    }
  }
}
