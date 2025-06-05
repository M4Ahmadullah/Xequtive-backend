import axios from "axios";
import {
  Coordinates,
  EnhancedFareEstimateRequest,
  EnhancedFareEstimateResponse,
  RouteDetails,
  VehicleOption,
  VehiclePriceInfo,
  BookingPassengersData,
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
} from "../config/specialZones";
import { getTimeMultiplier, getTimeSurcharge } from "../config/timePricing";
import { isRouteServiceable } from "../config/serviceArea";

export class EnhancedFareService {
  private static readonly BASE_URL =
    "https://api.mapbox.com/directions/v5/mapbox/driving";

  // Default currency
  private static readonly DEFAULT_CURRENCY = "GBP";

  /**
   * Calculate fare estimates for different vehicle types with enhanced features
   */
  static async calculateFares(
    request: EnhancedFareEstimateRequest
  ): Promise<EnhancedFareEstimateResponse> {
    try {
      // Handle both old and new request formats
      let pickupLocation: Coordinates;
      let dropoffLocation: Coordinates;
      let additionalStops: { location: Coordinates }[] = [];
      let requestDate: Date;

      // Parse request format
      if (request.pickupLocation && request.dropoffLocation) {
        // New format with direct coordinates
        pickupLocation = request.pickupLocation;
        dropoffLocation = request.dropoffLocation;
        additionalStops = request.additionalStops || [];
        requestDate = request.date ? new Date(request.date) : new Date();
      } else if (request.locations) {
        // Old format with location objects
        pickupLocation = request.locations.pickup.coordinates;
        dropoffLocation = request.locations.dropoff.coordinates;
        additionalStops = (request.locations.additionalStops || []).map(
          (stop) => ({
            location: stop.coordinates,
          })
        );
        requestDate = request.datetime
          ? new Date(`${request.datetime.date}T${request.datetime.time}:00`)
          : new Date();
      } else {
        throw new Error("Invalid request format - missing location data");
      }

      // Check if the route is within our service area
      const serviceAreaCheck = isRouteServiceable(
        pickupLocation,
        dropoffLocation
      );
      if (!serviceAreaCheck.serviceable) {
        const error = new Error(
          serviceAreaCheck.message || "Location is outside our service area"
        );
        // Add custom properties to the error object for better error handling
        Object.assign(error, {
          code: "LOCATION_NOT_SERVICEABLE",
          details: serviceAreaCheck.message,
        });
        throw error;
      }

      // Call the MapBox API to get distance and duration
      console.log("Calling MapBox API to get route details...");
      const routeDetails = await this.getRouteDetails(
        pickupLocation,
        dropoffLocation,
        additionalStops.map((stop) => stop.location)
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

      // Detect special zones using the helper method
      const specialZones = getZonesForRoute(routeLegs);

      // Check if specific zones are present
      const passesThroughCCZ = specialZones.includes("CONGESTION_CHARGE");
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

      // Compile special location notifications
      const notifications = [];

      // Airport notifications
      if (airports.pickupAirport) {
        const airport =
          AIRPORTS[airports.pickupAirport as keyof typeof AIRPORTS];
        if (airport) {
          notifications.push(
            `Your journey includes airport pickup at ${airport.name}. A £${airport.fees.pickup.toFixed(2)} fee has been added.`
          );
        }
      }

      if (airports.dropoffAirport) {
        const airport =
          AIRPORTS[airports.dropoffAirport as keyof typeof AIRPORTS];
        if (airport) {
          notifications.push(
            `Your journey includes airport dropoff at ${airport.name}. A £${airport.fees.dropoff.toFixed(2)} fee has been added.`
          );
        }
      }

      // Congestion charge notification
      if (passesThroughCCZ) {
        // Check if congestion charge is active at the requested time
        if (isZoneActive("CONGESTION_CHARGE", requestDate)) {
          notifications.push(
            `Your route passes through the Congestion Charge Zone. A £${SPECIAL_ZONES.CONGESTION_CHARGE.fee.toFixed(2)} charge has been added.`
          );
        } else {
          notifications.push(
            "Your journey passes through the Congestion Charge Zone, but outside charging hours"
          );
        }
      }

      // Dartford crossing notification
      if (hasDartfordCrossing) {
        notifications.push(
          `Your journey includes the Dartford Crossing. A £${SPECIAL_ZONES.DARTFORD_CROSSING.fee.toFixed(2)} charge has been added.`
        );
      }

      // Add notification for additional stops if any
      if (additionalStops.length > 0) {
        notifications.push(
          `Your journey includes ${additionalStops.length} additional stop${
            additionalStops.length > 1 ? "s" : ""
          }`
        );
      }

      // Remove all other special zones and time-based notifications
      // We're only keeping airport, congestion charge, dartford crossing, and additional stops notifications

      // Calculate fare for each vehicle type
      const allVehicleTypes = Object.values(vehicleTypes);
      const vehicleOptions: VehicleOption[] = [];

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
    } catch (error) {
      console.error("Error calculating enhanced fares:", error);
      throw new Error("Failed to calculate enhanced fare estimates");
    }
  }

  /**
   * Get route details from MapBox API
   */
  private static async getRouteDetails(
    pickup: Coordinates,
    dropoff: Coordinates,
    waypoints: Coordinates[] = []
  ): Promise<any> {
    try {
      // Format coordinates
      const coordinates = [
        `${pickup.lng},${pickup.lat}`,
        ...waypoints.map((wp) => `${wp.lng},${wp.lat}`),
        `${dropoff.lng},${dropoff.lat}`,
      ].join(";");

      const url = `${this.BASE_URL}/${coordinates}?access_token=${env.mapbox.token}&geometries=geojson&overview=full&annotations=duration,distance,speed`;

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
   * Calculate fare for a specific vehicle type with enhanced options
   */
  private static calculateVehicleOptionFare({
    vehicleType,
    distance,
    duration,
    additionalStops,
    requestDate,
    airports,
    passesThroughCCZ,
    hasDartfordCrossing,
    routeLegs,
    serviceZones,
    passengers,
  }: {
    vehicleType: VehicleType;
    distance: number;
    duration: number;
    additionalStops: number;
    requestDate: Date;
    airports: { pickupAirport: string | null; dropoffAirport: string | null };
    passesThroughCCZ: boolean;
    hasDartfordCrossing: boolean;
    routeLegs: any[];
    serviceZones: string[];
    passengers?: BookingPassengersData;
  }): VehiclePriceInfo {
    console.log(`\n===== Calculating fare for ${vehicleType.name} =====`);
    console.log(`Base fare: £${vehicleType.baseRate}`);
    console.log(`Per-mile rate: £${vehicleType.perMileRate}/mile`);
    console.log(`Distance: ${distance.toFixed(2)} miles`);
    console.log(`Estimated duration: ${duration.toFixed(0)} minutes`);
    console.log(`Additional stops: ${additionalStops}`);

    // Initialize fare breakdown structure
    const fareBreakdown = {
      baseFare: vehicleType.baseRate,
      distanceFare: 0,
      timeSurcharge: 0,
      additionalStopFees: 0,
      specialFees: [] as { name: string; amount: number }[],
    };

    // STEP 1: Calculate base fare (different logic for VIP vehicles)
    let initialFare = 0;

    if (vehicleType.id === "vip" || vehicleType.id === "vip-mpv") {
      // For VIP vehicles, calculate based on hourly rate
      const hourlyRate = vehicleType.id === "vip" ? 75.0 : 95.0; // £75/hour for VIP, £95/hour for VIP-MPV

      // Calculate hours (min 2 hours)
      const hours = Math.max(Math.ceil(duration / 60), 2);
      fareBreakdown.baseFare = hourlyRate * hours;
      initialFare = fareBreakdown.baseFare;

      console.log(`VIP vehicle: Using hourly rate of £${hourlyRate}/hour`);
      console.log(
        `Journey duration: ${duration.toFixed(
          0
        )} minutes (${hours} billable hours)`
      );
      console.log(`VIP hourly charge: £${fareBreakdown.baseFare.toFixed(2)}`);
    } else {
      // Standard calculation: Base Fare + (Distance × Per Mile Rate)
      fareBreakdown.baseFare = vehicleType.baseRate;
      fareBreakdown.distanceFare = vehicleType.perMileRate * distance;
      initialFare = fareBreakdown.baseFare + fareBreakdown.distanceFare;

      console.log(`Base fare: £${fareBreakdown.baseFare.toFixed(2)}`);
      console.log(
        `Distance charge (${distance.toFixed(2)} miles × £${
          vehicleType.perMileRate
        }/mile): £${fareBreakdown.distanceFare.toFixed(2)}`
      );
      console.log(`Initial fare: £${initialFare.toFixed(2)}`);
    }

    // STEP 2: Apply time-based adjustments
    const timeSurcharge = getTimeSurcharge(requestDate);
    fareBreakdown.timeSurcharge = timeSurcharge;
    initialFare += timeSurcharge;

    // STEP 3: Add additional stop fees
    if (additionalStops > 0 && vehicleType.additionalStopFee) {
      const stopFee = additionalStops * vehicleType.additionalStopFee;
      fareBreakdown.additionalStopFees = stopFee;
      initialFare += stopFee;
      console.log(
        `Additional stops (${additionalStops} × £${
          vehicleType.additionalStopFee
        }): £${stopFee.toFixed(2)}`
      );
    }

    // STEP 4: Add special zone charges and additional requests
    let totalFare = initialFare;
    const specialMessages = [];

    // Calculate additional request fees
    const additionalRequestFees: { name: string; amount: number }[] = [];
    const messages: string[] = [];

    if (passengers) {
      // Handle baby seats
      if (passengers.babySeat > 0) {
        const babySeatCharge = passengers.babySeat * 10; // £10.00 per baby seat
        additionalRequestFees.push({
          name: "Baby Seat (0-18 Months)",
          amount: babySeatCharge,
        });
      }

      // Handle child seats
      if (passengers.childSeat > 0) {
        const childSeatCharge = passengers.childSeat * 10; // £10.00 per child seat
        additionalRequestFees.push({
          name: "Child Seat (18 Months - 4 Years)",
          amount: childSeatCharge,
        });
      }

      // Handle booster seats
      if (passengers.boosterSeat > 0) {
        const boosterSeatCharge = passengers.boosterSeat * 10; // £10.00 per booster seat
        additionalRequestFees.push({
          name: "Booster Seat (4-6 Years)",
          amount: boosterSeatCharge,
        });
      }

      // Handle wheelchair
      if (passengers.wheelchair > 0) {
        const wheelchairCharge = passengers.wheelchair * 25; // £25.00 per wheelchair
        additionalRequestFees.push({
          name: "Foldable Wheelchair",
          amount: wheelchairCharge,
        });
      }

      // Add all additional request fees to the total fare
      const totalAdditionalRequestFees = additionalRequestFees.reduce(
        (sum, fee) => sum + fee.amount,
        0
      );
      totalFare += totalAdditionalRequestFees;
    }

    // Add existing special charges (congestion, airports, etc.)
    if (passesThroughCCZ && isZoneActive("CONGESTION_CHARGE", requestDate)) {
      const congestionCharge = SPECIAL_ZONES.CONGESTION_CHARGE.fee;
      totalFare += congestionCharge;
      fareBreakdown.specialFees.push({
        name: "Congestion Charge",
        amount: congestionCharge,
      });
    }

    if (hasDartfordCrossing) {
      const dartfordFee = SPECIAL_ZONES.DARTFORD_CROSSING.fee;
      totalFare += dartfordFee;
      fareBreakdown.specialFees.push({
        name: "Dartford Crossing",
        amount: dartfordFee,
      });
    }

    // Airport fees
    if (airports.pickupAirport) {
      const airport = AIRPORTS[airports.pickupAirport as keyof typeof AIRPORTS];
      if (airport) {
        const pickupFee = airport.fees.pickup;
        totalFare += pickupFee;
        fareBreakdown.specialFees.push({
          name: `${airport.name} Pickup Fee`,
          amount: pickupFee,
        });
        specialMessages.push(
          `Airport pickup fee at ${airport.name}: £${pickupFee.toFixed(2)}`
        );
      }
    }

    if (airports.dropoffAirport) {
      const airport =
        AIRPORTS[airports.dropoffAirport as keyof typeof AIRPORTS];
      if (airport) {
        const dropoffFee = airport.fees.dropoff;
        totalFare += dropoffFee;
        fareBreakdown.specialFees.push({
          name: `${airport.name} Dropoff Fee`,
          amount: dropoffFee,
        });
        specialMessages.push(
          `Airport dropoff fee at ${airport.name}: £${dropoffFee.toFixed(2)}`
        );
      }
    }

    // STEP 5: Apply minimum fare if needed
    if (totalFare < vehicleType.minimumFare) {
      console.log(
        `Calculated fare (£${totalFare.toFixed(
          2
        )}) is below minimum fare (£${vehicleType.minimumFare.toFixed(2)})`
      );
      totalFare = vehicleType.minimumFare;
      console.log(`Applied minimum fare: £${totalFare.toFixed(2)}`);
    }

    // STEP 6: Apply final adjustments - round up to nearest £0.50
    const roundedFare = Math.ceil(totalFare * 2) / 2;
    if (roundedFare !== totalFare) {
      console.log(
        `Rounded fare from £${totalFare.toFixed(2)} to £${roundedFare.toFixed(
          2
        )}`
      );
    }

    console.log(`Final fare: £${roundedFare.toFixed(2)}`);

    // Return the price info with all messages
    return {
      amount: roundedFare,
      currency: this.DEFAULT_CURRENCY,
      messages: specialMessages.length > 0 ? specialMessages : undefined,
      breakdown: {
        baseFare: fareBreakdown.baseFare,
        distanceFare: fareBreakdown.distanceFare,
        timeSurcharge: fareBreakdown.timeSurcharge,
        additionalStopFees: fareBreakdown.additionalStopFees,
        specialFees: fareBreakdown.specialFees,
        additionalRequestFees,
      },
    };
  }
}
