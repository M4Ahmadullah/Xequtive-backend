"use strict";
// Special Zones Configuration
// Contains geospatial data for special zones and locations
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPECIAL_ZONES_BY_REGION = exports.SPECIAL_ZONES = exports.AIRPORTS_BY_REGION = exports.AIRPORT_CODES = exports.AIRPORTS = void 0;
exports.isWithinBoundaries = isWithinBoundaries;
exports.isZoneActive = isZoneActive;
exports.getZonesForRoute = getZonesForRoute;
exports.getAirportsNearLocation = getAirportsNearLocation;
exports.isAtAirport = isAtAirport;
// Define the airports
exports.AIRPORTS = {
    // London airports
    HEATHROW: {
        name: "Heathrow Airport",
        code: "LHR",
        boundaries: {
            north: 51.490746,
            south: 51.453873,
            east: -0.414696,
            west: -0.461946,
        },
        fees: {
            pickup: 7.5, // Standard class
            dropoff: 6.0, // Standard class
        },
        region: "London",
    },
    GATWICK: {
        name: "Gatwick Airport",
        code: "LGW",
        boundaries: {
            north: 51.167842,
            south: 51.141653,
            east: -0.156885,
            west: -0.190532,
        },
        fees: {
            pickup: 8.0, // Standard class
            dropoff: 6.0, // Standard class
        },
        region: "London",
    },
    LUTON: {
        name: "Luton Airport",
        code: "LTN",
        boundaries: {
            north: 51.886328,
            south: 51.868648,
            east: -0.360506,
            west: -0.389516,
        },
        fees: {
            pickup: 6.0, // Standard class
            dropoff: 6.0, // Standard class
        },
        region: "London",
    },
    STANSTED: {
        name: "Stansted Airport",
        code: "STN",
        boundaries: {
            north: 51.895683,
            south: 51.875186,
            east: 0.251262,
            west: 0.225384,
        },
        fees: {
            pickup: 10.0, // Standard class
            dropoff: 7.0, // Standard class
        },
        region: "London",
    },
    CITY: {
        name: "London City Airport",
        code: "LCY",
        boundaries: {
            north: 51.508354,
            south: 51.500822,
            east: 0.058022,
            west: 0.042487,
        },
        fees: {
            pickup: 6.5, // Standard class
            dropoff: 0.0, // Standard class
        },
        region: "London",
    },
    // Manchester area airports
    MANCHESTER: {
        name: "Manchester Airport",
        code: "MAN",
        boundaries: {
            north: 53.372,
            south: 53.358,
            east: -2.265,
            west: -2.288,
        },
        fees: {
            pickup: 5.0,
            dropoff: 4.0,
        },
        region: "Manchester",
    },
    LIVERPOOL: {
        name: "Liverpool John Lennon Airport",
        code: "LPL",
        boundaries: {
            north: 53.341,
            south: 53.329,
            east: -2.839,
            west: -2.858,
        },
        fees: {
            pickup: 4.0,
            dropoff: 3.0,
        },
        region: "Manchester",
    },
    // Birmingham area
    BIRMINGHAM: {
        name: "Birmingham Airport",
        code: "BHX",
        boundaries: {
            north: 52.461,
            south: 52.445,
            east: -1.724,
            west: -1.749,
        },
        fees: {
            pickup: 5.0,
            dropoff: 4.0,
        },
        region: "Birmingham",
    },
    // Scotland
    EDINBURGH: {
        name: "Edinburgh Airport",
        code: "EDI",
        boundaries: {
            north: 55.957,
            south: 55.939,
            east: -3.351,
            west: -3.373,
        },
        fees: {
            pickup: 5.0,
            dropoff: 4.0,
        },
        region: "Scotland",
    },
    GLASGOW: {
        name: "Glasgow Airport",
        code: "GLA",
        boundaries: {
            north: 55.876,
            south: 55.858,
            east: -4.416,
            west: -4.44,
        },
        fees: {
            pickup: 4.5,
            dropoff: 3.5,
        },
        region: "Scotland",
    },
    // Wales
    CARDIFF: {
        name: "Cardiff Airport",
        code: "CWL",
        boundaries: {
            north: 51.405,
            south: 51.39,
            east: -3.333,
            west: -3.355,
        },
        fees: {
            pickup: 4.0,
            dropoff: 3.0,
        },
        region: "Wales",
    },
    // Northern Ireland
    BELFAST_INTL: {
        name: "Belfast International Airport",
        code: "BFS",
        boundaries: {
            north: 54.673,
            south: 54.645,
            east: -6.205,
            west: -6.235,
        },
        fees: {
            pickup: 4.0,
            dropoff: 3.0,
        },
        region: "Northern Ireland",
    },
    BELFAST_CITY: {
        name: "George Best Belfast City Airport",
        code: "BHD",
        boundaries: {
            north: 54.623,
            south: 54.61,
            east: -5.865,
            west: -5.885,
        },
        fees: {
            pickup: 4.0,
            dropoff: 3.0,
        },
        region: "Northern Ireland",
    },
    // Other major airports
    BRISTOL: {
        name: "Bristol Airport",
        code: "BRS",
        boundaries: {
            north: 51.391,
            south: 51.377,
            east: -2.71,
            west: -2.728,
        },
        fees: {
            pickup: 4.5,
            dropoff: 3.5,
        },
        region: "Other",
    },
    EAST_MIDLANDS: {
        name: "East Midlands Airport",
        code: "EMA",
        boundaries: {
            north: 52.84,
            south: 52.825,
            east: -1.318,
            west: -1.338,
        },
        fees: {
            pickup: 4.0,
            dropoff: 3.0,
        },
        region: "Other",
    },
    NEWCASTLE: {
        name: "Newcastle Airport",
        code: "NCL",
        boundaries: {
            north: 55.045,
            south: 55.032,
            east: -1.685,
            west: -1.71,
        },
        fees: {
            pickup: 4.0,
            dropoff: 3.0,
        },
        region: "Other",
    },
};
// Extract airport codes for easy iteration
exports.AIRPORT_CODES = Object.keys(exports.AIRPORTS);
// Group airports by region for easier filtering
exports.AIRPORTS_BY_REGION = Object.values(exports.AIRPORTS).reduce((acc, airport) => {
    const region = airport.region || "Other";
    if (!acc[region]) {
        acc[region] = [];
    }
    acc[region].push(airport.code);
    return acc;
}, {});
// Define special zones
exports.SPECIAL_ZONES = {
    // London zones
    CONGESTION_CHARGE: {
        name: "London Congestion Charge Zone",
        boundaries: {
            north: 51.530918,
            south: 51.498929,
            east: -0.080392,
            west: -0.144839,
        },
        fee: 7.5,
        operatingHours: {
            days: [1, 2, 3, 4, 5], // Monday to Friday
            startHour: 7, // 7am
            endHour: 18, // 6pm
        },
        exemptions: {
            vehicles: ["electric", "hybrid"],
        },
        region: "London",
    },
    ULEZ: {
        name: "London Ultra Low Emission Zone",
        boundaries: {
            north: 51.530918,
            south: 51.498929,
            east: -0.080392,
            west: -0.144839,
        },
        fee: 12.5,
        exemptions: {
            vehicles: ["electric", "euro6-diesel", "euro4-petrol"],
        },
        region: "London",
    },
    DARTFORD_CROSSING: {
        name: "Dartford Crossing",
        boundaries: {
            north: 51.47544,
            south: 51.457114,
            east: 0.27271,
            west: 0.247647,
        },
        fee: 4.0,
        region: "London",
    },
    // Manchester zones
    MANCHESTER_CLEAN_AIR: {
        name: "Manchester Clean Air Zone",
        boundaries: {
            north: 53.51,
            south: 53.39,
            east: -2.15,
            west: -2.32,
        },
        fee: 8.0,
        exemptions: {
            vehicles: ["electric", "euro6-diesel", "euro4-petrol"],
        },
        region: "Manchester",
    },
    // Birmingham zones
    BIRMINGHAM_CLEAN_AIR: {
        name: "Birmingham Clean Air Zone",
        boundaries: {
            north: 52.49,
            south: 52.465,
            east: -1.875,
            west: -1.92,
        },
        fee: 8.0,
        exemptions: {
            vehicles: ["electric", "euro6-diesel", "euro4-petrol"],
        },
        region: "Birmingham",
    },
    // Other major toll roads/bridges
    MERSEY_GATEWAY: {
        name: "Mersey Gateway Bridge",
        boundaries: {
            north: 53.37,
            south: 53.35,
            east: -2.73,
            west: -2.76,
        },
        fee: 2.0,
        region: "Manchester",
    },
    SEVERN_BRIDGE: {
        name: "Severn Bridge",
        boundaries: {
            north: 51.625,
            south: 51.605,
            east: -2.635,
            west: -2.655,
        },
        fee: 5.5,
        region: "Wales",
    },
    M6_TOLL: {
        name: "M6 Toll Road",
        boundaries: {
            north: 52.689,
            south: 52.556,
            east: -1.691,
            west: -2.004,
        },
        fee: 6.9,
        region: "Birmingham",
    },
};
// Group special zones by region
exports.SPECIAL_ZONES_BY_REGION = Object.entries(exports.SPECIAL_ZONES).reduce((acc, [key, zone]) => {
    const region = zone.region || "Other";
    if (!acc[region]) {
        acc[region] = [];
    }
    acc[region].push(key);
    return acc;
}, {});
/**
 * Check if coordinates are within a boundary
 * @param lat Latitude
 * @param lng Longitude
 * @param boundary Boundary object
 * @returns Boolean indicating if coordinates are within boundary
 */
