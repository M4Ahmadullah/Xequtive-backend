"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleTypes = void 0;
exports.getVehicleTypeById = getVehicleTypeById;
exports.getAllVehicleTypes = getAllVehicleTypes;
// Define all available vehicle types
exports.vehicleTypes = [
    {
        id: "standard-saloon",
        name: "Standard Saloon",
        description: "Comfortable ride for up to 4 passengers",
        capacity: {
            passengers: 4,
            luggage: 2,
        },
        baseRate: 5.0, // £5.00 base fare
        perMileRate: 2.95, // £2.95 per mile
        minimumFare: 15.0,
        waitingRatePerHour: 25.0, // £25.00 per hour
        waitingRatePerMinute: 0.42, // £0.42 per minute
        additionalStopFee: 2.5, // £2.50 per additional stop
        examples: ["Toyota Prius", "Ford Mondeo"],
        imageUrl: "/images/vehicles/standard-saloon.jpg",
    },
    {
        id: "estate",
        name: "Estate",
        description: "Spacious vehicle with extra luggage space",
        capacity: {
            passengers: 4,
            luggage: 4,
        },
        baseRate: 7.5, // £7.50 base fare
        perMileRate: 3.95, // £3.95 per mile
        minimumFare: 18.0,
        waitingRatePerHour: 30.0, // £30.00 per hour
        waitingRatePerMinute: 0.58, // £0.58 per minute
        additionalStopFee: 3.5, // £3.50 per additional stop
        examples: ["Mercedes E-Class Estate", "Volkswagen Passat Estate"],
        imageUrl: "/images/vehicles/estate.jpg",
    },
    {
        id: "large-mpv",
        name: "MPV-6",
        description: "Spacious vehicle for up to 6 passengers",
        capacity: {
            passengers: 6,
            luggage: 4,
        },
        baseRate: 12.5, // £12.50 base fare
        perMileRate: 4.75, // £4.75 per mile
        minimumFare: 22.0,
        waitingRatePerHour: 35.0, // £35.00 per hour
        waitingRatePerMinute: 0.58, // £0.58 per minute
        additionalStopFee: 4.5, // £4.50 per additional stop
        examples: ["Ford Galaxy", "Volkswagen Sharan"],
        imageUrl: "/images/vehicles/large-mpv.jpg",
    },
    {
        id: "extra-large-mpv",
        name: "MPV-8",
        description: "Maximum capacity for passengers and luggage",
        capacity: {
            passengers: 8,
            luggage: 6,
        },
        baseRate: 20.0, // £20.00 base fare
        perMileRate: 3.95, // £3.95 per mile
        minimumFare: 25.0,
        waitingRatePerHour: 45.0, // £45.00 per hour
        waitingRatePerMinute: 0.67, // £0.67 per minute
        additionalStopFee: 4.5, // £4.50 per additional stop
        examples: ["Ford Tourneo", "Mercedes Vito"],
        imageUrl: "/images/vehicles/xl-mpv.jpg",
    },
    {
        id: "executive-saloon",
        name: "Executive Saloon",
        description: "Premium ride in a Mercedes E-Class or equivalent",
        capacity: {
            passengers: 3,
            luggage: 2,
        },
        baseRate: 12.5, // £12.50 base fare
        perMileRate: 4.95, // £4.95 per mile
        minimumFare: 30.0,
        waitingRatePerHour: 45.0, // £45.00 per hour
        waitingRatePerMinute: 0.67, // £0.67 per minute
        additionalStopFee: 5.5, // £5.50 per additional stop
        examples: ["Mercedes E-Class", "BMW 5-Series"],
        imageUrl: "/images/vehicles/executive-saloon.jpg",
    },
    {
        id: "vip",
        name: "VIP Executive Saloon",
        description: "Luxury Mercedes S-Class or equivalent",
        capacity: {
            passengers: 3,
            luggage: 2,
        },
        baseRate: 0, // Hourly rates apply - custom quote
        perMileRate: 0, // Hourly rates apply - custom quote
        minimumFare: 50.0,
        waitingRatePerHour: 75.0, // £75.00 per hour
        waitingRatePerMinute: 1.25, // £1.25 per minute
        examples: ["Mercedes S-Class", "BMW 7-Series"],
        imageUrl: "/images/vehicles/vip.jpg",
    },
    {
        id: "vip-mpv",
        name: "VIP Executive MPV-8",
        description: "Luxury Mercedes V-Class or equivalent",
        capacity: {
            passengers: 6,
            luggage: 4,
        },
        baseRate: 0, // Hourly rates apply - custom quote
        perMileRate: 0, // Hourly rates apply - custom quote
        minimumFare: 60.0,
        waitingRatePerHour: 95.0, // £95.00 per hour
        waitingRatePerMinute: 1.58, // £1.58 per minute
        examples: ["Mercedes V-Class Luxury"],
        imageUrl: "/images/vehicles/vip-mpv.jpg",
    },
    {
        id: "wav",
        name: "Wheelchair Accessible Vehicle (WAV)",
        description: "Specially adapted vehicle for wheelchair users",
        capacity: {
            passengers: 4,
            luggage: 2,
            wheelchair: true,
        },
        baseRate: 12.5, // £12.50 base fare
        perMileRate: 4.75, // £4.75 per mile
        minimumFare: 25.0,
        waitingRatePerHour: 35.0, // £35.00 per hour
        waitingRatePerMinute: 0.58, // £0.58 per minute
        additionalStopFee: 4.5, // £4.50 per additional stop
        examples: ["Specially adapted vans"],
        imageUrl: "/images/vehicles/wav.jpg",
    },
];
// Helper function to get a vehicle type by ID
function getVehicleTypeById(id) {
    return exports.vehicleTypes.find((vehicle) => vehicle.id === id);
}
// Helper function to get all vehicle types
function getAllVehicleTypes() {
    return exports.vehicleTypes;
}
