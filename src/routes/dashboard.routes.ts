import { Router, Response } from "express";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { verifyToken, isAdmin } from "../middleware/authMiddleware";
import { firestore } from "../config/firebase";
import { Query, DocumentData } from "firebase-admin/firestore";
import { auth } from "../config/firebase";
import { z } from "zod";
import { AuthService } from "../services/auth.service";

const router = Router();

// =====================================================
// Dashboard Auth Routes
// =====================================================

// Admin registration (no verification needed for first admin)
router.post(
  "/auth/signup",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fullName, email, password, confirmPassword } = req.body;

      // Validate required fields
      if (!fullName || !email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "All fields are required: Full Name, Email, Password, and Confirm Password",
          },
        } as ApiResponse<never>);
      }

      // Validate password match
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Passwords do not match",
          },
        } as ApiResponse<never>);
      }

      // Create admin user in Firebase Authentication
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName,
      });

      // Set custom claims for admin
      await auth.setCustomUserClaims(userRecord.uid, {
        role: "admin",
        admin: true,
      });

      // Create admin document in Firestore
      await firestore.collection("users").doc(userRecord.uid).set({
        email: userRecord.email,
        fullName: fullName,
        role: "admin",
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: fullName,
          role: "admin",
          message: "Admin account created successfully",
        },
      });
    } catch (error) {
      console.error("Error creating admin account:", error);

      // Handle specific Firebase errors
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorCode = errorMessage.includes("already exists")
        ? "EMAIL_EXISTS"
        : "ADMIN_CREATION_ERROR";
      const statusCode = errorCode === "EMAIL_EXISTS" ? 409 : 500;

      return res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message:
            errorCode === "EMAIL_EXISTS"
              ? "Email already exists"
              : "Failed to create admin account",
          details: errorMessage,
        },
      } as ApiResponse<never>);
    }
  }
);

// Dashboard admin login endpoint
router.post("/auth/login", async (req: AuthenticatedRequest, res: Response) => {
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
      } as ApiResponse<never>);
    }

    // Login with email/password
    const authResult = await AuthService.loginWithEmail(email, password);

    // Verify this user has admin role
    const isUserAdmin = await AuthService.isAdmin(authResult.uid);

    if (!isUserAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Access denied. Admin privileges required.",
        },
      } as ApiResponse<never>);
    }

    // If we get here, user is an admin
    return res.json({
      success: true,
      data: {
        ...authResult,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(401).json({
      success: false,
      error: {
        code: "AUTHENTICATION_FAILED",
        message:
          error instanceof Error ? error.message : "Authentication failed",
      },
    } as ApiResponse<never>);
  }
});

