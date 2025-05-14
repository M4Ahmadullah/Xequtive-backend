"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FareService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const vehicleTypes_1 = require("../config/vehicleTypes");
const specialZones_1 = require("../config/specialZones");
const timePricing_1 = require("../config/timePricing");
class FareService {
    /**
     * Calculate fare estimates for different vehicle types
     */
    static async calculateFares(request) {
        try {
            const { pickupLocation, dropoffLocation, additionalStops = [] } = request;
            // Use the request date or current date
            const requestDate = request.date ? new Date(request.date) : new Date();
            // Call the MapBox API to get distance and duration
            console.log("Calling MapBox API to get route details...");
            const routeDetails = await this.getRouteDetails(pickupLocation, dropoffLocation);
            // Convert distance from meters to miles
            const distance = routeDetails.distance / 1609.34;
            // Convert duration from seconds to minutes
            const duration = routeDetails.duration / 60;
            console.log(`Distance: ${distance.toFixed(2)} miles, Duration: ${duration.toFixed(0)} minutes`);
            // Get the routing information including leg details
            const routeLegs = routeDetails.legs;
            // Detect special zones using the new helper method
            const specialZones = (0, specialZones_1.getZonesForRoute)(routeLegs);
            // Check if specific zones are present
            const hasCongeistionCharge = specialZones.includes("CONGESTION_CHARGE");
            const hasDartfordCrossing = specialZones.includes("DARTFORD_CROSSING");
            // Check for airports
            const airportsPickup = (0, specialZones_1.getAirportsNearLocation)(pickupLocation);
            const airportsDropoff = (0, specialZones_1.getAirportsNearLocation)(dropoffLocation);
            const airports = {
                pickupAirport: airportsPickup.length > 0 ? airportsPickup[0] : null,
                dropoffAirport: airportsDropoff.length > 0 ? airportsDropoff[0] : null,
            };
            // Log special conditions
            if (airports.pickupAirport) {
                const airport = specialZones_1.AIRPORTS[airports.pickupAirport];
                console.log(`Detected airport pickup at ${airport?.name || airports.pickupAirport}`);
            }
            if (airports.dropoffAirport) {
                const airport = specialZones_1.AIRPORTS[airports.dropoffAirport];
                console.log(`Detected airport dropoff at ${airport?.name || airports.dropoffAirport}`);
            }
            // Calculate fare for each vehicle type
            const allVehicleTypes = Object.values(vehicleTypes_1.vehicleTypes);
            const vehicleOptions = [];
            for (const vehicleType of allVehicleTypes) {
                console.log(`\n===== Calculating fare for ${vehicleType.name} =====`);
                // Calculate fare for this vehicle type
                const priceInfo = this.calculateVehicleFare(vehicleType, distance, duration, additionalStops.length, requestDate, airports, hasCongeistionCharge &&
                    (0, specialZones_1.isZoneActive)("CONGESTION_CHARGE", requestDate), hasDartfordCrossing);
                // Return vehicle option with calculated price
                vehicleOptions.push({
                    id: vehicleType.id,
                    name: vehicleType.name,
                    description: vehicleType.description,
                    capacity: vehicleType.capacity,
                    imageUrl: "", // Add default or empty values for required fields
                    eta: 0, // Add default or empty values for required fields
                    price: priceInfo,
                });
            }
            // Sort vehicle options by price (ascending)
            vehicleOptions.sort((a, b) => a.price.amount - b.price.amount);
            // Compile special location notifications
            const notifications = [];
            // Airport notifications
            if (airports.pickupAirport) {
                const airport = specialZones_1.AIRPORTS[airports.pickupAirport];
                if (airport) {
                    notifications.push(`Your journey includes airport pickup at ${airport.name}. A £${airport.fees.pickup.toFixed(2)} fee has been added.`);
                }
            }
            if (airports.dropoffAirport) {
                const airport = specialZones_1.AIRPORTS[airports.dropoffAirport];
                if (airport) {
                    notifications.push(`Your journey includes airport dropoff at ${airport.name}. A £${airport.fees.dropoff.toFixed(2)} fee has been added.`);
                }
            }
            // Congestion charge notification
            if (hasCongeistionCharge) {
                // Check if congestion charge is active at the requested time
                if ((0, specialZones_1.isZoneActive)("CONGESTION_CHARGE", requestDate)) {
                    notifications.push(`Your route passes through the Congestion Charge Zone. A £${specialZones_1.SPECIAL_ZONES.CONGESTION_CHARGE.fee.toFixed(2)} charge has been added.`);
                }
                else {
                    notifications.push("Your journey passes through the Congestion Charge Zone, but outside charging hours (Monday-Friday, 7am-6pm).");
                }
            }
            // Add notifications for other special zones
            for (const zoneKey of specialZones) {
                // Skip congestion charge as it's already handled
                if (zoneKey === "CONGESTION_CHARGE" ||
                    zoneKey === "DARTFORD_CROSSING") {
                    continue;
                }
                const zone = specialZones_1.SPECIAL_ZONES[zoneKey];
                if (zone) {
                    // Check if zone is active at requested time
                    if (!zone.operatingHours || (0, specialZones_1.isZoneActive)(zoneKey, requestDate)) {
                        notifications.push(`Your route passes through ${zone.name}. A £${zone.fee.toFixed(2)} charge has been added.`);
                    }
                    else {
                        notifications.push(`Your route passes through ${zone.name}, but outside charging hours.`);
                    }
                }
            }
            // Dartford crossing notification
            if (hasDartfordCrossing) {
                notifications.push(`Your journey includes the Dartford Crossing. A £${specialZones_1.SPECIAL_ZONES.DARTFORD_CROSSING.fee.toFixed(2)} charge has been added.`);
            }
            // Return just what the FareEstimateResponse interface expects
            return {
                fareEstimate: vehicleOptions[0]?.price.amount || 0,
                distance_miles: parseFloat(distance.toFixed(2)),
                duration_minutes: Math.ceil(duration),
            };
        }
        catch (error) {
            console.error("Error calculating fares:", error);
            throw new Error("Failed to calculate fare estimates");
        }
    }
    /**
     * Get route details from MapBox API
     */
    static async getRouteDetails(pickup, dropoff) {
        const pickupCoords = `${pickup.lng},${pickup.lat}`;
        const dropoffCoords = `${dropoff.lng},${dropoff.lat}`;
        const url = `${this.BASE_URL}/${pickupCoords};${dropoffCoords}?access_token=${env_1.env.mapbox.token}&geometries=geojson&overview=full&annotations=duration,distance,speed`;
        try {
            const response = await axios_1.default.get(url);
            const data = response.data;
            // Return the selected route
            return data.routes[0];
        }
        catch (error) {
            console.error("Error fetching route details:", error);
            throw new Error("Failed to get route details from MapBox API");
        }
    }
    /**
     * Calculate fare for a specific vehicle type
     */
    static calculateVehicleFare(vehicleType, distance, duration, additionalStops, requestDate, airports, hasCongestionCharge, hasDartfordCrossing) {
        console.log(`Base fare: £${vehicleType.baseRate}`);
        console.log(`Per-mile rate: £${vehicleType.perMileRate}/mile`);
        console.log(`Distance: ${distance.toFixed(2)} miles`);
        console.log(`Additional stops: ${additionalStops}`);
        // Calculate time-based multiplier using the new configuration
        const timeMultiplier = (0, timePricing_1.getTimeMultiplier)(requestDate);
        console.log(`Time multiplier: ${timeMultiplier}`);
        // Get time-based surcharge using the new configuration
        const timeSurcharge = (0, timePricing_1.getTimeSurcharge)(requestDate);
        console.log(`Time surcharge: £${timeSurcharge.toFixed(2)}`);
        // Calculate base fare
        const baseFare = vehicleType.baseRate;
        const distanceFare = vehicleType.perMileRate * distance;
        console.log(`Base fare: £${baseFare.toFixed(2)}`);
        console.log(`Distance charge: £${distanceFare.toFixed(2)}`);
        // Apply time multiplier to the distance fare only
        const timeAdjustedDistanceFare = distanceFare * timeMultiplier;
        console.log(`Time-adjusted distance charge: £${timeAdjustedDistanceFare.toFixed(2)}`);
        // Calculate initial fare
        let fareAmount = baseFare + timeAdjustedDistanceFare + timeSurcharge;
        console.log(`Initial fare: £${fareAmount.toFixed(2)}`);
        // Add additional stop fees
        if (additionalStops > 0 && vehicleType.additionalStopFee) {
            const stopFee = additionalStops * vehicleType.additionalStopFee;
            fareAmount += stopFee;
            console.log(`After stop fees: £${fareAmount.toFixed(2)} (added £${stopFee.toFixed(2)} for ${additionalStops} stops)`);
        }
        // Add special charges and location fees
        const specialLocationMessages = [];
        // Check for airports
        if (airports.pickupAirport) {
            const airport = specialZones_1.AIRPORTS[airports.pickupAirport];
            if (airport) {
                const pickupFee = airport.fees.pickup;
                fareAmount += pickupFee;
                console.log(`Airport pickup fee for ${airport.name}: £${pickupFee.toFixed(2)}`);
                specialLocationMessages.push(`Your journey includes airport pickup at ${airport.name}. A £${pickupFee.toFixed(2)} fee has been added.`);
            }
        }
        if (airports.dropoffAirport) {
            const airport = specialZones_1.AIRPORTS[airports.dropoffAirport];
            if (airport) {
                const dropoffFee = airport.fees.dropoff;
                fareAmount += dropoffFee;
                console.log(`Airport dropoff fee for ${airport.name}: £${dropoffFee.toFixed(2)}`);
                specialLocationMessages.push(`Your journey includes airport dropoff at ${airport.name}. A £${dropoffFee.toFixed(2)} fee has been added.`);
            }
        }
        // Add congestion charge
        if (hasCongestionCharge) {
            const congestionCharge = specialZones_1.SPECIAL_ZONES.CONGESTION_CHARGE.fee;
            fareAmount += congestionCharge;
            console.log(`Added congestion charge: £${congestionCharge.toFixed(2)}`);
            specialLocationMessages.push(`Your route passes through the Congestion Charge Zone. A £${congestionCharge.toFixed(2)} charge has been added.`);
        }
        // Add Dartford Crossing fee
        if (hasDartfordCrossing) {
            const dartfordFee = specialZones_1.SPECIAL_ZONES.DARTFORD_CROSSING.fee;
            fareAmount += dartfordFee;
            console.log(`Added Dartford Crossing fee: £${dartfordFee.toFixed(2)}`);
            specialLocationMessages.push(`Your journey includes the Dartford Crossing. A £${dartfordFee.toFixed(2)} charge has been added.`);
        }
        // Apply minimum fare if needed
        if (fareAmount < vehicleType.minimumFare) {
            console.log(`Fare £${fareAmount.toFixed(2)} is below minimum fare £${vehicleType.minimumFare.toFixed(2)}, using minimum fare`);
            fareAmount = vehicleType.minimumFare;
        }
        // Round to nearest 0.5
        const roundedFare = Math.ceil(fareAmount * 2) / 2;
        console.log(`Final rounded fare: £${roundedFare.toFixed(2)}`);
        return {
            amount: roundedFare,
            currency: this.DEFAULT_CURRENCY,
            messages: specialLocationMessages.length > 0
                ? specialLocationMessages
                : undefined,
        };
    }
}
exports.FareService = FareService;
FareService.BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/driving";
// Default currency
FareService.DEFAULT_CURRENCY = "GBP";
