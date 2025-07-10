import axios from "axios";
import { Coordinates } from "../types";
import { env } from "../config/env";

export interface GoogleDistanceResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry?: string; // encoded polyline
  legs?: any[];
}

export class GoogleDistanceService {
  private static readonly DISTANCE_MATRIX_URL = 
    "https://maps.googleapis.com/maps/api/distancematrix/json";
  private static readonly DIRECTIONS_URL = 
    "https://maps.googleapis.com/maps/api/directions/json";

  /**
   * Calculate distance and duration between locations using Google Distance Matrix API
   * This uses the shortest/fastest route which is what we want for fare calculation
   */
  static async getRouteDetails(
    pickup: Coordinates,
    dropoff: Coordinates,
    waypoints: Coordinates[] = []
  ): Promise<GoogleDistanceResult> {
    try {
      // If we have waypoints, use Directions API for multi-stop routes
      if (waypoints.length > 0) {
        return await this.getDirectionsWithWaypoints(pickup, dropoff, waypoints);
      }

      // For simple point-to-point, use Distance Matrix API (more efficient)
      const origins = `${pickup.lat},${pickup.lng}`;
      const destinations = `${dropoff.lat},${dropoff.lng}`;

      const response = await axios.get(this.DISTANCE_MATRIX_URL, {
        params: {
          origins,
          destinations,
          key: env.googlePlaces.apiKey,
          units: 'metric',
          mode: 'driving',
          avoid: 'tolls', // Avoid tolls to get shortest route
          departure_time: 'now' // Get current traffic conditions
        }
      });

      const data = response.data;
      
      if (data.status !== 'OK') {
        throw new Error(`Google Distance Matrix API error: ${data.status}`);
      }

      const element = data.rows[0]?.elements[0];
      if (!element || element.status !== 'OK') {
        throw new Error(`No route found: ${element?.status || 'Unknown error'}`);
      }

      return {
        distance: element.distance.value, // meters
        duration: element.duration.value, // seconds
        legs: []
      };
    } catch (error) {
      console.error("Error fetching route details from Google:", error);
      throw new Error("Failed to get route details from Google Distance Matrix API");
    }
  }

  /**
   * Get directions with waypoints using Google Directions API
   */
  private static async getDirectionsWithWaypoints(
    pickup: Coordinates,
    dropoff: Coordinates,
    waypoints: Coordinates[]
  ): Promise<GoogleDistanceResult> {
    try {
      const origin = `${pickup.lat},${pickup.lng}`;
      const destination = `${dropoff.lat},${dropoff.lng}`;
      const waypointsParam = waypoints
        .map(wp => `${wp.lat},${wp.lng}`)
        .join('|');

      const response = await axios.get(this.DIRECTIONS_URL, {
        params: {
          origin,
          destination,
          waypoints: waypointsParam,
          key: env.googlePlaces.apiKey,
          mode: 'driving',
          avoid: 'tolls', // Get shortest route
          departure_time: 'now'
        }
      });

      const data = response.data;
      
      if (data.status !== 'OK') {
        throw new Error(`Google Directions API error: ${data.status}`);
      }

      const route = data.routes[0];
      if (!route) {
        throw new Error('No route found');
      }

      // Calculate total distance and duration from all legs
      let totalDistance = 0;
      let totalDuration = 0;
      
      route.legs.forEach((leg: any) => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
      });

      return {
        distance: totalDistance, // meters
        duration: totalDuration, // seconds
        geometry: route.overview_polyline?.points,
        legs: route.legs
      };
    } catch (error) {
      console.error("Error fetching directions from Google:", error);
      throw new Error("Failed to get directions from Google Directions API");
    }
  }
} 