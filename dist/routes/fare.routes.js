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
        const fareEstimate = await fare_service_1.FareService.calculateFares(fareRequest);
        res.status(200).json({
            success: true,
            data: {
                ...fareEstimate,
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
                },
            });
        }
        // Validate request body against the enhanced schema
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
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Validation error",
                    details: error.errors
                        .map((e) => `${e.path.join(".")}: ${e.message}`)
                        .join(", "),
                    code: "VALIDATION_ERROR",
                },
            });
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorCode = errorMessage.includes("No routes found")
            ? "INVALID_LOCATION"
            : "FARE_CALCULATION_ERROR";
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
