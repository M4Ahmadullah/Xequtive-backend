"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authMiddleware_1 = require("../middleware/authMiddleware");
const firebase_1 = require("../config/firebase");
const booking_schema_1 = require("../validation/booking.schema");
const router = (0, express_1.Router)();
// Create booking endpoint
router.post("/create", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        const userData = res.locals.userData;
        const validatedData = booking_schema_1.bookingSchema.parse(req.body);
        const bookingData = {
            ...validatedData,
            userId: userData.uid,
            createdByAdmin: userData.role === "admin",
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const bookingRef = await firebase_1.firestore.collection("bookings").add(bookingData);
        const response = {
            success: true,
            data: {
                bookingId: bookingRef.id,
                message: "Booking received. Our manager will contact you shortly.",
            },
        };
        return res.status(201).json(response);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const response = {
                success: false,
                error: {
                    message: "Invalid booking data",
                    details: error.errors.map((e) => e.message).join(", "),
                },
            };
            return res.status(400).json(response);
        }
        console.error("Error creating booking:", error);
        const response = {
            success: false,
            error: {
                message: "Failed to create booking",
            },
        };
        return res.status(500).json(response);
    }
});
exports.default = router;
