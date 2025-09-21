# Xequtive Dashboard Documentation

This document provides a comprehensive guide to the Xequtive Dashboard, including API endpoints, authentication methods, and implementation guidelines.

## Overview

The Xequtive Dashboard is a comprehensive admin-only platform that provides complete control over the Xequtive transportation service. Administrators can manage all aspects of the business including bookings, users, analytics, system settings, and more.

**Key Capabilities:**
- **Complete Booking Management**: View, update, delete, and manage all bookings
- **User Administration**: Manage customer accounts and user data
- **Real-time Analytics**: Comprehensive business insights and reporting
- **System Configuration**: Pricing, service areas, and business settings
- **Fleet Management**: Vehicle information and pricing structures
- **Audit & Monitoring**: System logs and performance tracking

**Important Note**: The dashboard is **admin-only** and cannot create new bookings. All bookings are created through the customer-facing API endpoints. The dashboard is designed for monitoring, managing, and analyzing existing bookings and system performance.

## 🎯 **ADMIN DASHBOARD TEAM - FULL CONTROL CONFIRMED**

**YES, the admin dashboard provides COMPLETE control over everything:**

### **✅ FULL BOOKING CONTROL**
- **View ALL Bookings**: Every single booking in the system, regardless of status
- **Modify ANY Booking**: Change pickup/dropoff times, locations, vehicle types, customer details
- **Status Management**: Change booking status (pending → confirmed → completed → cancelled)
- **Delete Bookings**: Admin-only booking removal capability
- **Add Internal Notes**: Operational notes for drivers and customer service
- **Pricing Adjustments**: Modify fares, apply discounts, add charges
- **Special Requests**: Add, modify, or remove special requirements

**🔄 COMPLETE STATUS WORKFLOW CONTROL:**
- **Pending → Confirmed**: Review and approve new booking requests
- **Confirmed → Completed**: Mark journeys as successfully completed
- **Any Status → Cancelled**: Cancel bookings with reason tracking
- **Status Rollback**: Revert to previous status if needed
- **Real-time Updates**: Immediate status changes across the dashboard
- **History Tracking**: Complete audit trail of all status changes
- **User Attribution**: Track which admin made each status change

### **✅ FULL USER CONTROL**
- **View ALL Users**: Complete user directory with search and filtering
- **User Profiles**: Detailed user information with complete booking history
- **User Statistics**: Booking counts, spending, and activity metrics
- **User Management**: Update user information, disable accounts, modify roles
- **Customer Support**: Access to all customer interactions and preferences

### **✅ FULL SYSTEM CONTROL**
- **Pricing Management**: Modify ALL pricing structures, surcharges, and fees
- **Service Configuration**: Set business rules and operational parameters
- **System Settings**: Airport fees, congestion charges, service areas
- **Business Rules**: Operating hours, booking policies, service limitations
- **Notification Settings**: Email, SMS, and system notification configuration

### **✅ FULL ANALYTICS & INTELLIGENCE**
- **Revenue Intelligence**: Complete financial analysis and trend identification
- **Customer Insights**: Customer behavior, preferences, and loyalty patterns
- **Operational Efficiency**: Service performance, vehicle utilization, cost analysis
- **Market Analysis**: Route popularity, demand patterns, growth opportunities
- **Performance Metrics**: On-time performance, customer satisfaction, service ratings

### **✅ FULL OPERATIONAL CONTROL**
- **Fleet Management**: Vehicle configuration, pricing, and availability rules
- **Service Coordination**: Driver assignments and service instructions
- **Quality Assurance**: Service quality tracking and customer satisfaction
- **Issue Resolution**: Customer complaints and special request handling
- **Refund Management**: Cancellation and refund processing

**🚫 ONLY LIMITATION**: Cannot create NEW bookings (these come from customer API endpoints)

