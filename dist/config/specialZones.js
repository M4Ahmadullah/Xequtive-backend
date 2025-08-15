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
            north: 51.500,
            south: 51.445,
            east: -0.405,
            west: -0.500, // Extended to include all terminals
        },
        fees: {
            pickup: 7.5, // Standard vehicles (30-min wait)
            dropoff: 6.0,
        },
        region: "London",
    },
    GATWICK: {
        name: "Gatwick Airport",
        code: "LGW",
        boundaries: {
            north: 51.175,
            south: 51.135,
            east: -0.145,
            west: -0.205, // Extended boundaries
        },
        fees: {
            pickup: 10.0, // Standard vehicles (30-min wait)
            dropoff: 7.0,
        },
        region: "London",
    },
    LUTON: {
        name: "Luton Airport",
        code: "LTN",
        boundaries: {
            north: 51.895,
            south: 51.860,
            east: -0.350,
            west: -0.400, // Extended boundaries
        },
        fees: {
            pickup: 11.0, // Standard vehicles (30-min wait)
            dropoff: 6.0,
        },
        region: "London",
    },
    STANSTED: {
        name: "Stansted Airport",
        code: "STN",
        boundaries: {
            north: 51.905,
            south: 51.865,
            east: 0.265,
            west: 0.215, // Extended boundaries
        },
        fees: {
            pickup: 10.0, // Standard vehicles (30-min wait)
            dropoff: 7.0,
        },
        region: "London",
    },
    CITY: {
        name: "London City Airport",
        code: "LCY",
        boundaries: {
            north: 51.515,
            south: 51.495,
            east: 0.070,
            west: 0.035, // Extended boundaries
        },
        fees: {
            pickup: 6.90, // Standard vehicles (30-min wait)
            dropoff: 0.0, // FREE
        },
        region: "London",
    },
    MANCHESTER: {
        name: "Manchester Airport",
        code: "MAN",
        boundaries: {
            north: 53.380,
            south: 53.350,
            east: -2.255,
            west: -2.295, // Extended boundaries
        },
        fees: {
            pickup: 8.0,
            dropoff: 8.0,
        },
        region: "Manchester",
    },
    LIVERPOOL: {
        name: "Liverpool John Lennon Airport",
        code: "LPL",
        boundaries: {
            north: 53.350,
            south: 53.320,
            east: -2.830,
            west: -2.870, // Extended boundaries
        },
        fees: {
            pickup: 7.0,
            dropoff: 7.0,
        },
        region: "Manchester",
    },
    BIRMINGHAM: {
        name: "Birmingham Airport",
        code: "BHX",
        boundaries: {
            north: 52.470,
            south: 52.435,
            east: -1.715,
            west: -1.760, // Extended boundaries
        },
        fees: {
            pickup: 9.50, // Standard vehicles (30-min wait)
            dropoff: 6.0,
        },
        region: "Birmingham",
    },
    EDINBURGH: {
        name: "Edinburgh Airport",
        code: "EDI",
        boundaries: {
            north: 55.965,
            south: 55.930,
            east: -3.340,
            west: -3.385, // Extended boundaries
        },
        fees: {
            pickup: 8.0,
            dropoff: 8.0,
        },
        region: "Scotland",
    },
    GLASGOW: {
        name: "Glasgow Airport",
        code: "GLA",
        boundaries: {
            north: 55.885,
            south: 55.850,
            east: -4.405,
            west: -4.455, // Extended boundaries
        },
        fees: {
            pickup: 8.0,
            dropoff: 8.0,
        },
        region: "Scotland",
    },
    CARDIFF: {
        name: "Cardiff Airport",
        code: "CWL",
        boundaries: {
            north: 51.415,
            south: 51.380,
            east: -3.320,
            west: -3.370, // Extended boundaries
        },
        fees: {
            pickup: 7.0,
            dropoff: 7.0,
        },
        region: "Wales",
    },
    BELFAST_INTL: {
        name: "Belfast International Airport",
        code: "BFS",
        boundaries: {
            north: 54.685,
            south: 54.635,
            east: -6.190,
            west: -6.250, // Extended boundaries
        },
        fees: {
            pickup: 8.0,
            dropoff: 8.0,
        },
        region: "Northern Ireland",
    },
    BELFAST_CITY: {
        name: "George Best Belfast City Airport",
        code: "BHD",
        boundaries: {
            north: 54.635,
            south: 54.600,
            east: -5.850,
            west: -5.900, // Extended boundaries
        },
        fees: {
            pickup: 7.5,
            dropoff: 7.5,
        },
        region: "Northern Ireland",
    },
    BRISTOL: {
        name: "Bristol Airport",
        code: "BRS",
        boundaries: {
            north: 51.400,
            south: 51.365,
            east: -2.700,
            west: -2.740, // Extended boundaries
        },
        fees: {
            pickup: 7.0,
            dropoff: 7.0,
        },
        region: "Other",
    },
    EAST_MIDLANDS: {
        name: "East Midlands Airport",
        code: "EMA",
        boundaries: {
            north: 52.850,
            south: 52.815,
            east: -1.305,
            west: -1.350, // Extended boundaries
        },
        fees: {
            pickup: 7.5,
            dropoff: 7.5,
        },
        region: "Birmingham",
    },
    NEWCASTLE: {
        name: "Newcastle Airport",
        code: "NCL",
        boundaries: {
            north: 55.055,
            south: 55.020,
            east: -1.670,
            west: -1.725, // Extended boundaries
        },
        fees: {
            pickup: 7.5,
            dropoff: 7.5,
        },
        region: "Other",
    },
};
// Extract airport codes for easy iteration
exports.AIRPORT_CODES = Object.keys(exports.AIRPORTS);
// Airports grouped by region for efficient lookup
exports.AIRPORTS_BY_REGION = {
    London: ["HEATHROW", "GATWICK", "LUTON", "STANSTED", "CITY"],
    Manchester: ["MANCHESTER", "LIVERPOOL"],
    Birmingham: ["BIRMINGHAM", "EAST_MIDLANDS"],
    Scotland: ["EDINBURGH", "GLASGOW"],
    Wales: ["CARDIFF"],
    "Northern Ireland": ["BELFAST_INTL", "BELFAST_CITY"],
    Other: ["BRISTOL", "NEWCASTLE"],
};
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
        fee: 2.5, // Updated from £4.00 to £2.50
        region: "London",
    },
    BLACKWELL_SILVERSTONE_TUNNEL: {
        name: "Blackwell & Silverstone Tunnel",
        boundaries: {
            north: 52.089,
            south: 52.089,
            east: -1.150,
            west: -1.150,
        },
        fee: 4.0, // Peak time fee (6-10AM & 4-7PM)
        operatingHours: {
            days: [1, 2, 3, 4, 5], // Monday to Friday
            startHour: 6, // 6am
            endHour: 10, // 10am
        },
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
        if (!airport) {
            return false;
        }
        const { lat, lng } = location;
        const withinBounds = isWithinBoundaries(lat, lng, airport.boundaries);
        return withinBounds;
    }
    catch (error) {
        console.error(`Error checking if location is at ${airportCode}:`, error);
        return false; // Default to false on error
    }
}
