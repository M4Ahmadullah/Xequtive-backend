"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HourlyFareService = void 0;
const vehicleTypes_1 = require("../config/vehicleTypes");
const timePricing_1 = require("../config/timePricing");
const hourlyBooking_1 = require("../types/hourlyBooking");
const mapboxDistance_service_1 = require("./mapboxDistance.service");
class HourlyFareService {
    /**
     * Calculate fare estimates for different vehicle types based on booking type
     */
    static async calculateFares(request) {
        try {
            const { bookingType, datetime, passengers, numVehicles = 1 } = request;
            const requestDate = new Date(`${datetime.date}T${datetime.time}:00`);
            // Get all vehicle types
            const allVehicleTypes = Object.values(vehicleTypes_1.vehicleTypes);
            const vehicleOptions = [];
            // Calculate fares based on booking type
            for (const vehicleType of allVehicleTypes) {
                let priceInfo;
                switch (bookingType) {
                    case "one-way":
                        priceInfo = await this.calculateOneWayFare(vehicleType, request, requestDate);
                        break;
                    case "hourly":
                        priceInfo = this.calculateHourlyFare(vehicleType, request, requestDate);
                        break;
                    case "return":
                        priceInfo = await this.calculateReturnFare(vehicleType, request, requestDate);
                        break;
                    default:
                        throw new Error(`Unsupported booking type: ${bookingType}`);
                }
                // Return vehicle option with calculated price
                vehicleOptions.push({
                    id: vehicleType.id,
                    name: vehicleType.name,
                    description: vehicleType.description,
                    capacity: {
                        passengers: vehicleType.capacity.passengers,
                        luggage: vehicleType.capacity.luggage,
                    },
                    price: priceInfo,
                    imageUrl: vehicleType.imageUrl || "",
                });
            }
            // Sort vehicle options by price (ascending)
            vehicleOptions.sort((a, b) => a.price.amount - b.price.amount);
            // Generate notifications and pricing messages based on booking type
            const notifications = this.generateNotifications(bookingType, request);
            const pricingMessages = this.generatePricingMessages(bookingType, request);
            return {
                vehicleOptions,
                bookingType,
                notifications,
                pricingMessages,
                branding: hourlyBooking_1.EXECUTIVE_CARS_BRANDING,
            };
        }
        catch (error) {
            console.error("Error calculating fares:", error);
            throw new Error("Failed to calculate fare estimates");
        }
    }
    /**
     * Calculate One-Way fare (distance-based pricing)
     */
    static async calculateOneWayFare(vehicleType, request, requestDate) {
        if (!request.oneWayDetails) {
            throw new Error("One-Way details required for one-way booking");
        }
        const { pickupLocation, dropoffLocation, additionalStops } = request.oneWayDetails;
        const { passengers, numVehicles = 1 } = request;
        // Calculate distance using Mapbox
        const waypoints = additionalStops?.map(stop => `${stop.lat},${stop.lng}`) || [];
        const routeDetails = await mapboxDistance_service_1.MapboxDistanceService.getDistance(`${pickupLocation.lat},${pickupLocation.lng}`, `${dropoffLocation.lat},${dropoffLocation.lng}`, waypoints);
        const distance = routeDetails.distance; // Already in miles
        const duration = routeDetails.duration; // Already in minutes
        // Calculate distance-based fare using slab system
        const distanceCharge = this.calculateSlabBasedDistanceFare(vehicleType, distance);
        // Calculate additional stops charge
        const stopCharge = (additionalStops?.length || 0) * vehicleType.additionalStopFee;
        // Calculate base fare
        const baseFare = distanceCharge + stopCharge;
        // Apply minimum fare rule
        let totalFare = Math.max(baseFare, vehicleType.minimumFare);
        // Time surcharge
        const timeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
        totalFare += timeSurcharge;
        // Equipment charges
        const equipmentFees = this.calculateEquipmentFees(passengers, vehicleType);
        totalFare += equipmentFees;
        // Multiply by number of vehicles
        if (numVehicles > 1) {
            totalFare = totalFare * numVehicles;
        }
        // Round up to nearest whole number
        const roundedFare = Math.ceil(totalFare);
        return {
            amount: roundedFare,
            currency: this.DEFAULT_CURRENCY,
            messages: this.generateOneWayMessages(distance, duration, additionalStops?.length || 0, timeSurcharge, equipmentFees, numVehicles),
            breakdown: {
                baseFare: 0,
                distanceCharge,
                equipmentFees,
                timeSurcharge,
            },
        };
    }
    /**
     * Calculate Hourly fare (time-based pricing)
     */
    static calculateHourlyFare(vehicleType, request, requestDate) {
        if (!request.hourlyDetails) {
            throw new Error("Hourly details required for hourly booking");
        }
        const { hours, pickupLocation, dropoffLocation, additionalStops } = request.hourlyDetails;
        const { passengers, numVehicles = 1 } = request;
        // Validate hours
        if (hours < 4 || hours > 24) {
            throw new Error("Hours must be between 4 and 24");
        }
        // Calculate hourly rate
        const hourlyRate = this.getHourlyRate(vehicleType);
        // Calculate base fare (hours × hourly rate)
        const baseFare = hours * hourlyRate;
        // Apply minimum fare rule for hourly bookings
        let totalFare = Math.max(baseFare, vehicleType.minimumFare * 2);
        // Time surcharge
        const timeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
        totalFare += timeSurcharge;
        // Equipment charges
        const equipmentFees = this.calculateEquipmentFees(passengers, vehicleType);
        totalFare += equipmentFees;
        // Multiply by number of vehicles
        if (numVehicles > 1) {
            totalFare = totalFare * numVehicles;
        }
        // Round up to nearest whole number
        const roundedFare = Math.ceil(totalFare);
        return {
            amount: roundedFare,
            currency: this.DEFAULT_CURRENCY,
            messages: this.generateHourlyMessages(hours, hourlyRate, timeSurcharge, equipmentFees, numVehicles),
            breakdown: {
                baseFare: 0,
                hourlyRate,
                totalHours: hours,
                equipmentFees,
                timeSurcharge,
            },
        };
    }
    /**
     * Calculate Return fare (with wait charges or double pricing)
     */
    static async calculateReturnFare(vehicleType, request, requestDate) {
        if (!request.returnDetails) {
            throw new Error("Return details required for return booking");
        }
        const { outboundPickup, outboundDropoff, outboundStops, returnType, waitDuration, returnPickup, returnDropoff, returnStops } = request.returnDetails;
        const { passengers, numVehicles = 1 } = request;
        // Calculate outbound journey fare
        const outboundWaypoints = outboundStops?.map(stop => `${stop.lat},${stop.lng}`) || [];
        const outboundRoute = await mapboxDistance_service_1.MapboxDistanceService.getDistance(`${outboundPickup.lat},${outboundPickup.lng}`, `${outboundDropoff.lat},${outboundDropoff.lng}`, outboundWaypoints);
        const outboundDistance = outboundRoute.distance;
        const outboundDistanceCharge = this.calculateSlabBasedDistanceFare(vehicleType, outboundDistance);
        const outboundStopCharge = (outboundStops?.length || 0) * vehicleType.additionalStopFee;
        const outboundBaseFare = outboundDistanceCharge + outboundStopCharge;
        const outboundFare = Math.max(outboundBaseFare, vehicleType.minimumFare);
        let totalFare = outboundFare;
        if (returnType === "wait-and-return") {
            // Wait-and-return: driver waits and returns
            if (!waitDuration) {
                throw new Error("Wait duration required for wait-and-return booking");
            }
            // Calculate return journey (same route back)
            const returnFare = outboundFare; // Same fare for return journey
            totalFare += returnFare;
            // Add wait charge (driver waiting time)
            const waitCharge = waitDuration * this.getHourlyRate(vehicleType) * 0.5; // 50% of hourly rate for waiting
            totalFare += waitCharge;
            // Time surcharge for outbound
            const outboundTimeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
            totalFare += outboundTimeSurcharge;
            // Equipment charges
            const equipmentFees = this.calculateEquipmentFees(passengers, vehicleType);
            totalFare += equipmentFees;
            // Multiply by number of vehicles
            if (numVehicles > 1) {
                totalFare = totalFare * numVehicles;
            }
            const roundedFare = Math.ceil(totalFare);
            return {
                amount: roundedFare,
                currency: this.DEFAULT_CURRENCY,
                messages: this.generateReturnWaitMessages(outboundDistance, waitDuration, outboundTimeSurcharge, equipmentFees, numVehicles),
                breakdown: {
                    baseFare: outboundFare,
                    distanceCharge: outboundDistanceCharge,
                    equipmentFees,
                    timeSurcharge: outboundTimeSurcharge,
                    waitCharge,
                },
            };
        }
        else {
            // Later date return: two separate journeys
            if (!returnPickup || !returnDropoff || !request.returnDetails.returnDateTime) {
                throw new Error("Return pickup, dropoff, and datetime required for later-date return");
            }
            // Calculate return journey fare
            const returnWaypoints = returnStops?.map(stop => `${stop.lat},${stop.lng}`) || [];
            const returnRoute = await mapboxDistance_service_1.MapboxDistanceService.getDistance(`${returnPickup.lat},${returnPickup.lng}`, `${returnDropoff.lat},${returnDropoff.lng}`, returnWaypoints);
            const returnDistance = returnRoute.distance;
            const returnDistanceCharge = this.calculateSlabBasedDistanceFare(vehicleType, returnDistance);
            const returnStopCharge = (returnStops?.length || 0) * vehicleType.additionalStopFee;
            const returnBaseFare = returnDistanceCharge + returnStopCharge;
            const returnFare = Math.max(returnBaseFare, vehicleType.minimumFare);
            totalFare += returnFare;
            // Time surcharges for both journeys
            const outboundTimeSurcharge = this.calculateTimeSurcharge(requestDate, vehicleType.id);
            const returnDate = new Date(`${request.returnDetails.returnDateTime.date}T${request.returnDetails.returnDateTime.time}:00`);
            const returnTimeSurcharge = this.calculateTimeSurcharge(returnDate, vehicleType.id);
            totalFare += outboundTimeSurcharge + returnTimeSurcharge;
            // Equipment charges
            const equipmentFees = this.calculateEquipmentFees(passengers, vehicleType);
            totalFare += equipmentFees;
            // Multiply by number of vehicles
            if (numVehicles > 1) {
                totalFare = totalFare * numVehicles;
            }
            const roundedFare = Math.ceil(totalFare);
            return {
                amount: roundedFare,
                currency: this.DEFAULT_CURRENCY,
                messages: this.generateReturnLaterMessages(outboundDistance, returnDistance, outboundTimeSurcharge, returnTimeSurcharge, equipmentFees, numVehicles),
                breakdown: {
                    baseFare: outboundFare + returnFare,
                    distanceCharge: outboundDistanceCharge + returnDistanceCharge,
                    equipmentFees,
                    timeSurcharge: outboundTimeSurcharge + returnTimeSurcharge,
                },
            };
        }
    }
    /**
     * Generate notifications based on booking type
     */
    static generateNotifications(bookingType, request) {
        const notifications = [];
        switch (bookingType) {
            case "one-way":
                notifications.push("One-Way journey: Point-to-point transfer");
                if (request.oneWayDetails?.additionalStops && request.oneWayDetails.additionalStops.length > 0) {
                    notifications.push(`Additional stops: ${request.oneWayDetails.additionalStops.length} stops included`);
                }
                break;
            case "hourly":
                const hours = request.hourlyDetails?.hours || 0;
                notifications.push(`Hourly booking: ${hours} hours of service`);
                if (hours >= 8) {
                    notifications.push("Long-term booking: Extended service period");
                }
                notifications.push("Driver stays with you and follows your itinerary");
                notifications.push("Congestion charges and airport fees will be charged during the journey");
                break;
            case "return":
                const returnType = request.returnDetails?.returnType;
                if (returnType === "wait-and-return") {
                    const waitDuration = request.returnDetails?.waitDuration || 0;
                    notifications.push(`Wait-and-return: Driver waits ${waitDuration} hours and returns`);
                    notifications.push("Price includes driver waiting time");
                }
                else {
                    notifications.push("Later date return: Two separate scheduled journeys");
                    notifications.push("Price includes both outbound and return journeys");
                }
                break;
        }
        if (request.numVehicles && request.numVehicles > 1) {
            notifications.push(`Multiple vehicles: ${request.numVehicles} vehicles requested`);
        }
        return notifications;
    }
    /**
     * Generate pricing messages based on booking type
     */
    static generatePricingMessages(bookingType, request) {
        const messages = [];
        switch (bookingType) {
            case "one-way":
                messages.push("One-Way pricing: Distance-based fare with time surcharges");
                messages.push("Additional stops add extra charges");
                break;
            case "hourly":
                const hours = request.hourlyDetails?.hours || 0;
                messages.push(`Hourly pricing: ${hours} hours × hourly rate`);
                messages.push("Driver and vehicle included for the full duration");
                messages.push("Congestion charges and airport fees apply during journey");
                break;
            case "return":
                const returnType = request.returnDetails?.returnType;
                if (returnType === "wait-and-return") {
                    messages.push("Return pricing: Outbound + Return + Driver waiting time");
                    messages.push("Driver waits at destination and returns you");
                }
                else {
                    messages.push("Return pricing: Outbound journey + Return journey");
                    messages.push("Two separate scheduled journeys");
                }
                break;
        }
        return messages;
    }
    /**
     * Generate messages for One-Way pricing
     */
    static generateOneWayMessages(distance, duration, stops, timeSurcharge, equipmentFees, numVehicles) {
        const messages = [];
        messages.push(`Distance: ${distance.toFixed(1)} miles`);
        messages.push(`Duration: ${Math.round(duration)} minutes`);
        if (stops > 0) {
            messages.push(`Additional stops (${stops}): £${(stops * 5).toFixed(2)}`);
        }
        if (timeSurcharge > 0) {
            messages.push(`Time surcharge: £${timeSurcharge.toFixed(2)}`);
        }
        if (equipmentFees > 0) {
            messages.push(`Equipment fees: £${equipmentFees.toFixed(2)}`);
        }
        if (numVehicles > 1) {
            messages.push(`Multiple vehicles (${numVehicles}): Total × ${numVehicles}`);
        }
        return messages;
    }
    /**
     * Generate messages for Hourly pricing
     */
    static generateHourlyMessages(hours, hourlyRate, timeSurcharge, equipmentFees, numVehicles) {
        const messages = [];
        messages.push(`Hours: ${hours} × £${hourlyRate.toFixed(2)}/hour`);
        if (timeSurcharge > 0) {
            messages.push(`Time surcharge: £${timeSurcharge.toFixed(2)}`);
        }
        if (equipmentFees > 0) {
            messages.push(`Equipment fees: £${equipmentFees.toFixed(2)}`);
        }
        if (numVehicles > 1) {
            messages.push(`Multiple vehicles (${numVehicles}): Total × ${numVehicles}`);
        }
        return messages;
    }
    /**
     * Generate messages for Return Wait-and-Return pricing
     */
    static generateReturnWaitMessages(distance, waitDuration, timeSurcharge, equipmentFees, numVehicles) {
        const messages = [];
        messages.push(`Outbound: ${distance.toFixed(1)} miles`);
        messages.push(`Return: ${distance.toFixed(1)} miles (same route)`);
        messages.push(`Driver wait time: ${waitDuration} hours`);
        if (timeSurcharge > 0) {
            messages.push(`Time surcharge: £${timeSurcharge.toFixed(2)}`);
        }
        if (equipmentFees > 0) {
            messages.push(`Equipment fees: £${equipmentFees.toFixed(2)}`);
        }
        if (numVehicles > 1) {
            messages.push(`Multiple vehicles (${numVehicles}): Total × ${numVehicles}`);
        }
        return messages;
    }
    /**
     * Generate messages for Return Later-Date pricing
     */
    static generateReturnLaterMessages(outboundDistance, returnDistance, outboundTimeSurcharge, returnTimeSurcharge, equipmentFees, numVehicles) {
        const messages = [];
        messages.push(`Outbound: ${outboundDistance.toFixed(1)} miles`);
        messages.push(`Return: ${returnDistance.toFixed(1)} miles`);
        if (outboundTimeSurcharge > 0 || returnTimeSurcharge > 0) {
            messages.push(`Time surcharges: £${(outboundTimeSurcharge + returnTimeSurcharge).toFixed(2)}`);
        }
        if (equipmentFees > 0) {
            messages.push(`Equipment fees: £${equipmentFees.toFixed(2)}`);
        }
        if (numVehicles > 1) {
            messages.push(`Multiple vehicles (${numVehicles}): Total × ${numVehicles}`);
        }
        return messages;
    }
    /**
     * Calculate equipment fees for extra passengers/luggage
     */
    static calculateEquipmentFees(passengers, vehicleType) {
        let equipmentFees = 0;
        if (passengers.count > vehicleType.capacity.passengers) {
            const extraPassengers = passengers.count - vehicleType.capacity.passengers;
            equipmentFees += extraPassengers * 5; // £5 per extra passenger
        }
        if (passengers.luggage > vehicleType.capacity.luggage) {
            const extraLuggage = passengers.luggage - vehicleType.capacity.luggage;
            equipmentFees += extraLuggage * 3; // £3 per extra luggage
        }
        return equipmentFees;
    }
    /**
     * Get hourly rate for a vehicle type
     */
    static getHourlyRate(vehicleType) {
        // Define hourly rates based on vehicle type
        const hourlyRates = {
            'saloon': 25.00, // £25/hour
            'estate': 30.00, // £30/hour
            'mpv-6': 45.00, // £45/hour
            'mpv-8': 60.00, // £60/hour
            'executive': 50.00, // £50/hour
            'executive-mpv': 75.00, // £75/hour
            'vip-saloon': 80.00, // £80/hour
            'vip-suv': 100.00, // £100/hour
        };
        return hourlyRates[vehicleType.id] || 25.00; // Default to £25/hour
    }
    /**
     * Calculate distance fare using proper slab system
     */
    static calculateSlabBasedDistanceFare(vehicleType, distance) {
        const rates = vehicleType.perMileRates;
        let ratePerMile = 0;
        // Determine which rate applies based on total distance
        if (distance <= 4) {
            ratePerMile = rates['0-4'];
        }
        else if (distance <= 10.9) {
            ratePerMile = rates['4.1-10.9'];
        }
        else if (distance <= 20) {
            ratePerMile = rates['11-20'];
        }
        else if (distance <= 40) {
            ratePerMile = rates['20.1-40'];
        }
        else if (distance <= 60) {
            ratePerMile = rates['60.1-80'];
        }
        else if (distance <= 80) {
            ratePerMile = rates['81-99'];
        }
        else if (distance <= 99) {
            ratePerMile = rates['100-149'];
        }
        else if (distance <= 149) {
            ratePerMile = rates['150-299'];
        }
        else if (distance <= 299) {
            ratePerMile = rates['300+'];
        }
        else {
            ratePerMile = rates['300+'];
        }
        return distance * ratePerMile;
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
        const isWeekend = day === 5 || day === 6 || day === 0;
        // Determine time period
        let period = 'nonPeak';
        if (hours >= 6 && hours < 15) {
            period = 'peakMedium';
        }
        else if (hours >= 15) {
            period = 'peakHigh';
        }
        try {
            // Get surcharge from timeSurcharges configuration
            const timeCategory = isWeekend ? 'weekends' : 'weekdays';
            const timePeriod = timePricing_1.timeSurcharges[timeCategory][period];
            return timePeriod?.surcharges[mappedVehicleType] || 0;
        }
        catch (error) {
            console.error(`Error calculating time surcharge for ${vehicleTypeId}:`, error);
            return 0; // Default to no surcharge on error
        }
    }
}
exports.HourlyFareService = HourlyFareService;
// Default currency
HourlyFareService.DEFAULT_CURRENCY = "GBP";
