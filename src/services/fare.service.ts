import axios from "axios";
import {
  Coordinates,
  FareEstimateRequest,
  FareEstimateResponse,
  VehicleOption,
  VehiclePriceInfo,
} from "../types";
import { env } from "../config/env";
import { vehicleTypes, VehicleType } from "../config/vehicleTypes";
import {
  AIRPORTS,
  SPECIAL_ZONES,
  AIRPORT_CODES,
  isWithinBoundaries,
  isZoneActive,
  getZonesForRoute,
  getAirportsNearLocation,
  isAtAirport,
} from "../config/specialZones";
import { getTimeMultiplier, getTimeSurcharge } from "../config/timePricing";
import { isPeakHour, isWeekend, isHoliday } from "../config/timePricing";

// Additional equipment fees
const EQUIPMENT_FEES = {
  BABY_SEAT: 10.0, // Baby Seat (0-18 Months)
  CHILD_SEAT: 10.0, // Child Seat (18 Months - 4 Years)
  BOOSTER_SEAT: 10.0, // Booster Seat (4-6 Years)
  WHEELCHAIR: 25.0, // Foldable Wheelchair
};

export class FareService {
  private static readonly BASE_URL =
    "https://api.mapbox.com/directions/v5/mapbox/driving";

  // Default currency
  private static readonly DEFAULT_CURRENCY = "GBP";

