"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.FareService = void 0;
const axios_1 = __importDefault(require("axios"));
class FareService {
  static formatCoordinates(coords) {
    return `${coords.lng},${coords.lat}`;
  }
  static async getRouteDetails(
    pickupLocation,
    dropoffLocation,
    additionalStops
  ) {
    try {
      // Format coordinates for the API
      const coordinates = [
        pickupLocation,
        ...(additionalStops || []),
        dropoffLocation,
      ]
        .map((coord) => this.formatCoordinates(coord))
        .join(";");
      const response = await axios_1.default.get(
        `${this.BASE_URL}/${coordinates}`,
        {
          params: {
            access_token: this.MAPBOX_TOKEN,
            geometries: "geojson",
            overview: "full",
          },
        }
      );
      const route = response.data.routes[0];
      return {
        // Convert distance from meters to kilometers
        distance: route.distance / 1000,
        // Convert duration from seconds to minutes
        duration: route.duration / 60,
      };
    } catch (error) {
      throw new Error("Failed to calculate route details");
    }
  }
  static async calculateFare(request) {
    try {
      const { pickupLocation, dropoffLocation, additionalStops, vehicleType } =
        request;
      // Get base rate for vehicle type or use default
      const baseRate =
        this.VEHICLE_BASE_RATES[vehicleType] ||
        this.VEHICLE_BASE_RATES["Standard Saloon"];
      const minimumFare =
        this.MINIMUM_FARES[vehicleType] ||
        this.MINIMUM_FARES["Standard Saloon"];
      // Get route details from Mapbox
      const routeDetails = await this.getRouteDetails(
        pickupLocation,
        dropoffLocation,
        additionalStops
      );
      // Calculate fare
      // Base formula: base_rate + (distance_miles * rate_per_mile) + (duration_minutes * rate_per_min)
      const ratePerMile = 1.5; // £1.50 per mile
      const ratePerMin = 0.5; // £0.50 per minute
      let fareEstimate =
        baseRate +
        routeDetails.distance * ratePerMile +
        routeDetails.duration * ratePerMin;
      // Add surcharge for additional stops
      if (additionalStops && additionalStops.length > 0) {
        fareEstimate += additionalStops.length * 5; // £5 per additional stop
      }
      // Round to 2 decimal places
      fareEstimate = Math.round(fareEstimate * 100) / 100;
      // Apply minimum fare if calculated fare is less
      fareEstimate = Math.max(fareEstimate, minimumFare);
      return {
        fareEstimate,
        distance_miles: Math.round(routeDetails.distance * 10) / 10,
        duration_minutes: Math.round(routeDetails.duration),
      };
    } catch (error) {
      throw new Error("Failed to calculate fare estimate");
    }
  }
}
exports.FareService = FareService;
FareService.MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
FareService.BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/driving";
// Base rates for different vehicle types (in GBP)
FareService.VEHICLE_BASE_RATES = {
  "Standard Saloon": 2.5,
  "Executive Saloon": 3.0,
  "Executive MPV": 3.5,
  "Luxury Vehicle": 4.0,
};
// Minimum fare for each vehicle type
FareService.MINIMUM_FARES = {
  "Standard Saloon": 15,
  "Executive Saloon": 20,
  "Executive MPV": 25,
  "Luxury Vehicle": 30,
};
