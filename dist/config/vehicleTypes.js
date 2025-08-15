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
        minimumFare: 15.00,
        additionalStopFee: 2.50,
        perMileRates: {
            '0-4': 5.00,
            '4.1-10': 4.50,
            '10.1-15': 4.00,
            '15.1-20': 3.20,
            '20.1-30': 2.60,
            '30.1-40': 2.20,
            '41.1-50': 2.10,
            '51.1-60': 1.85,
            '61.1-80': 1.80,
            '80.1-150': 1.75,
            '150.1-300': 1.70,
            '300+': 1.60
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
        minimumFare: 18.00,
        additionalStopFee: 2.50,
        perMileRates: {
            '0-4': 5.50,
            '4.1-10': 5.40,
            '10.1-15': 4.90,
            '15.1-20': 3.80,
            '20.1-30': 3.00,
            '30.1-40': 2.70,
            '41.1-50': 2.60,
            '51.1-60': 2.35,
            '61.1-80': 2.30,
            '80.1-150': 2.25,
            '150.1-300': 2.10,
            '300+': 1.80
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
        minimumFare: 35.00,
        additionalStopFee: 4.50,
        perMileRates: {
            '0-4': 7.00,
            '4.1-10': 6.80,
            '10.1-15': 5.40,
            '15.1-20': 4.50,
            '20.1-30': 3.40,
            '30.1-40': 3.00,
            '41.1-50': 2.90,
            '51.1-60': 2.85,
            '61.1-80': 2.80,
            '80.1-150': 2.75,
            '150.1-300': 2.60,
            '300+': 2.40
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
        minimumFare: 45.00,
        additionalStopFee: 4.50,
        perMileRates: {
            '0-4': 8.00,
            '4.1-10': 7.80,
            '10.1-15': 7.20,
            '15.1-20': 4.80,
            '20.1-30': 4.20,
            '30.1-40': 3.80,
            '41.1-50': 3.40,
            '51.1-60': 3.20,
            '61.1-80': 3.00,
            '80.1-150': 2.80,
            '150.1-300': 2.75,
            '300+': 2.60
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
        minimumFare: 45.00,
        additionalStopFee: 5.50,
        perMileRates: {
            '0-4': 8.00,
            '4.1-10': 7.80,
            '10.1-15': 7.20,
            '15.1-20': 4.80,
            '20.1-30': 4.20,
            '30.1-40': 3.80,
            '41.1-50': 3.40,
            '51.1-60': 3.20,
            '61.1-80': 3.00,
            '80.1-150': 2.80,
            '150.1-300': 2.75,
            '300+': 2.60
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
        minimumFare: 65.00,
        additionalStopFee: 5.50,
        perMileRates: {
            '0-4': 9.00,
            '4.1-10': 9.60,
            '10.1-15': 9.20,
            '15.1-20': 6.20,
            '20.1-30': 5.00,
            '30.1-40': 4.60,
            '41.1-50': 4.20,
            '51.1-60': 3.80,
            '61.1-80': 3.70,
            '80.1-150': 3.60,
            '150.1-300': 3.40,
            '300+': 3.05
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
        minimumFare: 85.00,
        additionalStopFee: 5.50,
        perMileRates: {
            '0-4': 11.00,
            '4.1-10': 13.80,
            '10.1-15': 11.20,
            '15.1-20': 7.80,
            '20.1-30': 6.40,
            '30.1-40': 6.20,
            '41.1-50': 5.60,
            '51.1-60': 4.90,
            '61.1-80': 4.60,
            '80.1-150': 4.50,
            '150.1-300': 4.40,
            '300+': 4.20
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
        minimumFare: 95.00,
        additionalStopFee: 5.50,
        perMileRates: {
            '0-4': 12.00,
            '4.1-10': 13.90,
            '10.1-15': 12.40,
            '15.1-20': 8.00,
            '20.1-30': 7.20,
            '30.1-40': 6.80,
            '41.1-50': 5.70,
            '51.1-60': 4.95,
            '61.1-80': 4.75,
            '80.1-150': 4.60,
            '150.1-300': 4.50,
            '300+': 4.30
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
