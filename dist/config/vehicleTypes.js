"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleTypes = void 0;
exports.getVehicleTypeById = getVehicleTypeById;
exports.getAllVehicleTypes = getAllVehicleTypes;
exports.getVehicleTypesByClass = getVehicleTypesByClass;
// Define all available vehicle types
exports.vehicleTypes = {
    'saloon': {
        id: 'saloon',
        name: 'Standard Saloon',
        description: 'Comfortable and efficient standard saloon',
        class: 'Standard Comfort',
        capacity: {
            passengers: 4,
            luggage: 2,
            class: 'Standard Comfort'
        },
        minimumFare: 16.40,
        additionalStopFee: 2.50,
        perMileRates: {
            '0-4': 3.95,
            '4.1-10.9': 2.95,
            '11-20': 2.80,
            '20.1-40': 2.66,
            '41-60': 2.36,
            '60.1-80': 2.21,
            '81-99': 1.92,
            '100-149': 1.77,
            '150-299': 1.62,
            '300+': 1.48
        },
        waitingRatePerMinute: 0.50,
        waitingRatePerHour: 30,
        imageUrl: '/images/vehicles/saloon.jpg',
        examples: ['Toyota Prius', 'Ford Mondeo']
    },
    'estate': {
        id: 'estate',
        name: 'Estate',
        description: 'Spacious vehicle with extra luggage space',
        class: 'Standard Comfort',
        capacity: {
            passengers: 4,
            luggage: 3,
            class: 'Standard Comfort'
        },
        minimumFare: 18.40,
        additionalStopFee: 2.50,
        perMileRates: {
            '0-4': 4.95,
            '4.1-10.9': 3.45,
            '11-20': 3.28,
            '20.1-40': 3.11,
            '41-60': 2.76,
            '60.1-80': 2.59,
            '81-99': 2.24,
            '100-149': 2.07,
            '150-299': 1.90,
            '300+': 1.73
        },
        waitingRatePerMinute: 0.58,
        waitingRatePerHour: 30,
        imageUrl: '/images/vehicles/estate.jpg',
        examples: ['Mercedes E-Class Estate', 'Volkswagen Passat Estate']
    },
    'mpv-6': {
        id: 'mpv-6',
        name: 'MPV-6 Seater',
        description: 'Spacious vehicle for up to 6 passengers',
        class: 'Standard Comfort',
        capacity: {
            passengers: 6,
            luggage: 3,
            class: 'Standard Comfort'
        },
        minimumFare: 26.40,
        additionalStopFee: 4.50,
        perMileRates: {
            '0-4': 6.95,
            '4.1-10.9': 6.45,
            '11-20': 5.97,
            '20.1-40': 4.35,
            '41-60': 3.39,
            '60.1-80': 3.55,
            '81-99': 3.23,
            '100-149': 3.06,
            '150-299': 2.90,
            '300+': 2.74
        },
        waitingRatePerMinute: 0.58,
        waitingRatePerHour: 35,
        imageUrl: '/images/vehicles/large-mpv.jpg',
        examples: ['Ford Galaxy', 'Volkswagen Sharan']
    },
    'mpv-8': {
        id: 'mpv-8',
        name: 'MPV-8 Seater',
        description: 'Maximum capacity for passengers and luggage',
        class: 'Standard Comfort',
        capacity: {
            passengers: 8,
            luggage: 4,
            class: 'Standard Comfort'
        },
        minimumFare: 50.30,
        additionalStopFee: 4.50,
        perMileRates: {
            '0-4': 7.95,
            '4.1-10.9': 6.95,
            '11-20': 6.43,
            '20.1-40': 4.69,
            '41-60': 4.00,
            '60.1-80': 3.82,
            '81-99': 3.48,
            '100-149': 3.30,
            '150-299': 3.13,
            '300+': 2.95
        },
        waitingRatePerMinute: 0.67,
        waitingRatePerHour: 45,
        imageUrl: '/images/vehicles/xl-mpv.jpg',
        examples: ['Ford Tourneo', 'Mercedes Vito']
    },
    'executive': {
        id: 'executive',
        name: 'Executive Saloon',
        description: 'Premium ride in a Mercedes E-Class or equivalent',
        class: 'Business',
        capacity: {
            passengers: 3,
            luggage: 2,
            class: 'Business'
        },
        minimumFare: 34.40,
        additionalStopFee: 5.50,
        perMileRates: {
            '0-4': 7.95,
            '4.1-10.9': 5.95,
            '11-20': 5.50,
            '20.1-40': 4.02,
            '41-60': 3.42,
            '60.1-80': 3.27,
            '81-99': 2.98,
            '100-149': 2.83,
            '150-299': 2.68,
            '300+': 2.53
        },
        waitingRatePerMinute: 0.67,
        waitingRatePerHour: 45,
        imageUrl: '/images/vehicles/executive-saloon.jpg',
        examples: ['Mercedes E-Class', 'BMW 5-Series']
    },
    'executive-mpv': {
        id: 'executive-mpv',
        name: 'Executive MPV-8',
        description: 'Premium group transportation',
        class: 'Business',
        capacity: {
            passengers: 6,
            luggage: 4,
            class: 'Business'
        },
        minimumFare: 50.30,
        additionalStopFee: 5.50,
        perMileRates: {
            '0-4': 7.95,
            '4.1-10.9': 7.95,
            '11-20': 6.56,
            '20.1-40': 6.16,
            '41-60': 5.96,
            '60.1-80': 5.76,
            '81-99': 4.77,
            '100-149': 4.57,
            '150-299': 3.78,
            '300+': 3.58
        },
        waitingRatePerMinute: 0.67,
        waitingRatePerHour: 45,
        imageUrl: '/images/vehicles/executive-mpv.jpg',
        examples: ['Mercedes V-Class', 'BMW 2-Series Gran Tourer']
    },
    'vip-saloon': {
        id: 'vip-saloon',
        name: 'VIP-Saloon',
        description: 'Ultimate luxury saloon experience',
        class: 'Business',
        capacity: {
            passengers: 3,
            luggage: 2,
            class: 'Business'
        },
        minimumFare: 66.80,
        additionalStopFee: 5.50,
        perMileRates: {
            '0-4': 7.95,
            '4.1-10.9': 7.45,
            '11-20': 7.26,
            '20.1-40': 5.03,
            '41-60': 4.28,
            '60.1-80': 4.10,
            '81-99': 3.73,
            '100-149': 3.54,
            '150-299': 3.35,
            '300+': 3.17
        },
        waitingRatePerMinute: 0.75,
        waitingRatePerHour: 50,
        imageUrl: '/images/vehicles/vip-saloon.jpg',
        examples: ['Mercedes S-Class', 'BMW 7-Series']
    },
    'vip-suv': {
        id: 'vip-suv',
        name: 'VIP-SUV/MPV',
        description: 'Premium SUV/MPV for ultimate luxury group travel',
        class: 'Business',
        capacity: {
            passengers: 6,
            luggage: 4,
            class: 'Business'
        },
        minimumFare: 70.80,
        additionalStopFee: 5.50,
        perMileRates: {
            '0-4': 8.95,
            '4.1-10.9': 7.95,
            '11-20': 7.55,
            '20.1-40': 7.16,
            '41-60': 6.76,
            '60.1-80': 6.36,
            '81-99': 6.16,
            '100-149': 5.96,
            '150-299': 5.37,
            '300+': 4.97
        },
        waitingRatePerMinute: 0.75,
        waitingRatePerHour: 50,
        imageUrl: '/images/vehicles/vip-suv.jpg',
        examples: ['Mercedes GLS', 'BMW X7', 'Range Rover']
    }
};
// Helper function to get a vehicle type by ID
function getVehicleTypeById(id) {
    return exports.vehicleTypes[id];
}
// Helper function to get all vehicle types
function getAllVehicleTypes() {
    return Object.values(exports.vehicleTypes);
}
function getVehicleTypesByClass(vehicleClass) {
    return Object.values(exports.vehicleTypes).filter(type => type.class === vehicleClass);
}
