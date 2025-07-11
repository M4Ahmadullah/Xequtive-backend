"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDistanceService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
class GoogleDistanceService {
    /**
     * Calculate distance and duration between locations using Google Distance Matrix API
     * This uses the shortest/fastest route which is what we want for fare calculation
     */
    static async getDistance(origin, destination, waypoints = []) {
        try {
            console.log('📍 Using Google Distance Matrix API for shortest route calculation (not real-time traffic)');
            let url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${env_1.env.googlePlaces.apiKey}&units=imperial&mode=driving`;
            // Add waypoints if provided
            if (waypoints.length > 0) {
                const waypointsStr = waypoints.map(wp => encodeURIComponent(wp)).join('|');
                url += `&waypoints=${waypointsStr}`;
            }
            console.log('Google Distance API URL:', url);
            const response = await axios_1.default.get(url);
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
        }
        catch (error) {
            console.error('Google Distance API error:', error);
            throw new Error('Failed to calculate distance using Google API');
        }
    }
    /**
     * Get directions with waypoints using Google Directions API
     */
    static async getDirectionsWithWaypoints(pickup, dropoff, waypoints) {
        try {
            const origin = `${pickup.lat},${pickup.lng}`;
            const destination = `${dropoff.lat},${dropoff.lng}`;
            const waypointsParam = waypoints
                .map(wp => `${wp.lat},${wp.lng}`)
                .join('|');
            const response = await axios_1.default.get(this.DIRECTIONS_URL, {
                params: {
                    origin,
                    destination,
                    waypoints: waypointsParam,
                    key: env_1.env.googlePlaces.apiKey,
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
            route.legs.forEach((leg) => {
                totalDistance += leg.distance.value;
                totalDuration += leg.duration.value;
            });
            return {
                distance: totalDistance, // meters
                duration: totalDuration, // seconds
                geometry: route.overview_polyline?.points,
                legs: route.legs
            };
        }
        catch (error) {
            console.error("Error fetching directions from Google:", error);
            throw new Error("Failed to get directions from Google Directions API");
        }
    }
}
exports.GoogleDistanceService = GoogleDistanceService;
GoogleDistanceService.DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json";
GoogleDistanceService.DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";
