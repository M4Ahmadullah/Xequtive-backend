import { Coordinates } from "../types";

/**
 * Interface for a polygon-based excluded area
 */
interface PolygonExcludedArea {
  name: string;
  polygon: Coordinates[];
  message: string;
}

/**
 * Interface for a radius-based excluded area
 */
interface RadiusExcludedArea {
  name: string;
  center: Coordinates;
  radius: number; // in km
  message: string;
}

/**
 * Type for excluded areas - either polygon or radius based
 */
type ExcludedArea = PolygonExcludedArea | RadiusExcludedArea;

/**
 * Interface for a serviced island
 */
interface ServicedIsland {
  name: string;
  center: Coordinates;
  radius: number; // in km
}

/**
 * Service area boundaries for the United Kingdom
 */
export const UK_BOUNDARIES = {
  // Bounding box for mainland UK
  southwest: { lat: 49.9, lng: -8.65 }, // Southwest corner
  northeast: { lat: 58.7, lng: 1.76 }, // Northeast corner
};

/**
 * List of major islands we service
 */
export const SERVICED_ISLANDS: ServicedIsland[] = [
  {
    name: "Isle of Wight",
    center: { lat: 50.67, lng: -1.31 },
    radius: 15, // km
  },
  {
    name: "Anglesey",
    center: { lat: 53.27, lng: -4.32 },
    radius: 20, // km
  },
];

/**
 * Excluded areas that we do not service
 */
export const EXCLUDED_AREAS: ExcludedArea[] = [
  {
    name: "Northern Scotland Highlands",
    polygon: [
      { lat: 57.5, lng: -6.0 },
      { lat: 58.7, lng: -5.0 },
      { lat: 58.7, lng: -3.0 },
      { lat: 57.5, lng: -2.8 },
      { lat: 57.2, lng: -4.5 },
    ],
    message:
      "We don't currently service the remote Scottish Highlands. Please select a location further south.",
  },
  {
    name: "Outer Hebrides",
    center: { lat: 57.76, lng: -7.01 },
    radius: 60, // km
    message: "We don't currently service the Outer Hebrides islands.",
  },
  {
    name: "Orkney Islands",
    center: { lat: 59.0, lng: -3.0 },
    radius: 50, // km
    message: "We don't currently service the Orkney Islands.",
  },
  {
    name: "Shetland Islands",
    center: { lat: 60.5, lng: -1.2 },
    radius: 80, // km
    message: "We don't currently service the Shetland Islands.",
  },
];

/**
 * Maximum service distance in miles
 * We don't support journeys longer than this distance
 */
export const MAX_SERVICE_DISTANCE = 300; // miles

/**
 * Equipment fees for additional passenger requirements
 */
export const EQUIPMENT_FEES = {
  BABY_SEAT: 5.00,     // Fee for baby seat
  CHILD_SEAT: 7.50,    // Fee for child seat
  BOOSTER_SEAT: 5.50,  // Fee for booster seat
  WHEELCHAIR: 10.00,   // Fee for wheelchair accommodation
};

/**
 * Check if a location is within the UK service area
 * @param location - The coordinates to check
 * @returns True if the location is within UK boundaries
 */
export function isLocationInUK(location: Coordinates): boolean {
  return (
    location.lat >= UK_BOUNDARIES.southwest.lat &&
    location.lat <= UK_BOUNDARIES.northeast.lat &&
    location.lng >= UK_BOUNDARIES.southwest.lng &&
    location.lng <= UK_BOUNDARIES.northeast.lng
  );
}

/**
 * Check if a location is in an excluded area
 * @param location - The coordinates to check
 * @returns An object with the excluded status and a message if in excluded area
 */
