"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapboxDistanceService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
class MapboxDistanceService {
    /**
     * Calculate distance and duration between locations using Mapbox Directions API
     * This uses the shortest route (by distance) for accurate fare calculation
     */
    static async getDistance(origin, destination, waypoints = []) {
        try {
            console.log('🗺️ Using Mapbox Directions API for shortest route calculation (not real-time traffic)');
            console.log('🗺️ Origin:', origin);
            console.log('🗺️ Destination:', destination);
            console.log('🗺️ Waypoints:', waypoints);
            console.log('🗺️ Mapbox token available:', !!env_1.env.mapbox.token);
            console.log('🗺️ Mapbox token starts with:', env_1.env.mapbox.token?.substring(0, 10) + '...');
            // Convert coordinates to Mapbox format (longitude,latitude)
            const originCoords = this.convertToMapboxFormat(origin);
            const destCoords = this.convertToMapboxFormat(destination);
            console.log('🗺️ Origin coords (Mapbox format):', originCoords);
            console.log('🗺️ Destination coords (Mapbox format):', destCoords);
            // Validate that coordinates are not too similar
            const [originLng, originLat] = originCoords.split(',').map(Number);
            const [destLng, destLat] = destCoords.split(',').map(Number);
            const latDiff = Math.abs(originLat - destLat);
            const lngDiff = Math.abs(originLng - destLng);
            console.log('🗺️ Coordinate differences - Lat:', latDiff, 'Lng:', lngDiff);
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
            const url = `${this.DIRECTIONS_URL}/${coordinates}?access_token=${env_1.env.mapbox.token}&alternatives=true&geometries=geojson`;
            console.log('🗺️ Mapbox Directions API URL (without token):', url.replace(env_1.env.mapbox.token, 'TOKEN_HIDDEN'));
            const response = await axios_1.default.get(url);
            console.log('🗺️ Mapbox API response status:', response.status);
            console.log('🗺️ Mapbox API response code:', response.data.code);
            if (response.data.code !== 'Ok') {
                console.error('❌ Mapbox Directions API error:', response.data);
                throw new Error(`Mapbox API error: ${response.data.code} - ${response.data.message || 'Unknown error'}`);
            }
            // ✅ SELECT SHORTEST ROUTE: Find the route with the shortest distance
            let shortestRoute = response.data.routes[0];
            let shortestDistance = shortestRoute.distance;
            console.log('🗺️ Available routes:', response.data.routes.length);
            for (let i = 0; i < response.data.routes.length; i++) {
                const route = response.data.routes[i];
                console.log(`🗺️ Route ${i + 1}: ${(route.distance * this.METERS_TO_MILES).toFixed(2)} miles, ${(route.duration / 60).toFixed(0)} minutes`);
                if (route.distance < shortestDistance) {
                    shortestDistance = route.distance;
                    shortestRoute = route;
                }
            }
            console.log('✅ Selected shortest route:', {
                distance: (shortestRoute.distance * this.METERS_TO_MILES).toFixed(2) + ' miles',
                duration: (shortestRoute.duration / 60).toFixed(0) + ' minutes'
            });
            // Convert distance from meters to miles
            const distanceInMiles = shortestRoute.distance * this.METERS_TO_MILES;
            // Convert duration from seconds to minutes
            const durationInMinutes = shortestRoute.duration * this.SECONDS_TO_MINUTES;
            console.log(`✅ Shortest route: ${distanceInMiles.toFixed(2)} miles, Duration: ${durationInMinutes.toFixed(0)} minutes`);
            return {
                distance: distanceInMiles,
                duration: durationInMinutes
            };
        }
        catch (error) {
            console.error('❌ Mapbox Directions API error:', error);
            if (axios_1.default.isAxiosError(error)) {
                console.error('❌ Axios error details:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    url: error.config?.url
                });
                if (error.response?.status === 401) {
                    throw new Error('Invalid Mapbox API token');
                }
                else if (error.response?.status === 403) {
                    throw new Error('Mapbox API access denied');
                }
                else if (error.response?.status === 429) {
                    throw new Error('Mapbox API rate limit exceeded');
                }
                else if (error.response?.status === 422) {
                    throw new Error('Invalid coordinates provided. Please ensure pickup and dropoff locations are different and valid.');
                }
            }
            throw new Error('Failed to calculate distance using Mapbox API');
        }
    }
    /**
     * Convert coordinates from "lat,lng" format to Mapbox "lng,lat" format
     */
    static convertToMapboxFormat(coords) {
        const [lat, lng] = coords.split(',').map(Number);
        if (isNaN(lat) || isNaN(lng)) {
            throw new Error(`Invalid coordinate format: ${coords}. Expected "lat,lng"`);
        }
        return `${lng},${lat}`;
    }
}
exports.MapboxDistanceService = MapboxDistanceService;
MapboxDistanceService.DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/driving";
MapboxDistanceService.METERS_TO_MILES = 0.000621371;
MapboxDistanceService.SECONDS_TO_MINUTES = 1 / 60;