// Verify current admin session (token verification)
router.post(
  "/auth/verify",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Token is required",
          },
        } as ApiResponse<never>);
      }

      const userData = await AuthService.verifyToken(token);
      const isUserAdmin = await AuthService.isAdmin(userData.uid);

      if (!isUserAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Access denied. Admin privileges required.",
          },
        } as ApiResponse<never>);
      }

      res.status(200).json({
        success: true,
        data: {
          ...userData,
          role: "admin",
          authenticated: true,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_FAILED",
          message: "Invalid token",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// All other dashboard routes require admin authentication
router.use(verifyToken, isAdmin);

// =====================================================
// Bookings Management
// =====================================================

// Get all bookings with filtering
router.get("/bookings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Extract query parameters
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;
    const vehicleType = req.query.vehicleType as string;
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");
    const sort = (req.query.sort as string) || "pickupDate";
    const order = (req.query.order as string) || "desc";

    // Build query with filters
    let query: Query<DocumentData> = firestore.collection("bookings");

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

    // Map results to bookings array
    const bookings: any[] = [];
    snapshot.forEach((doc) => {
      bookings.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Calculate pagination information
    const pages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          pages,
          currentPage: page,
          limit,
        },
      },
    } as ApiResponse<any>);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch bookings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Get booking calendar data
router.get(
  "/bookings/calendar",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const status = req.query.status as string;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Start date and end date are required",
          },
        } as ApiResponse<never>);
      }

      // Build query
      let query: Query<DocumentData> = firestore
        .collection("bookings")
        .where("pickupDate", ">=", startDate)
        .where("pickupDate", "<=", endDate);

      if (status) {
        query = query.where("status", "==", status);
      }

      // Execute query
      const snapshot = await query.get();

      // Format data for calendar
      const events: any[] = [];
      snapshot.forEach((doc) => {
        const booking = doc.data();

        // Calculate end time based on duration
        const startTime = `${booking.pickupDate}T${booking.pickupTime}:00`;
        const durationMinutes = booking.journey?.duration_minutes || 60; // Default to 1 hour if no duration
        const endTime = new Date(
          new Date(startTime).getTime() + durationMinutes * 60000
        ).toISOString();

        events.push({
          id: doc.id,
          title: `${booking.customer.fullName} - ${booking.vehicle.name}`,
          start: startTime,
          end: endTime,
          status: booking.status,
          customer: booking.customer.fullName,
          pickupLocation: booking.locations.pickup.address,
          dropoffLocation: booking.locations.dropoff.address,
          vehicleType: booking.vehicle.name,
        });
      });

      return res.json({
        success: true,
        data: {
          events,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch calendar data",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Get booking details
router.get(
  "/bookings/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookingId = req.params.id;

      // Get booking document
      const bookingDoc = await firestore
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
        } as ApiResponse<never>);
      }

      // Get timeline from booking history subcollection
      const timelineSnapshot = await bookingDoc.ref
        .collection("history")
        .orderBy("timestamp", "asc")
        .get();
      const timeline: any[] = [];

      timelineSnapshot.forEach((doc) => {
        timeline.push(doc.data());
      });

      // Return booking with timeline
      return res.json({
        success: true,
        data: {
          id: bookingDoc.id,
          ...bookingDoc.data(),
          timeline:
            timeline.length > 0
              ? timeline
              : [
                  {
                    status: bookingDoc.data()?.status || "pending",
                    timestamp: bookingDoc.data()?.createdAt,
                  },
                ],
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error fetching booking details:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch booking details",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Update booking
router.put(
  "/bookings/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookingId = req.params.id;
      const updateData = req.body;

      // Get booking document
      const bookingDoc = await firestore
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
        } as ApiResponse<never>);
      }

      // Add metadata
      const updatedFields = Object.keys(updateData);
      updateData.updatedAt = new Date().toISOString();
      updateData.updatedBy = req.user?.uid;

      // Update booking
      await bookingDoc.ref.update(updateData);

      // If status is being updated, add to history
      if (
        updateData.status &&
        updateData.status !== bookingDoc.data()?.status
      ) {
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
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error updating booking:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to update booking",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Delete booking
router.delete(
  "/bookings/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookingId = req.params.id;

      // Get booking document
      const bookingDoc = await firestore
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
        } as ApiResponse<never>);
      }

      // Delete booking history subcollection first
      const historySnapshot = await bookingDoc.ref.collection("history").get();
      const batch = firestore.batch();

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
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error deleting booking:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to delete booking",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// =====================================================
// User Management
// =====================================================

// Get all users
router.get("/users", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Extract query parameters
    const role = req.query.role as string;
    const query = req.query.query as string;
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");

    // Build query
    let dbQuery: Query<DocumentData> = firestore.collection("users");

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
    const users: any[] = [];
    const userIds: string[] = [];

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
        batches.push(
          firestore.collection("bookings").where("userId", "in", batchIds).get()
        );
      }

      const bookingsData = await Promise.all(batches);
      const bookingCounts: { [key: string]: number } = {};

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
      filteredUsers = users.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchTerm) ||
          user.displayName?.toLowerCase().includes(searchTerm) ||
          user.fullName?.toLowerCase().includes(searchTerm)
      );
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
    } as ApiResponse<any>);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Get user details
router.get("/users/:uid", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.uid;

    // Get user document
    const userDoc = await firestore.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "User not found",
        },
      } as ApiResponse<never>);
    }

    // Get user's bookings
    const bookingsSnapshot = await firestore
      .collection("bookings")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const recentBookings: any[] = [];
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
    const allBookingsSnapshot = await firestore
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
      } else if (data.status === "cancelled") {
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
    } as ApiResponse<any>);
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch user details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Update user
router.put("/users/:uid", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.uid;
    const updateData = req.body;

    // Get user document
    const userDoc = await firestore.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "User not found",
        },
      } as ApiResponse<never>);
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
    } as ApiResponse<any>);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to update user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Disable user
