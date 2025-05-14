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

      // Log special conditions
      if (airports.pickupAirport) {
        const airport =
          AIRPORTS[airports.pickupAirport as keyof typeof AIRPORTS];
        console.log(
          `Detected airport pickup at ${
            airport?.name || airports.pickupAirport
          }`
        );
      }
      if (airports.dropoffAirport) {
        const airport =
          AIRPORTS[airports.dropoffAirport as keyof typeof AIRPORTS];
        console.log(
          `Detected airport dropoff at ${
            airport?.name || airports.dropoffAirport
          }`
        );
      }

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
          hasDartfordCrossing
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

      // Compile special location notifications
      const notifications = [];

      // Airport notifications
      if (airports.pickupAirport) {
        const airport =
          AIRPORTS[airports.pickupAirport as keyof typeof AIRPORTS];
        if (airport) {
          notifications.push(
            `Your journey includes airport pickup at ${
              airport.name
            }. A £${airport.fees.pickup.toFixed(2)} fee has been added.`
          );
        }
      }

      if (airports.dropoffAirport) {
        const airport =
          AIRPORTS[airports.dropoffAirport as keyof typeof AIRPORTS];
        if (airport) {
          notifications.push(
            `Your journey includes airport dropoff at ${
              airport.name
            }. A £${airport.fees.dropoff.toFixed(2)} fee has been added.`
          );
        }
      }

      // Congestion charge notification
      if (hasCongeistionCharge) {
        // Check if congestion charge is active at the requested time
        if (isZoneActive("CONGESTION_CHARGE", requestDate)) {
          notifications.push(
            `Your route passes through the Congestion Charge Zone. A £${SPECIAL_ZONES.CONGESTION_CHARGE.fee.toFixed(
              2
            )} charge has been added.`
          );
        } else {
          notifications.push(
            "Your journey passes through the Congestion Charge Zone, but outside charging hours (Monday-Friday, 7am-6pm)."
          );
        }
      }

      // Add notifications for other special zones
      for (const zoneKey of specialZones) {
        // Skip congestion charge as it's already handled
        if (
          zoneKey === "CONGESTION_CHARGE" ||
          zoneKey === "DARTFORD_CROSSING"
        ) {
          continue;
        }

        const zone = SPECIAL_ZONES[zoneKey as keyof typeof SPECIAL_ZONES];
        if (zone) {
          // Check if zone is active at requested time
          if (!zone.operatingHours || isZoneActive(zoneKey, requestDate)) {
            notifications.push(
              `Your route passes through ${zone.name}. A £${zone.fee.toFixed(
                2
              )} charge has been added.`
            );
          } else {
            notifications.push(
              `Your route passes through ${zone.name}, but outside charging hours.`
            );
          }
        }
      }

      // Dartford crossing notification
      if (hasDartfordCrossing) {
        notifications.push(
          `Your journey includes the Dartford Crossing. A £${SPECIAL_ZONES.DARTFORD_CROSSING.fee.toFixed(
            2
          )} charge has been added.`
        );
      }

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
    hasDartfordCrossing: boolean
  ): VehiclePriceInfo {
    console.log(`Base fare: £${vehicleType.baseRate}`);
    console.log(`Per-mile rate: £${vehicleType.perMileRate}/mile`);
    console.log(`Distance: ${distance.toFixed(2)} miles`);
    console.log(`Additional stops: ${additionalStops}`);

    // Calculate time-based multiplier using the new configuration
    const timeMultiplier = getTimeMultiplier(requestDate);
    console.log(`Time multiplier: ${timeMultiplier}`);

    // Get time-based surcharge using the new configuration
    const timeSurcharge = getTimeSurcharge(requestDate);
    console.log(`Time surcharge: £${timeSurcharge.toFixed(2)}`);

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

    // Calculate initial fare
    let fareAmount = baseFare + timeAdjustedDistanceFare + timeSurcharge;
    console.log(`Initial fare: £${fareAmount.toFixed(2)}`);

    // Add additional stop fees
    if (additionalStops > 0 && vehicleType.additionalStopFee) {
      const stopFee = additionalStops * vehicleType.additionalStopFee;
      fareAmount += stopFee;
      console.log(
        `After stop fees: £${fareAmount.toFixed(2)} (added £${stopFee.toFixed(
          2
        )} for ${additionalStops} stops)`
      );
    }

    // Add special charges and location fees
    const specialLocationMessages = [];

    // Check for airports
    if (airports.pickupAirport) {
      const airport = AIRPORTS[airports.pickupAirport as keyof typeof AIRPORTS];
      if (airport) {
        const pickupFee = airport.fees.pickup;
        fareAmount += pickupFee;
        console.log(
          `Airport pickup fee for ${airport.name}: £${pickupFee.toFixed(2)}`
        );
        specialLocationMessages.push(
          `Your journey includes airport pickup at ${
            airport.name
          }. A £${pickupFee.toFixed(2)} fee has been added.`
        );
      }
    }

    if (airports.dropoffAirport) {
      const airport =
        AIRPORTS[airports.dropoffAirport as keyof typeof AIRPORTS];
      if (airport) {
        const dropoffFee = airport.fees.dropoff;
        fareAmount += dropoffFee;
        console.log(
          `Airport dropoff fee for ${airport.name}: £${dropoffFee.toFixed(2)}`
        );
        specialLocationMessages.push(
          `Your journey includes airport dropoff at ${
            airport.name
          }. A £${dropoffFee.toFixed(2)} fee has been added.`
        );
      }
    }

    // Add congestion charge
    if (hasCongestionCharge) {
      const congestionCharge = SPECIAL_ZONES.CONGESTION_CHARGE.fee;
      fareAmount += congestionCharge;
      console.log(`Added congestion charge: £${congestionCharge.toFixed(2)}`);
      specialLocationMessages.push(
        `Your route passes through the Congestion Charge Zone. A £${congestionCharge.toFixed(
          2
        )} charge has been added.`
      );
    }

    // Add Dartford Crossing fee
    if (hasDartfordCrossing) {
      const dartfordFee = SPECIAL_ZONES.DARTFORD_CROSSING.fee;
      fareAmount += dartfordFee;
      console.log(`Added Dartford Crossing fee: £${dartfordFee.toFixed(2)}`);
      specialLocationMessages.push(
        `Your journey includes the Dartford Crossing. A £${dartfordFee.toFixed(
          2
        )} charge has been added.`
      );
    }

    // Apply minimum fare if needed
    if (fareAmount < vehicleType.minimumFare) {
      console.log(
        `Fare £${fareAmount.toFixed(
          2
        )} is below minimum fare £${vehicleType.minimumFare.toFixed(
          2
        )}, using minimum fare`
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
    };
  }
}
