# Xequtive Dashboard Documentation

This document provides a comprehensive guide to the Xequtive Dashboard, including API endpoints, authentication methods, and implementation guidelines.

## Table of Contents

1. [Authentication](#authentication)
   - [Admin Login](#admin-login)
   - [Admin Logout](#admin-logout)
   - [Check Admin Status](#check-admin-status)
   - [Admin Signup](#admin-signup)
   - [Authentication Methods](#authentication-methods)
     - [Firebase SDK Method](#firebase-sdk-method)
     - [Fetch API Method](#fetch-api-method)
2. [API Endpoints](#api-endpoints)
   - [Analytics](#analytics-endpoints)
   - [Bookings Management](#bookings-management)
   - [User Management](#user-management)
   - [Vehicle Information](#vehicle-information)
   - [System Settings](#system-settings)
   - [System Logs](#system-logs)
3. [Implementation Guide](#implementation-guide)
   - [Authentication Implementation](#authentication-implementation)
   - [Making API Calls](#making-api-calls)
   - [Error Handling](#error-handling)
4. [Security Considerations](#security-considerations)

## Authentication

The Xequtive Dashboard is exclusively accessible to users with the **admin role**. The dashboard uses Firebase Authentication for secure access control with a cookie-based authentication system.

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

#### Get All Bookings

Retrieves a list of all bookings with comprehensive filtering options.

**Endpoint:** `GET /api/dashboard/bookings`

**Query Parameters:**

- `startDate` (optional): Filter by start date (YYYY-MM-DD)
- `endDate` (optional): Filter by end date (YYYY-MM-DD)
- `status` (optional): Filter by booking status (`pending`, `confirmed`, `completed`, `cancelled`)
- `vehicleType` (optional): Filter by vehicle type ID
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
        "customer": {
          "fullName": "John Doe",
          "email": "john@example.com",
          "phone": "+44123456789"
        },
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
        "status": "confirmed",
        "specialRequests": "Please call when arriving",
        "travelInformation": {
          "type": "flight",
          "details": {
            "airline": "British Airways",
            "flightNumber": "BA123",
            "scheduledDeparture": "2025-05-15T16:00:00Z"
          }
        },
        "createdAt": "2025-05-10T10:30:00.000Z",
        "updatedAt": "2025-05-10T11:15:00.000Z"
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

#### Get Booking Calendar

Retrieves booking data formatted for calendar view.

**Endpoint:** `GET /api/dashboard/bookings/calendar`

**Query Parameters:**

- `startDate`: Start date for calendar view (required, YYYY-MM-DD)
- `endDate`: End date for calendar view (required, YYYY-MM-DD)
- `status` (optional): Filter by booking status

**Response:**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "booking123",
        "title": "John Doe - Standard Saloon",
        "start": "2025-05-15T14:30:00",
        "end": "2025-05-15T15:30:00",
        "status": "confirmed",
        "customer": "John Doe",
        "pickupLocation": "London Heathrow Airport",
        "dropoffLocation": "London City",
        "vehicleType": "Standard Saloon"
      }
    ]
  }
}
```

#### Get Booking Details

Retrieves comprehensive details of a specific booking including timeline.

**Endpoint:** `GET /api/dashboard/bookings/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "booking123",
    "customer": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+44123456789"
    },
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
    "status": "confirmed",
    "specialRequests": "Please call when arriving",
    "travelInformation": {
      "type": "flight",
      "details": {
        "airline": "British Airways",
        "flightNumber": "BA123",
        "scheduledDeparture": "2025-05-15T16:00:00Z"
      }
    },
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
    ],
    "createdAt": "2025-05-10T10:30:00.000Z",
    "updatedAt": "2025-05-10T11:15:00.000Z"
  }
}
```

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

| Vehicle Type | ID | Capacity | Class | Minimum Fare | Additional Stop Fee |
|--------------|----|---------:|-------|-------------:|-------------------:|
| Standard Saloon | `saloon` | 4 passengers | Standard Comfort | £16.40 | £2.50 |
| Estate | `estate` | 4 passengers | Standard Comfort | £18.40 | £2.50 |
| MPV-6 Seater | `mpv-6` | 6 passengers | Standard Comfort | £26.40 | £4.50 |
| MPV-8 Seater | `mpv-8` | 8 passengers | Standard Comfort | £50.30 | £4.50 |
| Executive Saloon | `executive` | 3 passengers | Business | £34.40 | £5.50 |
| Executive MPV-8 | `executive-mpv` | 6 passengers | Business | £50.30 | £5.50 |
| VIP-Saloon | `vip-saloon` | 3 passengers | Business | £66.80 | £5.50 |
| VIP-SUV/MPV | `vip-suv` | 6 passengers | Business | £70.80 | £5.50 |

#### Per-Mile Pricing Structure

Each vehicle type has a slab-based pricing structure:

**Standard Saloon:**
- 0-4 miles: £3.95/mile
- 4.1-10.9 miles: £2.95/mile
- 11-20 miles: £2.80/mile
- 20.1-40 miles: £2.66/mile
- 41-60 miles: £2.36/mile
- 60.1-80 miles: £2.21/mile
- 81-99 miles: £1.92/mile
- 100-149 miles: £1.77/mile
- 150-299 miles: £1.62/mile
- 300+ miles: £1.48/mile

**Estate:**
- 0-4 miles: £4.95/mile
- 4.1-10.9 miles: £3.45/mile
- 11-20 miles: £3.28/mile
- 20.1-40 miles: £3.11/mile
- 41-60 miles: £2.76/mile
- 60.1-80 miles: £2.59/mile
- 81-99 miles: £2.24/mile
- 100-149 miles: £2.07/mile
- 150-299 miles: £1.90/mile
- 300+ miles: £1.73/mile

**MPV-6 Seater:**
- 0-4 miles: £6.95/mile
- 4.1-10.9 miles: £6.45/mile
- 11-20 miles: £5.97/mile
- 20.1-40 miles: £4.35/mile
- 41-60 miles: £3.39/mile
- 60.1-80 miles: £3.55/mile
- 81-99 miles: £3.23/mile
- 100-149 miles: £3.06/mile
- 150-299 miles: £2.90/mile
- 300+ miles: £2.74/mile

**MPV-8 Seater:**
- 0-4 miles: £7.95/mile
- 4.1-10.9 miles: £6.95/mile
- 11-20 miles: £6.43/mile
- 20.1-40 miles: £4.69/mile
- 41-60 miles: £4.00/mile
- 60.1-80 miles: £3.82/mile
- 81-99 miles: £3.48/mile
- 100-149 miles: £3.30/mile
- 150-299 miles: £3.13/mile
- 300+ miles: £2.95/mile

**Executive Saloon:**
- 0-4 miles: £7.95/mile
- 4.1-10.9 miles: £5.95/mile
- 11-20 miles: £5.50/mile
- 20.1-40 miles: £4.02/mile
- 41-60 miles: £3.42/mile
- 60.1-80 miles: £3.27/mile
- 81-99 miles: £2.98/mile
- 100-149 miles: £2.83/mile
- 150-299 miles: £2.68/mile
- 300+ miles: £2.53/mile

**Executive MPV-8:**
- 0-4 miles: £7.95/mile
- 4.1-10.9 miles: £7.95/mile
- 11-20 miles: £6.56/mile
- 20.1-40 miles: £6.16/mile
- 41-60 miles: £5.96/mile
- 60.1-80 miles: £5.76/mile
- 81-99 miles: £4.77/mile
- 100-149 miles: £4.57/mile
- 150-299 miles: £3.78/mile
- 300+ miles: £3.58/mile

**VIP-Saloon:**
- 0-4 miles: £7.95/mile
- 4.1-10.9 miles: £7.45/mile
- 11-20 miles: £7.26/mile
- 20.1-40 miles: £5.03/mile
- 41-60 miles: £4.28/mile
- 60.1-80 miles: £4.10/mile
- 81-99 miles: £3.73/mile
- 100-149 miles: £3.54/mile
- 150-299 miles: £3.35/mile
- 300+ miles: £3.17/mile

**VIP-SUV/MPV:**
- 0-4 miles: £8.95/mile
- 4.1-10.9 miles: £7.95/mile
- 11-20 miles: £7.55/mile
- 20.1-40 miles: £7.16/mile
- 41-60 miles: £6.76/mile
- 60.1-80 miles: £6.36/mile
- 81-99 miles: £6.16/mile
- 100-149 miles: £5.96/mile
- 150-299 miles: £5.37/mile
- 300+ miles: £4.97/mile

#### Airport Fees

The system applies airport fees for pickups and drop-offs at major UK airports:

| Airport | Fee |
|---------|----:|
| London Heathrow | £10.00 |
| London Gatwick | £8.00 |
| London Stansted | £8.00 |
| London Luton | £8.00 |
| London City | £8.00 |
| Manchester | £8.00 |
| Birmingham | £7.00 |
| Edinburgh | £7.00 |
| Glasgow | £7.00 |
| Liverpool | £6.00 |
| Bristol | £6.00 |
| Cardiff | £6.00 |
| Belfast International | £6.00 |
| Belfast City | £6.00 |
| East Midlands | £6.00 |
| Newcastle | £6.00 |

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

#### Login Page Example

```javascript
// Login form submit handler
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

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
      throw new Error(
        "Access denied. Only admin users can access the dashboard."
      );
    }

    window.location.href = "/dashboard"; // Redirect to dashboard on success
  } catch (error) {
    document.getElementById("errorMessage").textContent = error.message;
  }
});
```

#### Dashboard Page Example

```javascript
// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/dashboard/auth/check-admin", {
      credentials: "include", // Important for cookies
    });

    if (!response.ok) {
      // Not authenticated or not admin
      window.location.href = "/login";
      return;
    }

    const data = await response.json();

    if (!data.success || data.data.role !== "admin") {
      window.location.href = "/login";
      return;
    }

    // Display user info
    document.getElementById("userDisplayName").textContent =
      data.data.displayName || data.data.email;

    // Load dashboard data
    loadDashboardData();
  } catch (error) {
    console.error("Authentication check failed:", error);
    window.location.href = "/login";
  }
});

// Load dashboard data
async function loadDashboardData() {
  try {
    // Get overview analytics
    const overviewResponse = await fetch("/api/dashboard/analytics/overview", {
      credentials: "include", // Important for cookies
    });

    if (!overviewResponse.ok) {
      if (overviewResponse.status === 401) {
        window.location.href = "/login?session=expired";
        return;
      }
      throw new Error("Failed to load overview data");
    }

    const overviewData = await overviewResponse.json();
    if (overviewData.success) {
      updateDashboardUI(overviewData.data);
    }

    // Get revenue data
    const revenueResponse = await fetch("/api/dashboard/analytics/revenue", {
      credentials: "include", // Important for cookies
    });

    if (!revenueResponse.ok) {
      throw new Error("Failed to load revenue data");
    }

    const revenueData = await revenueResponse.json();
    if (revenueData.success) {
      updateRevenueCharts(revenueData.data);
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

// Logout button handler
document.getElementById("logoutButton").addEventListener("click", async () => {
  try {
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include", // Important for cookies
    });
    window.location.href = "/login"; // Redirect to login page
  } catch (error) {
    console.error("Logout failed:", error);
    // Still redirect to login page even if logout API call fails
    window.location.href = "/login";
  }
});
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