router.post(
  "/users/:uid/disable",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.uid;

      // Get user document
      const userDoc = await firestore.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: {
            code: "RESOURCE_NOT_FOUND",
            message: "User not found",
          },
        } as ApiResponse<never>);
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
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error disabling user:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to disable user",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// =====================================================
// Analytics
// =====================================================

// Dashboard overview
router.get(
  "/analytics/overview",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const period = (req.query.period as string) || "week";

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
      const bookingsSnapshot = await firestore
        .collection("bookings")
        .where("createdAt", ">=", startDateISO)
        .get();

      // Previous period bookings
      const previousBookingsSnapshot = await firestore
        .collection("bookings")
        .where("createdAt", ">=", previousStartDateISO)
        .where("createdAt", "<=", previousEndDateISO)
        .get();

      // Current period users
      const usersSnapshot = await firestore
        .collection("users")
        .where("createdAt", ">=", startDateISO)
        .get();

      // Previous period users
      const previousUsersSnapshot = await firestore
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
      const vehicleCounts: { [key: string]: number } = {};
      const routes: { [key: string]: number } = {};

      bookingsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalBookings++;

        // Count by status
        if (data.status === "pending") pendingBookings++;
        else if (data.status === "confirmed") confirmedBookings++;
        else if (data.status === "completed") completedBookings++;
        else if (data.status === "cancelled") cancelledBookings++;

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
        if (
          data.locations?.pickup?.address &&
          data.locations?.dropoff?.address
        ) {
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
      const bookingsComparisonPercentage =
        previousTotalBookings > 0
          ? ((totalBookings - previousTotalBookings) / previousTotalBookings) *
            100
          : 0;

      const revenueComparisonPercentage =
        previousTotalRevenue > 0
          ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
          : 0;

      const usersComparisonPercentage =
        previousUsersSnapshot.size > 0
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
      const totalVehicleBookings = Object.values(vehicleCounts).reduce(
        (a, b) => a + b,
        0
      );
      const vehicleDistribution = Object.entries(vehicleCounts).map(
        ([name, count]) => ({
          name,
          percentage: Math.round((count / totalVehicleBookings) * 100),
        })
      );

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
            comparisonPercentage: parseFloat(
              bookingsComparisonPercentage.toFixed(1)
            ),
          },
          revenue: {
            total: parseFloat(totalRevenue.toFixed(2)),
            currency: "GBP",
            comparisonPercentage: parseFloat(
              revenueComparisonPercentage.toFixed(1)
            ),
          },
          users: {
            total: await firestore
              .collection("users")
              .count()
              .get()
              .then((snap) => snap.data().count),
            new: usersSnapshot.size,
            comparisonPercentage: parseFloat(
              usersComparisonPercentage.toFixed(1)
            ),
          },
          vehicles: {
            mostBooked: mostBookedVehicle,
            distribution: vehicleDistribution,
          },
          popularRoutes,
        },
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error fetching dashboard overview:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch dashboard overview",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Revenue Analytics
router.get(
  "/analytics/revenue",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Extract query parameters
      const startDate =
        (req.query.startDate as string) ||
        new Date(new Date().setMonth(new Date().getMonth() - 1))
          .toISOString()
          .split("T")[0]; // Default to last month
      const endDate =
        (req.query.endDate as string) || new Date().toISOString().split("T")[0]; // Default to today
      const interval = (req.query.interval as string) || "day";

      // Prepare Firestore query
      let query = firestore
        .collection("bookings")
        .where("pickupDate", ">=", startDate)
        .where("pickupDate", "<=", endDate)
        .orderBy("pickupDate", "asc");

      // Execute query
      const snapshot = await query.get();

      // Calculate total revenue and averages
      let totalRevenue = 0;
      let totalBookings = 0;
      const byVehicleType: {
        [key: string]: { amount: number; count: number };
      } = {};
      const byStatus: { [key: string]: number } = {};
      const timelineData: {
        [key: string]: { amount: number; bookings: number };
      } = {};

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
          } else if (interval === "week") {
            // Calculate the week start date
            const date = new Date(booking.pickupDate);
            const dayOfWeek = date.getDay();
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - dayOfWeek);
            timeKey = weekStart.toISOString().split("T")[0];
          } else if (interval === "month") {
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
      const averagePerBooking =
        totalBookings > 0
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
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch revenue analytics",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Booking Analytics
router.get(
  "/analytics/bookings",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Extract query parameters
      const startDate =
        (req.query.startDate as string) ||
        new Date(new Date().setMonth(new Date().getMonth() - 1))
          .toISOString()
          .split("T")[0]; // Default to last month
      const endDate =
        (req.query.endDate as string) || new Date().toISOString().split("T")[0]; // Default to today
      const interval = (req.query.interval as string) || "day";

      // Prepare Firestore query
      let query = firestore
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
      const timelineData: {
        [key: string]: { count: number; completed: number; cancelled: number };
      } = {};
      const byHour: { [key: number]: number } = {};
      const byWeekday: { [key: string]: number } = {};
      const byVehicleType: { [key: string]: number } = {};
      const cancellationReasons: { [key: string]: number } = {};

      // Process bookings data
      snapshot.forEach((doc) => {
        const booking = doc.data();
        total++;

        // Count by status
        if (booking.status === "completed") {
          completed++;
        } else if (booking.status === "cancelled") {
          cancelled++;

          // Track cancellation reasons
          const reason = booking.cancellationReason || "Not specified";
          cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;
        }

        // Group by time interval for timeline
        let timeKey;
        if (interval === "day") {
          timeKey = booking.pickupDate; // YYYY-MM-DD
        } else if (interval === "week") {
          // Calculate the week start date
          const date = new Date(booking.pickupDate);
          const dayOfWeek = date.getDay();
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - dayOfWeek);
          timeKey = weekStart.toISOString().split("T")[0];
        } else if (interval === "month") {
          timeKey = booking.pickupDate.substring(0, 7); // YYYY-MM
        }

        if (timeKey) {
          if (!timelineData[timeKey]) {
            timelineData[timeKey] = { count: 0, completed: 0, cancelled: 0 };
          }
          timelineData[timeKey].count++;
          if (booking.status === "completed") {
            timelineData[timeKey].completed++;
          } else if (booking.status === "cancelled") {
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
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error fetching booking analytics:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch booking analytics",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// User Analytics
router.get(
  "/analytics/users",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Extract query parameters
      const startDate =
        (req.query.startDate as string) ||
        new Date(new Date().setMonth(new Date().getMonth() - 1))
          .toISOString()
          .split("T")[0]; // Default to last month
      const endDate =
        (req.query.endDate as string) || new Date().toISOString().split("T")[0]; // Default to today
      const interval = (req.query.interval as string) || "day";

      // Get total users count
      const totalUsersCount = await firestore
        .collection("users")
        .count()
        .get()
        .then((snap) => snap.data().count);

      // Get new users in the date range
      const newUsersSnapshot = await firestore
        .collection("users")
        .where("createdAt", ">=", startDate)
        .where("createdAt", "<=", endDate)
        .orderBy("createdAt", "asc")
        .get();

      // Get active users (users with at least one booking in the period)
      const bookingsSnapshot = await firestore
        .collection("bookings")
        .where("pickupDate", ">=", startDate)
        .where("pickupDate", "<=", endDate)
        .get();

      const activeUserIds = new Set<string>();
      let totalBookings = 0;

      // Track bookings per user for top bookers
      const userBookings: {
        [key: string]: { bookings: number; spent: number; email?: string };
      } = {};

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
          if (
            booking.status !== "cancelled" &&
            booking.vehicle?.price?.amount
          ) {
            userBookings[userId].spent += booking.vehicle.price.amount;
          }
        }
      });

      // Timeline data for new users and bookings
      const timelineData: {
        [key: string]: { newUsers: number; totalBookings: number };
      } = {};

      // Build timeline data for new users
      newUsersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData && userData.createdAt) {
          let timeKey;
          // Format date based on interval
          if (interval === "day") {
            timeKey = userData.createdAt.substring(0, 10); // YYYY-MM-DD
          } else if (interval === "week") {
            const date = new Date(userData.createdAt);
            const dayOfWeek = date.getDay();
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - dayOfWeek);
            timeKey = weekStart.toISOString().split("T")[0];
          } else if (interval === "month") {
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
          } else if (interval === "week") {
            const date = new Date(pickupDate);
            const dayOfWeek = date.getDay();
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - dayOfWeek);
            timeKey = weekStart.toISOString().split("T")[0];
          } else if (interval === "month") {
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
      const userPromises = topBookerIds.map((userId) =>
        firestore.collection("users").doc(userId).get()
      );
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
      const returningUsers = Object.values(userBookings).filter(
        (user) => user.bookings > 1
      ).length;
      const oneTimeUsers = Object.values(userBookings).filter(
        (user) => user.bookings === 1
      ).length;
      const totalUsersWithBookings = returningUsers + oneTimeUsers;

      // Calculate retention percentages
      const returningPercentage =
        totalUsersWithBookings > 0
          ? Math.round((returningUsers / totalUsersWithBookings) * 100)
          : 0;

      const oneTimePercentage =
        totalUsersWithBookings > 0
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
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch user analytics",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Website Traffic Analytics
router.get(
  "/analytics/traffic",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Extract query parameters
      const startDate =
        (req.query.startDate as string) ||
        new Date(new Date().setMonth(new Date().getMonth() - 1))
          .toISOString()
          .split("T")[0]; // Default to last month
      const endDate =
        (req.query.endDate as string) || new Date().toISOString().split("T")[0]; // Default to today
      const interval = (req.query.interval as string) || "day";

      // Note: In a real implementation, this would query an analytics database
      // Since we don't have actual website analytics in this backend,
      // we'll create simulated data based on our booking data to demonstrate
      // the endpoint functionality

      // Get bookings in date range to estimate website traffic
      const bookingsSnapshot = await firestore
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
      const timelineData: {
        [key: string]: { visitors: number; unique: number };
      } = {};
      const pagesData: { [key: string]: number } = {
        "/": Math.round(estimatedVisitors * 0.5),
        "/fare-estimate": Math.round(estimatedVisitors * 0.3),
        "/booking": Math.round(estimatedVisitors * 0.2),
        "/about": Math.round(estimatedVisitors * 0.05),
        "/contact": Math.round(estimatedVisitors * 0.03),
      };

      const referrersData: { [key: string]: number } = {
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
      const locationsData: { [key: string]: number } = {};

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
          } else if (interval === "week") {
            const date = new Date(booking.createdAt);
            const dayOfWeek = date.getDay();
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - dayOfWeek);
            timeKey = weekStart.toISOString().split("T")[0];
          } else if (interval === "month") {
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
      const conversionRate = parseFloat(
        ((bookingCount / estimatedVisitors) * 100).toFixed(1)
      );

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
      } as ApiResponse<any>);
    } catch (error) {
      console.error("Error generating traffic analytics:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to generate traffic analytics",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// =====================================================
// System Management
// =====================================================

// Get system settings
router.get("/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get settings document from Firestore
    const settingsDoc = await firestore
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
      await firestore
        .collection("systemSettings")
        .doc("general")
        .set(defaultSettings);

      return res.json({
        success: true,
        data: defaultSettings,
      } as ApiResponse<any>);
    }

    // Return existing settings
    return res.json({
      success: true,
      data: settingsDoc.data(),
    } as ApiResponse<any>);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch system settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Update system settings
router.put("/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updateData = req.body;

    // Get current settings
    const settingsDoc = await firestore
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
    } else {
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

      await firestore
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
    } as ApiResponse<any>);
  } catch (error) {
    console.error("Error updating system settings:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to update system settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Get system logs
router.get("/logs", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Extract query parameters
    const level = req.query.level as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");

    // Build query
    let query = firestore.collection("systemLogs").orderBy("timestamp", "desc");

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
    const logs: any[] = [];
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
    } as ApiResponse<any>);
  } catch (error) {
    console.error("Error fetching system logs:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch system logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

export default router;
