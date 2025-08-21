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
            }
            else if (request.locations) {
                // Old format with location objects
                pickupLocation = request.locations.pickup.coordinates;
                // Check booking type first to determine dropoff requirements
                if (request.bookingType === "hourly") {
                    // For hourly bookings, dropoff location is optional
                    dropoffLocation = request.locations.dropoff?.coordinates || pickupLocation;
                }
                else {
                    // For one-way and return bookings, dropoff is required
                    if (!request.locations.dropoff) {
                        throw new Error("Dropoff location is required for one-way and return bookings");
                    }
                    dropoffLocation = request.locations.dropoff.coordinates;
                }
                // Handle stops professionally - geocode addresses and include in route
                additionalStops = [];
                // For return bookings, we don't use stops - will use smart reverse route
                if (request.bookingType !== "return") {
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
                }
                requestDate = request.datetime
                    ? new Date(`${request.datetime.date}T${request.datetime.time}:00`)
                    : new Date();
            }
            else {
                throw new Error("Invalid request format - missing location data");
            }
            // Check if the route is within our service area
            if (request.bookingType === "hourly") {
                // For hourly bookings, only check pickup location
                const serviceAreaCheck = (0, serviceArea_1.isRouteServiceable)(pickupLocation, pickupLocation // Same location for pickup and dropoff
                );
                if (!serviceAreaCheck.serviceable) {
                    const error = new Error(serviceAreaCheck.message || "Pickup location is outside our service area");
                    Object.assign(error, {
                        code: "LOCATION_NOT_SERVICEABLE",
                        details: serviceAreaCheck.message,
                    });
                    throw error;
                }
            }
            else {
                // For one-way and return bookings, check the full route
                const serviceAreaCheck = (0, serviceArea_1.isRouteServiceable)(pickupLocation, dropoffLocation);
                if (!serviceAreaCheck.serviceable) {
                    const error = new Error(serviceAreaCheck.message || "Location is outside our service area");
                    Object.assign(error, {
                        code: "LOCATION_NOT_SERVICEABLE",
                        details: serviceAreaCheck.message,
                    });
                    throw error;
                }
            }
            // For hourly bookings, we don't need distance/duration calculation
            let distance;
            let duration;
            if (request.bookingType === "hourly") {
                // Hourly bookings: distance = 0, duration = hours * 60
                distance = 0;
                duration = (request.hours || 3) * 60; // Convert hours to minutes
            }
            else {
                // One-way and return bookings: calculate actual distance and duration
                if (request.bookingType === "return") {
                    // For return bookings, calculate outbound distance and double it (smart reverse route)
                    const waypoints = additionalStops.map((stop) => `${stop.location.lat},${stop.location.lng}`);
                    const outboundRoute = await mapboxDistance_service_1.MapboxDistanceService.getDistance(`${pickupLocation.lat},${pickupLocation.lng}`, `${dropoffLocation.lat},${dropoffLocation.lng}`, waypoints);
                    // Return journey will follow reverse route, so double the distance
                    distance = outboundRoute.distance * 2;
                    duration = outboundRoute.duration * 2;
                }
                else {
                    // One-way bookings: calculate actual distance and duration
                    const waypoints = additionalStops.map((stop) => `${stop.location.lat},${stop.location.lng}`);
                    const routeDetails = await mapboxDistance_service_1.MapboxDistanceService.getDistance(`${pickupLocation.lat},${pickupLocation.lng}`, `${dropoffLocation.lat},${dropoffLocation.lng}`, waypoints);
                    // Distance is already in miles from the new API
                    distance = routeDetails.distance;
                    // Duration is already in minutes from the new API
                    duration = routeDetails.duration;
                }
            }
            // Since we're using Mapbox Directions API, we don't have detailed leg information
            // For airport detection, we'll use the pickup and dropoff locations directly
            const specialZones = [];
            // Check if specific zones are present
            const passesThroughCCZ = specialZones.includes("CONGESTION_CHARGE");
            const hasDartfordCrossing = specialZones.includes("DARTFORD_CROSSING");
            const hasBlackwellSilverstoneTunnel = specialZones.includes("BLACKWELL_SILVERSTONE_TUNNEL");
            // Check for airports
            const airportsPickup = (0, specialZones_1.getAirportsNearLocation)(pickupLocation);
            const airportsDropoff = (0, specialZones_1.getAirportsNearLocation)(dropoffLocation);
            const airports = {
                pickupAirport: airportsPickup.length > 0 ? airportsPickup[0] : null,
                dropoffAirport: airportsDropoff.length > 0 ? airportsDropoff[0] : null,
            };
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
            // Handle different booking types
            const bookingType = request.bookingType || "one-way";
            let baseMultiplier = 1.0;
            let returnDiscount = 0.0;
            let hourlyRate = 0.0;
            if (bookingType === "return") {
                // Apply 10% discount for return bookings
                returnDiscount = 0.10;
                baseMultiplier = 1.0; // Distance is calculated for one leg, then doubled
            }
            else if (bookingType === "hourly") {
                // For hourly bookings, we'll use the same pricing structure but calculate based on hours
                const hours = request.hours || 3;
                if (hours < 3 || hours > 12) {
                    throw new Error("Hourly bookings must be between 3 and 12 hours");
                }
                // Hourly rate will be calculated per vehicle type
            }
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
                    airports: {
                        pickupAirport: airports.pickupAirport || undefined,
                        dropoffAirport: airports.dropoffAirport || undefined,
                    },
                    passesThroughCCZ,
                    hasDartfordCrossing,
                    hasBlackwellSilverstoneTunnel,
                    serviceZones: specialZones,
                    passengers: request.passengers,
                    bookingType: request.bookingType || "one-way",
                    hours: request.hours || 0,
                    returnDiscount: returnDiscount,
                    returnType: request.returnType,
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
    static calculateVehicleOptionFare({ vehicleType, distance, duration, additionalStops, requestDate, airports, passesThroughCCZ, hasDartfordCrossing, hasBlackwellSilverstoneTunnel, serviceZones, passengers, bookingType = "one-way", hours = 0, returnDiscount = 0.0, returnType, }) {
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
        totalFare += timeSurcharge;
        // Airport fees
        let airportFee = 0;
        if (airports.pickupAirport) {
            const airport = specialZones_1.AIRPORTS[airports.pickupAirport];
            if (airport) {
                airportFee += airport.fees.pickup;
                messages.push(`Airport pickup fee (${airport.name}): £${airport.fees.pickup.toFixed(2)}`);
            }
        }
        if (airports.dropoffAirport) {
            const airport = specialZones_1.AIRPORTS[airports.dropoffAirport];
            if (airport) {
                airportFee += airport.fees.dropoff;
                messages.push(`Airport dropoff fee (${airport.name}): £${airport.fees.dropoff.toFixed(2)}`);
            }
        }
        totalFare += airportFee;
        // Special zone fees
        let specialZoneFees = 0;
        if (passesThroughCCZ && (0, specialZones_1.isZoneActive)("CONGESTION_CHARGE", requestDate)) {
            const congestionCharge = specialZones_1.SPECIAL_ZONES.CONGESTION_CHARGE.fee;
            specialZoneFees += congestionCharge;
            messages.push(`Congestion charge: £${congestionCharge.toFixed(2)}`);
        }
        if (hasDartfordCrossing) {
            const dartfordCharge = specialZones_1.SPECIAL_ZONES.DARTFORD_CROSSING.fee;
            specialZoneFees += dartfordCharge;
            messages.push(`Dartford crossing: £${dartfordCharge.toFixed(2)}`);
        }
        // Check for Blackwell & Silverstone Tunnel
        if (hasBlackwellSilverstoneTunnel) {
            let tunnelFee = 1.5; // Default off-peak rate
            let feeDescription = "Blackwell & Silverstone Tunnel (off-peak)";
            // Check if it's peak time (6-10AM or 4-7PM on weekdays)
            const day = requestDate.getDay();
            const hour = requestDate.getHours();
            const isWeekday = day >= 1 && day <= 5; // Monday to Friday
            const isMorningPeak = hour >= 6 && hour < 10;
            const isAfternoonPeak = hour >= 16 && hour < 19;
            if (isWeekday && (isMorningPeak || isAfternoonPeak)) {
                tunnelFee = 4.0; // Peak rate
                feeDescription = "Blackwell & Silverstone Tunnel (peak)";
            }
            specialZoneFees += tunnelFee;
            messages.push(`${feeDescription}: £${tunnelFee.toFixed(2)}`);
        }
        totalFare += specialZoneFees;
        // Handle different booking types
        let finalDistanceCharge = distanceCharge;
        if (bookingType === "hourly" && hours > 0) {
            // For hourly bookings, calculate based on hours instead of distance
            const hourlyRate = this.getHourlyRate(vehicleType, hours);
            totalFare = hourlyRate * hours;
            // Add hourly booking message
            messages.push(`Hourly rate (${hours} hours): £${hourlyRate.toFixed(2)}/hour`);
            // Reset distance charge for hourly bookings
            finalDistanceCharge = 0;
        }
        else if (bookingType === "return") {
            // For return bookings, double the distance and apply discount
            totalFare = totalFare * 2;
            // Apply return discount
            const discountAmount = totalFare * returnDiscount;
            totalFare -= discountAmount;
            // Add return booking messages based on return type
            if (returnType === 'wait-and-return') {
                messages.push("Return journey: Driver waits at destination and returns");
                messages.push("Driver wait time: unlimited");
                messages.push("Return route: Smart reverse of outbound journey");
            }
            else if (returnType === 'later-date') {
                messages.push("Return journey: Scheduled return on different date/time");
                messages.push("Return route: Smart reverse of outbound journey");
            }
            messages.push("Return journey: Distance doubled (outbound + reverse route)");
            messages.push(`Return discount (10%): -£${discountAmount.toFixed(2)}`);
        }
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
            if (bookingType === "return") {
                messages.push(`Additional stops (${additionalStops}): £${stopCharge.toFixed(2)} (applied to outbound journey)`);
                messages.push(`Return journey will reverse the outbound route with stops`);
            }
            else {
                messages.push(`Additional stops (${additionalStops}): £${stopCharge.toFixed(2)}`);
            }
        }
        // Calculate equipment charges
        let equipmentFees = 0;
        if (passengers) {
            if (passengers.babySeat > 0) {
                const babySeatFee = passengers.babySeat * serviceArea_1.EQUIPMENT_FEES.BABY_SEAT;
                equipmentFees += babySeatFee;
                messages.push(`Baby seat (${passengers.babySeat}): £${babySeatFee.toFixed(2)}`);
            }
            if (passengers.childSeat > 0) {
                const childSeatFee = passengers.childSeat * serviceArea_1.EQUIPMENT_FEES.CHILD_SEAT;
                equipmentFees += childSeatFee;
                messages.push(`Child seat (${passengers.childSeat}): £${childSeatFee.toFixed(2)}`);
            }
            if (passengers.boosterSeat > 0) {
                const boosterSeatFee = passengers.boosterSeat * serviceArea_1.EQUIPMENT_FEES.BOOSTER_SEAT;
                equipmentFees += boosterSeatFee;
                messages.push(`Booster seat (${passengers.boosterSeat}): £${boosterSeatFee.toFixed(2)}`);
            }
            if (passengers.wheelchair > 0) {
                const wheelchairFee = passengers.wheelchair * serviceArea_1.EQUIPMENT_FEES.WHEELCHAIR;
                equipmentFees += wheelchairFee;
                messages.push(`Wheelchair (${passengers.wheelchair}): £${wheelchairFee.toFixed(2)}`);
            }
        }
        if (equipmentFees > 0) {
            totalFare += equipmentFees;
        }
        // Round down to nearest whole number (e.g., 14.1 becomes 14, 14.9 becomes 14)
        const roundedFare = Math.floor(totalFare);
        return {
            amount: roundedFare,
            currency: this.DEFAULT_CURRENCY,
            messages, // Include the messages array
            breakdown: {
                baseFare: 0, // No base rate anymore
                distanceCharge: finalDistanceCharge,
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
        // Determine which rate applies based on total distance
        if (distance <= 4) {
            ratePerMile = rates['0-4'];
            rangeDescription = '0-4 miles';
        }
        else if (distance <= 10) {
            ratePerMile = rates['4.1-10'];
            rangeDescription = '4.1-10 miles';
        }
        else if (distance <= 15) {
            ratePerMile = rates['10.1-15'];
            rangeDescription = '10.1-15 miles';
        }
        else if (distance <= 20) {
            ratePerMile = rates['15.1-20'];
            rangeDescription = '15.1-20 miles';
        }
        else if (distance <= 30) {
            ratePerMile = rates['20.1-30'];
            rangeDescription = '20.1-30 miles';
        }
        else if (distance <= 40) {
            ratePerMile = rates['30.1-40'];
            rangeDescription = '30.1-40 miles';
        }
        else if (distance <= 50) {
            ratePerMile = rates['41.1-50'];
            rangeDescription = '41.1-50 miles';
        }
        else if (distance <= 60) {
            ratePerMile = rates['51.1-60'];
            rangeDescription = '51.1-60 miles';
        }
        else if (distance <= 80) {
            ratePerMile = rates['61.1-80'];
            rangeDescription = '61.1-80 miles';
        }
        else if (distance <= 150) {
            ratePerMile = rates['80.1-150'];
            rangeDescription = '80.1-150 miles';
        }
        else if (distance <= 300) {
            ratePerMile = rates['150.1-300'];
            rangeDescription = '150.1-300 miles';
        }
        else {
            ratePerMile = rates['300+'];
            rangeDescription = '300+ miles (Long Trip Discount)';
        }
        const totalCharge = distance * ratePerMile;
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
            'executive-saloon': 'executive-saloon',
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
    /**
     * Get hourly rate for a vehicle type based on hours
     */
    static getHourlyRate(vehicleType, hours) {
        // Use the same hourly rates as the Executive Cars system
        const hourlyRates = {
            'saloon': { '3-6': 30.00, '6-12': 25.00 },
            'estate': { '3-6': 35.00, '6-12': 30.00 },
            'mpv-6': { '3-6': 35.00, '6-12': 35.00 },
            'mpv-8': { '3-6': 40.00, '6-12': 35.00 },
            'executive-saloon': { '3-6': 45.00, '6-12': 40.00 },
            'executive-mpv': { '3-6': 55.00, '6-12': 50.00 },
            'vip-saloon': { '3-6': 75.00, '6-12': 70.00 },
            'vip-suv': { '3-6': 85.00, '6-12': 80.00 }
        };
        const vehicleId = vehicleType.id;
        const rateKey = hours <= 6 ? '3-6' : '6-12';
        return hourlyRates[vehicleId]?.[rateKey] || 30.00;
    }
}
exports.EnhancedFareService = EnhancedFareService;
// Default currency
EnhancedFareService.DEFAULT_CURRENCY = "GBP";
