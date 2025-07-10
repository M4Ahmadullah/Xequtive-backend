"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fare_service_1 = require("../services/fare.service");
const enhancedFare_service_1 = require("../services/enhancedFare.service");
const booking_schema_1 = require("../validation/booking.schema");
const authMiddleware_1 = require("../middleware/authMiddleware");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Legacy fare estimation endpoint
router.post("/", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                },
            });
        }
        // Validate request body
        const fareRequest = booking_schema_1.fareEstimateSchema.parse(req.body);
        // Calculate fare estimate
        const fareCalculationService = new fare_service_1.FareCalculationService();
        const fareEstimate = fareCalculationService.calculateFare({
            vehicleType: fareRequest.vehicleType,
            distance: Math.sqrt(Math.pow(fareRequest.dropoffLocation.lat - fareRequest.pickupLocation.lat, 2) +
                Math.pow(fareRequest.dropoffLocation.lng - fareRequest.pickupLocation.lng, 2)) * 69.172, // Convert to miles (approximate)
            additionalStops: fareRequest.additionalStops?.length || 0,
            // Optionally add more parameters if needed
        });
        res.status(200).json({
            success: true,
            data: {
                fareEstimate: fareEstimate,
                userId: req.user.uid, // Include user ID in response
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Validation error",
                    details: error.errors
                        .map((e) => `${e.path.join(".")}: ${e.message}`)
                        .join(", "),
                },
            });
        }
        res.status(500).json({
            success: false,
            error: {
                message: "Failed to calculate fare estimate",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Enhanced fare estimation endpoint - returns fares for all vehicle types
router.post("/enhanced", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: "Authentication required",
                    code: "AUTH_REQUIRED",
                },
            });
        }
        // Validate request body against the enhanced schema
        try {
            const fareRequest = booking_schema_1.enhancedFareEstimateSchema.parse(req.body);
            // Calculate fare estimates for all vehicle types
            const fareEstimates = await enhancedFare_service_1.EnhancedFareService.calculateFares(fareRequest);
            res.status(200).json({
                success: true,
                data: {
                    fare: fareEstimates,
                },
            });
        }
        catch (validationError) {
            if (validationError instanceof zod_1.ZodError) {
                // Create a more structured validation error response
                const validationErrors = validationError.errors.map((err) => {
                    const path = err.path.join(".");
                    let suggestion = "";
                    let expectedType = "";
                    let receivedValue = undefined;
                    // Add specific suggestions based on the error code
                    switch (err.code) {
                        case "invalid_type":
                            suggestion = `Expected ${err.expected}, received ${typeof err.received}`;
                            expectedType = err.expected;
                            receivedValue = err.received;
                            break;
                        case "invalid_string":
                            if (err.validation === "regex") {
                                if (path.includes("date")) {
                                    suggestion = "Date must be in YYYY-MM-DD format";
                                    expectedType = "YYYY-MM-DD";
                                }
                                else if (path.includes("time")) {
                                    suggestion = "Time must be in HH:mm format (24-hour)";
                                    expectedType = "HH:mm";
                                }
                                receivedValue = err.received;
                            }
                            break;
                        case "too_small":
                            suggestion = `Minimum value is ${err.minimum}`;
                            expectedType = `number >= ${err.minimum}`;
                            receivedValue = err.received;
                            break;
                        case "too_big":
                            suggestion = `Maximum value is ${err.maximum}`;
                            expectedType = `number <= ${err.maximum}`;
                            receivedValue = err.received;
                            break;
                    }
                    return {
                        field: path,
                        message: err.message,
                        expected: expectedType,
                        received: receivedValue,
                        suggestion: suggestion ||
                            "Please check the API documentation for correct format",
                    };
                });
                // Group errors by main sections
                const groupedErrors = {
                    locations: validationErrors.filter((e) => e.field.startsWith("locations")),
                    datetime: validationErrors.filter((e) => e.field.startsWith("datetime")),
                    passengers: validationErrors.filter((e) => e.field.startsWith("passengers")),
                };
                const missingFields = {};
                // Check locations
                if (!req.body.locations) {
                    missingFields.locations = "Missing entirely";
                }
                else {
                    const locationFields = {};
                    if (!req.body.locations.pickup)
                        locationFields.pickup = "Missing pickup location";
                    if (!req.body.locations.dropoff)
                        locationFields.dropoff = "Missing dropoff location";
                    if (Object.keys(locationFields).length > 0)
                        missingFields.locations = locationFields;
                }
                // Check datetime
                if (!req.body.datetime) {
                    missingFields.datetime = "Missing entirely";
                }
                else {
                    const datetimeFields = {};
                    if (!req.body.datetime.date)
                        datetimeFields.date = "Missing date";
                    if (!req.body.datetime.time)
                        datetimeFields.time = "Missing time";
                    if (Object.keys(datetimeFields).length > 0)
                        missingFields.datetime = datetimeFields;
                }
                // Check passengers
                if (!req.body.passengers) {
                    missingFields.passengers = "Missing entirely";
                }
                else {
                    const passengerFields = {};
                    if (req.body.passengers.count === undefined)
                        passengerFields.count = "Missing passenger count";
                    if (req.body.passengers.checkedLuggage === undefined)
                        passengerFields.checkedLuggage = "Missing checked luggage count";
                    if (req.body.passengers.handLuggage === undefined)
                        passengerFields.handLuggage = "Missing hand luggage count";
                    if (Object.keys(passengerFields).length > 0)
                        missingFields.passengers = passengerFields;
                }
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid request format",
                        details: {
                            summary: "The request contains validation errors. Please check the error details below.",
                            receivedData: req.body,
                            missingFields: Object.keys(missingFields).length > 0
                                ? missingFields
                                : undefined,
                            validationErrors: groupedErrors,
                            requiredFormat: {
                                locations: {
                                    pickup: {
                                        address: "string",
                                        coordinates: {
                                            lat: "number (-90 to 90)",
                                            lng: "number (-180 to 180)",
                                        },
                                    },
                                    dropoff: {
                                        address: "string",
                                        coordinates: {
                                            lat: "number (-90 to 90)",
                                            lng: "number (-180 to 180)",
                                        },
                                    },
                                },
                                datetime: {
                                    date: "YYYY-MM-DD",
                                    time: "HH:mm",
                                },
                                passengers: {
                                    count: "number (1-16)",
                                    checkedLuggage: "number (0-8)",
                                    handLuggage: "number (0-8)",
                                    mediumLuggage: "number (0-8)",
                                    babySeat: "number (0-5)",
                                    boosterSeat: "number (0-5)",
                                    childSeat: "number (0-5)",
                                    wheelchair: "number (0-2)",
                                },
                            },
                        },
                    },
                });
            }
            throw validationError;
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorCode = errorMessage.includes("No routes found")
            ? "INVALID_LOCATION"
            : error?.code || "FARE_CALCULATION_ERROR";
        res.status(500).json({
            success: false,
            error: {
                code: errorCode,
                message: "Failed to calculate fare estimate",
                details: errorMessage,
            },
        });
    }
});
exports.default = router;
