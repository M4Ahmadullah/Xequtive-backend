"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fare_service_1 = require("../services/fare.service");
const booking_schema_1 = require("../validation/booking.schema");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Fare estimation endpoint
router.post("/", async (req, res) => {
    try {
        // Validate request body
        const fareRequest = booking_schema_1.fareEstimateSchema.parse(req.body);
        // Calculate fare estimate
        const fareEstimate = await fare_service_1.FareService.calculateFare(fareRequest);
        res.status(200).json({
            success: true,
            data: fareEstimate,
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
exports.default = router;
