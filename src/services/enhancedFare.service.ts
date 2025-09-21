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
import { getTimeMultiplier, getTimeSurcharge, timeSurcharges } from "../config/timePricing";
import { isRouteServiceable, EQUIPMENT_FEES } from "../config/serviceArea";
import { MapboxDistanceService } from "./mapboxDistance.service";

export class EnhancedFareService {
  // Default currency
  private static readonly DEFAULT_CURRENCY = "GBP";
  
  /**
   * Geocode an address to get coordinates using Mapbox Geocoding API
   */
  private static async geocodeAddress(address: string): Promise<Coordinates> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${env.mapbox.token}&country=GB&limit=1`;
      
      const response = await axios.get(url);
      
      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        const [lng, lat] = feature.center;
        
        return { lat, lng };
      } else {
        throw new Error(`No coordinates found for address: ${address}`);
      }
    } catch (error) {
      console.error(`Geocoding failed for address: ${address}`, error);
      throw new Error(`Failed to geocode address: ${address}`);
    }
  }

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
      let additionalStops: { location: Coordinates; address?: string }[] = [];
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
        
        // Check booking type first to determine dropoff requirements
        if (request.bookingType === "hourly") {
          // For hourly bookings, dropoff location is optional
          dropoffLocation = request.locations.dropoff?.coordinates || pickupLocation;
        } else {
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
          const locationsWithStops = request.locations as any;
          if (locationsWithStops.stops && locationsWithStops.stops.length > 0) {
            // Geocode each stop address to get coordinates
            for (const stopAddress of locationsWithStops.stops) {
              try {
                const stopCoordinates = await this.geocodeAddress(stopAddress);
                additionalStops.push({
                  location: stopCoordinates,
                  address: stopAddress
                });
              } catch (error) {
                console.error(`❌ Failed to geocode stop: ${stopAddress}`, error);
                // Continue with other stops even if one fails
              }
            }
          }
          
          if (request.locations.additionalStops && request.locations.additionalStops.length > 0) {
            additionalStops = request.locations.additionalStops.map(
              (stop) => ({
                location: stop.coordinates,
                address: stop.address
              })
            );
          }
        }
        
        requestDate = request.datetime
          ? new Date(`${request.datetime.date}T${request.datetime.time}:00`)
          : new Date();

      } else {
        throw new Error("Invalid request format - missing location data");
      }

      // Check if the route is within our service area
      if (request.bookingType === "hourly") {
        // For hourly bookings, only check pickup location
        const serviceAreaCheck = isRouteServiceable(
          pickupLocation,
          pickupLocation // Same location for pickup and dropoff
        );
        
        if (!serviceAreaCheck.serviceable) {
          const error = new Error(
            serviceAreaCheck.message || "Pickup location is outside our service area"
          );
          Object.assign(error, {
            code: "LOCATION_NOT_SERVICEABLE",
            details: serviceAreaCheck.message,
          });
          throw error;
        }
      } else {
        // For one-way and return bookings, check the full route
        const serviceAreaCheck = isRouteServiceable(
          pickupLocation,
          dropoffLocation
        );
        
        if (!serviceAreaCheck.serviceable) {
          const error = new Error(
            serviceAreaCheck.message || "Location is outside our service area"
          );
          Object.assign(error, {
            code: "LOCATION_NOT_SERVICEABLE",
            details: serviceAreaCheck.message,
          });
          throw error;
        }
      }

      // For hourly bookings, we don't need distance/duration calculation
      let distance: number;
      let duration: number;
      
      if (request.bookingType === "hourly") {
        // Hourly bookings: distance = 0, duration = hours * 60
        distance = 0;
        duration = (request.hours || 3) * 60; // Convert hours to minutes
      } else {
        // One-way and return bookings: calculate actual distance and duration
        if (request.bookingType === "return") {
          // For return bookings, calculate outbound distance and double it (smart reverse route)
          const waypoints = additionalStops.map((stop) => `${stop.location.lat},${stop.location.lng}`);
          
          const outboundRoute = await MapboxDistanceService.getDistance(
            `${pickupLocation.lat},${pickupLocation.lng}`,
            `${dropoffLocation.lat},${dropoffLocation.lng}`,
            waypoints
          );

          // Return journey will follow reverse route, so double the distance
          distance = outboundRoute.distance * 2;
          duration = outboundRoute.duration * 2;
        } else {
          // One-way bookings: calculate actual distance and duration
          const waypoints = additionalStops.map((stop) => `${stop.location.lat},${stop.location.lng}`);
          
          const routeDetails = await MapboxDistanceService.getDistance(
            `${pickupLocation.lat},${pickupLocation.lng}`,
            `${dropoffLocation.lat},${dropoffLocation.lng}`,
            waypoints
          );

          // Distance is already in miles from the new API
          distance = routeDetails.distance;
          // Duration is already in minutes from the new API
          duration = routeDetails.duration;
        }
      }



      // Since we're using Mapbox Directions API, we don't have detailed leg information
      // For airport detection, we'll use the pickup and dropoff locations directly
      const specialZones: string[] = [];

      // Check if specific zones are present
      const passesThroughCCZ = specialZones.includes("CONGESTION_CHARGE");
      const hasDartfordCrossing = specialZones.includes("DARTFORD_CROSSING");
      const hasBlackwellSilverstoneTunnel = specialZones.includes("BLACKWELL_SILVERSTONE_TUNNEL");

      // Check for airports
      const airportsPickup = getAirportsNearLocation(pickupLocation);
      
      // For hourly bookings, only check pickup location for airports (no dropoff)
      let airportsDropoff: string[] = [];
      if (request.bookingType !== "hourly") {
        airportsDropoff = getAirportsNearLocation(dropoffLocation);
      }

      const airports = {
        pickupAirport: airportsPickup.length > 0 ? airportsPickup[0] : null,
        dropoffAirport: airportsDropoff.length > 0 ? airportsDropoff[0] : null,
      };



      // Compile special location notifications
      const notifications = [];

      // Airport notifications with actual charges
      if (airports.pickupAirport) {
        const airport =
          AIRPORTS[airports.pickupAirport as keyof typeof AIRPORTS];
        if (airport) {
          notifications.push(
            `Airport pickup at ${airport.name}: £${airport.fees.pickup.toFixed(2)} fee applied`
          );
        }
      }

      // For hourly bookings, only show pickup airport notifications (no dropoff)
      if (request.bookingType !== "hourly" && airports.dropoffAirport) {
        const airport =
          AIRPORTS[airports.dropoffAirport as keyof typeof AIRPORTS];
        if (airport) {
          notifications.push(
            `Airport dropoff at ${airport.name}: £${airport.fees.dropoff.toFixed(2)} fee applied`
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
        // No discount for return bookings (removed 10% discount)
        returnDiscount = 0.0;
        baseMultiplier = 1.0; // Distance is calculated for one leg, then doubled
      } else if (bookingType === "hourly") {
        // For hourly bookings, we'll use the same pricing structure but calculate based on hours
        const hours = request.hours || 3;
        if (hours < 3 || hours > 24) {
          throw new Error("Hourly bookings must be between 3 and 24 hours");
        }
        // Hourly rate will be calculated per vehicle type
      }

      // Calculate fare for each vehicle type
      const allVehicleTypes = Object.values(vehicleTypes);
      const vehicleOptions: VehicleOption[] = [];

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
        });

        // Return vehicle option with calculated price
        const vehicleOption: any = {
          id: vehicleType.id,
          name: vehicleType.name,
          description: vehicleType.description,
          capacity: vehicleType.capacity,
          imageUrl: vehicleType.imageUrl || "",
          eta: Math.floor(Math.random() * 10) + 5, // Random ETA between 5-15 minutes
          price: priceInfo,
        };

        // Add hourly rate for hourly bookings
        if (request.bookingType === "hourly" && request.hours && request.hours > 0) {
          vehicleOption.hourlyRate = vehicleType.waitingRatePerHour;
        }

        vehicleOptions.push(vehicleOption);
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
    } catch (error) {
      console.error("Error calculating enhanced fares:", error);
      throw new Error("Failed to calculate enhanced fare estimates");
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
    hasBlackwellSilverstoneTunnel,
    serviceZones,
    passengers,
    bookingType = "one-way",
    hours = 0,
    returnDiscount = 0.0,
  }: {
    vehicleType: VehicleType;
    distance: number;
    duration: number;
    additionalStops: number;
    requestDate: Date;
    airports: { pickupAirport?: string; dropoffAirport?: string };
    passesThroughCCZ: boolean;
    hasDartfordCrossing: boolean;
    hasBlackwellSilverstoneTunnel: boolean;
    serviceZones: string[];
    passengers?: BookingPassengersData;
    bookingType?: string;
    hours?: number;
    returnDiscount?: number;
  }): VehiclePriceInfo {

    console.log(`🚗 Enhanced Fare Calculation for ${vehicleType.name}:`);
    console.log(`   Distance: ${distance.toFixed(1)} miles`);
    console.log(`   Duration: ${duration} minutes`);
    console.log(`   Booking Type: ${bookingType}`);
    console.log(`   Additional Stops: ${additionalStops}`);
    console.log(`   Hours: ${hours}`);
    console.log(`   ${'='.repeat(50)}`);


    // Array to collect messages for this vehicle type
    const messages: string[] = [];

    // Calculate distance charge using slab-based system
    const distanceCharge = this.calculateSlabBasedDistanceFare(vehicleType, distance);
    console.log(`   📏 Distance Charge: £${distanceCharge.toFixed(2)} (${distance.toFixed(1)} miles)`);

    // Calculate additional stops charge
    const stopCharge = additionalStops * vehicleType.additionalStopFee;
    console.log(`   🛑 Stop Charge: £${stopCharge.toFixed(2)} (${additionalStops} stops)`);

    // Calculate base fare (distance + stops)
    const baseFare = distanceCharge + stopCharge;
    console.log(`   💰 Base Fare: £${baseFare.toFixed(2)} (distance + stops)`);

    // Apply minimum fare rule - IMPORTANT: Only use minimum fare if base fare is less than minimum
    let totalFare;
    if (baseFare < vehicleType.minimumFare) {
      totalFare = vehicleType.minimumFare;
      console.log(`   ⬆️  Minimum Fare Applied: £${vehicleType.minimumFare.toFixed(2)} (was £${baseFare.toFixed(2)})`);
    } else {
      totalFare = baseFare;
      console.log(`   ✅ Base Fare Used: £${totalFare.toFixed(2)}`);
    }

    // Time surcharge - REMOVED (only keeping airport fees)
    const timeSurcharge = 0; // No time surcharge applied
    totalFare += timeSurcharge;

    // Airport fees
    let airportFee = 0;
    if (airports.pickupAirport) {
      const airport = AIRPORTS[airports.pickupAirport as keyof typeof AIRPORTS];
      if (airport) {
        airportFee += airport.fees.pickup;
        console.log(`   ✈️  Airport Pickup Fee: £${airport.fees.pickup.toFixed(2)} (${airport.name})`);
        messages.push(`Airport pickup fee (${airport.name}): £${airport.fees.pickup.toFixed(2)}`);
      }
    }
    
    // For hourly bookings, only apply pickup airport fees (no dropoff fees)
    if (bookingType !== "hourly" && airports.dropoffAirport) {
      const airport = AIRPORTS[airports.dropoffAirport as keyof typeof AIRPORTS];
      if (airport) {
        airportFee += airport.fees.dropoff;
        console.log(`   ✈️  Airport Dropoff Fee: £${airport.fees.dropoff.toFixed(2)} (${airport.name})`);
        messages.push(`Airport dropoff fee (${airport.name}): £${airport.fees.dropoff.toFixed(2)}`);
      }
    }
    totalFare += airportFee;
    console.log(`   ✈️  Total Airport Fees: £${airportFee.toFixed(2)}`);

    // Special zone fees - REMOVED (only keeping airport fees)
    let specialZoneFees = 0;
    // All special zone charges removed except airport fees
    // This includes: congestion charge, dartford crossing, tunnel fees
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
    } else if (bookingType === "return") {
      // For return bookings, double only the distance charge (not total fare)
      const returnDistanceCharge = distanceCharge;
      totalFare += returnDistanceCharge;
      console.log(`   🔄 Return Distance Charge: £${returnDistanceCharge.toFixed(2)} (doubled)`);
      
      // Add return booking messages
      messages.push("Return journey: Scheduled return on specified date/time");
      messages.push("Return route: Smart reverse of outbound journey");
      messages.push("Return journey: Distance doubled (outbound + reverse route)");
    }

    // Time surcharge messages - REMOVED (no time surcharge applied)

    // Add additional stops message if applicable
    if (additionalStops > 0) {
      if (bookingType === "return") {
        messages.push(`Additional stops (${additionalStops}): £${stopCharge.toFixed(2)} (applied to outbound journey)`);
        messages.push(`Return journey will reverse the outbound route with stops`);
      } else {
        messages.push(`Additional stops (${additionalStops}): £${stopCharge.toFixed(2)}`);
      }
    }

    // Equipment charges - REMOVED (only keeping airport fees)
    let equipmentFees = 0;
    // All equipment charges removed except airport fees
    // This includes: baby seats, child seats, booster seats, wheelchairs
    totalFare += equipmentFees;

    console.log(`   💵 Total Fare Before Rounding: £${totalFare.toFixed(2)}`);
    
    // Round to nearest £5 for easier cash payments
    // 90.1 - 92.00 <= £90
    // 92.01 - 94.99 = £95
    const roundedFare = this.roundToNearestFive(totalFare);
    console.log(`   💰 Final Fare (rounded to nearest £5): £${roundedFare.toFixed(2)}`);
    console.log(`   📊 Rounding: £${totalFare.toFixed(2)} → £${roundedFare.toFixed(2)}`);
    console.log(`   ${'='.repeat(50)}`);
    console.log(''); // Empty line for better separation

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
  private static calculateSlabBasedDistanceFare(vehicleType: VehicleType, distance: number): number {
    const rates = vehicleType.perMileRates;
    let ratePerMile = 0;
    let rangeDescription = '';

    // Determine which rate applies based on total distance
    if (distance <= 4) {
      ratePerMile = rates['0-4'];
      rangeDescription = '0-4 miles';
    } else if (distance <= 10) {
      ratePerMile = rates['4.1-10'];
      rangeDescription = '4.1-10 miles';
    } else if (distance <= 15) {
      ratePerMile = rates['10.1-15'];
      rangeDescription = '10.1-15 miles';
    } else if (distance <= 20) {
      ratePerMile = rates['15.1-20'];
      rangeDescription = '15.1-20 miles';
    } else if (distance <= 30) {
      ratePerMile = rates['20.1-30'];
      rangeDescription = '20.1-30 miles';
    } else if (distance <= 40) {
      ratePerMile = rates['30.1-40'];
      rangeDescription = '30.1-40 miles';
    } else if (distance <= 50) {
      ratePerMile = rates['41.1-50'];
      rangeDescription = '41.1-50 miles';
    } else if (distance <= 60) {
      ratePerMile = rates['51.1-60'];
      rangeDescription = '51.1-60 miles';
    } else if (distance <= 80) {
      ratePerMile = rates['61.1-80'];
      rangeDescription = '61.1-80 miles';
    } else if (distance <= 150) {
      ratePerMile = rates['80.1-150'];
      rangeDescription = '80.1-150 miles';
    } else if (distance <= 300) {
      ratePerMile = rates['150.1-300'];
      rangeDescription = '150.1-300 miles';
    } else {
      ratePerMile = rates['300+'];
      rangeDescription = '300+ miles (Long Trip Discount)';
    }

    const totalCharge = distance * ratePerMile;

    return totalCharge;
  }

  /**
   * Calculate time-based surcharge
   */
  private static calculateTimeSurcharge(date: Date, vehicleTypeId: string): number {
    const day = date.getDay();
    const hours = date.getHours();

    // Map vehicle type IDs to surcharge keys
    const vehicleMap: { [key: string]: string } = {
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
    } else if (hours >= 15) {
      period = 'peakHigh';
    }

    // Get surcharge from timeSurcharges configuration
    const timeCategory = isWeekend ? 'weekends' : 'weekdays';
    const timePeriod = timeSurcharges[timeCategory][period as keyof typeof timeSurcharges.weekdays];
    
    return timePeriod?.surcharges[mappedVehicleType] || 0;
  }

  /**
   * Round fare to nearest £5 for easier cash payments
   * 90.1 - 92.00 <= £90
   * 92.01 - 94.99 = £95
   */
  private static roundToNearestFive(amount: number): number {
    // Round to nearest 5
    const rounded = Math.round(amount / 5) * 5;
    
    // Ensure minimum fare is respected
    return Math.max(rounded, 5); // Minimum £5 fare
  }

  /**
   * Get hourly rate for a vehicle type based on hours
   */
  private static getHourlyRate(vehicleType: VehicleType, hours: number): number {
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
    
    return hourlyRates[vehicleId as keyof typeof hourlyRates]?.[rateKey] || 30.00;
  }
}
