import axios from "axios";
import {
  Coordinates,
  EnhancedFareEstimateRequest,
  EnhancedFareEstimateResponse,
  RouteDetails,
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
      if (passesThroughCCZ) {
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

      // Add time-based notifications
      const day = requestDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const hour = requestDate.getHours();

      // Check if it's a weekday (Monday-Friday)
      if (day >= 1 && day <= 5) {
        // Peak hours for weekdays
        // Monday-Thursday: Morning Rush (3AM-9AM) and Evening Rush (3PM-9PM)
        // Friday: Morning Rush (3AM-9AM) and Evening Rush (3PM-11:59PM)
        if (day <= 4) {
          // Monday-Thursday
          if ((hour >= 3 && hour < 9) || (hour >= 15 && hour < 21)) {
            notifications.push(
              `Your journey is during peak hours (Weekday). A £3.54 peak time charge has been added.`
            );
          }
        } else {
          // Friday
          if ((hour >= 3 && hour < 9) || (hour >= 15 && hour < 24)) {
            notifications.push(
              `Your journey is during peak hours (Friday evening). A £3.54 peak time charge has been added.`
            );
          }
        }
      } else {
        // Weekend (Saturday and Sunday) - special rates apply
        notifications.push(
          `Your journey is during weekend hours. A £3.00 weekend surcharge has been added.`
        );
      }

      // Add notification for additional stops if any
      if (additionalStops.length > 0) {
        notifications.push(
          `Your journey includes ${additionalStops.length} additional stop${
            additionalStops.length > 1 ? "s" : ""
          }. Additional fees may apply based on vehicle type.`
        );
      }

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
    const day = requestDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = requestDate.getHours();
    let timeSurcharge = 0;

    // Check if it's a weekday (Monday-Friday)
    if (day >= 1 && day <= 5) {
      // Peak hours for weekdays
      // Monday-Thursday: Morning Rush (3AM-9AM) and Evening Rush (3PM-9PM)
      // Friday: Morning Rush (3AM-9AM) and Evening Rush (3PM-11:59PM)
      if (day <= 4) {
        // Monday-Thursday
        if ((hour >= 3 && hour < 9) || (hour >= 15 && hour < 21)) {
          timeSurcharge = 3.54; // Fixed £3.54 additional charge
          console.log(
            `Peak hours (Weekday): Adding £${timeSurcharge.toFixed(
              2
            )} surcharge`
          );
        }
      } else {
        // Friday
        if ((hour >= 3 && hour < 9) || (hour >= 15 && hour < 24)) {
          // Special rates for Friday - using same £3.54 for consistency
          timeSurcharge = 3.54;
          console.log(
            `Peak hours (Friday): Adding £${timeSurcharge.toFixed(2)} surcharge`
          );
        }
      }
    } else {
      // Weekend (Saturday and Sunday) - special rates apply
      // Using a 20% markup for weekend as per documentation example
      timeSurcharge = 3.0;
      console.log(
        `Weekend pricing: Adding £${timeSurcharge.toFixed(2)} surcharge`
      );
    }

    // Add time surcharge to fare
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

    // STEP 4: Add special zone charges
    let totalFare = initialFare;

    // Congestion Charge Zone
    if (passesThroughCCZ && isZoneActive("CONGESTION_CHARGE", requestDate)) {
      const congestionCharge = SPECIAL_ZONES.CONGESTION_CHARGE.fee;
      fareBreakdown.specialFees.push({
        name: "Congestion Charge",
        amount: congestionCharge,
      });
      totalFare += congestionCharge;
      console.log(
        `Congestion Charge Zone fee: £${congestionCharge.toFixed(2)}`
      );
    } else if (passesThroughCCZ) {
      console.log(
        `Route passes through CCZ but outside charging hours - no fee applied`
      );
    }

    // Dartford Crossing
    if (hasDartfordCrossing) {
      const dartfordFee = SPECIAL_ZONES.DARTFORD_CROSSING.fee;
      fareBreakdown.specialFees.push({
        name: "Dartford Crossing Fee",
        amount: dartfordFee,
      });
      totalFare += dartfordFee;
      console.log(`Dartford Crossing fee: £${dartfordFee.toFixed(2)}`);
    }

    // Airport fees - pickup
    if (airports.pickupAirport) {
      const airport = AIRPORTS[airports.pickupAirport as keyof typeof AIRPORTS];
      if (airport) {
        const pickupFee = airport.fees.pickup;
        fareBreakdown.specialFees.push({
          name: `${airport.name} Pickup Fee`,
          amount: pickupFee,
        });
        totalFare += pickupFee;
        console.log(
          `Airport pickup fee (${airport.name}): £${pickupFee.toFixed(2)}`
        );
      }
    }

    // Airport fees - dropoff
    if (airports.dropoffAirport) {
      const airport =
        AIRPORTS[airports.dropoffAirport as keyof typeof AIRPORTS];
      if (airport) {
        const dropoffFee = airport.fees.dropoff;
        fareBreakdown.specialFees.push({
          name: `${airport.name} Dropoff Fee`,
          amount: dropoffFee,
        });
        totalFare += dropoffFee;
        console.log(
          `Airport dropoff fee (${airport.name}): £${dropoffFee.toFixed(2)}`
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

    // Return the price info
    return {
      amount: roundedFare,
      currency: this.DEFAULT_CURRENCY,
      breakdown: fareBreakdown,
    };
  }
}
