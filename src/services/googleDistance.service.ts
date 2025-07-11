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
  static async getDistance(
    origin: string,
    destination: string,
    waypoints: string[] = []
  ): Promise<{ distance: number; duration: number }> {
    try {
      console.log('📍 Using Google Distance Matrix API for shortest route calculation (not real-time traffic)');
      
      let url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${env.googlePlaces.apiKey}&units=imperial&mode=driving`;
      
      // Add waypoints if provided
      if (waypoints.length > 0) {
        const waypointsStr = waypoints.map(wp => encodeURIComponent(wp)).join('|');
        url += `&waypoints=${waypointsStr}`;
      }

      console.log('Google Distance API URL:', url);
      
      const response = await axios.get(url);
      
      if (response.data.status !== 'OK') {
        console.error('Google Distance API error:', response.data);
        throw new Error(`Google API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
      }

      const element = response.data.rows[0]?.elements[0];
      
      if (!element || element.status !== 'OK') {
        console.error('No route found:', element);
        throw new Error('No route found between the specified locations');
      }

      // Convert distance from meters to miles
      const distanceInMiles = element.distance.value * 0.000621371;
      
      // Convert duration from seconds to minutes
      const durationInMinutes = element.duration.value / 60;

      console.log(`✅ Distance: ${distanceInMiles.toFixed(2)} miles, Duration: ${durationInMinutes.toFixed(0)} minutes`);

      return {
        distance: distanceInMiles,
        duration: durationInMinutes
      };

    } catch (error) {
      console.error('Google Distance API error:', error);
      throw new Error('Failed to calculate distance using Google API');
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