function isWithinBoundaries(lat, lng, boundary) {
    return (lat <= boundary.north &&
        lat >= boundary.south &&
        lng >= boundary.west &&
        lng <= boundary.east);
}
/**
 * Check if a special zone is active at a given time
 * @param zoneKey The key of the special zone in SPECIAL_ZONES
 * @param datetime The date and time to check
 * @returns Boolean indicating if the zone is active
 */
function isZoneActive(zoneKey, datetime) {
    const zone = exports.SPECIAL_ZONES[zoneKey];
    if (!zone || !zone.operatingHours)
        return true; // Default to active if no operating hours defined
    const { days, startHour, endHour } = zone.operatingHours;
    const day = datetime.getDay();
    const hour = datetime.getHours();
    // Check if the current day is in the active days
    const isDayActive = days.includes(day);
    // Check if the current hour is within operating hours
    const isHourActive = hour >= startHour && hour < endHour;
    return isDayActive && isHourActive;
}
/**
 * Get all zones that a route passes through
 * @param routeLegs The legs of the route with coordinates
 * @param regionFilter Optional region to filter zones by
 * @returns Array of zone keys that the route passes through
 */
function getZonesForRoute(routeLegs, regionFilter) {
    const matchingZones = [];
    // Get zones to check, filtered by region if specified
    const zonesToCheck = regionFilter
        ? exports.SPECIAL_ZONES_BY_REGION[regionFilter] || []
        : Object.keys(exports.SPECIAL_ZONES);
    for (const zoneKey of zonesToCheck) {
        const zone = exports.SPECIAL_ZONES[zoneKey];
        // Check each leg of the route
        for (const leg of routeLegs) {
            let routePassesThroughZone = false;
            for (const step of leg.steps) {
                const coordinates = step.geometry.coordinates;
                for (const [lng, lat] of coordinates) {
                    if (isWithinBoundaries(lat, lng, zone.boundaries)) {
                        routePassesThroughZone = true;
                        break;
                    }
                }
                if (routePassesThroughZone)
                    break;
            }
            if (routePassesThroughZone) {
                matchingZones.push(zoneKey);
                break; // No need to check other legs
            }
        }
    }
    return matchingZones;
}
/**
 * Get all airports near a location
 * @param location The coordinates to check
 * @param regionFilter Optional region to filter airports by
 * @returns Array of airport codes near the location
 */
function getAirportsNearLocation(location, regionFilter) {
    const matchingAirports = [];
    // Get airports to check, filtered by region if specified
    const airportsToCheck = regionFilter
        ? exports.AIRPORTS_BY_REGION[regionFilter] || []
        : exports.AIRPORT_CODES;
    for (const airportCode of airportsToCheck) {
        if (isAtAirport(location, airportCode)) {
            matchingAirports.push(airportCode);
        }
    }
    return matchingAirports;
}
/**
 * Check if a location is at a specific airport
 * @param location The coordinates to check
 * @param airportCode The airport code to check
 * @returns Boolean indicating if the location is at the airport
 */
function isAtAirport(location, airportCode) {
    try {
        const airport = exports.AIRPORTS[airportCode];
        if (!airport)
            return false;
        const { lat, lng } = location;
        return isWithinBoundaries(lat, lng, airport.boundaries);
    }
    catch (error) {
        console.error(`Error checking if location is at ${airportCode}:`, error);
        return false; // Default to false on error
    }
}