export function isLocationInExcludedArea(location: Coordinates): {
  excluded: boolean;
  message?: string;
} {
  // Check polygon-based exclusion zones
  for (const area of EXCLUDED_AREAS) {
    if ("polygon" in area) {
      // This is a polygon-based area
      if (isPointInPolygon(location, area.polygon)) {
        return { excluded: true, message: area.message };
      }
    } else if ("center" in area && "radius" in area) {
      // This is a radius-based area
      const distance = getDistanceFromLatLonInKm(
        location.lat,
        location.lng,
        area.center.lat,
        area.center.lng
      );
      if (distance <= area.radius) {
        return { excluded: true, message: area.message };
      }
    }
  }

  return { excluded: false };
}

/**
 * Check if a location is within our service area
 * @param location - The coordinates to check
 * @returns An object with the serviceable status and a message if not serviceable
 */
export function isLocationServiceable(location: Coordinates): {
  serviceable: boolean;
  message?: string;
} {
  // First, check if location is in the UK
  if (!isLocationInUK(location)) {
    return {
      serviceable: false,
      message: "We currently only service locations within the United Kingdom.",
    };
  }

  // Then check if it's in an excluded area
  const excludedCheck = isLocationInExcludedArea(location);
  if (excludedCheck.excluded) {
    return { serviceable: false, message: excludedCheck.message };
  }

  // Check service islands - if not on mainland, check if it's on a serviced island
  // This is a simplified check assuming the main UK polygon is a rectangle
  const isMainlandUK =
    location.lat >= UK_BOUNDARIES.southwest.lat &&
    location.lat <= UK_BOUNDARIES.northeast.lat &&
    location.lng >= UK_BOUNDARIES.southwest.lng &&
    location.lng <= UK_BOUNDARIES.northeast.lng;

  if (!isMainlandUK) {
    // Check if it's on a serviced island
    for (const island of SERVICED_ISLANDS) {
      const distance = getDistanceFromLatLonInKm(
        location.lat,
        location.lng,
        island.center.lat,
        island.center.lng
      );
      if (distance <= island.radius) {
        return { serviceable: true };
      }
    }

    return {
      serviceable: false,
      message:
        "We don't currently service this location. Please select a location on the UK mainland or a major island.",
    };
  }

  // If we got here, the location is serviceable
  return { serviceable: true };
}

/**
 * Check if a route can be serviced based on distance and location serviceability
 * @param pickup - The pickup coordinates
 * @param dropoff - The dropoff coordinates
 * @param distance_miles - Optional distance in miles to check against maximum service distance
 * @returns An object with the serviceable status and a message if not serviceable
 */
export function isRouteServiceable(
  pickup: Coordinates,
  dropoff: Coordinates,
  distance_miles?: number
): { serviceable: boolean; message?: string } {
  // First check if both locations are serviceable
  const pickupCheck = isLocationServiceable(pickup);
  if (!pickupCheck.serviceable) {
    return {
      serviceable: false,
      message: `Pickup location: ${pickupCheck.message}`,
    };
  }

  const dropoffCheck = isLocationServiceable(dropoff);
  if (!dropoffCheck.serviceable) {
    return {
      serviceable: false,
      message: `Dropoff location: ${dropoffCheck.message}`,
    };
  }

  // If we have the distance, check if it's within our max service distance
  if (distance_miles !== undefined && distance_miles > MAX_SERVICE_DISTANCE) {
    return {
      serviceable: false,
      message: `We don't currently support journeys longer than ${MAX_SERVICE_DISTANCE} miles. Your journey is approximately ${Math.round(
        distance_miles
      )} miles.`,
    };
  }

  return { serviceable: true };
}

/* Helper functions */

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param point - The point to check
 * @param polygon - The polygon to check against
 * @returns True if the point is inside the polygon
 */
function isPointInPolygon(point: Coordinates, polygon: Coordinates[]): boolean {
  const x = point.lat;
  const y = point.lng;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate distance between two coordinates in kilometers using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

/**
 * Convert degrees to radians
 * @param deg - Degrees to convert
 * @returns Value in radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
