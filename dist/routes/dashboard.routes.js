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
const authMiddleware_1 = require("../middleware/authMiddleware");
const firebase_1 = require("../config/firebase");
const firebase_2 = require("../config/firebase");
const auth_service_1 = require("../services/auth.service");
const vehicleTypes_1 = require("../config/vehicleTypes");
const whatsapp_service_1 = require("../services/whatsapp.service");
const adminBooking_schema_1 = require("../validation/adminBooking.schema");
const router = (0, express_1.Router)();
// Helper function to get hourly rate for a vehicle
function getHourlyRateForVehicle(vehicleId) {
    const vehicleType = vehicleTypes_1.vehicleTypes[vehicleId];
    return vehicleType?.waitingRatePerHour || 0;
}
// =====================================================
// Dashboard Auth Routes
// =====================================================
// Hardcoded Admin Authentication (Development/Testing)
router.post("/auth/hardcoded-login", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Email and password are required",
                },
            });
        }
        // Hardcoded admin credentials
        const authorizedAdmins = {
            "xequtivecars@gmail.com": "xequtive2025",
            "ahmadullahm4masoudy@gmail.com": "xequtive2025"
        };
        // Check if email exists and password matches
        if (!authorizedAdmins[email] || authorizedAdmins[email] !== password) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "INVALID_CREDENTIALS",
                    message: "Invalid email or password",
                },
            });
        }
        // Create admin user data
        const adminUser = {
            uid: `admin-${Date.now()}`, // Generate unique admin ID
            email: email,
            fullName: email === "xequtivecars@gmail.com" ? "Xequtive Cars Admin" : "Ahmadullah Masoudy",
            role: "admin",
            admin: true,
            createdAt: new Date().toISOString(),
        };
        // Create a simple session token (not Firebase)
        const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
        // Set token in cookie
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", sessionToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "strict",
            maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
        });
        // Return admin user data
        res.status(200).json({
            success: true,
            data: {
                user: adminUser,
                message: "Admin authentication successful",
                sessionToken: sessionToken,
            },
        });
    }
    catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message: "Internal server error during authentication",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Admin registration (no verification needed for first admin)
router.post("/auth/signup", async (req, res) => {
    try {
        const { fullName, email, password, confirmPassword } = req.body;
        // Validate required fields
        if (!fullName || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "All fields are required: Full Name, Email, Password, and Confirm Password",
                },
            });
        }
        // Validate password match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Passwords do not match",
                },
            });
        }
        // Create admin user in Firebase Authentication
        const userRecord = await firebase_2.auth.createUser({
            email,
            password,
            displayName: fullName,
        });
        // Set custom claims for admin
        await firebase_2.auth.setCustomUserClaims(userRecord.uid, {
            role: "admin",
            admin: true,
        });
        // Create admin document in Firestore
        await firebase_1.firestore.collection("users").doc(userRecord.uid).set({
            email: userRecord.email,
            fullName: fullName,
            role: "admin",
            createdAt: new Date().toISOString(),
        });
        // Create token for admin
        const customToken = await firebase_2.auth.createCustomToken(userRecord.uid, {
            role: "admin",
            admin: true,
            expiresIn: 432000, // 5 days in seconds
        });
        // Exchange custom token for ID token using Firebase API
        const apiKey = process.env.FIREBASE_API_KEY;
        if (!apiKey) {
            throw new Error("Firebase API key is missing");
        }
        const fetch = (await Promise.resolve().then(() => __importStar(require("node-fetch")))).default;
        const tokenResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: customToken,
                returnSecureToken: true,
                expiresIn: 432000, // 5 days in seconds
            }),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(tokenData.error?.message || "Token exchange failed");
        }
        // Set token in cookie
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", tokenData.idToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 432000 * 1000, // 5 days in milliseconds
            path: "/",
        });
        return res.status(201).json({
            success: true,
            data: {
                uid: userRecord.uid,
                email: userRecord.email,
                fullName: fullName,
                role: "admin",
            },
        });
    }
    catch (error) {
        console.error("Admin registration error:", error);
        return res.status(400).json({
            success: false,
            error: {
                code: "REGISTRATION_FAILED",
                message: error instanceof Error ? error.message : "Registration failed",
            },
        });
    }
});
// Dashboard admin login endpoint
router.post("/auth/login", async (req, res) => {
    try {
        // Validate request with simple checks
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Email and password are required",
                },
            });
        }
        // Login with email/password
        const authResult = await auth_service_1.AuthService.loginWithEmail(email, password);
        // Verify this user has admin role
        const userRecord = await firebase_2.auth.getUser(authResult.uid);
        const isUserAdmin = userRecord.customClaims?.admin === true;
        if (!isUserAdmin) {
            return res.status(403).json({
                success: false,
                error: {
                    code: "INSUFFICIENT_PERMISSIONS",
                    message: "Access denied. Admin privileges required.",
                },
            });
        }
        // Set token in HttpOnly cookie
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", authResult.token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 432000 * 1000, // 5 days in milliseconds
            path: "/",
        });
        // If we get here, user is an admin
        return res.json({
            success: true,
            data: {
                uid: authResult.uid,
                email: authResult.email,
                displayName: authResult.displayName,
                phone: authResult.phone,
                role: "admin",
            },
        });
    }
    catch (error) {
        console.error("Admin login error:", error);
        return res.status(401).json({
            success: false,
            error: {
                code: "AUTHENTICATION_FAILED",
                message: error instanceof Error ? error.message : "Authentication failed",
            },
        });
    }
});
// Dashboard logout endpoint
router.post("/auth/logout", async (req, res) => {
    try {
        // Clear the auth cookie
        const isProduction = process.env.NODE_ENV === "production";
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
        });
        return res.json({
            success: true,
            data: {
                message: "Logged out successfully",
            },
        });
    }
    catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "LOGOUT_FAILED",
                message: "Failed to logout",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Check if current user is admin
