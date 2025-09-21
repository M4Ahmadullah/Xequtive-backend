"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const contact_schema_1 = require("../validation/contact.schema");
const firebase_1 = require("../config/firebase");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const email_service_1 = require("../services/email.service");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// Contact form submission endpoint
router.post("/message", rateLimiter_1.contactLimiter, async (req, res) => {
    try {
        // Validate request body
        let validatedData;
        try {
            validatedData = contact_schema_1.contactMessageSchema.parse(req.body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: "Invalid contact form data",
                        code: "contact/invalid-data",
                        details: error.errors.map((e) => e.message).join(", "),
                    },
                });
            }
            throw error;
        }
        // Generate unique message ID
        const messageId = `contact_${(0, uuid_1.v4)().replace(/-/g, '').substring(0, 12)}`;
        // Get user ID if authenticated
        let userId;
        try {
            const token = req.cookies?.token;
            if (token) {
                const { auth } = await Promise.resolve().then(() => __importStar(require("../config/firebase")));
                const decodedToken = await auth.verifyIdToken(token);
                userId = decodedToken.uid;
            }
        }
        catch (error) {
            // User not authenticated or invalid token - continue as anonymous
            userId = undefined;
        }
        // Create contact message data
        const contactMessage = {
            id: messageId,
            userId: userId,
            firstName: validatedData.firstName.trim(),
            lastName: validatedData.lastName.trim(),
            email: validatedData.email.trim().toLowerCase(),
            phone: validatedData.phone.trim(),
            message: validatedData.message.trim(),
            agreeToTerms: validatedData.agreeToTerms,
            status: "new",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Prepare Firestore data (remove undefined values)
        const firestoreData = {
            id: messageId,
            ...(userId && { userId }),
            firstName: validatedData.firstName.trim(),
            lastName: validatedData.lastName.trim(),
            email: validatedData.email.trim().toLowerCase(),
            phone: validatedData.phone.trim(),
            message: validatedData.message.trim(),
            agreeToTerms: validatedData.agreeToTerms,
            status: "new",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Store in Firestore
        await firebase_1.firestore.collection("contact_messages").doc(messageId).set(firestoreData);
        // Send email notification to support team
        try {
            await email_service_1.EmailService.sendContactNotification(contactMessage);
        }
        catch (emailError) {
            console.error("❌ Failed to send contact notification email:", emailError);
            // Don't fail the request if email fails - message is still stored
        }
        // Return success response
        const response = {
            success: true,
            message: "Contact message sent successfully",
            messageId: messageId,
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error("❌ Contact form submission error:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to send contact message",
                code: "contact/server-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Get contact messages (admin only)
router.get("/messages", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user?.role || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                error: {
                    message: "Admin access required",
                    code: "contact/admin-required",
                },
            });
        }
        // Get query parameters
        const { status, limit = "50", offset = "0" } = req.query;
        let query = firebase_1.firestore.collection("contact_messages").orderBy("createdAt", "desc");
        // Filter by status if provided
        if (status && typeof status === "string" && ["new", "in_progress", "resolved"].includes(status)) {
            query = query.where("status", "==", status);
        }
        // Apply pagination
        const limitNum = parseInt(limit, 10);
        const offsetNum = parseInt(offset, 10);
        if (offsetNum > 0) {
            const offsetSnapshot = await firebase_1.firestore.collection("contact_messages")
                .orderBy("createdAt", "desc")
                .limit(offsetNum)
                .get();
            const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
            query = query.startAfter(lastDoc);
        }
        const snapshot = await query.limit(limitNum).get();
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return res.json({
            success: true,
            data: {
                messages,
                total: messages.length,
                hasMore: messages.length === limitNum,
            },
        });
    }
    catch (error) {
        console.error("❌ Failed to fetch contact messages:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to fetch contact messages",
                code: "contact/fetch-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Update contact message status (admin only)
router.put("/messages/:id/status", authMiddleware_1.verifyToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user?.role || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                error: {
                    message: "Admin access required",
                    code: "contact/admin-required",
                },
            });
        }
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        // Validate status
        if (!status || !["new", "in_progress", "resolved"].includes(status)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Invalid status. Must be 'new', 'in_progress', or 'resolved'",
                    code: "contact/invalid-status",
                },
            });
        }
        // Update message
        const updateData = {
            status: status,
            updatedAt: new Date().toISOString(),
        };
        if (adminNotes) {
            updateData.adminNotes = adminNotes;
        }
        await firebase_1.firestore.collection("contact_messages").doc(id).update(updateData);
        return res.json({
            success: true,
            message: "Contact message status updated successfully",
        });
    }
    catch (error) {
        console.error("❌ Failed to update contact message status:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to update contact message status",
                code: "contact/update-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
exports.default = router;
