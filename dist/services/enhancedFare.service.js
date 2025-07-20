"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedFareService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const vehicleTypes_1 = require("../config/vehicleTypes");
const specialZones_1 = require("../config/specialZones");
const timePricing_1 = require("../config/timePricing");
const serviceArea_1 = require("../config/serviceArea");
const mapboxDistance_service_1 = require("./mapboxDistance.service");
class EnhancedFareService {
    /**
     * Geocode an address to get coordinates using Mapbox Geocoding API
     */
    static async geocodeAddress(address) {
        try {
            const encodedAddress = encodeURIComponent(address);
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${env_1.env.mapbox.token}&country=GB&limit=1`;
            const response = await axios_1.default.get(url);
            if (response.data.features && response.data.features.length > 0) {
                const feature = response.data.features[0];
                const [lng, lat] = feature.center;
                return { lat, lng };
            }
            else {
                throw new Error(`No coordinates found for address: ${address}`);
            }
        }
        catch (error) {
            console.error(`Geocoding failed for address: ${address}`, error);
            throw new Error(`Failed to geocode address: ${address}`);
        }
    }
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
                // console.log("📋 Using new request format");
            }
            else if (request.locations) {
                // Old format with location objects
                pickupLocation = request.locations.pickup.coordinates;
                dropoffLocation = request.locations.dropoff.coordinates;
                // Handle stops professionally - geocode addresses and include in route
                additionalStops = [];
                // Check for stops in the locations object (frontend sends 'stops' as string array)
                const locationsWithStops = request.locations;
                if (locationsWithStops.stops && locationsWithStops.stops.length > 0) {
                    // Geocode each stop address to get coordinates
                    for (const stopAddress of locationsWithStops.stops) {
                        try {
                            const stopCoordinates = await this.geocodeAddress(stopAddress);
                            additionalStops.push({
                                location: stopCoordinates,
                                address: stopAddress
                            });
                        }
                        catch (error) {
                            console.error(`❌ Failed to geocode stop: ${stopAddress}`, error);
                            // Continue with other stops even if one fails
                        }
                    }
                }
                if (request.locations.additionalStops && request.locations.additionalStops.length > 0) {
                    additionalStops = request.locations.additionalStops.map((stop) => ({
                        location: stop.coordinates,
                        address: stop.address
                    }));
                }
                requestDate = request.datetime
                    ? new Date(`${request.datetime.date}T${request.datetime.time}:00`)
                    : new Date();
                console.log("📋 Using old request format with stops handling");
            }
            else {
                throw new Error("Invalid request format - missing location data");
            }
            // console.log("📍 Pickup location:", pickupLocation);
            // console.log("📍 Dropoff location:", dropoffLocation);
            // console.log("📅 Request date:", requestDate);
            // Check if the route is within our service area
            // console.log("🔍 Checking service area...");
            const serviceAreaCheck = (0, serviceArea_1.isRouteServiceable)(pickupLocation, dropoffLocation);
            // console.log("🔍 Service area check result:", serviceAreaCheck);
            if (!serviceAreaCheck.serviceable) {
                const error = new Error(serviceAreaCheck.message || "Location is outside our service area");
                // Add custom properties to the error object for better error handling
                Object.assign(error, {
                    code: "LOCATION_NOT_SERVICEABLE",
                    details: serviceAreaCheck.message,
                });
                throw error;
            }
            // Call the Mapbox Directions API to get distance and duration
            // console.log("🗺️ Calling Mapbox Directions API to get route details...");
            // console.log("🗺️ Mapbox token available:", !!env.mapbox.token);
            // console.log("🗺️ Mapbox token length:", env.mapbox.token?.length || 0);
            // Build waypoints for the route including all stops
            const waypoints = additionalStops.map((stop) => `${stop.location.lat},${stop.location.lng}`);
            const routeDetails = await mapboxDistance_service_1.MapboxDistanceService.getDistance(`${pickupLocation.lat},${pickupLocation.lng}`, `${dropoffLocation.lat},${dropoffLocation.lng}`, waypoints);
            // console.log("✅ Mapbox API call successful:", routeDetails);
            // Distance is already in miles from the new API
            const distance = routeDetails.distance;
            // Duration is already in minutes from the new API
            const duration = routeDetails.duration;
            // console.log(
            //   `📏 Distance: ${distance.toFixed(2)} miles, Duration: ${duration.toFixed(
            //     0
            //   )} minutes`
            // );
            // Since we're using Mapbox Directions API, we don't have detailed leg information
            // For airport detection, we'll use the pickup and dropoff locations directly
            const specialZones = [];
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
            // Airport notifications with actual charges
            if (airports.pickupAirport) {
                const airport = specialZones_1.AIRPORTS[airports.pickupAirport];
                if (airport) {
                    notifications.push(`Airport pickup at ${airport.name}: £${airport.fees.pickup.toFixed(2)} fee applied`);
                }
            }
            if (airports.dropoffAirport) {
                const airport = specialZones_1.AIRPORTS[airports.dropoffAirport];
                if (airport) {
                    notifications.push(`Airport dropoff at ${airport.name}: £${airport.fees.dropoff.toFixed(2)} fee applied`);
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
            // Additional stops are handled in the fare breakdown per vehicle type
            // No generic notification needed as charges are shown in detailed breakdown
            // Remove all other special zones and time-based notifications
            // We're only keeping airport, congestion charge, and dartford crossing notifications
            // Calculate fare for each vehicle type
            const allVehicleTypes = Object.values(vehicleTypes_1.vehicleTypes);
            const vehicleOptions = [];
            for (const vehicleType of allVehicleTypes) {
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
                    polyline: null, // No polyline data from Distance Matrix API
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
    static calculateVehicleOptionFare({ vehicleType, distance, duration, additionalStops, requestDate, airports, passesThroughCCZ, hasDartfordCrossing, serviceZones, passengers, }) {
        // Array to collect messages for this vehicle type
        const messages = [];
        // Calculate distance charge using slab-based system
        const distanceCharge = this.calculateSlabBasedDistanceFare(vehicleType, distance);
        // Calculate additional stops charge
        const stopCharge = additionalStops * vehicleType.additionalStopFee;
        // Calculate base fare (distance + stops)
        const baseFare = distanceCharge + stopCharge;
        // Apply minimum fare rule - IMPORTANT: Only use minimum fare if base fare is less than minimum
        let totalFare;
        if (baseFare < vehicleType.minimumFare) {
            totalFare = vehicleType.minimumFare;
        }
        else {
            totalFare = baseFare;
        }
        // Time surcharge
        const timeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
        if (timeSurcharge > 0) {
            console.log(`⏰ Time surcharge: £${timeSurcharge.toFixed(2)}`);
        }
        totalFare += timeSurcharge;
        // Airport fees
        let airportFee = 0;
        if (airports.pickupAirport) {
            const airport = specialZones_1.AIRPORTS[airports.pickupAirport];
            if (airport) {
                airportFee += airport.fees.pickup;
                console.log(`✈️ Airport pickup fee (${airport.name}): £${airport.fees.pickup.toFixed(2)}`);
                messages.push(`Airport pickup fee (${airport.name}): £${airport.fees.pickup.toFixed(2)}`);
            }
        }
        if (airports.dropoffAirport) {
            const airport = specialZones_1.AIRPORTS[airports.dropoffAirport];
            if (airport) {
                airportFee += airport.fees.dropoff;
                console.log(`✈️ Airport dropoff fee (${airport.name}): £${airport.fees.dropoff.toFixed(2)}`);
                messages.push(`Airport dropoff fee (${airport.name}): £${airport.fees.dropoff.toFixed(2)}`);
            }
        }
        if (airportFee > 0) {
            console.log(`Total airport fees: £${airportFee.toFixed(2)}`);
        }
        totalFare += airportFee;
        // Special zone fees
        let specialZoneFees = 0;
        if (passesThroughCCZ && (0, specialZones_1.isZoneActive)("CONGESTION_CHARGE", requestDate)) {
            const congestionCharge = specialZones_1.SPECIAL_ZONES.CONGESTION_CHARGE.fee;
            specialZoneFees += congestionCharge;
            console.log(`🏙️ Congestion charge: £${congestionCharge.toFixed(2)}`);
            messages.push(`Congestion charge: £${congestionCharge.toFixed(2)}`);
        }
        if (hasDartfordCrossing) {
            const dartfordCharge = specialZones_1.SPECIAL_ZONES.DARTFORD_CROSSING.fee;
            specialZoneFees += dartfordCharge;
            console.log(`🌉 Dartford crossing charge: £${dartfordCharge.toFixed(2)}`);
            messages.push(`Dartford crossing: £${dartfordCharge.toFixed(2)}`);
        }
        if (specialZoneFees > 0) {
            console.log(`Total special zone fees: £${specialZoneFees.toFixed(2)}`);
        }
        totalFare += specialZoneFees;
        // Add time surcharge message if applicable
        if (timeSurcharge > 0) {
            const day = requestDate.getDay();
            const hours = requestDate.getHours();
            const isWeekend = day === 5 || day === 6 || day === 0; // Friday, Saturday, Sunday
            const timeType = isWeekend ? 'Weekend' : 'Weekday';
            let period = 'Non-peak';
            if (hours >= 6 && hours < 15) {
                period = 'Peak medium';
            }
            else if (hours >= 15) {
                period = 'Peak high';
            }
            messages.push(`${timeType} ${period.toLowerCase()} surcharge: £${timeSurcharge.toFixed(2)}`);
        }
        // Add additional stops message if applicable
        if (additionalStops > 0) {
            messages.push(`Additional stops (${additionalStops}): £${stopCharge.toFixed(2)}`);
        }
        // Calculate equipment charges
        let equipmentFees = 0;
        if (passengers) {
            if (passengers.babySeat > 0) {
                const babySeatFee = passengers.babySeat * serviceArea_1.EQUIPMENT_FEES.BABY_SEAT;
                equipmentFees += babySeatFee;
                messages.push(`Baby seat (${passengers.babySeat}): £${babySeatFee.toFixed(2)}`);
                console.log(`👶 Baby seat fee: £${babySeatFee.toFixed(2)}`);
            }
            if (passengers.childSeat > 0) {
                const childSeatFee = passengers.childSeat * serviceArea_1.EQUIPMENT_FEES.CHILD_SEAT;
                equipmentFees += childSeatFee;
                messages.push(`Child seat (${passengers.childSeat}): £${childSeatFee.toFixed(2)}`);
                console.log(`🧒 Child seat fee: £${childSeatFee.toFixed(2)}`);
            }
            if (passengers.boosterSeat > 0) {
                const boosterSeatFee = passengers.boosterSeat * serviceArea_1.EQUIPMENT_FEES.BOOSTER_SEAT;
                equipmentFees += boosterSeatFee;
                messages.push(`Booster seat (${passengers.boosterSeat}): £${boosterSeatFee.toFixed(2)}`);
                console.log(`🪑 Booster seat fee: £${boosterSeatFee.toFixed(2)}`);
            }
            if (passengers.wheelchair > 0) {
                const wheelchairFee = passengers.wheelchair * serviceArea_1.EQUIPMENT_FEES.WHEELCHAIR;
                equipmentFees += wheelchairFee;
                messages.push(`Wheelchair (${passengers.wheelchair}): £${wheelchairFee.toFixed(2)}`);
                console.log(`♿ Wheelchair fee: £${wheelchairFee.toFixed(2)}`);
            }
        }
        if (equipmentFees > 0) {
            console.log(`Total equipment fees: £${equipmentFees.toFixed(2)}`);
            totalFare += equipmentFees;
        }
        console.log(`DEBUG: totalFare before rounding: £${totalFare.toFixed(2)}`);
        // Round up to nearest whole number (e.g., 14.1 becomes 15, 14.9 becomes 15)
        const roundedFare = Math.ceil(totalFare);
        console.log(`💰 ${vehicleType.name}: £${roundedFare.toFixed(2)} (${distance.toFixed(1)} miles, ${Math.round(duration)} mins)`);
        console.log('─'.repeat(60)); // Add separator line between vehicles
        // Log detailed breakdown for debugging
        console.log(`🔍 ${vehicleType.name} BREAKDOWN:`);
        console.log(`   Distance charge: £${distanceCharge.toFixed(2)}`);
        console.log(`   Time surcharge: £${timeSurcharge.toFixed(2)}`);
        console.log(`   Airport fees: £${airportFee.toFixed(2)}`);
        console.log(`   Equipment fees: £${equipmentFees.toFixed(2)}`);
        console.log(`   Total before rounding: £${totalFare.toFixed(2)}`);
        console.log(`   Final rounded fare: £${roundedFare.toFixed(2)}`);
        console.log('');
        return {
            amount: roundedFare,
            currency: this.DEFAULT_CURRENCY,
            messages, // Include the messages array
            breakdown: {
                baseFare: 0, // No base rate anymore
                distanceCharge,
                minimumFare: vehicleType.minimumFare,
                additionalStopFee: stopCharge,
                timeSurcharge,
                airportFee,
                specialZoneFees,
                equipmentFees,
            },
        };
    }
    /**
     * Calculate distance fare using proper slab system
     * The rate is determined by the total distance, and ALL miles are charged at that rate
     */
    static calculateSlabBasedDistanceFare(vehicleType, distance) {
        const rates = vehicleType.perMileRates;
        let ratePerMile = 0;
        let rangeDescription = '';
        console.log(`Calculating slab-based fare for ${distance.toFixed(2)} miles:`);
        // Determine which rate applies based on total distance
        if (distance <= 4) {
            ratePerMile = rates['0-4'];
            rangeDescription = '0-4 miles';
        }
        else if (distance <= 10.9) {
            ratePerMile = rates['4.1-10.9'];
            rangeDescription = '4.1-10.9 miles';
        }
        else if (distance <= 20) {
            ratePerMile = rates['11-20'];
            rangeDescription = '11-20 miles';
        }
        else if (distance <= 40) {
            ratePerMile = rates['20.1-40'];
            rangeDescription = '20.1-40 miles';
        }
        else if (distance <= 60) {
            ratePerMile = rates['41-60'];
            rangeDescription = '41-60 miles';
        }
        else if (distance <= 80) {
            ratePerMile = rates['60.1-80'];
            rangeDescription = '60.1-80 miles';
        }
        else if (distance <= 99) {
            ratePerMile = rates['81-99'];
            rangeDescription = '81-99 miles';
        }
        else if (distance <= 149) {
            ratePerMile = rates['100-149'];
            rangeDescription = '100-149 miles';
        }
        else if (distance <= 299) {
            ratePerMile = rates['150-299'];
            rangeDescription = '150-299 miles';
        }
        else {
            ratePerMile = rates['300+'];
            rangeDescription = '300+ miles (Long Trip Discount)';
        }
        const totalCharge = distance * ratePerMile;
        console.log(`  Distance: ${distance.toFixed(2)} miles falls in ${rangeDescription} range`);
        console.log(`  Rate: £${ratePerMile.toFixed(2)} per mile`);
        console.log(`  Total distance charge: ${distance.toFixed(2)} × £${ratePerMile.toFixed(2)} = £${totalCharge.toFixed(2)}`);
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
