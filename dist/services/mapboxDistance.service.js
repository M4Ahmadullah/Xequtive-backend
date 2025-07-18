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
     * This uses the shortest/fastest route which is what we want for fare calculation
     */
    static async getDistance(origin, destination, waypoints = []) {
        try {
            console.log('📍 Using Mapbox Directions API for shortest route calculation (not real-time traffic)');
            // Convert coordinates to Mapbox format (longitude,latitude)
            const originCoords = this.convertToMapboxFormat(origin);
            const destCoords = this.convertToMapboxFormat(destination);
            let coordinates = `${originCoords};${destCoords}`;
            // Add waypoints if provided
            if (waypoints.length > 0) {
                const waypointCoords = waypoints.map(wp => this.convertToMapboxFormat(wp));
                coordinates = `${originCoords};${waypointCoords.join(';')};${destCoords}`;
            }
            const url = `${this.DIRECTIONS_URL}/${coordinates}?access_token=${env_1.env.mapbox.token}&geometries=geojson&overview=full&steps=true&annotations=distance,duration&units=imperial`;
            console.log('Mapbox Directions API URL:', url);
            const response = await axios_1.default.get(url);
            if (response.data.code !== 'Ok') {
                console.error('Mapbox Directions API error:', response.data);
                throw new Error(`Mapbox API error: ${response.data.code} - ${response.data.message || 'Unknown error'}`);
            }
            const route = response.data.routes[0];
            if (!route) {
                console.error('No route found:', response.data);
                throw new Error('No route found between the specified locations');
            }
            // Convert distance from meters to miles
            const distanceInMiles = route.distance * this.METERS_TO_MILES;
            // Convert duration from seconds to minutes
            const durationInMinutes = route.duration * this.SECONDS_TO_MINUTES;
            console.log(`✅ Distance: ${distanceInMiles.toFixed(2)} miles, Duration: ${durationInMinutes.toFixed(0)} minutes`);
            return {
                distance: distanceInMiles,
                duration: durationInMinutes
            };
        }
        catch (error) {
            console.error('Mapbox Directions API error:', error);
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error('Invalid Mapbox API token');
                }
                else if (error.response?.status === 403) {
                    throw new Error('Mapbox API access denied');
                }
                else if (error.response?.status === 429) {
                    throw new Error('Mapbox API rate limit exceeded');
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
