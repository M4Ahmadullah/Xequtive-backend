"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedFareService = void 0;
const vehicleTypes_1 = require("../config/vehicleTypes");
const specialZones_1 = require("../config/specialZones");
const timePricing_1 = require("../config/timePricing");
const serviceArea_1 = require("../config/serviceArea");
const googleDistance_service_1 = require("./googleDistance.service");
class EnhancedFareService {
    /**
     * Calculate fare estimates for different vehicle types with enhanced features
     */
    static async calculateFares(request) {
        try {
            // Handle both old and new request formats
            let pickupLocation;
            let dropoffLocation;
            let additionalStops = [];
            let requestDate;
            // Parse request format
            if (request.pickupLocation && request.dropoffLocation) {
                // New format with direct coordinates
                pickupLocation = request.pickupLocation;
                dropoffLocation = request.dropoffLocation;
                additionalStops = request.additionalStops || [];
                requestDate = request.date ? new Date(request.date) : new Date();
            }
            else if (request.locations) {
                // Old format with location objects
                pickupLocation = request.locations.pickup.coordinates;
                dropoffLocation = request.locations.dropoff.coordinates;
                additionalStops = (request.locations.additionalStops || []).map((stop) => ({
                    location: stop.coordinates,
                }));
                requestDate = request.datetime
                    ? new Date(`${request.datetime.date}T${request.datetime.time}:00`)
                    : new Date();
            }
            else {
                throw new Error("Invalid request format - missing location data");
            }
            // Check if the route is within our service area
            const serviceAreaCheck = (0, serviceArea_1.isRouteServiceable)(pickupLocation, dropoffLocation);
            if (!serviceAreaCheck.serviceable) {
                const error = new Error(serviceAreaCheck.message || "Location is outside our service area");
                // Add custom properties to the error object for better error handling
                Object.assign(error, {
                    code: "LOCATION_NOT_SERVICEABLE",
                    details: serviceAreaCheck.message,
                });
                throw error;
            }
            // Call the Google Distance API to get distance and duration
            console.log("Calling Google Distance API to get route details...");
            const routeDetails = await googleDistance_service_1.GoogleDistanceService.getRouteDetails(pickupLocation, dropoffLocation, additionalStops.map((stop) => stop.location));
            // Convert distance from meters to miles
            const distance = routeDetails.distance / 1609.34;
            // Convert duration from seconds to minutes
            const duration = routeDetails.duration / 60;
            console.log(`Distance: ${distance.toFixed(2)} miles, Duration: ${duration.toFixed(0)} minutes`);
            // Get the routing information including leg details
            const routeLegs = routeDetails.legs || [];
            // Detect special zones using the helper method
            const specialZones = (0, specialZones_1.getZonesForRoute)(routeLegs);
            // Check if specific zones are present
            const passesThroughCCZ = specialZones.includes("CONGESTION_CHARGE");
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
            // Compile special location notifications
            const notifications = [];
            // Airport notifications
            if (airports.pickupAirport) {
                const airport = specialZones_1.AIRPORTS[airports.pickupAirport];
                if (airport) {
                    notifications.push(`Your journey includes airport pickup at ${airport.name}. Airport fees will be applied based on vehicle class.`);
                }
            }
            if (airports.dropoffAirport) {
                const airport = specialZones_1.AIRPORTS[airports.dropoffAirport];
                if (airport) {
                    notifications.push(`Your journey includes airport dropoff at ${airport.name}. A £${airport.fees.dropoff.toFixed(2)} fee has been added.`);
                }
            }
            // Congestion charge notification
            if (passesThroughCCZ) {
                // Check if congestion charge is active at the requested time
                if ((0, specialZones_1.isZoneActive)("CONGESTION_CHARGE", requestDate)) {
                    notifications.push(`Your route passes through the Congestion Charge Zone. A £${specialZones_1.SPECIAL_ZONES.CONGESTION_CHARGE.fee.toFixed(2)} charge has been added.`);
                }
                else {
                    notifications.push("Your journey passes through the Congestion Charge Zone, but outside charging hours");
                }
            }
            // Dartford crossing notification
            if (hasDartfordCrossing) {
                notifications.push(`Your journey includes the Dartford Crossing. A £${specialZones_1.SPECIAL_ZONES.DARTFORD_CROSSING.fee.toFixed(2)} charge has been added.`);
            }
            // Add notification for additional stops if any
            if (additionalStops.length > 0) {
                notifications.push(`Your journey includes ${additionalStops.length} additional stop${additionalStops.length > 1 ? "s" : ""}`);
            }
            // Remove all other special zones and time-based notifications
            // We're only keeping airport, congestion charge, dartford crossing, and additional stops notifications
            // Calculate fare for each vehicle type
            const allVehicleTypes = Object.values(vehicleTypes_1.vehicleTypes);
            const vehicleOptions = [];
            for (const vehicleType of allVehicleTypes) {
                console.log(`\n===== Calculating fare for ${vehicleType.name} =====`);
                // Calculate fare for this vehicle type
                const priceInfo = this.calculateVehicleOptionFare({
                    vehicleType,
                    distance,
                    duration,
                    additionalStops: additionalStops.length,
                    requestDate,
                    airports,
                    passesThroughCCZ,
                    hasDartfordCrossing,
                    routeLegs,
                    serviceZones: specialZones,
                    passengers: request.passengers,
                });
                // Return vehicle option with calculated price
                vehicleOptions.push({
                    id: vehicleType.id,
                    name: vehicleType.name,
                    description: vehicleType.description,
                    capacity: vehicleType.capacity,
                    imageUrl: vehicleType.imageUrl || "",
                    eta: Math.floor(Math.random() * 10) + 5, // Random ETA between 5-15 minutes
                    price: priceInfo,
                });
            }
            // Sort vehicle options by price (ascending)
            vehicleOptions.sort((a, b) => a.price.amount - b.price.amount);
            // Return enhanced response
            return {
                vehicleOptions,
                routeDetails: {
                    distance_miles: parseFloat(distance.toFixed(2)),
                    duration_minutes: Math.ceil(duration),
                    polyline: routeDetails.geometry || null,
                },
                notifications,
                journey: {
                    distance_miles: parseFloat(distance.toFixed(2)),
                    duration_minutes: Math.ceil(duration),
                },
            };
        }
        catch (error) {
            console.error("Error calculating enhanced fares:", error);
            throw new Error("Failed to calculate enhanced fare estimates");
        }
    }
    /**
     * Calculate fare for a specific vehicle type with enhanced options
     */
    static calculateVehicleOptionFare({ vehicleType, distance, duration, additionalStops, requestDate, airports, passesThroughCCZ, hasDartfordCrossing, routeLegs, serviceZones, passengers, }) {
        console.log(`===== Calculating fare for ${vehicleType.name} =====`);
        console.log(`Minimum fare: £${vehicleType.minimumFare}`);
        console.log(`Distance: ${distance.toFixed(2)} miles`);
        console.log(`Estimated duration: ${Math.round(duration)} minutes`);
        console.log(`Additional stops: ${additionalStops}`);
        // Calculate distance charge using slab-based system
        const distanceCharge = this.calculateSlabBasedDistanceFare(vehicleType, distance);
        console.log(`Distance charge (${distance.toFixed(2)} miles): £${distanceCharge.toFixed(2)}`);
        // Calculate additional stops charge
        const stopCharge = additionalStops * vehicleType.additionalStopFee;
        console.log(`Additional stops: ${additionalStops}`);
        console.log(`Stop charge: £${stopCharge.toFixed(2)}`);
        // Calculate base fare (distance + stops)
        const baseFare = distanceCharge + stopCharge;
        console.log(`Base fare (distance + stops): £${baseFare.toFixed(2)}`);
        // Apply minimum fare rule - use minimum fare if base fare is less than minimum
        let totalFare = Math.max(baseFare, vehicleType.minimumFare);
        console.log(`Fare after minimum fare rule: £${totalFare.toFixed(2)}`);
        // Time surcharge
        const timeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
        console.log(`Time surcharge: £${timeSurcharge.toFixed(2)}`);
        totalFare += timeSurcharge;
        // Airport fees
        let airportFee = 0;
        if (airports.pickupAirport) {
            const airport = specialZones_1.AIRPORTS[airports.pickupAirport];
            if (airport) {
                // Apply different fees based on vehicle class
                const isExecutive = vehicleType.class === 'Business';
                let pickupFee = airport.fees.pickup; // Default to standard
                // Apply executive fees based on new pricing structure
                if (isExecutive) {
                    switch (airports.pickupAirport.toLowerCase()) {
                        case 'heathrow':
                            pickupFee = 16.00;
                            break;
                        case 'gatwick':
                            pickupFee = 10.00;
                            break;
                        case 'luton':
                            pickupFee = 10.00;
                            break;
                        case 'stansted':
                            pickupFee = 10.00;
                            break;
                        case 'city':
                            pickupFee = 10.00;
                            break;
                        default:
                            pickupFee = airport.fees.pickup; // Keep standard for other airports
                    }
                }
                airportFee += pickupFee;
                console.log(`Airport pickup fee (${isExecutive ? 'Executive' : 'Standard'}): £${pickupFee.toFixed(2)}`);
            }
        }
        if (airports.dropoffAirport) {
            const airport = specialZones_1.AIRPORTS[airports.dropoffAirport];
            if (airport) {
                // Dropoff fees are same for both Standard and Executive classes
                airportFee += airport.fees.dropoff;
                console.log(`Airport dropoff fee: £${airport.fees.dropoff.toFixed(2)}`);
            }
        }
        totalFare += airportFee;
        // Special zone fees
        if (passesThroughCCZ && (0, specialZones_1.isZoneActive)("CONGESTION_CHARGE", requestDate)) {
            const congestionCharge = specialZones_1.SPECIAL_ZONES.CONGESTION_CHARGE.fee;
            totalFare += congestionCharge;
            console.log(`Congestion charge: £${congestionCharge.toFixed(2)}`);
        }
        if (hasDartfordCrossing) {
            const dartfordCharge = specialZones_1.SPECIAL_ZONES.DARTFORD_CROSSING.fee;
            totalFare += dartfordCharge;
            console.log(`Dartford crossing charge: £${dartfordCharge.toFixed(2)}`);
        }
        console.log(`DEBUG: totalFare before rounding: £${totalFare.toFixed(2)}`);
        // Round to nearest 0.50
        const roundedFare = Math.round(totalFare * 2) / 2;
        console.log(`Final rounded fare: £${roundedFare.toFixed(2)}`);
        return {
            amount: roundedFare,
            currency: this.DEFAULT_CURRENCY,
            breakdown: {
                baseFare: 0, // No base rate anymore
                distanceCharge,
                minimumFare: vehicleType.minimumFare,
                additionalStopFee: stopCharge,
                timeSurcharge,
                airportFee,
                specialZoneFees: passesThroughCCZ || hasDartfordCrossing
                    ? (passesThroughCCZ ? specialZones_1.SPECIAL_ZONES.CONGESTION_CHARGE.fee : 0) +
                        (hasDartfordCrossing ? specialZones_1.SPECIAL_ZONES.DARTFORD_CROSSING.fee : 0)
                    : 0,
            },
        };
    }
    /**
     * Calculate distance fare using proper slab system
     */
    static calculateSlabBasedDistanceFare(vehicleType, distance) {
        const rates = vehicleType.perMileRates;
        let totalCharge = 0;
        // Slab-based distance calculation
        if (distance <= 4) {
            totalCharge = distance * rates['0-4'];
        }
        else if (distance <= 10.9) {
            totalCharge = 4 * rates['0-4'] +
                (distance - 4) * rates['4.1-10.9'];
        }
        else if (distance <= 20) {
            totalCharge = 4 * rates['0-4'] +
                6.9 * rates['4.1-10.9'] +
                (distance - 10.9) * rates['11-20'];
        }
        else if (distance <= 40) {
            totalCharge = 4 * rates['0-4'] +
                6.9 * rates['4.1-10.9'] +
                9.1 * rates['11-20'] +
                (distance - 20) * rates['20.1-40'];
        }
        else if (distance <= 60) {
            totalCharge = 4 * rates['0-4'] +
                6.9 * rates['4.1-10.9'] +
                9.1 * rates['11-20'] +
                20 * rates['20.1-40'] +
                (distance - 40) * rates['41-60'];
        }
        else if (distance <= 80) {
            totalCharge = 4 * rates['0-4'] +
                6.9 * rates['4.1-10.9'] +
                9.1 * rates['11-20'] +
                20 * rates['20.1-40'] +
                20 * rates['41-60'] +
                (distance - 60) * rates['60.1-80'];
        }
        else if (distance <= 99) {
            totalCharge = 4 * rates['0-4'] +
                6.9 * rates['4.1-10.9'] +
                9.1 * rates['11-20'] +
                20 * rates['20.1-40'] +
                20 * rates['41-60'] +
                20 * rates['60.1-80'] +
                (distance - 80) * rates['81-99'];
        }
        else if (distance <= 149) {
            totalCharge = 4 * rates['0-4'] +
                6.9 * rates['4.1-10.9'] +
                9.1 * rates['11-20'] +
                20 * rates['20.1-40'] +
                20 * rates['41-60'] +
                20 * rates['60.1-80'] +
                19 * rates['81-99'] +
                (distance - 99) * rates['100-149'];
        }
        else if (distance <= 299) {
            totalCharge = 4 * rates['0-4'] +
                6.9 * rates['4.1-10.9'] +
                9.1 * rates['11-20'] +
                20 * rates['20.1-40'] +
                20 * rates['41-60'] +
                20 * rates['60.1-80'] +
                19 * rates['81-99'] +
                50 * rates['100-149'] +
                (distance - 149) * rates['150-299'];
        }
        else {
            // Long trip discount
            totalCharge = 4 * rates['0-4'] +
                6.9 * rates['4.1-10.9'] +
                9.1 * rates['11-20'] +
                20 * rates['20.1-40'] +
                20 * rates['41-60'] +
                20 * rates['60.1-80'] +
                19 * rates['81-99'] +
                50 * rates['100-149'] +
                150 * rates['150-299'] +
                (distance - 299) * rates['300+'];
        }
        return totalCharge;
    }
    /**
     * Calculate time-based surcharge
     */
    static calculateTimeSurcharge(date, vehicleTypeId) {
        const day = date.getDay();
        const hours = date.getHours();
        // Map vehicle type IDs to surcharge keys
        const vehicleMap = {
            'saloon': 'saloon',
            'estate': 'estate',
            'mpv-6': 'mpv-6',
            'mpv-8': 'mpv-8',
            'executive': 'executive',
            'executive-mpv': 'executive-mpv',
            'vip-saloon': 'vip-saloon',
            'vip-suv': 'vip-suv'
        };
        const mappedVehicleType = vehicleMap[vehicleTypeId] || 'saloon';
        // Determine if it's weekend (Friday, Saturday, Sunday)
        const isWeekend = day === 5 || day === 6 || day === 0; // Friday, Saturday, Sunday
        // Determine time period
        let period = 'nonPeak';
        if (hours >= 6 && hours < 15) {
            period = 'peakMedium';
        }
        else if (hours >= 15) {
            period = 'peakHigh';
        }
        // Get surcharge from timeSurcharges configuration
        const timeCategory = isWeekend ? 'weekends' : 'weekdays';
        const timePeriod = timePricing_1.timeSurcharges[timeCategory][period];
        return timePeriod?.surcharges[mappedVehicleType] || 0;
    }
}
exports.EnhancedFareService = EnhancedFareService;
// Default currency
EnhancedFareService.DEFAULT_CURRENCY = "GBP";