  /**
   * Calculate fare estimates for different vehicle types
   */
  static async calculateFares(
    request: FareEstimateRequest
  ): Promise<FareEstimateResponse> {
    try {
      const { pickupLocation, dropoffLocation, additionalStops = [] } = request;
      // Use the request date or current date
      const requestDate = request.date ? new Date(request.date) : new Date();

      // Call the MapBox API to get distance and duration
      console.log("Calling MapBox API to get route details...");
      const routeDetails = await this.getRouteDetails(
        pickupLocation,
        dropoffLocation
      );

      // Convert distance from meters to miles
      const distance = routeDetails.distance / 1609.34;
      // Convert duration from seconds to minutes
      const duration = routeDetails.duration / 60;

      console.log(
        `Distance: ${distance.toFixed(2)} miles, Duration: ${duration.toFixed(
          0
        )} minutes`
      );

      // Get the routing information including leg details
      const routeLegs = routeDetails.legs;

      // Detect special zones using the new helper method
      const specialZones = getZonesForRoute(routeLegs);

      // Check if specific zones are present
      const hasCongeistionCharge = specialZones.includes("CONGESTION_CHARGE");
      const hasDartfordCrossing = specialZones.includes("DARTFORD_CROSSING");

      // Check for airports
      const airportsPickup = getAirportsNearLocation(pickupLocation);
      const airportsDropoff = getAirportsNearLocation(dropoffLocation);

      const airports = {
        pickupAirport: airportsPickup.length > 0 ? airportsPickup[0] : null,
        dropoffAirport: airportsDropoff.length > 0 ? airportsDropoff[0] : null,
      };

      // Calculate fare for each vehicle type
      const allVehicleTypes = Object.values(vehicleTypes);
      const vehicleOptions: VehicleOption[] = [];

      for (const vehicleType of allVehicleTypes) {
        console.log(`\n===== Calculating fare for ${vehicleType.name} =====`);
        // Calculate fare for this vehicle type
        const priceInfo = this.calculateVehicleFare(
          vehicleType,
          distance,
          duration,
          additionalStops.length,
          requestDate,
          airports,
          hasCongeistionCharge &&
            isZoneActive("CONGESTION_CHARGE", requestDate),
          hasDartfordCrossing,
          request.passengers
        );

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

      // Return just what the FareEstimateResponse interface expects
      return {
        fareEstimate: vehicleOptions[0]?.price.amount || 0,
        distance_miles: parseFloat(distance.toFixed(2)),
        duration_minutes: Math.ceil(duration),
      };
    } catch (error) {
      console.error("Error calculating fares:", error);
      throw new Error("Failed to calculate fare estimates");
    }
  }

  /**
   * Get route details from MapBox API
   */
  private static async getRouteDetails(
    pickup: Coordinates,
    dropoff: Coordinates
  ): Promise<any> {
    const pickupCoords = `${pickup.lng},${pickup.lat}`;
    const dropoffCoords = `${dropoff.lng},${dropoff.lat}`;
    const url = `${this.BASE_URL}/${pickupCoords};${dropoffCoords}?access_token=${env.mapbox.token}&geometries=geojson&overview=full&annotations=duration,distance,speed`;

    try {
      const response = await axios.get(url);
      const data = response.data;
      // Return the selected route
      return data.routes[0];
    } catch (error) {
      console.error("Error fetching route details:", error);
      throw new Error("Failed to get route details from MapBox API");
    }
  }

  /**
   * Calculate fare for a specific vehicle type
   */
  private static calculateVehicleFare(
    vehicleType: VehicleType,
    distance: number,
    duration: number,
    additionalStops: number,
    requestDate: Date,
    airports: { pickupAirport: string | null; dropoffAirport: string | null },
    hasCongestionCharge: boolean,
    hasDartfordCrossing: boolean,
    passengers?: {
      count: number;
      checkedLuggage: number;
      mediumLuggage: number;
      handLuggage: number;
      babySeat: number;
      childSeat: number;
      boosterSeat: number;
      wheelchair: number;
    }
  ): VehiclePriceInfo {
    console.log(`Base fare: £${vehicleType.baseRate}`);
    console.log(`Per-mile rate: £${vehicleType.perMileRate}/mile`);
    console.log(`Distance: ${distance.toFixed(2)} miles`);
    console.log(`Additional stops: ${additionalStops}`);

    // Calculate time-based multiplier using the new configuration
    const timeMultiplier = getTimeMultiplier(requestDate);
    console.log(`Time multiplier: ${timeMultiplier}`);

    // Get time-based surcharge (silently applied)
    const timeSurcharge = getTimeSurcharge(requestDate);

    // Calculate base fare
    const baseFare = vehicleType.baseRate;
    const distanceFare = vehicleType.perMileRate * distance;
    console.log(`Base fare: £${baseFare.toFixed(2)}`);
    console.log(`Distance charge: £${distanceFare.toFixed(2)}`);

    // Apply time multiplier to the distance fare only
    const timeAdjustedDistanceFare = distanceFare * timeMultiplier;
    console.log(
      `Time-adjusted distance charge: £${timeAdjustedDistanceFare.toFixed(2)}`
    );

    // Calculate initial fare (including time surcharge)
    let fareAmount = baseFare + timeAdjustedDistanceFare + timeSurcharge;
    console.log(`Initial fare: £${fareAmount.toFixed(2)}`);

    const specialLocationMessages: string[] = [];
    const specialFees: { name: string; amount: number }[] = [];
    const additionalRequestFees: { name: string; amount: number }[] = [];

    // Add special equipment fees if requested
    if (passengers) {
      // Add special equipment fees
      if (passengers.babySeat > 0) {
        const fee = passengers.babySeat * EQUIPMENT_FEES.BABY_SEAT;
        fareAmount += fee;
        additionalRequestFees.push({ name: "Baby Seats", amount: fee });
      }

      if (passengers.childSeat > 0) {
        const fee = passengers.childSeat * EQUIPMENT_FEES.CHILD_SEAT;
        fareAmount += fee;
        additionalRequestFees.push({ name: "Child Seats", amount: fee });
      }

      if (passengers.boosterSeat > 0) {
        const fee = passengers.boosterSeat * EQUIPMENT_FEES.BOOSTER_SEAT;
        fareAmount += fee;
        additionalRequestFees.push({ name: "Booster Seats", amount: fee });
      }

      if (passengers.wheelchair > 0) {
        const fee = passengers.wheelchair * EQUIPMENT_FEES.WHEELCHAIR;
        fareAmount += fee;
        additionalRequestFees.push({ name: "Wheelchairs", amount: fee });
      }
    }

    // Add special location fees
    if (airports.pickupAirport) {
      const airport = AIRPORTS[airports.pickupAirport as keyof typeof AIRPORTS];
      if (airport) {
        fareAmount += airport.fees.pickup;
        specialFees.push({
          name: "Airport Pickup",
          amount: airport.fees.pickup,
        });
        specialLocationMessages.push(
          `Airport pickup at ${airport.name}: £${airport.fees.pickup.toFixed(2)}`
        );
      }
    }

    if (airports.dropoffAirport) {
      const airport =
        AIRPORTS[airports.dropoffAirport as keyof typeof AIRPORTS];
      if (airport) {
        fareAmount += airport.fees.dropoff;
        specialFees.push({
          name: "Airport Dropoff",
          amount: airport.fees.dropoff,
        });
        specialLocationMessages.push(
          `Airport dropoff at ${airport.name}: £${airport.fees.dropoff.toFixed(2)}`
        );
      }
    }

    if (hasCongestionCharge) {
      fareAmount += SPECIAL_ZONES.CONGESTION_CHARGE.fee;
      specialFees.push({
        name: "Congestion Charge",
        amount: SPECIAL_ZONES.CONGESTION_CHARGE.fee,
      });
      specialLocationMessages.push(
        `Congestion charge: £${SPECIAL_ZONES.CONGESTION_CHARGE.fee.toFixed(2)}`
      );
    }

    if (hasDartfordCrossing) {
      fareAmount += SPECIAL_ZONES.DARTFORD_CROSSING.fee;
      specialFees.push({
        name: "Dartford Crossing",
        amount: SPECIAL_ZONES.DARTFORD_CROSSING.fee,
      });
      specialLocationMessages.push(
        `Dartford crossing fee: £${SPECIAL_ZONES.DARTFORD_CROSSING.fee.toFixed(2)}`
      );
    }

    // Add additional stop fees
    let additionalStopFees = 0;
    if (additionalStops > 0 && vehicleType.additionalStopFee) {
      additionalStopFees = additionalStops * vehicleType.additionalStopFee;
      fareAmount += additionalStopFees;
      specialLocationMessages.push(
        `Additional stop fees: £${additionalStopFees.toFixed(2)}`
      );
    }

    // Apply minimum fare if needed
    if (fareAmount < vehicleType.minimumFare) {
      console.log(
        `Fare £${fareAmount.toFixed(2)} is below minimum fare £${vehicleType.minimumFare.toFixed(2)}, using minimum fare`
      );
      fareAmount = vehicleType.minimumFare;
    }

    // Round to nearest 0.5
    const roundedFare = Math.ceil(fareAmount * 2) / 2;
    console.log(`Final rounded fare: £${roundedFare.toFixed(2)}`);

    return {
      amount: roundedFare,
      currency: this.DEFAULT_CURRENCY,
      messages:
        specialLocationMessages.length > 0
          ? specialLocationMessages
          : undefined,
      breakdown: {
        baseFare,
        distanceFare: timeAdjustedDistanceFare,
        additionalStopFees,
        specialFees,
        additionalRequestFees,
      },
    };
  }
}