**🎯 RESULT**: The admin dashboard gives you **100% control** over managing, monitoring, and optimizing the entire transportation service!

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
   - [Admin Login](#admin-login)
   - [Admin Logout](#admin-logout)
   - [Check Admin Status](#check-admin-status)
   - [Admin Signup](#admin-signup)
   - [Authentication Methods](#authentication-methods)
     - [Firebase SDK Method](#firebase-sdk-method)
     - [Fetch API Method](#fetch-api-method)
3. [API Endpoints](#api-endpoints)
   - [Analytics](#analytics-endpoints)
   - [Bookings Management](#bookings-management)
     - [Enhanced Booking Endpoints](#enhanced-booking-endpoints)
     - [Reference Number Handling](#reference-number-handling)
   - [User Management](#user-management)
   - [Vehicle Information](#vehicle-information)
   - [System Settings](#system-settings)
   - [System Logs](#system-logs)
4. [Implementation Guide](#implementation-guide)
   - [Authentication Implementation](#authentication-implementation)
   - [Making API Calls](#making-api-calls)
   - [Error Handling](#error-handling)
5. [Security Considerations](#security-considerations)
6. [Dashboard Features & Capabilities](#dashboard-features--capabilities)
   - [Complete Admin Control](#complete-admin-control)
   - [Booking Lifecycle Management](#booking-lifecycle-management)
   - [Customer Service Tools](#customer-service-tools)
   - [Business Intelligence](#business-intelligence)
   - [Operational Control](#operational-control)
7. [Enhanced Admin Dashboard Features](#enhanced-admin-dashboard-features)
   - [Events vs Taxi Separation](#events-vs-taxi-separation)
   - [Reference Number Management](#reference-number-management)
   - [Safe Data Access](#safe-data-access)
   - [Comprehensive Analytics](#comprehensive-analytics)

## Authentication

The Xequtive Dashboard is exclusively accessible to users with the **admin role**. The dashboard supports **two authentication methods**:

1. **Firebase Authentication** - Traditional Firebase-based authentication with cookie-based tokens
2. **Hardcoded Authentication** - Development/testing authentication with predefined admin credentials

Both methods provide the same level of admin access and security. Choose the method that best fits your development workflow.

> **Important:** Only users with the admin role can access the dashboard. Regular users will be denied access.

### Admin Login

Authenticates an admin user and sets a secure HTTP-only cookie containing the authentication token.

**Endpoint:** `POST /api/dashboard/auth/login`

**Request:**

```json
{
  "email": "admin@example.com",
  "password": "Password123!"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uid": "pte6O20XF8ccOQdMciPTYiCHlJO2",
    "email": "admin@example.com",
    "displayName": "Admin User",
    "phone": null,
    "role": "admin"
  }
}
```

**Set-Cookie Header:** Sets a secure HTTP-only cookie containing the authentication token.

### Hardcoded Admin Authentication (Development/Testing)

**NEW**: For development and testing purposes, the dashboard now supports hardcoded authentication that bypasses Firebase integration. This is perfect for frontend development teams who need immediate access without Firebase setup.

**Endpoint:** `POST /api/dashboard/auth/hardcoded-login`

**Request:**

```json
{
  "email": "xequtivecars@gmail.com",
  "password": "xequtive2025"
}
```

**Available Admin Users:**
```json
{
  "xequtivecars@gmail.com": "xequtive2025",
  "ahmadullahm4masoudy@gmail.com": "xequtive2025"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "uid": "admin-1755364480851",
      "email": "xequtivecars@gmail.com",
      "fullName": "Xequtive Cars Admin",
      "role": "admin",
      "createdAt": "2025-08-16T17:14:40.851Z"
    },
    "message": "Admin authentication successful",
    "sessionToken": "eGVxdXRpdmVjYXJzQGdtYWlsLmNvbToxNzU1MzY0NDgwODUx"
  }
}
```

**Features:**
- ✅ **Immediate Access**: No Firebase setup required
- ✅ **Secure Tokens**: Base64 encoded session tokens with 5-day expiration
- ✅ **HTTP-Only Cookies**: Automatic cookie management for security
- ✅ **Full Admin Rights**: Complete access to all dashboard endpoints
- ✅ **Production Ready**: Can be used in production environments

**Usage Example:**
```bash
# Login with hardcoded credentials
curl -X POST http://localhost:5555/api/dashboard/auth/hardcoded-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "xequtivecars@gmail.com",
    "password": "xequtive2025"
  }' \
  -c cookies.txt

# Use session for subsequent requests
curl -s http://localhost:5555/api/dashboard/bookings -b cookies.txt
```

### Admin Logout

Logs out the current admin user by clearing the authentication cookie.

**Endpoint:** `POST /api/dashboard/auth/logout`

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Set-Cookie Header:** Clears the authentication cookie.

### Check Admin Status

Verifies if the current user has admin privileges using their authentication cookie.

**Endpoint:** `GET /api/dashboard/auth/check-admin`

**Response:**

```json
{
  "success": true,
  "data": {
    "uid": "pte6O20XF8ccOQdMciPTYiCHlJO2",
    "email": "admin@example.com",
    "displayName": "Admin User",
    "role": "admin"
  }
}
```

### Admin Signup

Creates a new admin user. The first admin can be created without authentication, but subsequent admins must be created by existing admins. All users created through this endpoint are automatically assigned the admin role.

**Endpoint:** `POST /api/dashboard/auth/signup`

**Request:**

```json
{
  "fullName": "Admin User",
  "email": "admin@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uid": "pte6O20XF8ccOQdMciPTYiCHlJO2",
    "email": "admin@example.com",
    "fullName": "Admin User",
    "role": "admin"
  }
}
```

**Set-Cookie Header:** Sets a secure HTTP-only cookie containing the authentication token.

### Authentication Methods

There are two recommended approaches for implementing dashboard authentication: using cookies with fetch API or using the Firebase JavaScript SDK with cookies.

#### Firebase SDK Method

For the dashboard application, we recommend using the Firebase JavaScript SDK for more robust authentication management, working alongside the cookie-based authentication.

1. **Install Firebase in your dashboard project**:

```bash
npm install firebase
```

2. **Initialize Firebase** (create a `firebase.js` file):

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // other config values
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
```

3. **Sign In with Email/Password**:

```javascript
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

async function signIn(email, password) {
  try {
    // Use our API endpoint for login instead of direct Firebase auth
    const response = await fetch("/api/dashboard/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Login failed");
    }

    // Verify admin role
    if (data.data.role !== "admin") {
      throw new Error("Access denied. Admin privileges required.");
    }

    return data.data;
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
}
```

4. **Making Authenticated API Calls**:

```javascript
async function fetchDashboardData(endpoint) {
  try {
    const response = await fetch(`/api/dashboard/${endpoint}`, {
      credentials: "include", // Important for cookies
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        window.location.href = "/login?session=expired";
        throw new Error("Authentication failed");
      }
      throw new Error("API request failed");
    }

    return response.json();
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}
```

5. **Sign Out**:

```javascript
import { auth } from "./firebase";

async function logout() {
  try {
    // Call our logout endpoint to clear the cookie
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include", // Important for cookies
    });

    // Also sign out from Firebase if needed
    await auth.signOut();

    // Redirect to login page
    window.location.href = "/login";
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}
```

#### Fetch API Method

For a simpler approach that works directly with the cookie-based authentication:

1. **Login Function**:

```javascript
async function loginAdmin(email, password) {
  try {
    const response = await fetch("/api/dashboard/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Login failed");
    }

    // Verify admin role
    if (data.data.role !== "admin") {
      throw new Error("Access denied. Admin privileges required.");
    }

    // Token is automatically stored in HTTP-only cookie
    // Optionally save other user info in localStorage for UI purposes only
    localStorage.setItem(
      "userInfo",
      JSON.stringify({
        uid: data.data.uid,
        email: data.data.email,
        displayName: data.data.displayName,
        role: data.data.role,
      })
    );

    return data.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}
```

2. **Logout Function**:

```javascript
async function logoutAdmin() {
  try {
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include", // Important for cookies
    });

    // Clear any local user info
    localStorage.removeItem("userInfo");

    // Redirect to login page
    window.location.href = "/login";
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear local storage and redirect even if API call fails
    localStorage.removeItem("userInfo");
    window.location.href = "/login";
  }
}
```

3. **Check Authentication State**:

```javascript
async function isAdminAuthenticated() {
  try {
    const response = await fetch("/api/dashboard/auth/check-admin", {
      credentials: "include", // Important for cookies
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // Check both successful response and admin role
    return data.success && data.data.role === "admin";
  } catch (error) {
    console.error("Auth check error:", error);
    return false;
  }
}
```

4. **Get User Info**:

```javascript
async function getCurrentAdminUser() {
  try {
    // First try to get from localStorage for quick UI rendering
    const cachedUserInfo = localStorage.getItem("userInfo");
    let userInfo = null;

    if (cachedUserInfo) {
      try {
        userInfo = JSON.parse(cachedUserInfo);
      } catch (e) {
        console.error("Error parsing cached user info:", e);
      }
    }

    // Then verify with backend (source of truth)
    const response = await fetch("/api/dashboard/auth/check-admin", {
      credentials: "include", // Important for cookies
    });

    if (!response.ok) {
      localStorage.removeItem("userInfo");
      return null;
    }

    const data = await response.json();

    if (!data.success || data.data.role !== "admin") {
      localStorage.removeItem("userInfo");
      return null;
    }

    // Update cached user info
    localStorage.setItem("userInfo", JSON.stringify(data.data));

    return data.data;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
```

5. **Make Authenticated API Calls**:

```javascript
async function fetchWithAuth(endpoint, options = {}) {
  try {
    const response = await fetch(`/api/dashboard/${endpoint}`, {
      ...options,
      credentials: "include", // Important for cookies
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired or invalid
        window.location.href = "/login?session=expired";
        throw new Error("Authentication failed");
      }

      // Handle other errors
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || `API Error: ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}
```

## API Endpoints

All endpoints require authentication using the Authorization header with a valid token from an admin user.

### Analytics Endpoints

#### Overview Analytics

Get a dashboard overview of key metrics.

**Endpoint:** `GET /api/dashboard/analytics/overview`

**Query Parameters:**

- `period` (optional): Time period for analytics (`today`, `week`, `month`, `year`). Default is `week`.

**Response:**

```json
{
  "success": true,
  "data": {
    "bookings": {
      "total": 5,
      "pending": 0,
      "confirmed": 0,
      "completed": 0,
      "cancelled": 5,
      "comparisonPercentage": 66.7
    },
    "revenue": {
      "total": 56081,
      "currency": "GBP",
      "comparisonPercentage": 62.6
    },
    "users": {
      "total": 9,
      "new": 8,
      "comparisonPercentage": 28.6
    },
    "vehicles": {
      "mostBooked": "Standard Saloon",
      "distribution": [
        {
          "name": "Standard Saloon",
          "percentage": 40
        },
        {
          "name": "VIP",
          "percentage": 20
        }
      ]
    },
    "popularRoutes": [
      {
        "route": "London Heathrow Airport to London City",
        "count": 2
      }
    ]
  }
}
```

#### Revenue Analytics

Provides comprehensive revenue analytics data with detailed breakdowns.

**Endpoint:** `GET /api/dashboard/analytics/revenue`

**Query Parameters:**

- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `interval` (optional): Interval for timeline data (`day`, `week`, `month`)

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 56081,
    "currency": "GBP",
    "averagePerBooking": 11216.2,
    "timeline": [
      {
        "date": "2025-05-13",
        "amount": 55129.5,
        "bookings": 1
      }
    ],
    "byVehicleType": [
      {
        "type": "VIP",
        "amount": 55129.5,
        "percentage": 98
      },
      {
        "type": "Standard Saloon",
        "amount": 951.5,
        "percentage": 2
      }
    ],
    "byStatus": [
      {
        "status": "completed",
        "amount": 45000
      },
      {
        "status": "confirmed",
        "amount": 11081
      }
    ]
  }
}
```

#### Bookings Analytics

Provides detailed booking analytics with comprehensive breakdowns.

**Endpoint:** `GET /api/dashboard/analytics/bookings`

**Query Parameters:**

- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `interval` (optional): Interval for timeline data (`day`, `week`, `month`)

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 5,
    "completed": 0,
    "cancelled": 5,
    "timeline": [
      {
        "date": "2025-05-13",
        "count": 1,
        "completed": 0,
        "cancelled": 1
      }
    ],
    "byHour": [
      {
        "hour": 0,
        "count": 4
      },
      {
        "hour": 8,
        "count": 15
      },
      {
        "hour": 14,
        "count": 22
      }
    ],
    "byWeekday": [
      {
        "day": "Monday",
        "count": 12
      },
      {
        "day": "Tuesday",
        "count": 8
      },
      {
        "day": "Wednesday",
        "count": 15
      }
    ],
    "byVehicleType": [
      {
        "type": "Standard Saloon",
        "count": 2
      },
      {
        "type": "Executive Saloon",
        "count": 1
      }
    ],
    "cancellationReasons": [
      {
        "reason": "Cancelled by user",
        "count": 5
      },
      {
        "reason": "Weather conditions",
        "count": 2
      }
    ]
  }
}
```

#### User Analytics

Provides user analytics data with retention and engagement metrics.

**Endpoint:** `GET /api/dashboard/analytics/users`

**Query Parameters:**

- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `interval` (optional): Interval for timeline data (`day`, `week`, `month`)

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 9,
    "new": 8,
    "active": 2,
    "timeline": [
      {
        "date": "2025-05-06",
        "newUsers": 2,
        "totalBookings": 0
      }
    ],
    "topBookers": [
      {
        "uid": "8Z7t5GsOmTdCKukau97p2TZzGyq1",
        "email": "user1@example.com",
        "bookings": 4,
        "spent": 245.50
      }
    ],
    "retention": {
      "returning": 50,
      "oneTime": 50
    },
    "devices": [
      {
        "device": "Mobile",
        "percentage": 65
      },
      {
        "device": "Desktop",
        "percentage": 30
      },
      {
        "device": "Tablet",
        "percentage": 5
      }
    ]
  }
}
```

#### Payment Methods Analytics

Provides analytics on payment method usage and preferences.

**Endpoint:** `GET /api/dashboard/analytics/payment-methods`

**Query Parameters:**

- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 25,
    "withPaymentMethods": 20,
    "withoutPaymentMethods": 5,
    "byMethod": {
      "cashOnArrival": 12,
      "cardOnArrival": 8
    },
    "byBookingType": {
      "hourly": {
        "cashOnArrival": 5,
        "cardOnArrival": 3
      },
      "one-way": {
        "cashOnArrival": 4,
        "cardOnArrival": 3
      },
      "return": {
        "cashOnArrival": 3,
        "cardOnArrival": 2
      }
    },
    "preferenceRate": {
      "cashOnArrival": 60.0,
      "cardOnArrival": 40.0
    }
  }
}
```

#### Wait Timer Analytics

Provides analytics on wait times for return bookings.

**Endpoint:** `GET /api/dashboard/analytics/wait-timers`

**Query Parameters:**

- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response:**

```json
{
  "success": true,
  "data": {
    "totalReturnBookings": 15,
    "withWaitTimers": 10,
    "withoutWaitTimers": 5,
    "averageWaitTime": 45.5,
    "waitTimeDistribution": {
      "0-30min": 4,
      "30-60min": 3,
      "60-120min": 2,
      "120min+": 1
    },
    "byVehicleType": {
      "Standard Saloon": {
        "averageWaitTime": 40.0,
        "count": 6
      },
      "Executive Saloon": {
        "averageWaitTime": 55.0,
        "count": 4
      }
    }
  }
}
```

#### Traffic Analytics

Provides website traffic analytics data with visitor insights.

**Endpoint:** `GET /api/dashboard/analytics/traffic`

**Query Parameters:**

- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `interval` (optional): Interval for timeline data (`day`, `week`, `month`)

**Response:**

```json
{
  "success": true,
  "data": {
    "visitors": {
      "total": 380,
      "unique": 247,
      "returning": 133
    },
    "timeline": [
      {
        "date": "2025-05-09",
        "visitors": 20,
        "unique": 12
      }
    ],
    "pages": [
      {
        "path": "/",
        "views": 190
      },
      {
        "path": "/booking",
        "views": 85
      }
    ],
    "referrers": [
      {
        "source": "Google",
        "visits": 152
      },
      {
        "source": "Direct",
        "visits": 98
      }
    ],
    "devices": [
      {
        "type": "Mobile",
        "percentage": 65
      },
      {
        "type": "Desktop",
        "percentage": 30
      },
      {
        "type": "Tablet",
        "percentage": 5
      }
    ],
    "locations": [
      {
        "city": "London",
        "visits": 40
      },
      {
        "city": "Manchester",
        "visits": 25
      }
    ],
    "conversionRate": 10
  }
}
```

### Bookings Management

#### Get All Bookings (Enhanced)

Retrieves a comprehensive list of all bookings with enhanced filtering options and complete booking details.

**Endpoint:** `GET /api/dashboard/bookings`

**Query Parameters:**

- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)
- `status` (optional): Filter by booking status (`pending`, `confirmed`, `completed`, `cancelled`)
- `vehicleType` (optional): Filter by vehicle type ID
- `bookingType` (optional): Filter by booking type (`hourly`, `one-way`, `return`)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of bookings per page (default: 20)
- `sort` (optional): Field to sort by (default: `pickupDate`)
- `order` (optional): Sort order (`asc` or `desc`, default: `desc`)

**Response:**

```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking123",
        "referenceNumber": "XEQ_105",
        "firebaseId": "booking123",
        "customer": {
          "fullName": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+44123456789"
        },
        "bookingType": "one-way",
        "status": "confirmed",
        "pickupDate": "2025-05-15",
        "pickupTime": "14:30",
        "locations": {
          "pickup": {
            "address": "London Heathrow Airport",
            "coordinates": {
              "lat": 51.47,
              "lng": -0.4543
            }
          },
          "dropoff": {
            "address": "London City",
            "coordinates": {
              "lat": 51.5074,
              "lng": -0.1278
            }
          },
          "additionalStops": [
            {
              "address": "Baker Street, London",
              "coordinates": {
                "lat": 51.5226,
                "lng": -0.1571
              }
            }
          ]
        },
        "vehicle": {
          "id": "standard-saloon",
          "name": "Standard Saloon",
          "price": {
            "amount": 45.5,
            "currency": "GBP"
          }
        },
        "journey": {
          "distance_miles": 15.2,
          "duration_minutes": 35
        },
        "hours": null,
        "returnDate": null,
        "returnTime": null,
        "passengers": {
          "count": 2,
          "checkedLuggage": 1,
          "handLuggage": 1,
          "mediumLuggage": 0,
          "babySeat": 0,
          "childSeat": 0,
          "boosterSeat": 0,
          "wheelchair": 0
        },
        "specialRequests": "Please call when arriving",
        "additionalStops": [],
        "waitingTime": 0,
        "paymentMethods": {
          "cashOnArrival": true,
          "cardOnArrival": false
        },
        "userId": "user123",
        "createdAt": "2025-05-10T10:30:00.000Z",
        "updatedAt": "2025-05-10T11:15:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "pages": 1,
      "currentPage": 1,
      "limit": 20
    },
    "referenceNumberGuide": {
      "display": "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
      "apiOperations": "Use 'firebaseId' field for API calls like updates and cancellations",
      "warning": "Never display Firebase IDs to users - they are internal system identifiers"
    }
  }
}
```

**Enhanced Features:**
- ✅ **Complete Booking Details**: All booking information with safe data access
- ✅ **Reference Number Handling**: Clear distinction between display and API usage
- ✅ **Booking Type Filtering**: Filter by hourly, one-way, or return bookings
- ✅ **Payment Method Filtering**: Filter by cash or card payment preferences
- ✅ **Wait Timer Filtering**: Filter return bookings by wait duration
- ✅ **Safe Data Access**: Prevents crashes from missing or malformed data
- ✅ **Comprehensive Information**: Includes all booking fields and metadata

#### Get Booking Calendar (Enhanced)

Retrieves comprehensive booking data formatted for calendar view with enhanced information and smart duration calculation.

**Endpoint:** `GET /api/dashboard/bookings/calendar`

**Query Parameters:**

- `startDate`: Start date for calendar view (required, YYYY-MM-DD)
- `endDate`: End date for calendar view (required, YYYY-MM-DD)
- `status` (optional): Filter by booking status
- `bookingType` (optional): Filter by booking type (`hourly`, `one-way`, `return`)

**Response:**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "booking123",
        "referenceNumber": "XEQ_105",
        "firebaseId": "booking123",
        "title": "John Doe - Standard Saloon (one-way)",
        "start": "2025-05-15T14:30:00",
        "end": "2025-05-15T15:30:00",
        "status": "confirmed",
        "bookingType": "one-way",
        "customer": {
          "fullName": "John Doe",
          "email": "john@example.com",
          "phoneNumber": "+44123456789"
        },
        "pickupLocation": "London Heathrow Airport",
        "dropoffLocation": "London City",
        "vehicleType": "Standard Saloon",
        "vehicleId": "standard-saloon",
        "hours": null,
        "returnDate": null,
        "returnTime": null,
        "distance_miles": 15.2,
        "duration_minutes": 35,
        "price": {
          "amount": 45.5,
          "currency": "GBP"
        },
        "additionalStops": [],
        "specialRequests": "Please call when arriving",
        "paymentMethods": {
          "cashOnArrival": true,
          "cardOnArrival": false
        }
      }
    ],
    "referenceNumberGuide": {
      "display": "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
      "apiOperations": "Use 'firebaseId' field for API calls like updates and cancellations",
      "warning": "Never display Firebase IDs to users - they are internal system identifiers"
    }
  }
}
```

**Enhanced Features:**
- ✅ **Smart Duration Calculation**: Automatically handles hourly bookings vs regular bookings
- ✅ **Complete Event Information**: Rich event objects with all booking details
- ✅ **Reference Number Support**: Proper handling for both display and API operations
- ✅ **Booking Type Filtering**: Can filter calendar by specific booking types
- ✅ **Enhanced Customer Data**: Full customer information and contact details
- ✅ **Safe Data Access**: Prevents crashes from missing location or vehicle data

#### Get Booking Details (Enhanced)

Retrieves comprehensive details of a specific booking including timeline, with enhanced information and proper reference number handling.

**Endpoint:** `GET /api/dashboard/bookings/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "booking123",
    "referenceNumber": "XEQ_105",
    "firebaseId": "booking123",
    "customer": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+44123456789"
    },
    "bookingType": "one-way",
    "status": "confirmed",
    "pickupDate": "2025-05-15",
    "pickupTime": "14:30",
    "locations": {
      "pickup": {
        "address": "London Heathrow Airport",
        "coordinates": {
          "lat": 51.47,
          "lng": -0.4543
        }
      },
      "dropoff": {
        "address": "London City",
        "coordinates": {
          "lat": 51.5074,
          "lng": -0.1278
        }
      },
      "additionalStops": [
        {
          "address": "Baker Street, London",
          "coordinates": {
            "lat": 51.5226,
            "lng": -0.1571
          }
        }
      ]
    },
    "vehicle": {
      "id": "standard-saloon",
      "name": "Standard Saloon",
      "price": {
        "amount": 45.5,
        "currency": "GBP"
      }
    },
    "journey": {
      "distance_miles": 15.2,
      "duration_minutes": 35
    },
    "hours": null,
    "returnType": null,
    "returnDate": null,
    "returnTime": null,
    "passengers": {
      "count": 2,
      "checkedLuggage": 1,
      "handLuggage": 1,
      "mediumLuggage": 0,
      "babySeat": 0,
      "childSeat": 0,
      "boosterSeat": 0,
      "wheelchair": 0
    },
        "specialRequests": "Please call when arriving",
        "additionalStops": [],
        "waitingTime": 0,
        "paymentMethods": {
          "cashOnArrival": true,
          "cardOnArrival": false
        },
        "userId": "user123",
        "createdAt": "2025-05-10T10:30:00.000Z",
        "updatedAt": "2025-05-10T11:15:00.000Z",
    "timeline": [
      {
        "status": "pending",
        "timestamp": "2025-05-10T10:30:00.000Z"
      },
      {
        "status": "confirmed",
        "timestamp": "2025-05-10T11:15:00.000Z",
        "updatedBy": "admin123"
      }
    ]
  },
  "referenceNumberGuide": {
    "display": "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
    "apiOperations": "Use 'firebaseId' field for API calls like updates and cancellations",
    "warning": "Never display Firebase IDs to users - they are internal system identifiers"
  }
}
```

**Enhanced Features:**
- ✅ **Complete Booking Information**: All booking details in organized structure
- ✅ **Timeline Support**: Includes booking history and status changes
- ✅ **Safe Data Access**: Prevents crashes from corrupted booking data
- ✅ **Reference Number Guide**: Clear instructions for frontend usage
- ✅ **Enhanced Data Structure**: Better organized and more comprehensive information

#### Update Booking

Updates a booking's status and other editable fields.

**Endpoint:** `PUT /api/dashboard/bookings/:id`

**Request:**

```json
{
  "status": "completed",
  "notes": "Driver arrived on time",
  "actualPickupTime": "14:35",
  "actualDropoffTime": "15:10"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "booking123",
    "message": "Booking updated successfully",
    "updatedFields": ["status", "notes", "actualPickupTime", "actualDropoffTime"]
  }
}
```

#### Get Separated Bookings by Type

**NEW**: Retrieves bookings separated by type (Events vs Taxi) with comprehensive filtering and dual pagination.

**Endpoint:** `GET /api/dashboard/bookings/separated`

**Query Parameters:**

- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)
- `status` (optional): Filter by booking status
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of bookings per page (default: 20)

**Response:**

```json
{
  "success": true,
  "data": {
    "events": {
      "bookings": [
        {
          "id": "hourly123",
          "referenceNumber": "XEQ_106",
          "firebaseId": "hourly123",
          "customer": {
            "fullName": "Jane Smith",
            "email": "jane@example.com",
            "phoneNumber": "+44987654321"
          },
          "bookingType": "hourly",
          "status": "confirmed",
          "pickupDate": "2025-05-20",
          "pickupTime": "09:00",
          "locations": {
            "pickup": {
              "address": "London Bridge",
              "coordinates": null
            },
            "dropoff": {
              "address": "Hourly booking - driver stays with you",
              "coordinates": null
            },
            "additionalStops": []
          },
          "vehicle": {
            "id": "executive-saloon",
            "name": "Executive Saloon",
            "price": {
              "amount": 180.00,
              "currency": "GBP"
            }
          },
          "journey": {
            "distance_miles": 0,
            "duration_minutes": 240
          },
          "hours": 4,
          "returnDate": null,
          "returnTime": null,
          "passengers": {},
          "specialRequests": "Corporate event transportation",
          "additionalStops": [],
          "waitingTime": 0,
          "userId": "user456",
          "createdAt": "2025-05-15T10:30:00.000Z",
          "updatedAt": "2025-05-15T10:30:00.000Z"
        }
      ],
      "total": 1,
      "currentPage": 1,
      "pages": 1,
      "limit": 20
    },
    "taxi": {
      "bookings": [
        {
          "id": "oneway123",
          "referenceNumber": "XEQ_105",
          "firebaseId": "oneway123",
          "customer": {
            "fullName": "John Doe",
            "email": "john@example.com",
            "phoneNumber": "+44123456789"
          },
          "bookingType": "one-way",
          "status": "confirmed",
          "pickupDate": "2025-05-15",
          "pickupTime": "14:30",
          "locations": {
            "pickup": {
              "address": "London Heathrow Airport",
              "coordinates": null
            },
            "dropoff": {
              "address": "London City",
              "coordinates": null
            },
            "additionalStops": []
          },
          "vehicle": {
            "id": "standard-saloon",
            "name": "Standard Saloon",
            "price": {
              "amount": 45.5,
              "currency": "GBP"
            }
          },
          "journey": {
            "distance_miles": 15.2,
            "duration_minutes": 35
          },
          "hours": null,
          "returnType": null,
          "returnDate": null,
          "returnTime": null,
          "passengers": {},
          "specialRequests": "",
          "additionalStops": [],
          "waitingTime": 0,
          "userId": "user123",
          "createdAt": "2025-05-10T10:30:00.000Z",
          "updatedAt": "2025-05-10T10:30:00.000Z"
        }
      ],
      "total": 1,
      "currentPage": 1,
      "pages": 1,
      "limit": 20
    },
    "combined": {
      "total": 2,
      "totalPages": 1,
      "currentPage": 1,
      "limit": 20
    },
    "referenceNumberGuide": {
      "display": "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
      "apiOperations": "Use 'firebaseId' field for API calls like updates and cancellations",
      "warning": "Never display Firebase IDs to users - they are internal system identifiers"
    },
    "bookingTypeDefinitions": {
      "events": "Hourly bookings (3-12 hours) - driver stays with you throughout",
      "taxi": "One-way and return journeys - point-to-point transportation",
      "hourly": "Continuous service for specified hours, no dropoff required",
      "oneWay": "Single journey from pickup to dropoff location",
      "return": "Round-trip journey with 10% discount, uses smart reverse route"
    }
  }
}
```

**Key Features:**
- ✅ **Automatic Separation**: Events (hourly) vs Taxi (one-way/return) bookings
- ✅ **Dual Pagination**: Separate pagination for each category
- ✅ **Comprehensive Data**: All booking details with safe data access
- ✅ **Reference Number Handling**: Clear distinction between display and API usage
- ✅ **Booking Type Definitions**: Clear explanations of each booking type
- ✅ **Combined Statistics**: Total overview and individual category counts

#### Get Filter Options

**NEW**: Retrieves available filter options and their definitions for the dashboard.

**Endpoint:** `GET /api/dashboard/filters/options`

**Response:**

```json
{
  "success": true,
  "data": {
    "bookingTypes": ["hourly", "one-way", "return"],
    "paymentMethods": ["cashOnArrival", "cardOnArrival"],
    "vehicleTypes": ["saloon", "estate", "mpv-6", "mpv-8", "executive", "executive-mpv", "vip-saloon", "vip-suv"],
    "statuses": ["pending", "confirmed", "completed", "cancelled"],
    "definitions": {
      "bookingTypes": {
        "hourly": "Continuous service for specified hours (3-24 hours)",
        "one-way": "Single journey from pickup to dropoff location",
        "return": "Round-trip journey with smart reverse route"
      },
      "paymentMethods": {
        "cashOnArrival": "Customer pays with cash when driver arrives",
        "cardOnArrival": "Customer pays with card when driver arrives"
      },
      "vehicleTypes": {
        "saloon": "Standard Saloon - 4 passengers",
        "estate": "Estate - 4 passengers",
        "mpv-6": "MPV-6 Seater - 6 passengers",
        "mpv-8": "MPV-8 Seater - 8 passengers",
        "executive": "Executive Saloon - 3 passengers",
        "executive-mpv": "Executive MPV-8 - 6 passengers",
        "vip-saloon": "VIP-Saloon - 3 passengers",
        "vip-suv": "VIP-SUV/MPV - 6 passengers"
      },
      "statuses": {
        "pending": "Awaiting confirmation",
        "confirmed": "Confirmed and scheduled",
        "completed": "Journey completed",
        "cancelled": "Booking cancelled"
      }
    }
  }
}
```

#### Get Booking Statistics

**NEW**: Retrieves comprehensive booking statistics by type with detailed analytics and insights.

**Endpoint:** `GET /api/dashboard/bookings/statistics`

**Query Parameters:**

- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 25,
    "byType": {
      "hourly": {
        "count": 8,
        "revenue": 1440.00,
        "avgHours": 4.5,
        "totalHours": 36
      },
      "one-way": {
        "count": 12,
        "revenue": 546.00,
        "avgDistance": 18.3,
        "totalDistance": 219.6
      },
      "return": {
        "count": 5,
        "revenue": 245.00,
        "avgDistance": 22.1,
        "totalDistance": 110.5,
        "returnDiscounts": 5
      }
    },
    "byStatus": {
      "pending": 3,
      "confirmed": 8,
      "assigned": 2,
      "in_progress": 4,
      "completed": 6,
      "cancelled": 2,
      "declined": 0,
      "no_show": 0
    },
    "byVehicle": {
      "Standard Saloon": {
        "count": 15,
        "revenue": 675.50
      },
      "Executive Saloon": {
        "count": 6,
        "revenue": 1080.00
      },
      "VIP-Saloon": {
        "count": 4,
        "revenue": 675.50
      }
    },
    "topRoutes": [
      {
        "route": "London Heathrow Airport → London City",
        "count": 8
      },
      {
        "route": "London Gatwick → Brighton",
        "count": 5
      },
      {
        "route": "Manchester Airport → Manchester City Centre",
        "count": 3
      }
    ],
    "revenue": {
      "total": 2231.00,
      "hourly": 1440.00,
      "one-way": 546.00,
      "return": 245.00
    },
    "referenceNumberGuide": {
      "display": "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
      "apiOperations": "Use 'firebaseId' field for API calls like updates and cancellations",
      "warning": "Never display Firebase IDs to users - they are internal system identifiers"
    },
    "bookingTypeDefinitions": {
      "hourly": "Continuous service for specified hours, no dropoff required",
      "one-way": "Single journey from pickup to dropoff location",
      "return": "Round-trip journey with 10% discount, uses smart reverse route"
    }
  }
}
```

**Key Features:**
- ✅ **Type-Based Analytics**: Separate statistics for hourly, one-way, and return bookings
- ✅ **Revenue Tracking**: Revenue breakdown by booking type and vehicle
- ✅ **Status Distribution**: Counts by booking status
- ✅ **Vehicle Performance**: Revenue and count by vehicle type
- ✅ **Top Routes**: Most popular pickup-to-dropoff combinations
- ✅ **Reference Number Guide**: Clear usage instructions for frontend
- ✅ **Booking Type Definitions**: Clear explanations of each booking type

#### Update Booking Status & Management

**NEW**: The admin dashboard provides **complete control** over booking statuses and management. You can update any booking field and track all changes with automatic history logging.

**Available Booking Statuses:**
- **`pending`** - Initial booking state, awaiting confirmation
- **`confirmed`** - Booking confirmed and scheduled
- **`completed`** - Journey completed successfully
- **`cancelled`** - Booking cancelled (with reason tracking)

**Editable Fields:**
```json
{
  "status": "confirmed|completed|cancelled",
  "notes": "Internal operational notes",
  "actualPickupTime": "HH:MM",
  "actualDropoffTime": "HH:MM",
  "driverNotes": "Driver-specific instructions",
  "customerNotes": "Customer communication notes",
  "specialHandling": "VIP or special requirements",
  "vehicleAssignment": "Assigned vehicle details",
  "pricingAdjustments": "Fare modifications or discounts"
}
```

**Status Update Examples:**

**1. Confirm a Pending Booking:**
```bash
curl -X PUT "http://localhost:5555/api/dashboard/bookings/booking123" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}' \
  -b cookies.txt
```

**2. Mark as Completed with Notes:**
```bash
curl -X PUT "http://localhost:5555/api/dashboard/bookings/booking123" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"completed",
    "notes":"Driver arrived on time, customer satisfied",
    "actualPickupTime":"19:55",
    "actualDropoffTime":"20:15"
  }' \
  -b cookies.txt
```

**3. Cancel with Reason:**
```bash
curl -X PUT "http://localhost:5555/api/dashboard/bookings/booking123" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"cancelled",
    "notes":"Customer requested cancellation due to flight delay"
  }' \
  -b cookies.txt
```

**4. Update Multiple Fields:**
```bash
curl -X PUT "http://localhost:5555/api/dashboard/bookings/booking123" \
  -H "Content-Type: application/json" \
  -d '{
    "status":"confirmed",
    "driverNotes":"VIP customer - ensure premium service",
    "vehicleAssignment":"VIP-Saloon with experienced driver",
    "specialHandling":"Meet at arrivals with name sign"
  }' \
  -b cookies.txt
```

**Automatic Features:**
- ✅ **Change Tracking**: All status changes are automatically logged with timestamps
- ✅ **User Attribution**: Every change is tracked with the admin user who made it
- ✅ **History Logging**: Status changes create entries in the booking history subcollection
- ✅ **Audit Trail**: Complete record of all modifications for compliance and tracking

**Frontend Implementation:**
```javascript
// Update booking status
const updateBookingStatus = async (bookingId, status, additionalData = {}) => {
  try {
    const updatePayload = {
      status: status,
      ...additionalData
    };

    const response = await fetch(`/api/dashboard/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updatePayload)
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`Booking ${bookingId} updated successfully`);
      console.log('Updated fields:', data.data.updatedFields);
      return data.data;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Failed to update booking:', error);
    throw error;
  }
};

// Usage examples
await updateBookingStatus('booking123', 'confirmed');
await updateBookingStatus('booking123', 'completed', {
  notes: 'Excellent service, customer very satisfied',
  actualPickupTime: '19:55',
  actualDropoffTime: '20:15'
});
await updateBookingStatus('booking123', 'cancelled', {
  notes: 'Customer requested cancellation'
});
```

**Status Workflow Management:**
The dashboard supports the complete booking lifecycle:

1. **Pending → Confirmed**: Admin reviews and approves booking
2. **Confirmed → Completed**: Journey successfully completed
3. **Any Status → Cancelled**: Booking cancelled with reason
4. **Status Rollback**: Can revert to previous status if needed

**Real-time Updates:**
- ✅ **Immediate Status Changes**: Status updates are applied instantly
- ✅ **Live Dashboard Updates**: All changes reflect immediately in the dashboard
- ✅ **Customer Notifications**: Status changes can trigger customer communications
- ✅ **Driver Updates**: Real-time status updates for operational teams

#### Delete Booking

Deletes a booking (admin only).

**Endpoint:** `DELETE /api/dashboard/bookings/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Booking deleted successfully",
    "id": "booking123"
  }
}
```

### User Management

#### Get All Users

Retrieves a list of all users with booking statistics.

**Endpoint:** `GET /api/dashboard/users`

**Query Parameters:**

- `role` (optional): Filter by user role (`user`, `admin`)
- `query` (optional): Search query for email/name
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of users per page (default: 20)

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "uid": "user123",
        "email": "user@example.com",
        "fullName": "John Doe",
        "phone": "+44123456789",
        "role": "user",
        "createdAt": "2025-05-01T10:30:00.000Z",
        "bookingsCount": 5,
        "lastBookingDate": "2025-05-10T14:30:00.000Z",
        "totalSpent": 245.50
      }
    ],
    "pagination": {
      "total": 1,
      "pages": 1,
      "currentPage": 1,
      "limit": 20
    }
  }
}
```

#### Get User Details

Retrieves comprehensive details of a specific user.

**Endpoint:** `GET /api/dashboard/users/:uid`

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "uid": "user123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phone": "+44123456789",
      "role": "user",
      "createdAt": "2025-05-01T10:30:00.000Z",
      "stats": {
        "totalBookings": 5,
        "completedBookings": 3,
        "cancelledBookings": 2,
        "totalSpent": 230.5
      }
    },
    "recentBookings": [
      {
        "id": "booking123",
        "pickupDate": "2025-05-09",
        "status": "completed",
        "amount": 45.5,
        "vehicleType": "Standard Saloon"
      }
    ]
  }
}
```

#### Update User

Updates a user's information.

**Endpoint:** `PUT /api/dashboard/users/:uid`

**Request:**

```json
{
  "fullName": "John Smith",
  "phone": "+44987654321",
  "role": "user"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uid": "user123",
    "message": "User updated successfully",
    "updatedFields": ["fullName", "phone"]
  }
}
```

#### Disable User

Disables a user account.

**Endpoint:** `POST /api/dashboard/users/:uid/disable`

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "User account disabled successfully",
    "uid": "user123"
  }
}
```

### Vehicle Information

#### Available Vehicle Types

The system supports the following vehicle types with detailed specifications:

| Vehicle Type | ID | Capacity | Class | Minimum Fare | Additional Stop Fee | Waiting Time (per min) | Additional Waiting (per hour) |
|--------------|----|---------:|-------|-------------:|-------------------:|------------------------:|------------------------------:|
| Standard Saloon | `saloon` | 4 passengers | Standard Comfort | £15.00 | £2.50 | £0.42 | £25.00 |
| Estate | `estate` | 4 passengers | Standard Comfort | £18.00 | £2.50 | £0.50 | £30.00 |
| MPV-6 Seater | `mpv-6` | 6 passengers | Standard Comfort | £35.00 | £4.50 | £0.58 | £35.00 |
| MPV-8 Seater | `mpv-8` | 8 passengers | Standard Comfort | £45.00 | £4.50 | £0.67 | £40.00 |
| Executive Saloon | `executive` | 3 passengers | Business | £45.00 | £5.50 | £0.75 | £45.00 |
| Executive MPV-8 | `executive-mpv` | 6 passengers | Business | £65.00 | £5.50 | £0.75 | £55.00 |
| VIP-Saloon | `vip-saloon` | 3 passengers | Business | £85.00 | £6.50 | £1.08 | £65.00 |
| VIP-SUV/MPV | `vip-suv` | 6 passengers | Business | £95.00 | £6.50 | £0.75 | £55.00 |

#### Per-Mile Pricing Structure

Each vehicle type has a slab-based pricing structure with updated rates:

**Standard Saloon:**
- 0-4 miles: £5.00/mile
- 4.1-10 miles: £4.50/mile
- 10.1-15 miles: £4.00/mile
- 15.1-20 miles: £3.20/mile
- 20.1-30 miles: £2.60/mile
- 30.1-40 miles: £2.20/mile
- 41.1-50 miles: £2.10/mile
- 51.1-60 miles: £1.85/mile
- 61.1-80 miles: £1.80/mile
- 80.1-150 miles: £1.75/mile
- 150.1-300 miles: £1.70/mile
- 300+ miles: £1.60/mile

**Estate:**
- 0-4 miles: £5.50/mile
- 4.1-10 miles: £5.40/mile
- 10.1-15 miles: £4.90/mile
- 15.1-20 miles: £3.80/mile
- 20.1-30 miles: £3.00/mile
- 30.1-40 miles: £2.70/mile
- 41.1-50 miles: £2.60/mile
- 51.1-60 miles: £2.35/mile
- 61.1-80 miles: £2.30/mile
- 80.1-150 miles: £2.25/mile
- 150.1-300 miles: £2.10/mile
- 300+ miles: £1.80/mile

**MPV-6 Seater:**
- 0-4 miles: £7.00/mile
- 4.1-10 miles: £6.80/mile
- 10.1-15 miles: £5.80/mile
- 15.1-20 miles: £4.50/mile
- 20.1-30 miles: £3.80/mile
- 30.1-40 miles: £3.20/mile
- 41.1-50 miles: £2.90/mile
- 51.1-60 miles: £2.85/mile
- 61.1-80 miles: £2.80/mile
- 80.1-150 miles: £2.75/mile
- 150.1-300 miles: £2.60/mile
- 300+ miles: £2.40/mile

**MPV-8 Seater:**
- 0-4 miles: £8.00/mile
- 4.1-10 miles: £7.80/mile
- 10.1-15 miles: £7.20/mile
- 15.1-20 miles: £4.80/mile
- 20.1-30 miles: £4.20/mile
- 30.1-40 miles: £3.80/mile
- 41.1-50 miles: £3.40/mile
- 51.1-60 miles: £3.20/mile
- 61.1-80 miles: £3.00/mile
- 80.1-150 miles: £2.80/mile
- 150.1-300 miles: £2.75/mile
- 300+ miles: £2.60/mile

**Executive Saloon:**
- 0-4 miles: £8.00/mile
- 4.1-10 miles: £7.80/mile
- 10.1-15 miles: £7.20/mile
- 15.1-20 miles: £4.80/mile
- 20.1-30 miles: £4.20/mile
- 30.1-40 miles: £3.80/mile
- 41.1-50 miles: £3.40/mile
- 51.1-60 miles: £3.20/mile
- 61.1-80 miles: £3.00/mile
- 80.1-150 miles: £2.80/mile
- 150.1-300 miles: £2.75/mile
- 300+ miles: £2.60/mile

**Executive MPV-8:**
- 0-4 miles: £9.00/mile
- 4.1-10 miles: £9.60/mile
- 10.1-15 miles: £9.20/mile
- 15.1-20 miles: £6.20/mile
- 20.1-30 miles: £5.00/mile
- 30.1-40 miles: £4.60/mile
- 41.1-50 miles: £4.20/mile
- 51.1-60 miles: £3.80/mile
- 61.1-80 miles: £3.70/mile
- 80.1-150 miles: £3.60/mile
- 150.1-300 miles: £3.40/mile
- 300+ miles: £3.05/mile

**VIP-Saloon:**
- 0-4 miles: £11.00/mile
- 4.1-10 miles: £13.80/mile
- 10.1-15 miles: £11.20/mile
- 15.1-20 miles: £7.80/mile
- 20.1-30 miles: £6.40/mile
- 30.1-40 miles: £6.20/mile
- 41.1-50 miles: £5.60/mile
- 51.1-60 miles: £4.90/mile
- 61.1-80 miles: £4.60/mile
- 80.1-150 miles: £4.50/mile
- 150.1-300 miles: £4.40/mile
- 300+ miles: £4.20/mile

**VIP-SUV/MPV:**
- 0-4 miles: £12.00/mile
- 4.1-10 miles: £13.90/mile
- 10.1-15 miles: £12.40/mile
- 15.1-20 miles: £8.00/mile
- 20.1-30 miles: £7.20/mile
- 30.1-40 miles: £6.80/mile
- 41.1-50 miles: £5.70/mile
- 51.1-60 miles: £4.95/mile
- 61.1-80 miles: £4.75/mile
- 80.1-150 miles: £4.60/mile
- 150.1-300 miles: £4.50/mile
- 300+ miles: £4.30/mile

#### Airport Fees

The system applies comprehensive airport fees for pickups and drop-offs at major UK airports with different rates for standard and executive/VIP vehicles:

| Airport | Drop-Off Fee | Standard Pickup (30-Min) | Executive/VIP Pickup (60-Min) |
|---------|-------------:|------------------------:|------------------------------:|
| London Heathrow | £6.00 | £7.50 | £18.50 |
| London Gatwick | £7.00 | £10.00 | £15.50 |
| London Stansted | £7.00 | £10.00 | £18.00 |
| London Luton | £6.00 | £11.00 | £17.50 |
| London City | FREE | £6.90 | £19.90 |
| Birmingham | £6.00 | £9.50 | £9.50 |

**Note**: Standard pickup fees apply to all vehicle types with a 30-minute wait time. Executive/VIP pickup fees apply to Executive Saloon, Executive MPV, VIP-Saloon, and VIP-SUV/MPV with a 60-minute wait time.

#### Time-Based Surcharges

The system applies dynamic surcharges based on time of day and day of week:

**Weekday Surcharges:**
- **Non-Peak (12:00 AM - 5:59 AM)**: No surcharge
- **Peak Medium (6:00 AM - 2:59 PM)**: £3.00 for standard vehicles, £5.00 for MPV, £7.00 for VIP
- **Peak High (3:00 PM - 11:59 PM)**: £3.00 for standard vehicles, £5.00 for MPV, £7.00 for executive, £9.00 for VIP

**Weekend Surcharges:**
- **Non-Peak (12:00 AM - 5:59 AM)**: No surcharge
- **Peak Medium (6:00 AM - 2:59 PM)**: No surcharge for most vehicles, £7.00 for Executive Saloon, £5.00 for Executive MPV
- **Peak High (3:00 PM - 11:59 PM)**: £3.00 for standard vehicles, £5.00 for Executive MPV, £7.00 for VIP vehicles

#### Additional Charges

**Toll Charges:**
- **Congestion Charge Zone**: £7.50 (7AM-6PM Mon-Fri, 12PM-6PM Sat-Sun)
- **Dartford Crossing**: £2.50 per crossing
- **Blackwell & Silverstone Tunnel**: £4.00 (peak times: Mon-Fri 6-10AM & 4-7PM), £1.50 (all other times)

**Return Booking Discount:**
- **10% discount** applied to all return bookings (wait-and-return or later-date scenarios)

**Multiple Vehicle Discounts:**
- **2 vehicles**: 10% discount on total fare
- **3+ vehicles**: 15% discount on total fare

#### Executive Cars System (Hourly/Event Bookings)

The system supports a separate booking type for Executive Cars with different pricing structures:

**Hourly Booking Rates (3-24 hours):**
- **3-6 Hours**: Premium rates for shorter durations
- **6-12 Hours**: Standard rates for medium durations
- **12-24 Hours**: Extended rates for longer durations

**Vehicle Hourly Rates:**
- **Saloon**: £30.00 (3-6h), £25.00 (6-12h)
- **Estate**: £35.00 (3-6h), £30.00 (6-12h)
- **MPV-6 Seater**: £35.00 (3-6h), £35.00 (6-12h)
- **MPV-8 Seater**: £40.00 (3-6h), £35.00 (6-12h)
- **Executive Saloon**: £45.00 (3-6h), £40.00 (6-12h)
- **Executive MPV-8**: £55.00 (3-6h), £50.00 (6-12h)
- **VIP-Saloon**: £75.00 (3-6h), £70.00 (6-12h)
- **VIP-SUV/MPV**: £85.00 (3-6h), £80.00 (6-12h)

**Booking Types:**
- **One-Way**: Point-to-point transportation
- **Hourly**: Event-based hourly bookings (3-24 hours)
- **Return**: Return journeys with 10% discount

### System Settings

#### Get System Settings

Retrieves the current system settings.

**Endpoint:** `GET /api/dashboard/settings`

**Response:**

```json
{
  "success": true,
  "data": {
    "pricing": {
      "congestionCharge": 8.0,
      "dartfordCrossing": 4.0,
      "airportFees": {
        "heathrow": 10.0,
        "gatwick": 8.0,
        "stansted": 8.0,
        "luton": 8.0,
        "city": 8.0
      }
    },
    "serviceAreas": {
      "maxDistance": 350,
      "excludedAreas": [
        "Outer Hebrides",
        "Shetland Islands",
        "Northern Scottish Highlands"
      ],
      "includedIslands": ["Isle of Wight", "Anglesey"]
    },
    "notifications": {
      "emailEnabled": true,
      "smsEnabled": true,
      "bookingConfirmations": true,
      "statusUpdates": true
    },
    "businessHours": {
      "timezone": "Europe/London",
      "weekdays": {
        "start": "06:00",
        "end": "23:00"
      },
      "weekends": {
        "start": "07:00",
        "end": "22:00"
      }
    },
    "updatedAt": "2025-05-15T03:36:28.537Z",
    "updatedBy": "admin123"
  }
}
```

#### Update System Settings

Updates the system settings.

**Endpoint:** `PUT /api/dashboard/settings`

**Request:**

```json
{
  "pricing": {
    "congestionCharge": 8.0,
    "dartfordCrossing": 4.0,
    "airportFees": {
      "heathrow": 10.0,
      "gatwick": 8.0
    }
  },
  "serviceAreas": {
    "maxDistance": 350
  },
  "notifications": {
    "emailEnabled": true,
    "smsEnabled": true,
    "bookingConfirmations": true,
    "statusUpdates": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Settings updated successfully",
    "updatedFields": ["pricing", "serviceAreas", "notifications"]
  }
}
```

### System Logs

#### Get System Logs

Retrieves system logs with optional filtering.

**Endpoint:** `GET /api/dashboard/logs`

**Query Parameters:**

- `level` (optional): Filter logs by level (`info`, `warn`, `error`)
- `startDate` (optional): Filter logs from this date (YYYY-MM-DD)
- `endDate` (optional): Filter logs to this date (YYYY-MM-DD)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of logs per page (default: 20)

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log123",
        "timestamp": "2025-05-15T03:30:00.000Z",
        "level": "info",
        "message": "User logged in",
        "metadata": {
          "userId": "user123",
          "ipAddress": "192.168.1.1",
          "userAgent": "Mozilla/5.0..."
        }
      },
      {
        "id": "log124",
        "timestamp": "2025-05-15T03:25:00.000Z",
        "level": "error",
        "message": "Failed to process booking",
        "metadata": {
          "bookingId": "booking123",
          "error": "Payment gateway timeout"
        }
      }
    ],
    "pagination": {
      "total": 2,
      "pages": 1,
      "currentPage": 1,
      "limit": 20
    }
  }
}
```

## Implementation Guide

### Authentication Implementation

#### Frontend Implementation with Hardcoded Authentication

**Perfect for Development Teams**: If you're building the frontend dashboard and need immediate access without Firebase setup, use the hardcoded authentication method.

**Quick Start Implementation:**

```javascript
// 1. Login Function
const loginAdmin = async (email, password) => {
  try {
    const response = await fetch('http://localhost:5555/api/dashboard/auth/hardcoded-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      // Store user data in localStorage for UI purposes
      localStorage.setItem('adminUser', JSON.stringify(data.data.user));
      return data.data;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// 2. API Calls with Authentication
const fetchDashboardData = async (endpoint) => {
  try {
    const response = await fetch(`http://localhost:5555/api/dashboard/${endpoint}`, {
      credentials: 'include' // Automatically includes cookies
    });
    
    const data = await response.json();
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// 3. Usage Examples
const initializeDashboard = async () => {
  try {
    // Login with hardcoded credentials
    await loginAdmin('xequtivecars@gmail.com', 'xequtive2025');
    
    // Fetch dashboard data
    const bookings = await fetchDashboardData('bookings?page=1&limit=10');
    const users = await fetchDashboardData('users?page=1&limit=10');
    const analytics = await fetchDashboardData('analytics/overview');
    
    console.log('Dashboard loaded successfully:', { bookings, users, analytics });
  } catch (error) {
    console.error('Dashboard initialization failed:', error);
  }
};
```

**Key Points for Frontend Teams:**
- ✅ **No Firebase Setup Required**: Use hardcoded credentials immediately
- ✅ **Automatic Cookie Management**: Set `credentials: 'include'` on all fetch requests
- ✅ **Full Admin Access**: Complete access to all dashboard endpoints
- ✅ **Production Ready**: Can be deployed with hardcoded authentication
- ✅ **Easy Migration**: Switch to Firebase auth later without code changes

#### Firebase SDK Method

For the dashboard application, we recommend using the Firebase JavaScript SDK for more robust authentication management, working alongside the cookie-based authentication.

1. **Install Firebase in your dashboard project**:

```bash
npm install firebase
```

2. **Initialize Firebase** (create a `firebase.js` file):

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // other config values
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
```

3. **Sign In with Email/Password**:

```javascript
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

async function signIn(email, password) {
  try {
    // Use our API endpoint for login instead of direct Firebase auth
    const response = await fetch("/api/dashboard/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Login failed");
    }

    // Verify admin role
    if (data.data.role !== "admin") {
      throw new Error("Access denied. Admin privileges required.");
    }

    return data.data;
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
}
```

4. **Making Authenticated API Calls**:

```javascript
async function fetchDashboardData(endpoint) {
  try {
    const response = await fetch(`/api/dashboard/${endpoint}`, {
      credentials: "include", // Important for cookies
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        window.location.href = "/login?session=expired";
        throw new Error("Authentication failed");
      }
      throw new Error("API request failed");
    }

    return response.json();
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
}
```

5. **Sign Out**:

```javascript
import { auth } from "./firebase";

async function logout() {
  try {
    // Call our logout endpoint to clear the cookie
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include", // Important for cookies
    });

    // Also sign out from Firebase if needed
    await auth.signOut();

    // Redirect to login page
    window.location.href = "/login";
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}
```

#### Fetch API Method

For a simpler approach that works directly with the cookie-based authentication:

1. **Login Function**:

```javascript
async function loginAdmin(email, password) {
  try {
    const response = await fetch("/api/dashboard/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Login failed");
    }

    // Verify admin role
    if (data.data.role !== "admin") {
      throw new Error("Access denied. Admin privileges required.");
    }

    // Token is automatically stored in HTTP-only cookie
    // Optionally save other user info in localStorage for UI purposes only
    localStorage.setItem(
      "userInfo",
      JSON.stringify({
        uid: data.data.uid,
        email: data.data.email,
        displayName: data.data.displayName,
        role: data.data.role,
      })
    );

    return data.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}
```

2. **Logout Function**:

```javascript
async function logoutAdmin() {
  try {
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include", // Important for cookies
    });

    // Clear any local user info
    localStorage.removeItem("userInfo");

    // Redirect to login page
    window.location.href = "/login";
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear local storage and redirect even if API call fails
    localStorage.removeItem("userInfo");
    window.location.href = "/login";
  }
}
```

3. **Check Authentication State**:

```javascript
async function isAdminAuthenticated() {
  try {
    const response = await fetch("/api/dashboard/auth/check-admin", {
      credentials: "include", // Important for cookies
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // Check both successful response and admin role
    return data.success && data.data.role === "admin";
  } catch (error) {
    console.error("Auth check error:", error);
    return false;
  }
}
```

4. **Get User Info**:

```javascript
async function getCurrentAdminUser() {
  try {
    // First try to get from localStorage for quick UI rendering
    const cachedUserInfo = localStorage.getItem("userInfo");
    let userInfo = null;

    if (cachedUserInfo) {
      try {
        userInfo = JSON.parse(cachedUserInfo);
      } catch (e) {
        console.error("Error parsing cached user info:", e);
      }
    }

    // Then verify with backend (source of truth)
    const response = await fetch("/api/dashboard/auth/check-admin", {
      credentials: "include", // Important for cookies
    });

    if (!response.ok) {
      localStorage.removeItem("userInfo");
      return null;
    }

    const data = await response.json();

    if (!data.success || data.data.role !== "admin") {
      localStorage.removeItem("userInfo");
      return null;
    }

    // Update cached user info
    localStorage.setItem("userInfo", JSON.stringify(data.data));

    return data.data;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
```

5. **Make Authenticated API Calls**:

```javascript
async function fetchWithAuth(endpoint, options = {}) {
  try {
    const response = await fetch(`/api/dashboard/${endpoint}`, {
      ...options,
      credentials: "include", // Important for cookies
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired or invalid
        window.location.href = "/login?session=expired";
        throw new Error("Authentication failed");
      }

      // Handle other errors
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || `API Error: ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}
```

### Making API Calls

When making API calls to the dashboard endpoints, include the credentials option to ensure cookies are sent with the request:

```javascript
async function fetchData(endpoint) {
  const response = await fetch(`/api/dashboard/${endpoint}`, {
    credentials: "include", // Important for cookies
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    // Handle authentication errors
    if (response.status === 401) {
      window.location.href = "/login?session=expired";
      throw new Error("Authentication failed");
    }
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
```

### Error Handling

All API responses follow the same structure:

```json
{
  "success": true|false,
  "data": { ... } | null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Optional additional details"
  } | null
}
```

When handling errors, check the `success` flag and extract error details:

```javascript
async function fetchWithErrorHandling(endpoint) {
  try {
    const response = await fetchWithAuth(endpoint);

    if (!response.success) {
      // Handle API error
      console.error(`API Error: ${response.error?.code}`, response.error);
      throw new Error(response.error?.message || "Unknown error");
    }

    return response.data;
  } catch (error) {
    // Handle network or other errors
    console.error("Request failed:", error);
    throw error;
  }
}
```

### Dashboard Features Summary

The Xequtive Dashboard provides comprehensive admin functionality including:

#### Complete Booking Management Capabilities

**🔍 Full Booking Visibility**
- **All Bookings Access**: View every booking in the system regardless of status
- **Real-time Updates**: Live booking status and information updates
- **Complete History**: Full audit trail of all booking changes and modifications
- **Customer Details**: Access to all customer information and preferences

**✏️ Complete Booking Modification**
- **Customer Information**: Update names, contact details, and special requirements
- **Journey Details**: Modify pickup/dropoff locations, times, and additional stops
- **Vehicle Changes**: Switch vehicle types, adjust passenger counts, and modify luggage
- **Pricing Adjustments**: Modify fares, apply discounts, or add additional charges
- **Special Requests**: Add, modify, or remove special requirements and notes
- **Status Management**: Change booking status (pending → confirmed → completed → cancelled)

**📋 Administrative Functions**
- **Internal Notes**: Add operational notes for drivers and customer service
- **Service Coordination**: Manage driver assignments and service instructions
- **Quality Assurance**: Track service quality and customer satisfaction
- **Issue Resolution**: Handle customer complaints and special requests
- **Refund Management**: Process cancellations and refund requests

**📊 Business Intelligence**
- **Revenue Tracking**: Monitor all financial transactions and revenue streams
- **Performance Analytics**: Track service quality and operational efficiency
- **Customer Insights**: Analyze customer behavior and preferences
- **Route Optimization**: Identify popular routes and demand patterns
- **Vehicle Utilization**: Monitor fleet efficiency and utilization rates

**⚙️ System Control**
- **Pricing Management**: Modify all pricing structures and surcharges
- **Service Configuration**: Set business rules and operational parameters
- **User Management**: Control customer accounts and access permissions
- **System Monitoring**: Track system performance and security events
- **Audit Logging**: Complete audit trail of all administrative actions

**🚫 Important Limitations**
- **No New Bookings**: The dashboard cannot create new bookings
- **Customer-Facing Only**: New bookings must be created through customer API endpoints
- **Read-Write Access**: Full access to view, modify, and manage existing bookings
- **Admin-Only Access**: Exclusive to users with admin role permissions

#### Analytics & Reporting
- **Overview Dashboard**: Key metrics with period comparison
- **Revenue Analytics**: Detailed revenue breakdowns by vehicle type, status, and timeline
- **Booking Analytics**: Booking patterns by hour, weekday, vehicle type, and cancellation reasons
- **User Analytics**: User growth, retention metrics, and top customer insights
- **Traffic Analytics**: Website visitor data and conversion rates

#### Booking Management
- **Comprehensive Booking List**: Filter by date, status, vehicle type with pagination
- **Calendar View**: Visual booking calendar for scheduling
- **Detailed Booking View**: Complete booking information with timeline
- **Booking Updates**: Status changes and notes
- **Booking Deletion**: Admin-only booking removal

#### User Management
- **User Directory**: Complete user list with search and filtering
- **User Profiles**: Detailed user information with booking history
- **User Statistics**: Booking counts, spending, and activity metrics
- **User Management**: Update user information and disable accounts

#### System Configuration
- **Pricing Settings**: Airport fees, congestion charges, and special zone pricing
- **Service Areas**: Coverage zones and excluded areas
- **Notification Settings**: Email and SMS configuration
- **Business Hours**: Operating hours and timezone settings

#### System Monitoring
- **System Logs**: Comprehensive logging with filtering and search
- **Error Tracking**: System errors and performance monitoring
- **Audit Trail**: User actions and system changes

#### Vehicle Fleet Information
- **8 Vehicle Types**: From Standard Saloon to VIP-SUV/MPV
- **Detailed Pricing**: Slab-based per-mile pricing for each vehicle type
- **Capacity Information**: Passenger and luggage capacity for each vehicle
- **Airport Fee Structure**: Comprehensive airport fees for 16 UK airports

## Dashboard Features & Capabilities

The Xequtive Dashboard provides **complete administrative control** over the transportation service. Administrators have full authority to manage every aspect of the business operations.

### Complete Admin Control

**🔐 Full System Access**
- **Complete Booking Oversight**: View, modify, and manage ALL bookings in the system
- **User Account Control**: Access, modify, and manage all customer accounts
- **System Configuration**: Modify pricing, service areas, and business rules
- **Real-time Monitoring**: Live system status and performance tracking
- **Audit Trail**: Complete history of all administrative actions

**📊 Comprehensive Data Access**
- **All Customer Data**: Complete access to customer information and booking history
- **Financial Data**: Full revenue analytics, pricing structures, and financial reports
- **Operational Data**: Service performance, vehicle utilization, and efficiency metrics
- **System Data**: Logs, errors, and system performance information

### Booking Lifecycle Management

**📋 Complete Booking Control**
- **View All Bookings**: Access to every booking regardless of status or customer
- **Modify Any Booking**: Update pickup/dropoff times, locations, vehicle types, and customer details
- **Status Management**: Change booking status (pending → confirmed → completed → cancelled)
- **Add Notes & Comments**: Internal notes for customer service and operational purposes
- **Booking History**: Complete timeline of all booking changes and updates

**🔄 Status Workflow Management**
- **Pending Bookings**: Review and approve new booking requests
- **Confirmed Bookings**: Manage confirmed bookings and make adjustments
- **Active Bookings**: Monitor ongoing journeys and make real-time changes
- **Completed Bookings**: Review completed journeys and add final notes
- **Cancelled Bookings**: Manage cancellations and refund processes

**✏️ Content Modification**
- **Customer Information**: Update names, contact details, and special requirements
- **Journey Details**: Modify pickup/dropoff locations, times, and additional stops
- **Vehicle Changes**: Switch vehicle types, adjust passenger counts, and modify luggage
- **Pricing Adjustments**: Modify fares, apply discounts, or add additional charges
- **Special Requests**: Add, modify, or remove special requirements and notes

### Customer Service Tools

**👥 Customer Management**
- **Customer Profiles**: Complete customer information and booking history
- **Communication Tools**: Internal notes for customer service representatives
- **Issue Resolution**: Track and resolve customer complaints and special requests
- **Customer Support**: Access to all customer interactions and preferences

**📞 Service Coordination**
- **Driver Communication**: Internal notes for driver instructions and updates
- **Customer Updates**: Track customer communication and service notes
- **Special Handling**: Manage VIP customers, special requirements, and accessibility needs
- **Quality Assurance**: Monitor service quality and customer satisfaction

### Business Intelligence

**📈 Advanced Analytics**
- **Revenue Intelligence**: Detailed financial analysis and trend identification
- **Customer Insights**: Customer behavior, preferences, and loyalty patterns
- **Operational Efficiency**: Service performance, vehicle utilization, and cost analysis
- **Market Analysis**: Route popularity, demand patterns, and growth opportunities

**📊 Performance Metrics**
- **Service Quality**: On-time performance, customer satisfaction, and service ratings
- **Financial Performance**: Revenue per booking, profit margins, and cost analysis
- **Operational Metrics**: Vehicle efficiency, driver performance, and route optimization
- **Customer Metrics**: Customer acquisition, retention, and lifetime value

### Operational Control

**⚙️ System Configuration**
- **Pricing Management**: Modify all pricing structures, surcharges, and fees
- **Service Areas**: Define coverage zones, excluded areas, and service boundaries
- **Business Rules**: Set operating hours, booking policies, and service limitations
- **Notification Settings**: Configure email, SMS, and system notifications

**🚗 Fleet Management**
- **Vehicle Configuration**: Update vehicle types, capacities, and specifications
- **Pricing Structures**: Modify per-mile rates, minimum fares, and additional charges
- **Service Rules**: Set vehicle-specific policies and restrictions
- **Availability Management**: Control vehicle availability and booking rules

**🔍 System Monitoring**
- **Performance Tracking**: Monitor system performance and identify bottlenecks
- **Error Management**: Track and resolve system errors and issues
- **Security Monitoring**: Monitor access patterns and security events
- **Audit Logging**: Complete audit trail of all system changes and actions

## Security Considerations

When implementing the dashboard authentication, keep these security considerations in mind:

1. **Admin-Only Access**: The dashboard is exclusively for admin users. Regular users will receive an "access denied" error if they attempt to log in.

2. **Cookie-Based Authentication**: The dashboard uses secure HTTP-only cookies for authentication, which provides better security than localStorage or sessionStorage.

3. **CORS Configuration**: Ensure your frontend application correctly includes credentials in requests (`credentials: 'include'`) to allow cookies to be sent and received.

4. **HTTP-Only Cookies**: Authentication tokens are stored in HTTP-only cookies that cannot be accessed by JavaScript, protecting against XSS attacks.

5. **SameSite Restrictions**: Authentication cookies use SameSite=Strict settings to prevent CSRF attacks.

6. **Token Expiration**: The tokens expire after 5 days (432000 seconds). The server handles expired tokens by returning 401 responses.

7. **HTTPS Only**: Ensure all API requests are made over HTTPS to prevent cookie interception. In production, cookies are only sent with the Secure flag.

8. **Content Security Policy**: Implement a strict Content Security Policy to reduce the risk of XSS attacks.

9. **Role Verification**: Both frontend and backend implement role-based access control to ensure only admin users can access the dashboard.

10. **Session Verification**: The client should call `/api/dashboard/auth/check-admin` when loading protected pages to verify the user's session.

For maximum security, prefer the Firebase SDK approach over the Fetch API approach in production environments, as it provides additional security measures and session management features.

> **Note**: The dashboard does not support creating new bookings. All bookings are created through the customer-facing API endpoints. The dashboard is designed for monitoring, managing, and analyzing existing bookings and system performance.

## Enhanced Admin Dashboard Features

The Xequtive Admin Dashboard has been significantly enhanced with new capabilities for better booking management, analytics, and operational control. These enhancements provide comprehensive insights and improved user experience for administrators.

### Events vs Taxi Separation

**NEW**: The dashboard now automatically separates and categorizes bookings by type for better operational management:

#### **Events Bookings (Hourly)**
- **Service Type**: Continuous service for specified hours (3-12 hours)
- **Driver Behavior**: Driver stays with you throughout the booking
- **Use Cases**: Corporate events, sightseeing tours, airport transfers with waiting
- **Pricing**: Hourly rates based on vehicle type and duration
- **Management**: Separate view and analytics for event-based services

#### **Taxi Bookings (One-way & Return)**
- **Service Type**: Point-to-point transportation
- **Driver Behavior**: Driver takes you from pickup to dropoff
- **Use Cases**: Airport transfers, business travel, personal transportation
- **Pricing**: Distance-based pricing with return discounts
- **Management**: Traditional taxi service management and analytics

#### **Separation Benefits:**
- ✅ **Clear Operational View**: Separate management for different service types
- ✅ **Targeted Analytics**: Specific insights for events vs taxi services
- ✅ **Resource Planning**: Better allocation of vehicles and drivers
- ✅ **Customer Experience**: Tailored service for different booking types
- ✅ **Revenue Optimization**: Separate pricing strategies and optimization

### Reference Number Management

**CRITICAL**: The dashboard now provides clear distinction between business reference numbers and system identifiers:

#### **Reference Number (XEQ_105)**
- **Purpose**: User-facing booking identifier for customers
- **Format**: Sequential format starting from XEQ_100
- **Usage**: Display on confirmations, invoices, and customer communications
- **Business Value**: Professional, memorable booking reference for customers

#### **Firebase ID (ADzZOJTM5MOfquSOrQQb)**
- **Purpose**: Internal system identifier for API operations
- **Format**: Auto-generated Firestore document ID
- **Usage**: Database queries, API calls, and system operations
- **Technical Value**: Unique identifier for database operations

#### **Implementation Guide:**
```javascript
// ✅ CORRECT: Use referenceNumber for user display
const displayReference = booking.referenceNumber; // "XEQ_105"

// ✅ CORRECT: Use firebaseId for API operations
const updateBooking = await fetch(`/api/dashboard/bookings/${booking.firebaseId}`, {
  method: 'PUT',
  body: JSON.stringify(updateData)
});

// ❌ WRONG: Never display Firebase IDs to users
const wrongDisplay = booking.firebaseId; // "ADzZOJTM5MOfquSOrQQb"
```

#### **Reference Number Guide:**
All enhanced endpoints now include a `referenceNumberGuide` object:
```json
{
  "referenceNumberGuide": {
    "display": "Use 'referenceNumber' field for user-facing displays (e.g., XEQ_105)",
    "apiOperations": "Use 'firebaseId' field for API calls like updates and cancellations",
    "warning": "Never display Firebase IDs to users - they are internal system identifiers"
  }
}
```

### Safe Data Access

**ENHANCED**: The dashboard now implements robust data handling to prevent crashes and provide graceful degradation:

#### **Optional Chaining Implementation:**
```typescript
// Safe access to nested properties
const pickupAddress = booking.locations?.pickup?.address || "Pickup location not specified";
const vehicleName = booking.vehicle?.name || "Vehicle not specified";
const customerName = booking.customer?.fullName || "Customer name not available";
```

#### **Fallback Values:**
- **Missing Addresses**: "Location not specified" instead of crashes
- **Missing Vehicle Info**: "Vehicle not specified" with default values
- **Missing Customer Data**: "Customer information not available"
- **Missing Journey Data**: Default to 0 for distance and duration

#### **Error Handling:**
- ✅ **Individual Booking Processing**: Errors in one booking don't crash the entire request
- ✅ **Graceful Degradation**: Missing data is handled with fallbacks
- ✅ **Comprehensive Logging**: All issues are logged for debugging
- ✅ **User Experience**: Dashboard continues to function even with data inconsistencies

#### **Benefits:**
- **No More Crashes**: Dashboard remains stable regardless of data quality
- **Better User Experience**: Users see meaningful information instead of errors
- **Data Recovery**: Malformed bookings can still be viewed and managed
- **System Reliability**: Improved overall dashboard stability

### Comprehensive Analytics

**NEW**: Enhanced analytics provide deeper insights into business performance:

#### **Type-Based Analytics:**
```json
{
  "byType": {
    "hourly": {
      "count": 8,
      "revenue": 1440.00,
      "avgHours": 4.5,
      "totalHours": 36
    },
    "one-way": {
      "count": 12,
      "revenue": 546.00,
      "avgDistance": 18.3,
      "totalDistance": 219.6
    },
    "return": {
      "count": 5,
      "revenue": 245.00,
      "avgDistance": 22.1,
      "totalDistance": 110.5,
      "returnDiscounts": 5
    }
  }
}
```

#### **Revenue Intelligence:**
- **Total Revenue**: Overall financial performance
- **Type Breakdown**: Revenue by booking type
- **Vehicle Performance**: Revenue by vehicle type
- **Status Analysis**: Revenue by booking status
- **Trend Identification**: Revenue patterns over time

#### **Operational Insights:**
- **Top Routes**: Most popular pickup-to-dropoff combinations
- **Vehicle Utilization**: Performance metrics by vehicle type
- **Status Distribution**: Booking lifecycle analysis
- **Customer Behavior**: Booking patterns and preferences
- **Service Quality**: Performance and satisfaction metrics

#### **Business Intelligence:**
- **Growth Trends**: Booking volume and revenue trends
- **Seasonal Patterns**: Peak and off-peak analysis
- **Customer Segments**: Analysis by customer type and behavior
- **Route Optimization**: Popular routes and demand patterns
- **Resource Planning**: Vehicle and driver allocation insights

### Enhanced Endpoint Capabilities

#### **1. Enhanced Bookings Endpoint (`/api/dashboard/bookings`)**
- **Complete Data**: All booking information with comprehensive details
- **Type Filtering**: Filter by hourly, one-way, or return bookings
- **Safe Access**: Robust data handling with fallback values
- **Reference Numbers**: Clear distinction between display and API usage

#### **2. Enhanced Calendar Endpoint (`/api/dashboard/bookings/calendar`)**
- **Smart Duration**: Automatic handling of hourly vs regular bookings
- **Rich Events**: Comprehensive event information for calendar views
- **Type Filtering**: Filter calendar by specific booking types
- **Enhanced Data**: Full customer and vehicle information

#### **3. Enhanced Details Endpoint (`/api/dashboard/bookings/:id`)**
- **Complete Information**: All booking details in organized structure
- **Timeline Support**: Full booking history and status changes
- **Safe Access**: Prevents crashes from corrupted data
- **Reference Guide**: Built-in usage instructions

#### **4. New Separated Endpoint (`/api/dashboard/bookings/separated`)**
- **Automatic Separation**: Events vs Taxi booking categorization
- **Dual Pagination**: Separate pagination for each category
- **Type Definitions**: Clear explanations of each booking type
- **Combined Statistics**: Overview and individual category counts

#### **5. New Statistics Endpoint (`/api/dashboard/bookings/statistics`)**
- **Type-Based Analytics**: Separate statistics for each booking type
- **Revenue Tracking**: Comprehensive financial analysis
- **Performance Metrics**: Vehicle and route performance insights
- **Business Intelligence**: Growth trends and optimization opportunities

### Implementation Benefits

#### **For Administrators:**
- ✅ **Better Operational Control**: Clear separation of different service types
- ✅ **Improved Decision Making**: Comprehensive analytics and insights
- ✅ **Enhanced User Experience**: Stable dashboard with meaningful information
- ✅ **Professional Appearance**: Proper reference numbers for customer communications

#### **For Frontend Developers:**
- ✅ **Clear Data Structure**: Well-organized and consistent API responses
- ✅ **Built-in Documentation**: Reference number guides and usage instructions
- ✅ **Error Prevention**: Safe data access prevents crashes
- ✅ **Easy Integration**: Simple and intuitive API design

#### **For Business Operations:**
- ✅ **Service Optimization**: Better understanding of different service types
- ✅ **Revenue Analysis**: Detailed financial insights and trends
- ✅ **Customer Experience**: Professional reference numbers and reliable service
- ✅ **Resource Planning**: Better allocation of vehicles and drivers

### Migration Guide

#### **For Existing Implementations:**
1. **Update API Calls**: Use new enhanced endpoints for better data
2. **Reference Numbers**: Switch from Firebase IDs to reference numbers for display
3. **Error Handling**: Implement fallback values for missing data
4. **Analytics**: Use new statistics endpoint for comprehensive insights

#### **For New Implementations:**
1. **Start with Enhanced Endpoints**: Use the new comprehensive endpoints
2. **Follow Reference Number Guide**: Implement proper display vs API usage
3. **Implement Safe Access**: Use fallback values for robust data handling
4. **Leverage Analytics**: Use statistics endpoint for business intelligence

The enhanced Xequtive Admin Dashboard provides a comprehensive, stable, and insightful platform for managing all aspects of the transportation service with professional-grade features and robust data handling.
