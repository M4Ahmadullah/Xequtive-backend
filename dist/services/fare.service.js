"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fareCalculationService = exports.FareCalculationService = void 0;
const timePricing_1 = require("../config/timePricing");
const serviceArea_1 = require("../config/serviceArea");
class FareCalculationService {
    /**
     * Calculate fare based on comprehensive pricing rules
     * @param params Fare calculation parameters
     * @returns Calculated fare details
     */
    calculateFare(params) {
        const { vehicleType, distance, additionalStops = 0, airport, isWeekend = false, timeOfDay = '12:00 AM', isAirportPickup = false } = params;
        // Find vehicle class configuration
        const vehicleClassConfig = this.findVehicleClassConfig(vehicleType);
        if (!vehicleClassConfig) {
            throw new Error(`Invalid vehicle type: ${vehicleType}`);
        }
        // Get specific vehicle pricing
        const vehiclePricing = vehicleClassConfig.pricing[vehicleType];
        if (!vehiclePricing) {
            throw new Error(`No pricing found for vehicle type: ${vehicleType}`);
        }
        // Step 1: Calculate distance-based fare using proper slab system
        const distanceFare = this.calculateDistanceFare(vehiclePricing, distance);
        // Step 2: Calculate additional stops charge
        const additionalStopsFare = this.calculateAdditionalStopsFare(vehicleClassConfig.additionalStopFees[vehicleType] || 0, additionalStops);
        // Step 3: Calculate core fare (distance + stops)
        const coreFare = distanceFare + additionalStopsFare;
        // Step 4: Apply minimum fare rule to core fare
        const fareAfterMinimum = Math.max(coreFare, vehiclePricing.minimumFare);
        // Step 5: Calculate additional fees (applied after minimum fare check)
        const airportFee = this.calculateAirportFee(vehicleType, airport, isAirportPickup);
        // Step 6: Calculate time-based surcharge
        const timeSurcharge = this.calculateTimeSurcharge(vehicleType, isWeekend, timeOfDay);
        // Step 7: Calculate equipment charges
        let equipmentFees = 0;
        if (params.passengers) {
            if (params.passengers.babySeat > 0) {
                equipmentFees += params.passengers.babySeat * serviceArea_1.EQUIPMENT_FEES.BABY_SEAT;
            }
            if (params.passengers.childSeat > 0) {
                equipmentFees += params.passengers.childSeat * serviceArea_1.EQUIPMENT_FEES.CHILD_SEAT;
            }
            if (params.passengers.boosterSeat > 0) {
                equipmentFees += params.passengers.boosterSeat * serviceArea_1.EQUIPMENT_FEES.BOOSTER_SEAT;
            }
            if (params.passengers.wheelchair > 0) {
                equipmentFees += params.passengers.wheelchair * serviceArea_1.EQUIPMENT_FEES.WHEELCHAIR;
            }
        }
        // Step 8: Combine all components
        const totalFare = fareAfterMinimum + airportFee + timeSurcharge + equipmentFees;
        // Step 9: Round up to nearest whole number (e.g., 14.1 becomes 15, 14.9 becomes 15)
        const roundedFare = Math.floor(totalFare);
        return roundedFare;
    }
    /**
     * Calculate fare with detailed breakdown for debugging and transparency
     * @param params Fare calculation parameters
     * @returns Detailed fare breakdown
     */
    calculateFareWithBreakdown(params) {
        const { vehicleType, distance, additionalStops = 0, airport, isWeekend = false, timeOfDay = '12:00 AM', isAirportPickup = false } = params;
        // Find vehicle class configuration
        const vehicleClassConfig = this.findVehicleClassConfig(vehicleType);
        if (!vehicleClassConfig) {
            throw new Error(`Invalid vehicle type: ${vehicleType}`);
        }
        // Get specific vehicle pricing
        const vehiclePricing = vehicleClassConfig.pricing[vehicleType];
        if (!vehiclePricing) {
            throw new Error(`No pricing found for vehicle type: ${vehicleType}`);
        }
        // Step 1: Calculate distance-based fare using proper slab system
        const distanceFare = this.calculateDistanceFare(vehiclePricing, distance);
        // Step 2: Calculate additional stops charge
        const additionalStopsFare = this.calculateAdditionalStopsFare(vehicleClassConfig.additionalStopFees[vehicleType] || 0, additionalStops);
        // Step 3: Calculate core fare (distance + stops)
        const coreFare = distanceFare + additionalStopsFare;
        // Step 4: Apply minimum fare rule to core fare
        const fareAfterMinimum = Math.max(coreFare, vehiclePricing.minimumFare);
        const minimumFareApplied = fareAfterMinimum > coreFare;
        // Step 5: Calculate additional fees (applied after minimum fare check)
        const airportFee = this.calculateAirportFee(vehicleType, airport, isAirportPickup);
        // Step 6: Calculate time-based surcharge
        const timeSurcharge = this.calculateTimeSurcharge(vehicleType, isWeekend, timeOfDay);
        // Step 7: Calculate equipment charges
        let equipmentFees = 0;
        if (params.passengers) {
            if (params.passengers.babySeat > 0) {
                equipmentFees += params.passengers.babySeat * serviceArea_1.EQUIPMENT_FEES.BABY_SEAT;
            }
            if (params.passengers.childSeat > 0) {
                equipmentFees += params.passengers.childSeat * serviceArea_1.EQUIPMENT_FEES.CHILD_SEAT;
            }
            if (params.passengers.boosterSeat > 0) {
                equipmentFees += params.passengers.boosterSeat * serviceArea_1.EQUIPMENT_FEES.BOOSTER_SEAT;
            }
            if (params.passengers.wheelchair > 0) {
                equipmentFees += params.passengers.wheelchair * serviceArea_1.EQUIPMENT_FEES.WHEELCHAIR;
            }
        }
        // Step 8: Combine all components
        const totalFare = fareAfterMinimum + airportFee + timeSurcharge + equipmentFees;
        // Step 9: Round up to nearest whole number (e.g., 14.1 becomes 15, 14.9 becomes 15)
        const finalFare = Math.floor(totalFare);
        return {
            totalFare: finalFare,
            breakdown: {
                distanceFare,
                additionalStopsFare,
                coreFare,
                minimumFareApplied,
                fareAfterMinimum,
                airportFee,
                timeSurcharge,
                equipmentFees,
                finalFare
            }
        };
    }
    /**
     * Find the vehicle class configuration
     * @param vehicleType
     * @returns Vehicle class configuration or undefined
     */
    findVehicleClassConfig(vehicleType) {
        // Iterate through vehicle types in the pricing configuration
        for (const [className, config] of Object.entries(timePricing_1.vehicleClassPricing)) {
            if (config.vehicles.includes(vehicleType)) {
                return config;
            }
        }
        return undefined;
    }
    /**
     * Calculate fare based on tiered mileage pricing (FIXED SLAB SYSTEM)
     * @param vehiclePricing Vehicle-specific pricing details
     * @param distance Total trip distance
     * @returns Calculated distance-based fare
     */
    calculateDistanceFare(vehiclePricing, distance) {
        let totalDistanceFare = 0;
        let remainingDistance = distance;
        // Sort mileage ranges from lowest to highest
        const sortedRanges = [...vehiclePricing.perMilePricing.mileageRanges]
            .sort((a, b) => a.range.min - b.range.min);
        for (const range of sortedRanges) {
            if (remainingDistance <= 0)
                break;
            // Calculate the distance that applies to this range
            const rangeStart = range.range.min;
            const rangeEnd = range.range.max === Infinity ? Infinity : range.range.max;
            // For each range, calculate how much of the trip falls within it
            let rangeDistance = 0;
            if (distance <= rangeStart) {
                // Trip doesn't reach this range
                continue;
            }
            else if (distance <= rangeEnd) {
                // Trip ends within this range
                rangeDistance = distance - rangeStart;
            }
            else {
                // Trip goes beyond this range
                rangeDistance = rangeEnd - rangeStart;
            }
            // Make sure we don't exceed remaining distance
            rangeDistance = Math.min(rangeDistance, remainingDistance);
            if (rangeDistance > 0) {
                totalDistanceFare += rangeDistance * range.rate;
                remainingDistance -= rangeDistance;
            }
        }
        return totalDistanceFare;
    }
    /**
     * Calculate additional stops fare
     * @param stopFee Fee per additional stop
     * @param additionalStops Number of additional stops
     * @returns Total additional stops fare
     */
    calculateAdditionalStopsFare(stopFee, additionalStops) {
        return stopFee * additionalStops;
    }
    /**
     * Calculate airport-related fees
     * @param vehicleType
     * @param airport
     * @param isPickup
     * @returns Airport fee
     */
    calculateAirportFee(vehicleType, airport, isPickup = false) {
        if (!airport)
            return 0;
        // Determine if it's standard or executive class
        const vehicleClass = this.findVehicleClassConfig(vehicleType);
        const classType = vehicleClass?.vehicles.some((v) => ['executive-saloon', 'executive-mpv', 'vip-saloon', 'vip-suv'].includes(v)) ? 'executive' : 'standard';
        // Get appropriate fee based on pickup/dropoff
        const feeType = isPickup ? 'pickupFees' : 'dropoffFees';
        // Safely handle airport fee lookup
        const airportFeesByClass = timePricing_1.airportFees[feeType][classType];
        return airportFeesByClass && airport in airportFeesByClass
            ? airportFeesByClass[airport]
            : 0;
    }
    /**
     * Calculate time-based surcharge
     * @param vehicleType
     * @param isWeekend
     * @param timeOfDay
     * @returns Surcharge amount
     */
    calculateTimeSurcharge(vehicleType, isWeekend, timeOfDay) {
        const timeCategory = isWeekend ? 'weekends' : 'weekdays';
        // Determine time period
        const getPeriod = () => {
            const time = this.parseTime(timeOfDay);
            if (time >= this.parseTime('12:00 AM') && time < this.parseTime('06:00 AM'))
                return 'nonPeak';
            if (time >= this.parseTime('06:00 AM') && time < this.parseTime('03:00 PM'))
                return 'peakMedium';
            return 'peakHigh';
        };
        const period = getPeriod();
        // Safely access surcharges
        const timeSurchargesData = isWeekend ? timePricing_1.timeSurcharges.weekends : timePricing_1.timeSurcharges.weekdays;
        return timeSurchargesData[period].surcharges[vehicleType] || 0;
    }
    /**
     * Parse time string to minutes since midnight
     * @param timeStr Time in format 'HH:MM AM/PM'
     * @returns Minutes since midnight
     */
    parseTime(timeStr) {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours !== 12)
            hours += 12;
        if (modifier === 'AM' && hours === 12)
            hours = 0;
        return hours * 60 + minutes;
    }
}
exports.FareCalculationService = FareCalculationService;
// Export a singleton instance
exports.fareCalculationService = new FareCalculationService();