router.get("/auth/check-admin", async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "NOT_AUTHENTICATED",
                    message: "Not authenticated",
                },
            });
        }
        // Check if it's a hardcoded admin token
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            // Check if decoded string contains email format (contains @ and :)
            if (decoded.includes('@') && decoded.includes(':')) {
                const [email, timestamp] = decoded.split(':');
                // Check if it's one of the authorized admin emails
                const authorizedEmails = ["xequtivecars@gmail.com", "ahmadullahm4masoudy@gmail.com"];
                if (authorizedEmails.includes(email)) {
                    return res.json({
                        success: true,
                        data: {
                            uid: `admin-${timestamp}`,
                            email: email,
                            displayName: email === "xequtivecars@gmail.com" ? "Xequtive Cars Admin" : "Ahmadullah Masoudy",
                            role: "admin",
                        },
                    });
                }
            }
        }
        catch (error) {
            // Not a valid base64 token, continue to Firebase verification
        }
        // Firebase token verification
        try {
            // Verify the token
            const decodedToken = await firebase_2.auth.verifyIdToken(token);
            const userRecord = await firebase_2.auth.getUser(decodedToken.uid);
            // Check if user has admin role
            const isUserAdmin = userRecord.customClaims?.admin === true;
            if (!isUserAdmin) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "NOT_ADMIN",
                        message: "User is not an admin",
                    },
                });
            }
            // Get user profile from Firestore for additional data
            const userDoc = await firebase_1.firestore
                .collection("users")
                .doc(userRecord.uid)
                .get();
            const userData = userDoc.data();
            return res.json({
                success: true,
                data: {
                    uid: userRecord.uid,
                    email: userRecord.email,
                    displayName: userData?.fullName || userRecord.displayName,
                    role: "admin",
                },
            });
        }
        catch (error) {
            // Token is invalid - clear it and return not authenticated
            const isProduction = process.env.NODE_ENV === "production";
            res.clearCookie("token", {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax",
                path: "/",
            });
            return res.status(401).json({
                success: false,
                error: {
                    code: "INVALID_TOKEN",
                    message: "Invalid or expired token",
                },
            });
        }
    }
    catch (error) {
        console.error("Error checking admin status:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Server error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Apply authentication and admin middleware to all routes below this point
router.use(authMiddleware_1.verifyDashboardToken, authMiddleware_1.isAdmin);
// =====================================================
// Bookings Management
// =====================================================
// Get all bookings with comprehensive filtering and separation
router.get("/bookings", async (req, res) => {
    try {
        // Extract query parameters
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const status = req.query.status;
        const vehicleType = req.query.vehicleType;
        const bookingType = req.query.bookingType; // Filter by booking type
        const paymentMethod = req.query.paymentMethod; // Filter by payment method (cashOnArrival, cardOnArrival)
        const page = parseInt(req.query.page || "1");
        const limit = parseInt(req.query.limit || "20");
        const sort = req.query.sort || "pickupDate";
        const order = req.query.order || "desc";
        // Build query with filters
        let query = firebase_1.firestore.collection("bookings");
        // Apply filters if provided
        if (startDate) {
            query = query.where("pickupDate", ">=", startDate);
        }
        if (endDate) {
            query = query.where("pickupDate", "<=", endDate);
        }
        if (status) {
            query = query.where("status", "==", status);
        }
        if (vehicleType) {
            query = query.where("vehicle.id", "==", vehicleType);
        }
        if (bookingType) {
            query = query.where("bookingType", "==", bookingType);
        }
        // Get total count for pagination
        const countSnapshot = await query.get();
        const total = countSnapshot.size;
        // Apply sorting and pagination
        query = query.orderBy(sort, order === "asc" ? "asc" : "desc");
        // Calculate pagination
        const offset = (page - 1) * limit;
        query = query.limit(limit).offset(offset);
        // Execute query
        const snapshot = await query.get();
        // Helper function to generate Google Maps links
        const generateGoogleMapsLink = (coordinates, address) => {
            if (!coordinates)
                return null;
            return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&t=m&z=15`;
        };
        // Map results to comprehensive bookings array
        const bookings = [];
        snapshot.forEach((doc) => {
            const bookingData = doc.data();
            // Enhanced booking object with ALL available data
            const enhancedBooking = {
                // =====================================================
                // 1. CORE BOOKING INFORMATION
                // =====================================================
                id: doc.id,
                firebaseId: doc.id, // Firebase document ID for API operations
                referenceNumber: bookingData.referenceNumber || "N/A", // Business reference (XEQ_XXX)
                userId: bookingData.userId || "N/A",
                status: bookingData.status || "pending",
                bookingType: bookingData.bookingType || "one-way",
                pickupDate: bookingData.pickupDate || "N/A",
                pickupTime: bookingData.pickupTime || "N/A",
                createdAt: bookingData.createdAt || "N/A",
                updatedAt: bookingData.updatedAt || "N/A",
                waitingTime: bookingData.waitingTime || 0,
                // =====================================================
                // 2. CUSTOMER INFORMATION
                // =====================================================
                customer: {
                    fullName: bookingData.customer?.fullName || "N/A",
                    email: bookingData.customer?.email || "N/A",
                    phoneNumber: bookingData.customer?.phoneNumber || "N/A",
                },
                // =====================================================
                // 3. LOCATION INFORMATION WITH GOOGLE MAPS LINKS
                // =====================================================
                locations: {
                    pickup: {
                        address: bookingData.locations?.pickup?.address || "Pickup location not specified",
                        coordinates: bookingData.locations?.pickup?.coordinates || null,
                        googleMapsLink: generateGoogleMapsLink(bookingData.locations?.pickup?.coordinates || null, bookingData.locations?.pickup?.address || ""),
                    },
                    dropoff: {
                        address: bookingData.locations?.dropoff?.address || "Dropoff location not specified",
                        coordinates: bookingData.locations?.dropoff?.coordinates || null,
                        googleMapsLink: generateGoogleMapsLink(bookingData.locations?.dropoff?.coordinates || null, bookingData.locations?.dropoff?.address || ""),
                    },
                    additionalStops: (bookingData.locations?.additionalStops || []).map((stop) => ({
                        address: stop.address || "Stop location not specified",
                        coordinates: stop.coordinates || null,
                        googleMapsLink: generateGoogleMapsLink(stop.coordinates || null, stop.address || ""),
                    })),
                },
                // =====================================================
                // 4. JOURNEY DETAILS
                // =====================================================
                journey: {
                    distance_miles: bookingData.journey?.distance_miles || 0,
                    duration_minutes: bookingData.journey?.duration_minutes || 0,
                },
                // =====================================================
                // 5. VEHICLE & PRICING INFORMATION
                // =====================================================
                vehicle: {
                    id: bookingData.vehicle?.id || "N/A",
                    name: bookingData.vehicle?.name || "Vehicle not specified",
                    price: {
                        amount: bookingData.vehicle?.price?.amount || 0,
                        currency: bookingData.vehicle?.price?.currency || "GBP",
                    },
                },
                // Legacy price field for backward compatibility
                price: {
                    amount: bookingData.price?.amount || bookingData.vehicle?.price?.amount || 0,
                    currency: bookingData.price?.currency || bookingData.vehicle?.price?.currency || "GBP",
                },
                // =====================================================
                // 6. PASSENGER & LUGGAGE DETAILS
                // =====================================================
                passengers: {
                    count: bookingData.passengers?.count || 0,
                    checkedLuggage: bookingData.passengers?.checkedLuggage || 0,
                    handLuggage: bookingData.passengers?.handLuggage || 0,
                    mediumLuggage: bookingData.passengers?.mediumLuggage || 0,
                    babySeat: bookingData.passengers?.babySeat || 0,
                    childSeat: bookingData.passengers?.childSeat || 0,
                    boosterSeat: bookingData.passengers?.boosterSeat || 0,
                    wheelchair: bookingData.passengers?.wheelchair || 0,
                },
                // =====================================================
                // 7. SPECIAL REQUIREMENTS
                // =====================================================
                specialRequests: bookingData.specialRequests || "",
                // =====================================================
                // 8. ADDITIONAL STOPS (LEGACY FORMAT)
                // =====================================================
                additionalStops: bookingData.additionalStops || [],
                // =====================================================
                // 9. PAYMENT METHODS
                // =====================================================
                paymentMethods: bookingData.paymentMethods || null,
                // =====================================================
                // 10. RETURN BOOKING INFORMATION
                // =====================================================
                returnDate: bookingData.returnDate || null,
                returnTime: bookingData.returnTime || null,
                returnDiscount: bookingData.returnDiscount || 0,
                // =====================================================
                // 11. SERVICE DURATION (HOURLY BOOKINGS)
                // =====================================================
                hours: bookingData.hours || null,
                // =====================================================
                // 12. TRAVEL INFORMATION
                // =====================================================
                travelInformation: bookingData.travelInformation || null,
                // =====================================================
                // 13. BOOKING TIMELINE (STATUS HISTORY)
                // =====================================================
                timeline: [
                    {
                        status: "created",
                        timestamp: bookingData.createdAt || "N/A",
                        updatedBy: "system",
                        description: "Booking created"
                    },
                    ...(bookingData.status !== "pending" ? [{
                            status: bookingData.status,
                            timestamp: bookingData.updatedAt || "N/A",
                            updatedBy: "system",
                            description: `Booking ${bookingData.status}`
                        }] : [])
                ],
                // =====================================================
                // 14. SYSTEM METADATA
                // =====================================================
                metadata: {
                    documentId: doc.id,
                    referenceNumber: bookingData.referenceNumber || "N/A",
                    bookingType: bookingData.bookingType || "one-way",
                    hasCoordinates: !!(bookingData.locations?.pickup?.coordinates),
                    hasDropoff: !!(bookingData.locations?.dropoff?.address),
                    hasPaymentMethod: !!(bookingData.paymentMethods),
                    isReturnBooking: bookingData.bookingType === "return",
                    isHourlyBooking: bookingData.bookingType === "hourly",
                }
            };
            bookings.push(enhancedBooking);
        });
        // Apply post-query filters for payment methods and wait duration
        let filteredBookings = bookings;
        if (paymentMethod) {
            filteredBookings = filteredBookings.filter(booking => {
                if (!booking.paymentMethods)
                    return false;
                if (paymentMethod === "cashOnArrival")
                    return booking.paymentMethods.cashOnArrival === true;
                if (paymentMethod === "cardOnArrival")
                    return booking.paymentMethods.cardOnArrival === true;
                return false;
            });
        }
        // Apply pagination to filtered results
        const filteredTotal = filteredBookings.length;
        const paginatedBookings = filteredBookings.slice((page - 1) * limit, page * limit);
        const pages = Math.ceil(filteredTotal / limit);
        // Calculate pagination information
        return res.json({
            success: true,
            data: {
                bookings: paginatedBookings,
                pagination: {
                    total: filteredTotal,
                    pages,
                    currentPage: page,
                    limit,
                },
                // ⚠️ IMPORTANT: Reference Number Usage Guide
                referenceNumberGuide: {
                    display: "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
                    apiOperations: "Use 'firebaseId' field for API calls like updates and cancellations",
                    warning: "Never display Firebase IDs to users - they are internal system identifiers",
                },
                // 📊 Complete Data Structure Information
                dataStructure: {
                    totalFields: 14,
                    sections: [
                        "Core Booking Information (id, referenceNumber, status, etc.)",
                        "Customer Information (fullName, email, phoneNumber)",
                        "Location Information (pickup, dropoff, additionalStops with Google Maps links)",
                        "Journey Details (distance_miles, duration_minutes)",
                        "Vehicle & Pricing (id, name, price with currency)",
                        "Passenger & Luggage Details (count, all luggage types, seats)",
                        "Special Requirements (specialRequests)",
                        "Additional Stops (legacy format)",
                        "Payment Methods (cashOnArrival, cardOnArrival)",
                        "Return Booking Information (returnType, returnDate, waitDuration)",
                        "Service Duration (hours for hourly bookings)",
                        "Travel Information (flight/train details)",
                        "Booking Timeline (status history)",
                        "System Metadata (flags and indicators)"
                    ],
                    googleMapsIntegration: {
                        pickup: "Clickable Google Maps link for pickup location",
                        dropoff: "Clickable Google Maps link for dropoff location",
                        additionalStops: "Clickable Google Maps links for all additional stops",
                        note: "Links open in new tab with exact coordinates and zoom level 15"
                    },
                    coordinates: {
                        format: "{ lat: number, lng: number }",
                        availability: "Available for pickup, dropoff, and additional stops",
                        googleMapsFormat: "https://www.google.com/maps?q=lat,lng&t=m&z=15"
                    }
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching bookings:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch bookings",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Get booking calendar data with enhanced information
router.get("/bookings/calendar", async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const status = req.query.status;
        const bookingType = req.query.bookingType; // NEW: Filter by booking type
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Start date and end date are required",
                },
            });
        }
        // Build query
        let query = firebase_1.firestore
            .collection("bookings")
            .where("pickupDate", ">=", startDate)
            .where("pickupDate", "<=", endDate);
        if (status) {
            query = query.where("status", "==", status);
        }
        if (bookingType) {
            query = query.where("bookingType", "==", bookingType);
        }
        // Execute query
        const snapshot = await query.get();
        // Format data for calendar with enhanced information
        const events = [];
        snapshot.forEach((doc) => {
            const booking = doc.data();
            // Calculate end time based on duration or hours
            const startTime = `${booking.pickupDate}T${booking.pickupTime}:00`;
            let durationMinutes = 60; // Default to 1 hour
            if (booking.bookingType === "hourly" && booking.hours) {
                durationMinutes = booking.hours * 60; // Convert hours to minutes
            }
            else if (booking.journey?.duration_minutes) {
                durationMinutes = booking.journey.duration_minutes;
            }
            const endTime = new Date(new Date(startTime).getTime() + durationMinutes * 60000).toISOString();
            // Enhanced event object with proper reference number handling
            const enhancedEvent = {
                id: doc.id,
                // ⚠️ IMPORTANT: Use referenceNumber for display, NOT Firebase ID
                referenceNumber: booking.referenceNumber || "N/A",
                firebaseId: doc.id, // Keep Firebase ID for API operations
                title: `${booking.customer?.fullName || "Unknown"} - ${booking.vehicle?.name || "Vehicle"} (${booking.bookingType || "one-way"})`,
                start: startTime,
                end: endTime,
                // Booking Information
                status: booking.status || "pending",
                bookingType: booking.bookingType || "one-way",
                // Customer Information
                customer: {
                    fullName: booking.customer?.fullName || "Unknown",
                    email: booking.customer?.email || "N/A",
                    phoneNumber: booking.customer?.phoneNumber || "N/A",
                },
                // Location Information (with safe access)
                pickupLocation: booking.locations?.pickup?.address || "Pickup location not specified",
                dropoffLocation: booking.bookingType === "hourly" ? "Hourly booking - driver stays with you" : (booking.locations?.dropoff?.address || "Dropoff location not specified"),
                // Vehicle Information
                vehicleType: booking.vehicle?.name || "Vehicle not specified",
                vehicleId: booking.vehicle?.id || "N/A",
                // Special Booking Types
                hours: booking.hours || null, // For hourly bookings
                returnDate: booking.returnDate || null,
                returnTime: booking.returnTime || null,
                // Payment Methods
                paymentMethods: booking.paymentMethods || null,
                // Journey Information
                distance_miles: booking.journey?.distance_miles || 0,
                duration_minutes: durationMinutes,
                // Price Information
                price: {
                    amount: booking.vehicle?.price?.amount || 0,
                    currency: booking.vehicle?.price?.currency || "GBP",
                },
                // Additional Information
                additionalStops: booking.additionalStops || [],
                specialRequests: booking.specialRequests || "",
            };
            events.push(enhancedEvent);
        });
        return res.json({
            success: true,
            data: {
                events,
                // ⚠️ IMPORTANT: Reference Number Usage Guide
                referenceNumberGuide: {
                    display: "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
                    apiOperations: "Use 'firebaseId' field for API calls like updates and cancellations",
                    warning: "Never display Firebase IDs to users - they are internal system identifiers",
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching calendar data:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch calendar data",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Get booking details with enhanced information
router.get("/bookings/:id", async (req, res) => {
    try {
        const bookingId = req.params.id;
        // Get booking document
        const bookingDoc = await firebase_1.firestore
            .collection("bookings")
            .doc(bookingId)
            .get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "RESOURCE_NOT_FOUND",
                    message: "Booking not found",
                },
            });
        }
        // Get timeline from booking history subcollection
        const timelineSnapshot = await bookingDoc.ref
            .collection("history")
            .orderBy("timestamp", "asc")
            .get();
        const timeline = [];
        timelineSnapshot.forEach((doc) => {
            timeline.push(doc.data());
        });
        // Enhanced booking data with proper reference number handling
        const bookingData = bookingDoc.data();
        if (!bookingData) {
            return res.status(500).json({
                success: false,
                error: {
                    code: "DATA_ERROR",
                    message: "Booking data is corrupted or missing",
                },
            });
        }
        // Helper function to generate Google Maps links
        const generateGoogleMapsLink = (coordinates, address) => {
            if (!coordinates)
                return null;
            return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&t=m&z=15`;
        };
        const enhancedBooking = {
            // =====================================================
            // 1. CORE BOOKING INFORMATION
            // =====================================================
            id: bookingDoc.id,
            firebaseId: bookingDoc.id, // Firebase document ID for API operations
            referenceNumber: bookingData.referenceNumber || "N/A", // Business reference (XEQ_XXX)
            userId: bookingData.userId || "N/A",
            status: bookingData.status || "pending",
            bookingType: bookingData.bookingType || "one-way",
            pickupDate: bookingData.pickupDate || "N/A",
            pickupTime: bookingData.pickupTime || "N/A",
            createdAt: bookingData.createdAt || "N/A",
            updatedAt: bookingData.updatedAt || "N/A",
            waitingTime: bookingData.waitingTime || 0,
            // =====================================================
            // 2. CUSTOMER INFORMATION
            // =====================================================
            customer: {
                fullName: bookingData.customer?.fullName || "N/A",
                email: bookingData.customer?.email || "N/A",
                phoneNumber: bookingData.customer?.phoneNumber || "N/A",
            },
            // =====================================================
            // 3. LOCATION INFORMATION WITH GOOGLE MAPS LINKS
            // =====================================================
            locations: {
                pickup: {
                    address: bookingData.locations?.pickup?.address || "Pickup location not specified",
                    coordinates: bookingData.locations?.pickup?.coordinates || null,
                    googleMapsLink: generateGoogleMapsLink(bookingData.locations?.pickup?.coordinates || null, bookingData.locations?.pickup?.address || ""),
                },
                dropoff: {
                    address: bookingData.locations?.dropoff?.address || "Dropoff location not specified",
                    coordinates: bookingData.locations?.dropoff?.coordinates || null,
                    googleMapsLink: generateGoogleMapsLink(bookingData.locations?.dropoff?.coordinates || null, bookingData.locations?.dropoff?.address || ""),
                },
                additionalStops: (bookingData.locations?.additionalStops || []).map((stop) => ({
                    address: stop.address || "Stop location not specified",
                    coordinates: stop.coordinates || null,
                    googleMapsLink: generateGoogleMapsLink(stop.coordinates || null, stop.address || ""),
                })),
            },
            // =====================================================
            // 4. JOURNEY DETAILS
            // =====================================================
            journey: {
                distance_miles: bookingData.journey?.distance_miles || 0,
                duration_minutes: bookingData.journey?.duration_minutes || 0,
            },
            // =====================================================
            // 5. VEHICLE & PRICING INFORMATION
            // =====================================================
            vehicle: {
                id: bookingData.vehicle?.id || "N/A",
                name: bookingData.vehicle?.name || "Vehicle not specified",
                price: {
                    amount: bookingData.vehicle?.price?.amount || 0,
                    currency: bookingData.vehicle?.price?.currency || "GBP",
                },
            },
            // Legacy price field for backward compatibility
            price: {
                amount: bookingData.price?.amount || bookingData.vehicle?.price?.amount || 0,
                currency: bookingData.price?.currency || bookingData.vehicle?.price?.currency || "GBP",
            },
            // =====================================================
            // 6. PASSENGER & LUGGAGE DETAILS
            // =====================================================
            passengers: {
                count: bookingData.passengers?.count || 0,
                checkedLuggage: bookingData.passengers?.checkedLuggage || 0,
                handLuggage: bookingData.passengers?.handLuggage || 0,
                mediumLuggage: bookingData.passengers?.mediumLuggage || 0,
                babySeat: bookingData.passengers?.babySeat || 0,
                childSeat: bookingData.passengers?.childSeat || 0,
                boosterSeat: bookingData.passengers?.boosterSeat || 0,
                wheelchair: bookingData.passengers?.wheelchair || 0,
            },
            // =====================================================
            // 7. SPECIAL REQUIREMENTS
            // =====================================================
            specialRequests: bookingData.specialRequests || "",
            // =====================================================
            // 8. ADDITIONAL STOPS (LEGACY FORMAT)
            // =====================================================
            additionalStops: bookingData.additionalStops || [],
            // =====================================================
            // 9. PAYMENT METHODS
            // =====================================================
            paymentMethods: bookingData.paymentMethods || null,
            // =====================================================
            // 10. RETURN BOOKING INFORMATION
            // =====================================================
            returnDate: bookingData.returnDate || null,
            returnTime: bookingData.returnTime || null,
            returnDiscount: bookingData.returnDiscount || 0,
            // =====================================================
            // 11. SERVICE DURATION (HOURLY BOOKINGS)
            // =====================================================
            hours: bookingData.hours || null,
            // =====================================================
            // 12. TRAVEL INFORMATION
            // =====================================================
            travelInformation: bookingData.travelInformation || null,
            // =====================================================
            // 13. BOOKING TIMELINE (STATUS HISTORY)
            // =====================================================
            timeline: timeline.length > 0 ? timeline : [
                {
                    status: "created",
                    timestamp: bookingData.createdAt || "N/A",
                    updatedBy: "system",
                    description: "Booking created"
                },
                ...(bookingData.status !== "pending" ? [{
                        status: bookingData.status,
                        timestamp: bookingData.updatedAt || "N/A",
                        updatedBy: "system",
                        description: `Booking ${bookingData.status}`
                    }] : [])
            ],
            // =====================================================
            // 14. SYSTEM METADATA
            // =====================================================
            metadata: {
                documentId: bookingDoc.id,
                referenceNumber: bookingData.referenceNumber || "N/A",
                bookingType: bookingData.bookingType || "one-way",
                hasCoordinates: !!(bookingData.locations?.pickup?.coordinates),
                hasDropoff: !!(bookingData.locations?.dropoff?.address),
                hasPaymentMethod: !!(bookingData.paymentMethods),
                isReturnBooking: bookingData.bookingType === "return",
                isHourlyBooking: bookingData.bookingType === "hourly",
            }
        };
        // Return enhanced booking with timeline
        return res.json({
            success: true,
            data: enhancedBooking,
            // ⚠️ IMPORTANT: Reference Number Usage Guide
            referenceNumberGuide: {
                display: "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
                apiOperations: "Use 'firebaseId' field for API calls like updates and cancellations",
                warning: "Never display Firebase IDs to users - they are internal system identifiers",
            },
        });
    }
    catch (error) {
        console.error("Error fetching booking details:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch booking details",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// NEW: Get separated bookings by type (Events vs Taxi)
router.get("/bookings/separated", async (req, res) => {
    try {
        // Extract query parameters
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const status = req.query.status;
        const page = parseInt(req.query.page || "1");
        const limit = parseInt(req.query.limit || "20");
        // Build base query
        let query = firebase_1.firestore.collection("bookings");
        // Apply filters if provided
        if (startDate) {
            query = query.where("pickupDate", ">=", startDate);
        }
        if (endDate) {
            query = query.where("pickupDate", "<=", endDate);
        }
        if (status) {
            query = query.where("status", "==", status);
        }
        // Execute query to get all bookings
        const snapshot = await query.get();
        // Separate bookings by type
        const eventsBookings = []; // Hourly bookings
        const taxiBookings = []; // One-way and return bookings
        snapshot.forEach((doc) => {
            const bookingData = doc.data();
            // Enhanced booking object with proper reference number handling
            const enhancedBooking = {
                id: doc.id,
                // ⚠️ IMPORTANT: Use referenceNumber for display, NOT Firebase ID
                referenceNumber: bookingData.referenceNumber || "N/A",
                firebaseId: doc.id, // Keep Firebase ID for API operations
                // Customer Information
                customer: {
                    fullName: bookingData.customer?.fullName || "N/A",
                    email: bookingData.customer?.email || "N/A",
                    phoneNumber: bookingData.customer?.phoneNumber || "N/A",
                },
                // Booking Details
                bookingType: bookingData.bookingType || "one-way",
                status: bookingData.status || "pending",
                pickupDate: bookingData.pickupDate || "N/A",
                pickupTime: bookingData.pickupTime || "N/A",
                // Location Information (with safe access)
                locations: {
                    pickup: {
                        address: bookingData.locations?.pickup?.address || "Pickup location not specified",
                        coordinates: bookingData.locations?.pickup?.coordinates || null,
                    },
                    dropoff: {
                        address: bookingData.locations?.dropoff?.address || "Dropoff location not specified",
                        coordinates: bookingData.locations?.dropoff?.coordinates || null,
                    },
                    additionalStops: bookingData.locations?.additionalStops || [],
                },
                // Vehicle Information
                vehicle: {
                    id: bookingData.vehicle?.id || "N/A",
                    name: bookingData.vehicle?.name || "Vehicle not specified",
                    price: {
                        amount: bookingData.vehicle?.price?.amount || 0,
                        currency: bookingData.vehicle?.price?.currency || "GBP",
                    },
                    // Add hourly rate for hourly bookings
                    ...(bookingData.bookingType === "hourly" && {
                        hourlyRate: getHourlyRateForVehicle(bookingData.vehicle?.id || "N/A")
                    }),
                },
                // Journey Information
                journey: {
                    distance_miles: bookingData.journey?.distance_miles || 0,
                    duration_minutes: bookingData.journey?.duration_minutes || 0,
                },
                // Special Booking Types
                hours: bookingData.hours || null, // For hourly bookings
                // For return bookings
                returnDate: bookingData.returnDate || null,
                returnTime: bookingData.returnTime || null,
                // Additional Information
                passengers: bookingData.passengers || {},
                specialRequests: bookingData.specialRequests || "",
                additionalStops: bookingData.additionalStops || [],
                waitingTime: bookingData.waitingTime || 0,
                // Metadata
                userId: bookingData.userId || "N/A",
                createdAt: bookingData.createdAt || "N/A",
                updatedAt: bookingData.updatedAt || "N/A",
            };
            // Categorize by booking type
            if (bookingData.bookingType === "hourly") {
                eventsBookings.push(enhancedBooking);
            }
            else {
                // One-way and return bookings go to taxi bookings
                taxiBookings.push(enhancedBooking);
            }
        });
        // Sort both arrays by creation date (newest first)
        eventsBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        taxiBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Apply pagination to both arrays
        const eventsStart = (page - 1) * limit;
        const eventsEnd = eventsStart + limit;
        const taxiStart = (page - 1) * limit;
        const taxiEnd = taxiStart + limit;
        const paginatedEvents = eventsBookings.slice(eventsStart, eventsEnd);
        const paginatedTaxi = taxiBookings.slice(taxiStart, taxiEnd);
        // Calculate pagination information
        const totalEvents = eventsBookings.length;
        const totalTaxi = taxiBookings.length;
        const totalBookings = totalEvents + totalTaxi;
        const pages = Math.ceil(totalBookings / limit);
        return res.json({
            success: true,
            data: {
                // Events Bookings (Hourly)
                events: {
                    bookings: paginatedEvents,
                    total: totalEvents,
                    currentPage: page,
                    pages: Math.ceil(totalEvents / limit),
                    limit,
                },
                // Taxi Bookings (One-way and Return)
                taxi: {
                    bookings: paginatedTaxi,
                    total: totalTaxi,
                    currentPage: page,
                    pages: Math.ceil(totalTaxi / limit),
                    limit,
                },
                // Combined Statistics
                combined: {
                    total: totalBookings,
                    totalPages: pages,
                    currentPage: page,
                    limit,
                },
                // ⚠️ IMPORTANT: Reference Number Usage Guide
                referenceNumberGuide: {
                    display: "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
                    apiOperations: "Use 'firebaseId' field for API calls like updates and cancellations",
                    warning: "Never display Firebase IDs to users - they are internal system identifiers",
                },
                // Booking Type Definitions
                bookingTypeDefinitions: {
                    events: "Hourly bookings (3-24 hours) - driver stays with you throughout",
                    taxi: "One-way and return journeys - point-to-point transportation",
                    hourly: "Continuous service for specified hours, no dropoff required",
                    oneWay: "Single journey from pickup to dropoff location",
                    return: "Round-trip journey with smart reverse route (no discount)",
                    waitAndReturn: "Driver waits at destination and returns (up to 24 hours)",
                    laterDate: "Scheduled return on different date/time",
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching separated bookings:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch separated bookings",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// NEW: Get booking statistics by type
router.get("/bookings/statistics", async (req, res) => {
    try {
        // Extract query parameters
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        // Build base query
        let query = firebase_1.firestore.collection("bookings");
        // Apply date filters if provided
        if (startDate) {
            query = query.where("pickupDate", ">=", startDate);
        }
        if (endDate) {
            query = query.where("pickupDate", "<=", endDate);
        }
        // Execute query to get all bookings
        const snapshot = await query.get();
        // Initialize statistics
        const stats = {
            total: 0,
            byType: {
                hourly: { count: 0, revenue: 0, avgHours: 0, totalHours: 0 },
                "one-way": { count: 0, revenue: 0, avgDistance: 0, totalDistance: 0 },
                return: { count: 0, revenue: 0, avgDistance: 0, totalDistance: 0, returnDiscounts: 0 },
            },
            byStatus: {
                pending: 0,
                confirmed: 0,
                assigned: 0,
                "in_progress": 0,
                completed: 0,
                cancelled: 0,
                declined: 0,
                "no_show": 0,
            },
            byVehicle: {},
            topRoutes: [],
            revenue: {
                total: 0,
                hourly: 0,
                "one-way": 0,
                return: 0,
            },
        };
        // Process each booking
        snapshot.forEach((doc) => {
            const booking = doc.data();
            stats.total++;
            // Count by status
            const status = booking.status || "pending";
            if (status in stats.byStatus) {
                stats.byStatus[status]++;
            }
            else {
                // Handle unknown statuses
                stats.byStatus.pending++;
            }
            // Count by vehicle type
            const vehicleName = booking.vehicle?.name || "Unknown";
            if (!stats.byVehicle[vehicleName]) {
                stats.byVehicle[vehicleName] = { count: 0, revenue: 0 };
            }
            stats.byVehicle[vehicleName].count++;
            // Calculate revenue
            const amount = booking.vehicle?.price?.amount || 0;
            stats.revenue.total += amount;
            stats.byVehicle[vehicleName].revenue += amount;
            // Process by booking type
            const bookingType = booking.bookingType || "one-way";
            if (bookingType === "hourly") {
                stats.byType.hourly.count++;
                stats.byType.hourly.revenue += amount;
                stats.revenue.hourly += amount;
                const hours = booking.hours || 0;
                stats.byType.hourly.totalHours += hours;
            }
            else if (bookingType === "one-way") {
                stats.byType["one-way"].count++;
                stats.byType["one-way"].revenue += amount;
                stats.revenue["one-way"] += amount;
                const distance = booking.journey?.distance_miles || 0;
                stats.byType["one-way"].totalDistance += distance;
            }
            else if (bookingType === "return") {
                stats.byType.return.count++;
                stats.byType.return.revenue += amount;
                stats.revenue.return += amount;
                stats.byType.return.returnDiscounts++;
                const distance = booking.journey?.distance_miles || 0;
                stats.byType.return.totalDistance += distance;
            }
            // Track routes for top routes calculation
            if (booking.locations?.pickup?.address && booking.locations?.dropoff?.address) {
                const route = `${booking.locations.pickup.address} → ${booking.locations.dropoff.address}`;
                const existingRoute = stats.topRoutes.find(r => r.route === route);
                if (existingRoute) {
                    existingRoute.count++;
                }
                else {
                    stats.topRoutes.push({ route, count: 1 });
                }
            }
        });
        // Calculate averages
        if (stats.byType.hourly.count > 0) {
            stats.byType.hourly.avgHours = parseFloat((stats.byType.hourly.totalHours / stats.byType.hourly.count).toFixed(1));
        }
        if (stats.byType["one-way"].count > 0) {
            stats.byType["one-way"].avgDistance = parseFloat((stats.byType["one-way"].totalDistance / stats.byType["one-way"].count).toFixed(1));
        }
        if (stats.byType.return.count > 0) {
            stats.byType.return.avgDistance = parseFloat((stats.byType.return.totalDistance / stats.byType.return.count).toFixed(1));
        }
        // Sort top routes by count
        stats.topRoutes.sort((a, b) => b.count - a.count);
        stats.topRoutes = stats.topRoutes.slice(0, 10); // Top 10 routes
        // Sort vehicle stats by revenue
        const sortedVehicles = Object.entries(stats.byVehicle)
            .sort(([, a], [, b]) => b.revenue - a.revenue)
            .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
        return res.json({
            success: true,
            data: {
                ...stats,
                byVehicle: sortedVehicles,
                // ⚠️ IMPORTANT: Reference Number Usage Guide
                referenceNumberGuide: {
                    display: "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
                    apiOperations: "Use 'firebaseId' field for API calls like updates and cancellations",
                    warning: "Never display Firebase IDs to users - they are internal system identifiers",
                },
                // Booking Type Definitions
                bookingTypeDefinitions: {
                    hourly: "Continuous service for specified hours, no dropoff required",
                    "one-way": "Single journey from pickup to dropoff location",
                    return: "Round-trip journey with smart reverse route (no discount)",
                    waitAndReturn: "Driver waits at destination and returns (up to 24 hours)",
                    laterDate: "Scheduled return on different date/time",
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching booking statistics:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch booking statistics",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Update booking (basic update)
router.put("/bookings/:id/basic", async (req, res) => {
    try {
        const bookingId = req.params.id;
        const updateData = req.body;
        // Get booking document
        const bookingDoc = await firebase_1.firestore
            .collection("bookings")
            .doc(bookingId)
            .get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "RESOURCE_NOT_FOUND",
                    message: "Booking not found",
                },
            });
        }
        // Add metadata
        const updatedFields = Object.keys(updateData);
        updateData.updatedAt = new Date().toISOString();
        updateData.updatedBy = req.user?.uid;
        // Update booking
        await bookingDoc.ref.update(updateData);
        // If status is being updated, add to history
        if (updateData.status &&
            updateData.status !== bookingDoc.data()?.status) {
            await bookingDoc.ref.collection("history").add({
                status: updateData.status,
                timestamp: new Date().toISOString(),
                updatedBy: req.user?.uid,
            });
        }
        return res.json({
            success: true,
            data: {
                id: bookingId,
                message: "Booking updated successfully",
                updatedFields,
            },
        });
    }
    catch (error) {
        console.error("Error updating booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to update booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Delete booking
router.delete("/bookings/:id", async (req, res) => {
    try {
        const bookingId = req.params.id;
        // Get booking document
        const bookingDoc = await firebase_1.firestore
            .collection("bookings")
            .doc(bookingId)
            .get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "RESOURCE_NOT_FOUND",
                    message: "Booking not found",
                },
            });
        }
        // Delete booking history subcollection first
        const historySnapshot = await bookingDoc.ref.collection("history").get();
        const batch = firebase_1.firestore.batch();
        historySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        // Delete booking document
        batch.delete(bookingDoc.ref);
        // Commit batch delete
        await batch.commit();
        return res.json({
            success: true,
            data: {
                message: "Booking deleted successfully",
                id: bookingId,
            },
        });
    }
    catch (error) {
        console.error("Error deleting booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to delete booking",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// =====================================================
// User Management
// =====================================================
// Get all users
router.get("/users", async (req, res) => {
    try {
        // Extract query parameters
        const role = req.query.role;
        const query = req.query.query;
        const page = parseInt(req.query.page || "1");
        const limit = parseInt(req.query.limit || "20");
        // Build query
        let dbQuery = firebase_1.firestore.collection("users");
        if (role) {
            dbQuery = dbQuery.where("role", "==", role);
        }
        // Get total count for pagination
        const countSnapshot = await dbQuery.get();
        const total = countSnapshot.size;
        // Apply pagination
        dbQuery = dbQuery
            .orderBy("createdAt", "desc")
            .limit(limit)
            .offset((page - 1) * limit);
        // Execute query
        const snapshot = await dbQuery.get();
        // Map results to users array
        const users = [];
        const userIds = [];
        snapshot.forEach((doc) => {
            userIds.push(doc.id);
            users.push({
                uid: doc.id,
                ...doc.data(),
                bookingsCount: 0, // Will be populated later
            });
        });
        // Get booking counts for each user
        if (userIds.length > 0) {
            // We can only do "in" queries with up to 10 values, so we might need to batch
            const batches = [];
            for (let i = 0; i < userIds.length; i += 10) {
                const batchIds = userIds.slice(i, i + 10);
                batches.push(firebase_1.firestore.collection("bookings").where("userId", "in", batchIds).get());
            }
            const bookingsData = await Promise.all(batches);
            const bookingCounts = {};
            // Count bookings per user
            bookingsData.forEach((snapshot) => {
                snapshot.forEach((doc) => {
                    const userId = doc.data().userId;
                    bookingCounts[userId] = (bookingCounts[userId] || 0) + 1;
                });
            });
            // Add booking counts to users
            users.forEach((user) => {
                user.bookingsCount = bookingCounts[user.uid] || 0;
            });
        }
        // Filter by query string if provided
        let filteredUsers = users;
        if (query) {
            const searchTerm = query.toLowerCase();
            filteredUsers = users.filter((user) => user.email?.toLowerCase().includes(searchTerm) ||
                user.displayName?.toLowerCase().includes(searchTerm) ||
                user.fullName?.toLowerCase().includes(searchTerm));
        }
        // Calculate pagination information
        const filteredTotal = query ? filteredUsers.length : total;
        const pages = Math.ceil(filteredTotal / limit);
        return res.json({
            success: true,
            data: {
                users: filteredUsers,
                pagination: {
                    total: filteredTotal,
                    pages,
                    currentPage: page,
                    limit,
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch users",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Get user details
router.get("/users/:uid", async (req, res) => {
    try {
        const userId = req.params.uid;
        // Get user document
        const userDoc = await firebase_1.firestore.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "RESOURCE_NOT_FOUND",
                    message: "User not found",
                },
            });
        }
        // Get user's bookings
        const bookingsSnapshot = await firebase_1.firestore
            .collection("bookings")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(5)
            .get();
        const recentBookings = [];
        bookingsSnapshot.forEach((doc) => {
            const data = doc.data();
            recentBookings.push({
                id: doc.id,
                pickupDate: data.pickupDate,
                status: data.status,
                amount: data.vehicle?.price?.amount || 0,
            });
        });
        // Calculate user stats
        const allBookingsSnapshot = await firebase_1.firestore
            .collection("bookings")
            .where("userId", "==", userId)
            .get();
        let totalBookings = 0;
        let completedBookings = 0;
        let cancelledBookings = 0;
        let totalSpent = 0;
        allBookingsSnapshot.forEach((doc) => {
            const data = doc.data();
            totalBookings++;
            if (data.status === "completed") {
                completedBookings++;
                totalSpent += data.vehicle?.price?.amount || 0;
            }
            else if (data.status === "cancelled") {
                cancelledBookings++;
            }
        });
        return res.json({
            success: true,
            data: {
                user: {
                    uid: userDoc.id,
                    ...userDoc.data(),
                    stats: {
                        totalBookings,
                        completedBookings,
                        cancelledBookings,
                        totalSpent,
                    },
                },
                recentBookings,
            },
        });
    }
    catch (error) {
        console.error("Error fetching user details:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch user details",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Update user
router.put("/users/:uid", async (req, res) => {
    try {
        const userId = req.params.uid;
        const updateData = req.body;
        // Get user document
        const userDoc = await firebase_1.firestore.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "RESOURCE_NOT_FOUND",
                    message: "User not found",
                },
            });
        }
        // Update user
        const updatedFields = Object.keys(updateData);
        await userDoc.ref.update(updateData);
        return res.json({
            success: true,
            data: {
                uid: userId,
                message: "User updated successfully",
                updatedFields,
            },
        });
    }
    catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to update user",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Disable user
router.post("/users/:uid/disable", async (req, res) => {
    try {
        const userId = req.params.uid;
        // Get user document
        const userDoc = await firebase_1.firestore.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "RESOURCE_NOT_FOUND",
                    message: "User not found",
                },
            });
        }
        // Update user status
        await userDoc.ref.update({
            disabled: true,
            disabledAt: new Date().toISOString(),
            disabledBy: req.user?.uid,
        });
        return res.json({
            success: true,
            data: {
                message: "User account disabled successfully",
                uid: userId,
            },
        });
    }
    catch (error) {
        console.error("Error disabling user:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to disable user",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// =====================================================
// Filter Options and Metadata
// =====================================================
// Get available filter options for the dashboard
router.get("/filters/options", async (req, res) => {
    try {
        // Get all bookings to extract unique values
        const snapshot = await firebase_1.firestore.collection("bookings").get();
        const filterOptions = {
            bookingTypes: new Set(),
            paymentMethods: new Set(),
            vehicleTypes: new Set(),
            statuses: new Set(),
        };
        snapshot.forEach((doc) => {
            const booking = doc.data();
            // Collect booking types
            if (booking.bookingType) {
                filterOptions.bookingTypes.add(booking.bookingType);
            }
            // Collect payment methods
            if (booking.paymentMethods) {
                if (booking.paymentMethods.cashOnArrival) {
                    filterOptions.paymentMethods.add("cashOnArrival");
                }
                if (booking.paymentMethods.cardOnArrival) {
                    filterOptions.paymentMethods.add("cardOnArrival");
                }
            }
            // Collect vehicle types
            if (booking.vehicle?.id) {
                filterOptions.vehicleTypes.add(booking.vehicle.id);
            }
            // Collect statuses
            if (booking.status) {
                filterOptions.statuses.add(booking.status);
            }
        });
        return res.json({
            success: true,
            data: {
                bookingTypes: Array.from(filterOptions.bookingTypes).sort(),
                paymentMethods: Array.from(filterOptions.paymentMethods).sort(),
                vehicleTypes: Array.from(filterOptions.vehicleTypes).sort(),
                statuses: Array.from(filterOptions.statuses).sort(),
                // Filter definitions
                filterDefinitions: {
                    bookingTypes: {
                        "one-way": "Single journey from pickup to dropoff location",
                        "hourly": "Continuous service for specified hours (3-24 hours)",
                        "return": "Round-trip journey with smart reverse route"
                    },
                    paymentMethods: {
                        "cashOnArrival": "Customer pays with cash when driver arrives",
                        "cardOnArrival": "Customer pays with card when driver arrives"
                    },
                }
            }
        });
    }
    catch (error) {
        console.error("Error fetching filter options:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch filter options",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// =====================================================
// Analytics
// =====================================================
// Payment Methods Analytics
router.get("/analytics/payment-methods", async (req, res) => {
    try {
        // Extract query parameters
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        // Build base query
        let query = firebase_1.firestore.collection("bookings");
        // Apply date filters if provided
        if (startDate) {
            query = query.where("pickupDate", ">=", startDate);
        }
        if (endDate) {
            query = query.where("pickupDate", "<=", endDate);
        }
        // Execute query to get all bookings
        const snapshot = await query.get();
        // Initialize payment method statistics
        const paymentStats = {
            total: 0,
            withPaymentMethods: 0,
            withoutPaymentMethods: 0,
            byMethod: {
                cashOnArrival: 0,
                cardOnArrival: 0,
            },
            byBookingType: {
                hourly: { cash: 0, card: 0, none: 0 },
                "one-way": { cash: 0, card: 0, none: 0 },
                return: { cash: 0, card: 0, none: 0 },
            },
            revenue: {
                cashOnArrival: 0,
                cardOnArrival: 0,
                none: 0,
            },
        };
        // Process each booking
        snapshot.forEach((doc) => {
            const booking = doc.data();
            paymentStats.total++;
            const paymentMethods = booking.paymentMethods;
            const amount = booking.vehicle?.price?.amount || 0;
            const bookingType = booking.bookingType || "one-way";
            if (paymentMethods) {
                paymentStats.withPaymentMethods++;
                const hasCash = paymentMethods.cashOnArrival || false;
                const hasCard = paymentMethods.cardOnArrival || false;
                if (hasCash) {
                    paymentStats.byMethod.cashOnArrival++;
                    paymentStats.revenue.cashOnArrival += amount;
                    paymentStats.byBookingType[bookingType].cash++;
                }
                else if (hasCard) {
                    paymentStats.byMethod.cardOnArrival++;
                    paymentStats.revenue.cardOnArrival += amount;
                    paymentStats.byBookingType[bookingType].card++;
                }
            }
            else {
                paymentStats.withoutPaymentMethods++;
                paymentStats.revenue.none += amount;
                paymentStats.byBookingType[bookingType].none++;
            }
        });
        // Calculate percentages
        const percentages = {
            withPaymentMethods: paymentStats.total > 0 ? Math.round((paymentStats.withPaymentMethods / paymentStats.total) * 100) : 0,
            withoutPaymentMethods: paymentStats.total > 0 ? Math.round((paymentStats.withoutPaymentMethods / paymentStats.total) * 100) : 0,
            byMethod: {
                cashOnArrival: paymentStats.withPaymentMethods > 0 ? Math.round((paymentStats.byMethod.cashOnArrival / paymentStats.withPaymentMethods) * 100) : 0,
                cardOnArrival: paymentStats.withPaymentMethods > 0 ? Math.round((paymentStats.byMethod.cardOnArrival / paymentStats.withPaymentMethods) * 100) : 0,
            },
        };
        return res.json({
            success: true,
            data: {
                ...paymentStats,
                percentages,
                // Payment Method Definitions
                paymentMethodDefinitions: {
                    cashOnArrival: "Customer pays with cash when driver arrives",
                    cardOnArrival: "Customer pays with card when driver arrives",
                    none: "No payment method specified (to be determined later)",
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching payment methods analytics:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch payment methods analytics",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Wait Timer Analytics
router.get("/analytics/wait-timers", async (req, res) => {
    try {
        // Extract query parameters
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        // Build base query
        let query = firebase_1.firestore.collection("bookings");
        // Apply date filters if provided
        if (startDate) {
            query = query.where("pickupDate", ">=", startDate);
        }
        if (endDate) {
            query = query.where("pickupDate", "<=", endDate);
        }
        // Execute query to get all bookings
        const snapshot = await query.get();
        // Initialize wait timer statistics
        const waitStats = {
            totalReturnBookings: 0,
            byBookingType: {
                waitAndReturn: {
                    withTimer: 0,
                    withoutTimer: 0,
                    averageDuration: 0,
                },
            },
        };
        // Process each booking
        snapshot.forEach((doc) => {
            const booking = doc.data();
            if (booking.bookingType === "return") {
                waitStats.totalReturnBookings++;
            }
        });
        return res.json({
            success: true,
            data: {
                ...waitStats,
            },
        });
    }
    catch (error) {
        console.error("Error fetching wait timer analytics:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch wait timer analytics",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Dashboard overview
router.get("/analytics/overview", async (req, res) => {
    try {
        const period = req.query.period || "week";
        // Calculate date ranges based on period
        const endDate = new Date();
        let startDate = new Date();
        let previousStartDate = new Date();
        let previousEndDate = new Date();
        switch (period) {
            case "today":
                startDate.setHours(0, 0, 0, 0);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 1);
                previousEndDate = new Date(previousStartDate);
                previousEndDate.setHours(23, 59, 59, 999);
                break;
            case "week":
                startDate.setDate(startDate.getDate() - 7);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 7);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                break;
            case "month":
                startDate.setMonth(startDate.getMonth() - 1);
                previousStartDate = new Date(startDate);
                previousStartDate.setMonth(previousStartDate.getMonth() - 1);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                break;
            case "year":
                startDate.setFullYear(startDate.getFullYear() - 1);
                previousStartDate = new Date(startDate);
                previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                break;
        }
        // Convert dates to ISO strings for Firestore queries
        const startDateISO = startDate.toISOString();
        const previousStartDateISO = previousStartDate.toISOString();
        const previousEndDateISO = previousEndDate.toISOString();
        // Current period bookings
        const bookingsSnapshot = await firebase_1.firestore
            .collection("bookings")
            .where("createdAt", ">=", startDateISO)
            .get();
        // Previous period bookings
        const previousBookingsSnapshot = await firebase_1.firestore
            .collection("bookings")
            .where("createdAt", ">=", previousStartDateISO)
            .where("createdAt", "<=", previousEndDateISO)
            .get();
        // Current period users
        const usersSnapshot = await firebase_1.firestore
            .collection("users")
            .where("createdAt", ">=", startDateISO)
            .get();
        // Previous period users
        const previousUsersSnapshot = await firebase_1.firestore
            .collection("users")
            .where("createdAt", ">=", previousStartDateISO)
            .where("createdAt", "<=", previousEndDateISO)
            .get();
        // Calculate booking statistics
        let totalBookings = 0;
        let pendingBookings = 0;
        let confirmedBookings = 0;
        let completedBookings = 0;
        let cancelledBookings = 0;
        let totalRevenue = 0;
        const vehicleCounts = {};
        const routes = {};
        bookingsSnapshot.forEach((doc) => {
            const data = doc.data();
            totalBookings++;
            // Count by status
            if (data.status === "pending")
                pendingBookings++;
            else if (data.status === "confirmed")
                confirmedBookings++;
            else if (data.status === "completed")
                completedBookings++;
            else if (data.status === "cancelled")
                cancelledBookings++;
            // Calculate revenue (exclude cancelled)
            if (data.status !== "cancelled" && data.vehicle?.price?.amount) {
                totalRevenue += data.vehicle.price.amount;
            }
            // Count vehicle types
            if (data.vehicle?.name) {
                vehicleCounts[data.vehicle.name] =
                    (vehicleCounts[data.vehicle.name] || 0) + 1;
            }
            // Count routes
            if (data.locations?.pickup?.address &&
                data.locations?.dropoff?.address) {
                const route = `${data.locations.pickup.address} to ${data.locations.dropoff.address}`;
                routes[route] = (routes[route] || 0) + 1;
            }
        });
        // Calculate previous period metrics for comparison
        let previousTotalBookings = 0;
        let previousTotalRevenue = 0;
        previousBookingsSnapshot.forEach((doc) => {
            const data = doc.data();
            previousTotalBookings++;
            // Calculate revenue (exclude cancelled)
            if (data.status !== "cancelled" && data.vehicle?.price?.amount) {
                previousTotalRevenue += data.vehicle.price.amount;
            }
        });
        // Calculate percentage changes
        const bookingsComparisonPercentage = previousTotalBookings > 0
            ? ((totalBookings - previousTotalBookings) / previousTotalBookings) *
                100
            : 0;
        const revenueComparisonPercentage = previousTotalRevenue > 0
            ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
            : 0;
        const usersComparisonPercentage = previousUsersSnapshot.size > 0
            ? ((usersSnapshot.size - previousUsersSnapshot.size) /
                previousUsersSnapshot.size) *
                100
            : 0;
        // Get most booked vehicle
        let mostBookedVehicle = "";
        let mostBookedCount = 0;
        Object.entries(vehicleCounts).forEach(([vehicle, count]) => {
            if (count > mostBookedCount) {
                mostBookedVehicle = vehicle;
                mostBookedCount = count;
            }
        });
        // Create vehicle distribution array
        const totalVehicleBookings = Object.values(vehicleCounts).reduce((a, b) => a + b, 0);
        const vehicleDistribution = Object.entries(vehicleCounts).map(([name, count]) => ({
            name,
            percentage: Math.round((count / totalVehicleBookings) * 100),
        }));
        // Sort vehicle distribution by percentage (descending)
        vehicleDistribution.sort((a, b) => b.percentage - a.percentage);
        // Get popular routes
        const popularRoutes = Object.entries(routes)
            .map(([route, count]) => ({ route, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5 routes
        return res.json({
            success: true,
            data: {
                bookings: {
                    total: totalBookings,
                    pending: pendingBookings,
                    confirmed: confirmedBookings,
                    completed: completedBookings,
                    cancelled: cancelledBookings,
                    comparisonPercentage: parseFloat(bookingsComparisonPercentage.toFixed(1)),
                },
                revenue: {
                    total: parseFloat(totalRevenue.toFixed(2)),
                    currency: "GBP",
                    comparisonPercentage: parseFloat(revenueComparisonPercentage.toFixed(1)),
                },
                users: {
                    total: await firebase_1.firestore
                        .collection("users")
                        .count()
                        .get()
                        .then((snap) => snap.data().count),
                    new: usersSnapshot.size,
                    comparisonPercentage: parseFloat(usersComparisonPercentage.toFixed(1)),
                },
                vehicles: {
                    mostBooked: mostBookedVehicle,
                    distribution: vehicleDistribution,
                },
                popularRoutes,
            },
        });
    }
    catch (error) {
        console.error("Error fetching dashboard overview:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch dashboard overview",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Revenue Analytics
router.get("/analytics/revenue", async (req, res) => {
    try {
        // Extract query parameters
        const startDate = req.query.startDate ||
            new Date(new Date().setMonth(new Date().getMonth() - 1))
                .toISOString()
                .split("T")[0]; // Default to last month
        const endDate = req.query.endDate || new Date().toISOString().split("T")[0]; // Default to today
        const interval = req.query.interval || "day";
        // Prepare Firestore query
        let query = firebase_1.firestore
            .collection("bookings")
            .where("pickupDate", ">=", startDate)
            .where("pickupDate", "<=", endDate)
            .orderBy("pickupDate", "asc");
        // Execute query
        const snapshot = await query.get();
        // Calculate total revenue and averages
        let totalRevenue = 0;
        let totalBookings = 0;
        const byVehicleType = {};
        const byStatus = {};
        const timelineData = {};
        // Process bookings data
        snapshot.forEach((doc) => {
            const booking = doc.data();
            const amount = booking.vehicle?.price?.amount || 0;
            if (amount > 0) {
                totalRevenue += amount;
                totalBookings++;
                // Group by vehicle type
                const vehicleType = booking.vehicle?.name || "Unknown";
                if (!byVehicleType[vehicleType]) {
                    byVehicleType[vehicleType] = { amount: 0, count: 0 };
                }
                byVehicleType[vehicleType].amount += amount;
                byVehicleType[vehicleType].count++;
                // Group by status
                const status = booking.status || "pending";
                byStatus[status] = (byStatus[status] || 0) + amount;
                // Group by time interval
                let timeKey;
                if (interval === "day") {
                    timeKey = booking.pickupDate; // YYYY-MM-DD
                }
                else if (interval === "week") {
                    // Calculate the week start date
                    const date = new Date(booking.pickupDate);
                    const dayOfWeek = date.getDay();
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - dayOfWeek);
                    timeKey = weekStart.toISOString().split("T")[0];
                }
                else if (interval === "month") {
                    timeKey = booking.pickupDate.substring(0, 7); // YYYY-MM
                }
                if (timeKey) {
                    if (!timelineData[timeKey]) {
                        timelineData[timeKey] = { amount: 0, bookings: 0 };
                    }
                    timelineData[timeKey].amount += amount;
                    timelineData[timeKey].bookings++;
                }
            }
        });
        // Format timeline data for response
        const timeline = Object.keys(timelineData)
            .sort()
            .map((date) => ({
            date,
            amount: parseFloat(timelineData[date].amount.toFixed(2)),
            bookings: timelineData[date].bookings,
        }));
        // Format vehicle type data
        const byVehicleTypeArray = Object.entries(byVehicleType)
            .map(([type, data]) => ({
            type,
            amount: parseFloat(data.amount.toFixed(2)),
            percentage: Math.round((data.amount / totalRevenue) * 100),
        }))
            .sort((a, b) => b.amount - a.amount);
        // Format status data
        const byStatusArray = Object.entries(byStatus)
            .map(([status, amount]) => ({
            status,
            amount: parseFloat(amount.toFixed(2)),
        }))
            .sort((a, b) => b.amount - a.amount);
        // Calculate average per booking
        const averagePerBooking = totalBookings > 0
            ? parseFloat((totalRevenue / totalBookings).toFixed(2))
            : 0;
        return res.json({
            success: true,
            data: {
                total: parseFloat(totalRevenue.toFixed(2)),
                currency: "GBP",
                averagePerBooking,
                timeline,
                byVehicleType: byVehicleTypeArray,
                byStatus: byStatusArray,
            },
        });
    }
    catch (error) {
        console.error("Error fetching revenue analytics:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch revenue analytics",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Booking Analytics
router.get("/analytics/bookings", async (req, res) => {
    try {
        // Extract query parameters
        const startDate = req.query.startDate ||
            new Date(new Date().setMonth(new Date().getMonth() - 1))
                .toISOString()
                .split("T")[0]; // Default to last month
        const endDate = req.query.endDate || new Date().toISOString().split("T")[0]; // Default to today
        const interval = req.query.interval || "day";
        // Prepare Firestore query
        let query = firebase_1.firestore
            .collection("bookings")
            .where("pickupDate", ">=", startDate)
            .where("pickupDate", "<=", endDate)
            .orderBy("pickupDate", "asc");
        // Execute query
        const snapshot = await query.get();
        // Prepare data structures for analytics
        let total = 0;
        let completed = 0;
        let cancelled = 0;
        const timelineData = {};
        const byHour = {};
        const byWeekday = {};
        const byVehicleType = {};
        const cancellationReasons = {};
        // Process bookings data
        snapshot.forEach((doc) => {
            const booking = doc.data();
            total++;
            // Count by status
            if (booking.status === "completed") {
                completed++;
            }
            else if (booking.status === "cancelled") {
                cancelled++;
                // Track cancellation reasons
                const reason = booking.cancellationReason || "Not specified";
                cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;
            }
            // Group by time interval for timeline
            let timeKey;
            if (interval === "day") {
                timeKey = booking.pickupDate; // YYYY-MM-DD
            }
            else if (interval === "week") {
                // Calculate the week start date
                const date = new Date(booking.pickupDate);
                const dayOfWeek = date.getDay();
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - dayOfWeek);
                timeKey = weekStart.toISOString().split("T")[0];
            }
            else if (interval === "month") {
                timeKey = booking.pickupDate.substring(0, 7); // YYYY-MM
            }
            if (timeKey) {
                if (!timelineData[timeKey]) {
                    timelineData[timeKey] = { count: 0, completed: 0, cancelled: 0 };
                }
                timelineData[timeKey].count++;
                if (booking.status === "completed") {
                    timelineData[timeKey].completed++;
                }
                else if (booking.status === "cancelled") {
                    timelineData[timeKey].cancelled++;
                }
            }
            // Group by hour of day
            if (booking.pickupTime) {
                const hour = parseInt(booking.pickupTime.split(":")[0], 10);
                byHour[hour] = (byHour[hour] || 0) + 1;
            }
            // Group by weekday
            if (booking.pickupDate) {
                const date = new Date(booking.pickupDate);
                const weekdays = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                ];
                const weekday = weekdays[date.getDay()];
                byWeekday[weekday] = (byWeekday[weekday] || 0) + 1;
            }
            // Group by vehicle type
            const vehicleType = booking.vehicle?.name || "Unknown";
            byVehicleType[vehicleType] = (byVehicleType[vehicleType] || 0) + 1;
        });
        // Format timeline data for response
        const timeline = Object.keys(timelineData)
            .sort()
            .map((date) => ({
            date,
            count: timelineData[date].count,
            completed: timelineData[date].completed,
            cancelled: timelineData[date].cancelled,
        }));
        // Format hourly data
        const byHourArray = Object.entries(byHour)
            .map(([hour, count]) => ({
            hour: parseInt(hour, 10),
            count,
        }))
            .sort((a, b) => a.hour - b.hour);
        // Format weekday data
        const weekdayOrder = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ];
        const byWeekdayArray = weekdayOrder.map((day) => ({
            day,
            count: byWeekday[day] || 0,
        }));
        // Format vehicle type data
        const byVehicleTypeArray = Object.entries(byVehicleType)
            .map(([type, count]) => ({
            type,
            count,
        }))
            .sort((a, b) => b.count - a.count);
        // Format cancellation reasons
        const cancellationReasonsArray = Object.entries(cancellationReasons)
            .map(([reason, count]) => ({
            reason,
            count,
        }))
            .sort((a, b) => b.count - a.count);
        return res.json({
            success: true,
            data: {
                total,
                completed,
                cancelled,
                timeline,
                byHour: byHourArray,
                byWeekday: byWeekdayArray,
                byVehicleType: byVehicleTypeArray,
                cancellationReasons: cancellationReasonsArray,
            },
        });
    }
    catch (error) {
        console.error("Error fetching booking analytics:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch booking analytics",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// User Analytics
router.get("/analytics/users", async (req, res) => {
    try {
        // Extract query parameters
        const startDate = req.query.startDate ||
            new Date(new Date().setMonth(new Date().getMonth() - 1))
                .toISOString()
                .split("T")[0]; // Default to last month
        const endDate = req.query.endDate || new Date().toISOString().split("T")[0]; // Default to today
        const interval = req.query.interval || "day";
        // Get total users count
        const totalUsersCount = await firebase_1.firestore
            .collection("users")
            .count()
            .get()
            .then((snap) => snap.data().count);
        // Get new users in the date range
        const newUsersSnapshot = await firebase_1.firestore
            .collection("users")
            .where("createdAt", ">=", startDate)
            .where("createdAt", "<=", endDate)
            .orderBy("createdAt", "asc")
            .get();
        // Get active users (users with at least one booking in the period)
        const bookingsSnapshot = await firebase_1.firestore
            .collection("bookings")
            .where("pickupDate", ">=", startDate)
            .where("pickupDate", "<=", endDate)
            .get();
        const activeUserIds = new Set();
        let totalBookings = 0;
        // Track bookings per user for top bookers
        const userBookings = {};
        // Process booking data for active users and booking counts
        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            const userId = booking.userId;
            totalBookings++;
            if (userId) {
                activeUserIds.add(userId);
                // Track user booking stats
                if (!userBookings[userId]) {
                    userBookings[userId] = { bookings: 0, spent: 0 };
                }
                userBookings[userId].bookings++;
                // Add spending if booking is not cancelled
                if (booking.status !== "cancelled" &&
                    booking.vehicle?.price?.amount) {
                    userBookings[userId].spent += booking.vehicle.price.amount;
                }
            }
        });
        // Timeline data for new users and bookings
        const timelineData = {};
        // Build timeline data for new users
        newUsersSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData && userData.createdAt) {
                let timeKey;
                // Format date based on interval
                if (interval === "day") {
                    timeKey = userData.createdAt.substring(0, 10); // YYYY-MM-DD
                }
                else if (interval === "week") {
                    const date = new Date(userData.createdAt);
                    const dayOfWeek = date.getDay();
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - dayOfWeek);
                    timeKey = weekStart.toISOString().split("T")[0];
                }
                else if (interval === "month") {
                    timeKey = userData.createdAt.substring(0, 7); // YYYY-MM
                }
                if (timeKey) {
                    if (!timelineData[timeKey]) {
                        timelineData[timeKey] = { newUsers: 0, totalBookings: 0 };
                    }
                    timelineData[timeKey].newUsers++;
                }
            }
        });
        // Add booking counts to timeline
        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            const pickupDate = booking.pickupDate;
            if (pickupDate) {
                let timeKey;
                // Format date based on interval
                if (interval === "day") {
                    timeKey = pickupDate; // YYYY-MM-DD
                }
                else if (interval === "week") {
                    const date = new Date(pickupDate);
                    const dayOfWeek = date.getDay();
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - dayOfWeek);
                    timeKey = weekStart.toISOString().split("T")[0];
                }
                else if (interval === "month") {
                    timeKey = pickupDate.substring(0, 7); // YYYY-MM
                }
                if (timeKey) {
                    if (!timelineData[timeKey]) {
                        timelineData[timeKey] = { newUsers: 0, totalBookings: 0 };
                    }
                    timelineData[timeKey].totalBookings++;
                }
            }
        });
        // Sort timeline by date
        const timeline = Object.keys(timelineData)
            .sort()
            .map((date) => ({
            date,
            newUsers: timelineData[date].newUsers,
            totalBookings: timelineData[date].totalBookings,
        }));
        // Get top bookers (need to fetch their emails)
        const topBookerIds = Object.entries(userBookings)
            .sort((a, b) => b[1].bookings - a[1].bookings)
            .slice(0, 10) // Top 10 users
            .map(([userId, _]) => userId);
        // Fetch user details for top bookers
        const userPromises = topBookerIds.map((userId) => firebase_1.firestore.collection("users").doc(userId).get());
        const userSnapshots = await Promise.all(userPromises);
        // Add email information to the top bookers
        userSnapshots.forEach((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                if (userData && userBookings[doc.id]) {
                    userBookings[doc.id].email = userData.email;
                }
            }
        });
        // Format top bookers array
        const topBookers = topBookerIds.map((userId) => ({
            uid: userId,
            email: userBookings[userId].email || "unknown@example.com",
            bookings: userBookings[userId].bookings,
            spent: parseFloat(userBookings[userId].spent.toFixed(2)),
        }));
        // Calculate retention metrics
        const returningUsers = Object.values(userBookings).filter((user) => user.bookings > 1).length;
        const oneTimeUsers = Object.values(userBookings).filter((user) => user.bookings === 1).length;
        const totalUsersWithBookings = returningUsers + oneTimeUsers;
        // Calculate retention percentages
        const returningPercentage = totalUsersWithBookings > 0
            ? Math.round((returningUsers / totalUsersWithBookings) * 100)
            : 0;
        const oneTimePercentage = totalUsersWithBookings > 0
            ? Math.round((oneTimeUsers / totalUsersWithBookings) * 100)
            : 0;
        // Mock device data (since we don't actually track this in the database)
        const devices = [
            { device: "Mobile", percentage: 65 },
            { device: "Desktop", percentage: 30 },
            { device: "Tablet", percentage: 5 },
        ];
        return res.json({
            success: true,
            data: {
                total: totalUsersCount,
                new: newUsersSnapshot.size,
                active: activeUserIds.size,
                timeline,
                topBookers,
                retention: {
                    returning: returningPercentage,
                    oneTime: oneTimePercentage,
                },
                devices,
            },
        });
    }
    catch (error) {
        console.error("Error fetching user analytics:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch user analytics",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Website Traffic Analytics
router.get("/analytics/traffic", async (req, res) => {
    try {
        // Extract query parameters
        const startDate = req.query.startDate ||
            new Date(new Date().setMonth(new Date().getMonth() - 1))
                .toISOString()
                .split("T")[0]; // Default to last month
        const endDate = req.query.endDate || new Date().toISOString().split("T")[0]; // Default to today
        const interval = req.query.interval || "day";
        // Note: In a real implementation, this would query an analytics database
        // Since we don't have actual website analytics in this backend,
        // we'll create simulated data based on our booking data to demonstrate
        // the endpoint functionality
        // Get bookings in date range to estimate website traffic
        const bookingsSnapshot = await firebase_1.firestore
            .collection("bookings")
            .where("createdAt", ">=", startDate)
            .where("createdAt", "<=", endDate)
            .orderBy("createdAt", "asc")
            .get();
        // Use booking count to estimate traffic (1 booking = approximately 10 visitors)
        const bookingCount = bookingsSnapshot.size;
        const estimatedVisitors = bookingCount * 10;
        const estimatedUnique = Math.round(estimatedVisitors * 0.65); // 65% of visitors are unique
        const estimatedReturning = estimatedVisitors - estimatedUnique;
        // Track pages, referrers, devices and locations based on booking data
        const timelineData = {};
        const pagesData = {
            "/": Math.round(estimatedVisitors * 0.5),
            "/fare-estimate": Math.round(estimatedVisitors * 0.3),
            "/booking": Math.round(estimatedVisitors * 0.2),
            "/about": Math.round(estimatedVisitors * 0.05),
            "/contact": Math.round(estimatedVisitors * 0.03),
        };
        const referrersData = {
            Google: Math.round(estimatedVisitors * 0.4),
            Direct: Math.round(estimatedVisitors * 0.3),
            Facebook: Math.round(estimatedVisitors * 0.15),
            Instagram: Math.round(estimatedVisitors * 0.1),
            Twitter: Math.round(estimatedVisitors * 0.05),
        };
        const devicesData = [
            { type: "Mobile", percentage: 65 },
            { type: "Desktop", percentage: 30 },
            { type: "Tablet", percentage: 5 },
        ];
        // Generate location data based on booking pickup locations
        const locationsData = {};
        // Generate timeline data based on bookings
        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            // Extract location data
            if (booking.locations?.pickup?.address) {
                // Extract city name (assuming format includes ", City" or similar)
                const addressParts = booking.locations.pickup.address.split(",");
                if (addressParts.length > 1) {
                    const city = addressParts[addressParts.length - 2].trim();
                    locationsData[city] = (locationsData[city] || 0) + 10; // Each booking represents ~10 visitors
                }
            }
            // Generate timeline data
            if (booking.createdAt) {
                let timeKey;
                // Format date based on interval
                if (interval === "day") {
                    timeKey = booking.createdAt.substring(0, 10); // YYYY-MM-DD
                }
                else if (interval === "week") {
                    const date = new Date(booking.createdAt);
                    const dayOfWeek = date.getDay();
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - dayOfWeek);
                    timeKey = weekStart.toISOString().split("T")[0];
                }
                else if (interval === "month") {
                    timeKey = booking.createdAt.substring(0, 7); // YYYY-MM
                }
                if (timeKey) {
                    if (!timelineData[timeKey]) {
                        timelineData[timeKey] = { visitors: 0, unique: 0 };
                    }
                    // Each booking represents ~10 visitors
                    timelineData[timeKey].visitors += 10;
                    timelineData[timeKey].unique += 6; // ~60% of visitors are unique
                }
            }
        });
        // Format timeline for response
        const timeline = Object.keys(timelineData)
            .sort()
            .map((date) => ({
            date,
            visitors: timelineData[date].visitors,
            unique: timelineData[date].unique,
        }));
        // Format pages data
        const pages = Object.entries(pagesData)
            .map(([path, views]) => ({ path, views }))
            .sort((a, b) => b.views - a.views);
        // Format referrers data
        const referrers = Object.entries(referrersData)
            .map(([source, visits]) => ({ source, visits }))
            .sort((a, b) => b.visits - a.visits);
        // Format locations data
        const locations = Object.entries(locationsData)
            .map(([city, visits]) => ({ city, visits }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 10); // Top 10 locations
        // Calculate conversion rate (bookings / visitors)
        const conversionRate = parseFloat(((bookingCount / estimatedVisitors) * 100).toFixed(1));
        return res.json({
            success: true,
            data: {
                visitors: {
                    total: estimatedVisitors,
                    unique: estimatedUnique,
                    returning: estimatedReturning,
                },
                timeline,
                pages,
                referrers,
                devices: devicesData,
                locations,
                conversionRate,
            },
        });
    }
    catch (error) {
        console.error("Error generating traffic analytics:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to generate traffic analytics",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// =====================================================
// System Management
// =====================================================
// Get system settings
router.get("/settings", async (req, res) => {
    try {
        // Get settings document from Firestore
        const settingsDoc = await firebase_1.firestore
            .collection("systemSettings")
            .doc("general")
            .get();
        // If document doesn't exist, create default settings
        if (!settingsDoc.exists) {
            const defaultSettings = {
                pricing: {
                    congestionCharge: 7.5,
                    dartfordCrossing: 4.0,
                },
                serviceAreas: {
                    maxDistance: 300,
                    excludedAreas: [
                        "Outer Hebrides",
                        "Shetland Islands",
                        "Northern Scottish Highlands",
                    ],
                    includedIslands: ["Isle of Wight", "Anglesey"],
                },
                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                },
                updatedAt: new Date().toISOString(),
                updatedBy: "system",
            };
            // Save default settings
            await firebase_1.firestore
                .collection("systemSettings")
                .doc("general")
                .set(defaultSettings);
            return res.json({
                success: true,
                data: defaultSettings,
            });
        }
        // Return existing settings
        return res.json({
            success: true,
            data: settingsDoc.data(),
        });
    }
    catch (error) {
        console.error("Error fetching system settings:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch system settings",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Update system settings
router.put("/settings", async (req, res) => {
    try {
        const updateData = req.body;
        // Get current settings
        const settingsDoc = await firebase_1.firestore
            .collection("systemSettings")
            .doc("general")
            .get();
        // Prepare update with metadata
        const updatedFields = Object.keys(updateData);
        updateData.updatedAt = new Date().toISOString();
        updateData.updatedBy = req.user?.uid;
        // If settings document exists, update it
        if (settingsDoc.exists) {
            await settingsDoc.ref.update(updateData);
        }
        else {
            // If document doesn't exist, create default settings with updates
            const defaultSettings = {
                pricing: {
                    congestionCharge: 7.5,
                    dartfordCrossing: 4.0,
                },
                serviceAreas: {
                    maxDistance: 300,
                    excludedAreas: [
                        "Outer Hebrides",
                        "Shetland Islands",
                        "Northern Scottish Highlands",
                    ],
                    includedIslands: ["Isle of Wight", "Anglesey"],
                },
                notifications: {
                    emailEnabled: true,
                    smsEnabled: true,
                },
                ...updateData,
            };
            await firebase_1.firestore
                .collection("systemSettings")
                .doc("general")
                .set(defaultSettings);
        }
        return res.json({
            success: true,
            data: {
                message: "Settings updated successfully",
                updatedFields,
            },
        });
    }
    catch (error) {
        console.error("Error updating system settings:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to update system settings",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Get contact messages (admin only)
router.get("/contact-messages", async (req, res) => {
    try {
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
        // Get total count for pagination
        const totalSnapshot = await firebase_1.firestore.collection("contact_messages").get();
        const total = totalSnapshot.size;
        return res.json({
            success: true,
            data: {
                messages,
                pagination: {
                    total,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: offsetNum + limitNum < total
                }
            }
        });
    }
    catch (error) {
        console.error("Error fetching contact messages:", error);
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
router.put("/contact-messages/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        // Validate status
        if (status && !["new", "in_progress", "resolved"].includes(status)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Invalid status. Must be 'new', 'in_progress', or 'resolved'",
                    code: "contact/invalid-status",
                },
            });
        }
        // Prepare update data
        const updateData = {
            updatedAt: new Date().toISOString(),
        };
        if (status)
            updateData.status = status;
        if (notes)
            updateData.notes = notes;
        // Update the contact message
        await firebase_1.firestore.collection("contact_messages").doc(id).update(updateData);
        return res.json({
            success: true,
            data: {
                id,
                message: "Contact message updated successfully",
                updatedFields: Object.keys(updateData).filter(key => key !== "updatedAt")
            }
        });
    }
    catch (error) {
        console.error("Error updating contact message:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to update contact message",
                code: "contact/update-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// Get system logs
router.get("/logs", async (req, res) => {
    try {
        // Extract query parameters
        const level = req.query.level;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const page = parseInt(req.query.page || "1");
        const limit = parseInt(req.query.limit || "20");
        // Build query
        let query = firebase_1.firestore.collection("systemLogs").orderBy("timestamp", "desc");
        // Apply filters if provided
        if (level) {
            query = query.where("level", "==", level);
        }
        if (startDate) {
            query = query.where("timestamp", ">=", startDate);
        }
        if (endDate) {
            query = query.where("timestamp", "<=", endDate);
        }
        // Get total count for pagination
        const countSnapshot = await query.get();
        const total = countSnapshot.size;
        // Apply pagination
        query = query.limit(limit).offset((page - 1) * limit);
        // Execute query
        const snapshot = await query.get();
        // Map results to logs array
        const logs = [];
        snapshot.forEach((doc) => {
            logs.push({
                id: doc.id,
                ...doc.data(),
            });
        });
        // Calculate pagination information
        const pages = Math.ceil(total / limit);
        return res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    total,
                    pages,
                    currentPage: page,
                    limit,
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching system logs:", error);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch system logs",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
/**
 * @route PUT /api/dashboard/bookings/:id
 * @desc Update booking details (admin only)
 * @access Admin
 * @param {string} id - Booking ID
 * @body {AdminBookingUpdateRequest} - Booking update data
 * @returns {AdminBookingUpdateResponse} - Updated booking information
 */
router.put("/bookings/:id", async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user?.role || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                error: {
                    message: "Admin access required",
                    code: "dashboard/admin-required",
                },
            });
        }
        const { id } = req.params;
        const updateData = req.body;
        // Validate the update data
        const validationResult = adminBooking_schema_1.adminBookingUpdateSchema.safeParse(updateData);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Invalid booking update data",
                    code: "dashboard/invalid-data",
                    details: validationResult.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', '),
                },
            });
        }
        const validatedData = validationResult.data;
        // Check if booking exists
        const bookingDoc = await firebase_1.firestore.collection("bookings").doc(id).get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    message: "Booking not found",
                    code: "dashboard/booking-not-found",
                },
            });
        }
        const existingBooking = bookingDoc.data();
        // Prepare update object with only provided fields
        const updateFields = {
            updatedAt: new Date().toISOString(),
        };
        // Track which fields are being updated
        const updatedFields = [];
        // Update basic booking information
        if (validatedData.bookingType !== undefined) {
            updateFields.bookingType = validatedData.bookingType;
            updatedFields.push("bookingType");
        }
        if (validatedData.status !== undefined) {
            updateFields.status = validatedData.status;
            updatedFields.push("status");
        }
        // Update customer information (except email)
        if (validatedData.firstName !== undefined) {
            updateFields["customer.fullName"] = `${validatedData.firstName} ${validatedData.lastName || existingBooking.customer?.fullName?.split(' ')[1] || ''}`.trim();
            updatedFields.push("customer.fullName");
        }
        if (validatedData.lastName !== undefined) {
            updateFields["customer.fullName"] = `${validatedData.firstName || existingBooking.customer?.fullName?.split(' ')[0] || ''} ${validatedData.lastName}`.trim();
            updatedFields.push("customer.fullName");
        }
        if (validatedData.phone !== undefined) {
            updateFields["customer.phoneNumber"] = validatedData.phone;
            updatedFields.push("customer.phoneNumber");
        }
        // Update location information
        if (validatedData.locations) {
            if (validatedData.locations.pickup) {
                updateFields["locations.pickup"] = {
                    ...existingBooking.locations?.pickup,
                    ...validatedData.locations.pickup,
                };
                updatedFields.push("locations.pickup");
            }
            if (validatedData.locations.dropoff) {
                updateFields["locations.dropoff"] = {
                    ...existingBooking.locations?.dropoff,
                    ...validatedData.locations.dropoff,
                };
                updatedFields.push("locations.dropoff");
            }
            if (validatedData.locations.additionalStops !== undefined) {
                updateFields["locations.additionalStops"] = validatedData.locations.additionalStops;
                updatedFields.push("locations.additionalStops");
            }
        }
        // Update date and time information
        if (validatedData.pickupDate !== undefined) {
            updateFields.pickupDate = validatedData.pickupDate;
            updatedFields.push("pickupDate");
        }
        if (validatedData.pickupTime !== undefined) {
            updateFields.pickupTime = validatedData.pickupTime;
            updatedFields.push("pickupTime");
        }
        if (validatedData.returnDate !== undefined) {
            updateFields.returnDate = validatedData.returnDate;
            updatedFields.push("returnDate");
        }
        if (validatedData.returnTime !== undefined) {
            updateFields.returnTime = validatedData.returnTime;
            updatedFields.push("returnTime");
        }
        // Update vehicle information
        if (validatedData.vehicleType !== undefined) {
            updateFields["vehicle.id"] = validatedData.vehicleType;
            // Update vehicle name based on type
            const vehicleType = vehicleTypes_1.vehicleTypes[validatedData.vehicleType];
            if (vehicleType) {
                updateFields["vehicle.name"] = vehicleType.name;
            }
            updatedFields.push("vehicle.id", "vehicle.name");
        }
        // Update pricing information (admin override)
        if (validatedData.pricing) {
            const currentPricing = existingBooking.vehicle?.price || {};
            updateFields["vehicle.price"] = {
                ...currentPricing,
                ...validatedData.pricing,
            };
            updatedFields.push("vehicle.price");
        }
        // Update distance information (admin override)
        if (validatedData.distance) {
            const currentDistance = existingBooking.journey || {};
            updateFields.journey = {
                ...currentDistance,
                ...validatedData.distance,
            };
            updatedFields.push("journey");
        }
        // Update hourly booking specific fields
        if (validatedData.hours !== undefined) {
            updateFields.hours = validatedData.hours;
            updatedFields.push("hours");
        }
        // Update additional information
        if (validatedData.passengers !== undefined) {
            updateFields.passengers = validatedData.passengers;
            updatedFields.push("passengers");
        }
        if (validatedData.luggage !== undefined) {
            updateFields.luggage = validatedData.luggage;
            updatedFields.push("luggage");
        }
        if (validatedData.specialRequests !== undefined) {
            updateFields.specialRequests = validatedData.specialRequests;
            updatedFields.push("specialRequests");
        }
        if (validatedData.notes !== undefined) {
            updateFields.notes = validatedData.notes;
            updatedFields.push("notes");
        }
        // Update payment information
        if (validatedData.paymentMethod !== undefined) {
            updateFields.paymentMethod = validatedData.paymentMethod;
            updatedFields.push("paymentMethod");
        }
        if (validatedData.paymentStatus !== undefined) {
            updateFields.paymentStatus = validatedData.paymentStatus;
            updatedFields.push("paymentStatus");
        }
        // Update driver assignment
        if (validatedData.driverId !== undefined) {
            updateFields.driverId = validatedData.driverId;
            updatedFields.push("driverId");
        }
        if (validatedData.driverName !== undefined) {
            updateFields.driverName = validatedData.driverName;
            updatedFields.push("driverName");
        }
        if (validatedData.driverPhone !== undefined) {
            updateFields.driverPhone = validatedData.driverPhone;
            updatedFields.push("driverPhone");
        }
        // Update vehicle details
        if (validatedData.vehicleMake !== undefined) {
            updateFields.vehicleMake = validatedData.vehicleMake;
            updatedFields.push("vehicleMake");
        }
        if (validatedData.vehicleColor !== undefined) {
            updateFields.vehicleColor = validatedData.vehicleColor;
            updatedFields.push("vehicleColor");
        }
        if (validatedData.vehicleReg !== undefined) {
            updateFields.vehicleReg = validatedData.vehicleReg;
            updatedFields.push("vehicleReg");
        }
        // Update flight information
        if (validatedData.flightNumber !== undefined) {
            updateFields.flightNumber = validatedData.flightNumber;
            updatedFields.push("flightNumber");
        }
        if (validatedData.terminal !== undefined) {
            updateFields.terminal = validatedData.terminal;
            updatedFields.push("terminal");
        }
        // Update travel information
        if (validatedData.travelInformation !== undefined) {
            const currentTravelInfo = existingBooking.travelInformation || {};
            updateFields.travelInformation = {
                ...currentTravelInfo,
                ...validatedData.travelInformation,
            };
            updatedFields.push("travelInformation");
        }
        // Update payment methods
        if (validatedData.paymentMethods !== undefined) {
            const currentPaymentMethods = existingBooking.paymentMethods || {};
            updateFields.paymentMethods = {
                ...currentPaymentMethods,
                ...validatedData.paymentMethods,
            };
            updatedFields.push("paymentMethods");
        }
        // Update additional booking details
        if (validatedData.waitingTime !== undefined) {
            updateFields.waitingTime = validatedData.waitingTime;
            updatedFields.push("waitingTime");
        }
        if (validatedData.numVehicles !== undefined) {
            updateFields.numVehicles = validatedData.numVehicles;
            updatedFields.push("numVehicles");
        }
        // Update admin override information
        if (validatedData.adminOverride) {
            const currentAdminOverride = existingBooking.adminOverride || {};
            updateFields.adminOverride = {
                ...currentAdminOverride,
                ...validatedData.adminOverride,
                lastUpdatedBy: req.user.uid,
                lastUpdatedAt: new Date().toISOString(),
            };
            updatedFields.push("adminOverride");
        }
        // Add admin update log
        const adminLog = {
            action: "booking_updated",
            adminId: req.user.uid,
            adminEmail: req.user.email,
            timestamp: new Date().toISOString(),
            updatedFields: updatedFields,
            reason: validatedData.adminOverride?.reason || "Admin update",
        };
        updateFields.adminLogs = [...(existingBooking.adminLogs || []), adminLog];
        // Update the booking in Firestore
        await firebase_1.firestore.collection("bookings").doc(id).update(updateFields);
        // Get the updated booking
        const updatedBookingDoc = await firebase_1.firestore.collection("bookings").doc(id).get();
        const updatedBooking = updatedBookingDoc.data();
        console.log(`✅ Admin ${req.user.email} updated booking ${id}. Fields updated: ${updatedFields.join(', ')}`);
        return res.json({
            success: true,
            data: {
                id,
                message: "Booking updated successfully",
                updatedFields,
                booking: updatedBooking,
            },
        });
    }
    catch (error) {
        console.error("❌ Failed to update booking:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to update booking",
                code: "dashboard/update-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
// =====================================================
// Booking Confirmation WhatsApp Message
// =====================================================
/**
 * Send booking confirmation message to WhatsApp group
 */
router.post("/bookings/:id/send-confirmation", authMiddleware_1.verifyDashboardToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user?.role || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                error: {
                    message: "Admin access required",
                    code: "dashboard/admin-required",
                },
            });
        }
        const { id } = req.params;
        // Get booking data
        const bookingDoc = await firebase_1.firestore.collection("bookings").doc(id).get();
        if (!bookingDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    message: "Booking not found",
                    code: "dashboard/booking-not-found",
                },
            });
        }
        const booking = bookingDoc.data();
        // Prepare WhatsApp booking data
        const whatsappData = {
            id: bookingDoc.id,
            referenceNumber: booking.referenceNumber || `XEQ_${bookingDoc.id.slice(-3)}`,
            fullName: booking.customer?.fullName || 'Unknown',
            pickupDate: booking.pickupDate,
            pickupTime: booking.pickupTime,
            pickupLocation: booking.locations?.pickup?.address || 'Unknown',
            dropoffLocation: booking.locations?.dropoff?.address,
            vehicleType: booking.vehicle?.name || 'Unknown',
            price: booking.vehicle?.price?.totalFare || 0,
            bookingType: booking.bookingType || 'one-way',
            phoneNumber: booking.customer?.phoneNumber,
            email: booking.customer?.email,
            passengers: booking.passengers,
            specialRequests: booking.specialRequests,
            hours: booking.hours,
            returnDate: booking.returnDate,
            returnTime: booking.returnTime,
            // Vehicle details for confirmation
            vehicleMake: booking.vehicleMake,
            vehicleColor: booking.vehicleColor,
            vehicleReg: booking.vehicleReg,
            driverName: booking.driverName,
            driverPhone: booking.driverPhone,
        };
        // Send confirmation message
        await whatsapp_service_1.WhatsAppService.sendBookingConfirmation(whatsappData);
        console.log(`✅ Admin ${req.user.email} sent booking confirmation for booking ${id}`);
        return res.json({
            success: true,
            data: {
                message: "Booking confirmation sent successfully",
                bookingId: id,
                referenceNumber: whatsappData.referenceNumber,
            },
        });
    }
    catch (error) {
        console.error("❌ Failed to send booking confirmation:", error);
        return res.status(500).json({
            success: false,
            error: {
                message: "Failed to send booking confirmation",
                code: "dashboard/confirmation-error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
exports.default = router;
