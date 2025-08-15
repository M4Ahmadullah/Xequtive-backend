"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timePricing = exports.timeSurcharges = exports.airportFees = exports.vehicleClassPricing = void 0;
exports.getTimeSurcharge = getTimeSurcharge;
exports.getTimeMultiplier = getTimeMultiplier;
// Exact pricing configuration as specified by the user
exports.vehicleClassPricing = {
    standardComfortClass: {
        vehicles: ['saloon', 'estate', 'mpv-6', 'mpv-8'],
        additionalStopFees: {
            'saloon': 2.50,
            'estate': 2.50,
            'mpv-6': 4.50,
            'mpv-8': 4.50
        },
        pricing: {
            'saloon': {
                reservationFee: 8.50,
                minimumFare: 16.40,
                perMilePricing: {
                    overall: 2.95,
                    mileageRanges: [
                        { range: { min: 0, max: 4 }, rate: 3.95 },
                        { range: { min: 4.1, max: 10.9 }, rate: 2.95 },
                        { range: { min: 11, max: 20 }, rate: 2.80 },
                        { range: { min: 20.1, max: 40 }, rate: 2.66 },
                        { range: { min: 41, max: 60 }, rate: 2.36 },
                        { range: { min: 60.1, max: 80 }, rate: 2.21 },
                        { range: { min: 81, max: 99 }, rate: 1.92 },
                        { range: { min: 100, max: 149 }, rate: 1.77 },
                        { range: { min: 150, max: 299 }, rate: 1.62 },
                        { range: { min: 300, max: Infinity }, rate: 1.48 }
                    ]
                }
            },
            'estate': {
                reservationFee: 8.50,
                minimumFare: 18.40,
                perMilePricing: {
                    overall: 3.45,
                    mileageRanges: [
                        { range: { min: 0, max: 4 }, rate: 4.95 },
                        { range: { min: 4.1, max: 10.9 }, rate: 3.45 },
                        { range: { min: 11, max: 20 }, rate: 3.28 },
                        { range: { min: 20.1, max: 40 }, rate: 3.11 },
                        { range: { min: 41, max: 60 }, rate: 2.76 },
                        { range: { min: 60.1, max: 80 }, rate: 2.59 },
                        { range: { min: 81, max: 99 }, rate: 2.24 },
                        { range: { min: 100, max: 149 }, rate: 2.07 },
                        { range: { min: 150, max: 299 }, rate: 1.90 },
                        { range: { min: 300, max: Infinity }, rate: 1.73 }
                    ]
                }
            },
            'mpv-6': {
                reservationFee: 12.50,
                minimumFare: 26.40,
                perMilePricing: {
                    overall: 6.45,
                    mileageRanges: [
                        { range: { min: 0, max: 4 }, rate: 6.95 },
                        { range: { min: 4.1, max: 10.9 }, rate: 6.45 },
                        { range: { min: 11, max: 20 }, rate: 5.97 },
                        { range: { min: 20.1, max: 40 }, rate: 4.35 },
                        { range: { min: 41, max: 60 }, rate: 3.39 },
                        { range: { min: 60.1, max: 80 }, rate: 3.55 },
                        { range: { min: 81, max: 99 }, rate: 3.23 },
                        { range: { min: 100, max: 149 }, rate: 3.06 },
                        { range: { min: 150, max: 299 }, rate: 2.90 },
                        { range: { min: 300, max: Infinity }, rate: 2.74 }
                    ]
                }
            },
            'mpv-8': {
                reservationFee: 18.50,
                minimumFare: 50.30,
                perMilePricing: {
                    overall: 6.95,
                    mileageRanges: [
                        { range: { min: 0, max: 4 }, rate: 7.95 },
                        { range: { min: 4.1, max: 10.9 }, rate: 6.95 },
                        { range: { min: 11, max: 20 }, rate: 6.43 },
                        { range: { min: 20.1, max: 40 }, rate: 4.69 },
                        { range: { min: 41, max: 60 }, rate: 4.00 },
                        { range: { min: 60.1, max: 80 }, rate: 3.82 },
                        { range: { min: 81, max: 99 }, rate: 3.48 },
                        { range: { min: 100, max: 149 }, rate: 3.30 },
                        { range: { min: 150, max: 299 }, rate: 3.13 },
                        { range: { min: 300, max: Infinity }, rate: 2.95 }
                    ]
                }
            }
        }
    },
    businessClass: {
        vehicles: ['executive-saloon', 'executive-mpv', 'vip-saloon', 'vip-suv'],
        additionalStopFees: {
            'executive-saloon': 5.50,
            'executive-mpv': 5.50,
            'vip-saloon': 5.50,
            'vip-suv': 5.50
        },
        pricing: {
            'executive-saloon': {
                reservationFee: 18.50,
                minimumFare: 34.40,
                perMilePricing: {
                    overall: 5.95,
                    mileageRanges: [
                        { range: { min: 0, max: 4 }, rate: 7.95 },
                        { range: { min: 4.1, max: 10.9 }, rate: 5.95 },
                        { range: { min: 11, max: 20 }, rate: 5.50 },
                        { range: { min: 20.1, max: 40 }, rate: 4.02 },
                        { range: { min: 41, max: 60 }, rate: 3.42 },
                        { range: { min: 60.1, max: 80 }, rate: 3.27 },
                        { range: { min: 81, max: 99 }, rate: 2.98 },
                        { range: { min: 100, max: 149 }, rate: 2.83 },
                        { range: { min: 150, max: 299 }, rate: 2.68 },
                        { range: { min: 300, max: Infinity }, rate: 2.53 }
                    ]
                }
            },
            'executive-mpv': {
                reservationFee: 18.50,
                minimumFare: 50.30,
                perMilePricing: {
                    overall: 7.95,
                    mileageRanges: [
                        { range: { min: 0, max: 4 }, rate: 7.95 },
                        { range: { min: 4.1, max: 10.9 }, rate: 7.95 },
                        { range: { min: 11, max: 20 }, rate: 6.56 },
                        { range: { min: 20.1, max: 40 }, rate: 6.16 },
                        { range: { min: 41, max: 60 }, rate: 5.96 },
                        { range: { min: 60.1, max: 80 }, rate: 5.76 },
                        { range: { min: 81, max: 99 }, rate: 4.77 },
                        { range: { min: 100, max: 149 }, rate: 4.57 },
                        { range: { min: 150, max: 299 }, rate: 3.78 },
                        { range: { min: 300, max: Infinity }, rate: 3.58 }
                    ]
                }
            },
            'vip-saloon': {
                reservationFee: 35.00,
                minimumFare: 66.80,
                perMilePricing: {
                    overall: 7.45,
                    mileageRanges: [
                        { range: { min: 0, max: 4 }, rate: 7.95 },
                        { range: { min: 4.1, max: 10.9 }, rate: 7.45 },
                        { range: { min: 11, max: 20 }, rate: 7.26 },
                        { range: { min: 20.1, max: 40 }, rate: 5.03 },
                        { range: { min: 41, max: 60 }, rate: 4.28 },
                        { range: { min: 60.1, max: 80 }, rate: 4.10 },
                        { range: { min: 81, max: 99 }, rate: 3.73 },
                        { range: { min: 100, max: 149 }, rate: 3.54 },
                        { range: { min: 150, max: 299 }, rate: 3.35 },
                        { range: { min: 300, max: Infinity }, rate: 3.17 }
                    ]
                }
            },
            'vip-suv': {
                reservationFee: 35.00,
                minimumFare: 70.80,
                perMilePricing: {
                    overall: 7.95,
                    mileageRanges: [
                        { range: { min: 0, max: 4 }, rate: 8.95 },
                        { range: { min: 4.1, max: 10.9 }, rate: 7.95 },
                        { range: { min: 11, max: 20 }, rate: 7.55 },
                        { range: { min: 20.1, max: 40 }, rate: 7.16 },
                        { range: { min: 41, max: 60 }, rate: 6.76 },
                        { range: { min: 60.1, max: 80 }, rate: 6.36 },
                        { range: { min: 81, max: 99 }, rate: 6.16 },
                        { range: { min: 100, max: 149 }, rate: 5.96 },
                        { range: { min: 150, max: 299 }, rate: 5.37 },
                        { range: { min: 300, max: Infinity }, rate: 4.97 }
                    ]
                }
            }
        }
    }
};
// Airport fees configuration
exports.airportFees = {
    dropoffFees: {
        standard: {
            'heathrow': 6.00,
            'gatwick': 7.00,
            'luton': 6.00,
            'stansted': 7.00,
            'city': 0.00,
            'birmingham': 6.00
        },
        executive: {
            'heathrow': 6.00,
            'gatwick': 7.00,
            'luton': 6.00,
            'stansted': 7.00,
            'city': 0.00,
            'birmingham': 6.00
        }
    },
    pickupFees: {
        standard: {
            'heathrow': 7.50,
            'gatwick': 10.00,
            'luton': 11.00,
            'stansted': 10.00,
            'city': 6.90,
            'birmingham': 9.50
        },
        executive: {
            'heathrow': 18.50,
            'gatwick': 15.50,
            'luton': 17.50,
            'stansted': 18.00,
            'city': 19.90,
            'birmingham': 9.50
        }
    }
};
// Time-based surcharges configuration
exports.timeSurcharges = {
    weekdays: {
        nonPeak: {
            startTime: '00:00',
            endTime: '05:59',
            surcharges: {
                'saloon': 0.00,
                'estate': 0.00,
                'mpv-6': 0.00,
                'mpv-8': 0.00,
                'executive': 0.00,
                'executive-mpv': 0.00,
                'vip-saloon': 0.00,
                'vip-suv': 0.00
            }
        },
        peakMedium: {
            startTime: '06:00',
            endTime: '14:59',
            surcharges: {
                'saloon': 3.00,
                'estate': 3.00,
                'mpv-6': 3.00,
                'mpv-8': 3.00,
                'executive': 5.00,
                'executive-mpv': 5.00,
                'vip-saloon': 7.00,
                'vip-suv': 7.00
            }
        },
        peakHigh: {
            startTime: '15:00',
            endTime: '23:59',
            surcharges: {
                'saloon': 3.00,
                'estate': 3.00,
                'mpv-6': 5.00,
                'mpv-8': 5.00,
                'executive': 7.00,
                'executive-mpv': 7.00,
                'vip-saloon': 9.00,
                'vip-suv': 9.00
            }
        }
    },
    weekends: {
        nonPeak: {
            startTime: '00:00',
            endTime: '05:59',
            surcharges: {
                'saloon': 0.00,
                'estate': 0.00,
                'mpv-6': 0.00,
                'mpv-8': 0.00,
                'executive': 0.00,
                'executive-mpv': 0.00,
                'vip-saloon': 0.00,
                'vip-suv': 0.00
            }
        },
        peakMedium: {
            startTime: '06:00',
            endTime: '14:59',
            surcharges: {
                'saloon': 0.00,
                'estate': 0.00,
                'mpv-6': 0.00,
                'mpv-8': 0.00,
                'executive': 0.00,
                'executive-mpv': 0.00,
                'vip-saloon': 0.00,
                'vip-suv': 0.00
            }
        },
        peakHigh: {
            startTime: '15:00',
            endTime: '23:59',
            surcharges: {
                'saloon': 3.00,
                'estate': 3.00,
                'mpv-6': 3.00,
                'mpv-8': 3.00,
                'executive': 7.00,
                'executive-mpv': 5.00,
                'vip-saloon': 5.00,
                'vip-suv': 7.00
            }
        }
    }
};
// Legacy exports for backward compatibility
exports.timePricing = exports.vehicleClassPricing;
// Simple helper functions
function getTimeSurcharge(date, vehicleTypeId) {
    const day = date.getDay();
    const hours = date.getHours();
    // Map vehicle type IDs to surcharge keys
    const vehicleMap = {
        'saloon': 'saloon',
        'estate': 'estate',
        'mpv-6': 'mpv-6',
        'mpv-8': 'mpv-8',
        'executive-saloon': 'executive-saloon',
        'executive-mpv': 'executive-mpv',
        'vip-saloon': 'executive-saloon',
        'vip-mpv': 'executive-mpv'
    };
    const mappedVehicleType = vehicleMap[vehicleTypeId] || 'saloon';
    // Determine if it's weekend
    const isWeekend = day === 5 || day === 6 || day === 0; // Friday, Saturday, Sunday
    // Determine time period
    let period = 'nonPeak';
    if (hours >= 6 && hours < 15) {
        period = 'peakMedium';
    }
    else if (hours >= 15) {
        period = 'peakHigh';
    }
    // Get surcharge
    const timeCategory = isWeekend ? 'weekends' : 'weekdays';
    const timePeriod = exports.timeSurcharges[timeCategory][period];
    return timePeriod?.surcharges[mappedVehicleType] || 0;
}
function getTimeMultiplier(date) {
    return 1.0; // Simple implementation
}
