import axios from "axios";
import { Coordinates } from "../types";
import { env } from "../config/env";

export interface MapboxDistanceResult {
  distance: number; // in miles
  duration: number; // in minutes
  geometry?: string; // encoded polyline
  legs?: MapboxLeg[];
}

export interface MapboxLeg {
  distance: number; // in meters
  duration: number; // in seconds
  steps: any[];
}

export interface MapboxRoute {
  distance: number; // in meters
  duration: number; // in seconds
  geometry?: string;
  legs?: MapboxLeg[];
}

export interface MapboxResponse {
  code: string;
  message?: string;
  routes: MapboxRoute[];
}

export class MapboxDistanceService {
  private static readonly DIRECTIONS_URL = 
    "https://api.mapbox.com/directions/v5/mapbox/driving";
  
  private static readonly METERS_TO_MILES = 0.000621371;
  private static readonly SECONDS_TO_MINUTES = 1 / 60;

  /**
   * Calculate distance and duration between locations using Mapbox Directions API
   * This uses the shortest route (by distance) for accurate fare calculation
   */
  static async getDistance(
    origin: string,
    destination: string,
    waypoints: string[] = []
  ): Promise<{ distance: number; duration: number }> {
    try {
      // console.log('🗺️ Using Mapbox Directions API for shortest route calculation (not real-time traffic)');
      // console.log('🗺️ Origin:', origin);
      // console.log('🗺️ Destination:', destination);
      // console.log('🗺️ Waypoints:', waypoints);
      // console.log('🗺️ Mapbox token available:', !!env.mapbox.token);
      // console.log('🗺️ Mapbox token starts with:', env.mapbox.token?.substring(0, 10) + '...');
      
      // Convert coordinates to Mapbox format (longitude,latitude)
      const originCoords = this.convertToMapboxFormat(origin);
      const destCoords = this.convertToMapboxFormat(destination);
      
      // console.log('🗺️ Origin coords (Mapbox format):', originCoords);
      // console.log('🗺️ Destination coords (Mapbox format):', destCoords);
      
      // Validate that coordinates are not too similar
      const [originLng, originLat] = originCoords.split(',').map(Number);
      const [destLng, destLat] = destCoords.split(',').map(Number);
      
      const latDiff = Math.abs(originLat - destLat);
      const lngDiff = Math.abs(originLng - destLng);
      
      // console.log('🗺️ Coordinate differences - Lat:', latDiff, 'Lng:', lngDiff);
      
      // Check if coordinates are too close (less than 0.001 degrees difference)
      if (latDiff < 0.001 && lngDiff < 0.001) {
        throw new Error('Pickup and dropoff locations are too close to calculate a meaningful route. Please select different locations.');
      }
      
      let coordinates = `${originCoords};${destCoords}`;
      
      // Add waypoints if provided
      if (waypoints.length > 0) {
        const waypointCoords = waypoints.map(wp => this.convertToMapboxFormat(wp));
        coordinates = `${originCoords};${waypointCoords.join(';')};${destCoords}`;
      }

      // ✅ FIXED: Use working Mapbox API format with alternatives for shortest route
      const url = `${this.DIRECTIONS_URL}/${coordinates}?access_token=${env.mapbox.token}&alternatives=true&geometries=geojson`;
      
      // console.log('🗺️ Mapbox Directions API URL (without token):', url.replace(env.mapbox.token, 'TOKEN_HIDDEN'));
      
      const response = await axios.get<MapboxResponse>(url);
      
      // console.log('🗺️ Mapbox API response status:', response.status);
      // console.log('🗺️ Mapbox API response code:', response.data.code);
      
      if (response.data.code !== 'Ok') {
        console.error('❌ Mapbox Directions API error:', response.data);
        throw new Error(`Mapbox API error: ${response.data.code} - ${response.data.message || 'Unknown error'}`);
      }

      // ✅ SELECT SHORTEST ROUTE: Find the route with the shortest distance
      let shortestRoute = response.data.routes[0];
      let shortestDistance = shortestRoute.distance;
      
      // console.log('🗺️ Available routes:', response.data.routes.length);
      
      for (let i = 0; i < response.data.routes.length; i++) {
        const route = response.data.routes[i];
        // console.log(`🗺️ Route ${i + 1}: ${(route.distance * this.METERS_TO_MILES).toFixed(2)} miles, ${(route.duration / 60).toFixed(0)} minutes`);
        
        if (route.distance < shortestDistance) {
          shortestDistance = route.distance;
          shortestRoute = route;
        }
      }
      
      // console.log('✅ Selected shortest route:', {
      //   distance: (shortestRoute.distance * this.METERS_TO_MILES).toFixed(2) + ' miles',
      //   duration: (shortestRoute.duration / 60).toFixed(0) + ' minutes'
      // });

      // Convert distance from meters to miles
      const distanceInMiles = shortestRoute.distance * this.METERS_TO_MILES;
      
      // Convert duration from seconds to minutes
      const durationInMinutes = shortestRoute.duration * this.SECONDS_TO_MINUTES;

      // console.log(`✅ Shortest route: ${distanceInMiles.toFixed(2)} miles, Duration: ${durationInMinutes.toFixed(0)} minutes`);

      return {
        distance: distanceInMiles,
        duration: durationInMinutes
      };

    } catch (error) {
      console.error('❌ Mapbox Directions API error:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
        
        if (error.response?.status === 401) {
          throw new Error('Invalid Mapbox API token');
        } else if (error.response?.status === 403) {
          throw new Error('Mapbox API access denied');
        } else if (error.response?.status === 429) {
          throw new Error('Mapbox API rate limit exceeded');
        } else if (error.response?.status === 422) {
          throw new Error('Invalid coordinates provided. Please ensure pickup and dropoff locations are different and valid.');
        }
      }
      throw new Error('Failed to calculate distance using Mapbox API');
    }
  }

  /**
   * Convert coordinates from "lat,lng" format to Mapbox "lng,lat" format
   */
  private static convertToMapboxFormat(coords: string): string {
    const [lat, lng] = coords.split(',').map(Number);
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error(`Invalid coordinate format: ${coords}. Expected "lat,lng"`);
    }
    return `${lng},${lat}`;
  }
} 