# Xequtive Dashboard API Documentation

This document outlines the API endpoints designed specifically for the Xequtive administrative dashboard. These endpoints provide access to comprehensive data about users, bookings, and system analytics.

## Authentication

All dashboard API endpoints require admin authentication.

### Admin Signup

Admin accounts can only be created by existing admins. This endpoint creates a new admin user with the specified credentials.

```
POST /api/dashboard/auth/signup
```

**Headers:**

```
Authorization: Bearer {token} // Existing admin's token
```

**Request Body:**

```json
{
  "email": "newadmin@example.com",
  "password": "secure_password",
  "fullName": "New Admin User"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "uid": "admin123",
    "email": "newadmin@example.com",
    "displayName": "New Admin User",
    "role": "admin",
    "message": "Admin account created successfully"
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid admin signup data",
    "details": "Password must be at least 8 characters"
  }
}
```

**Error Response (409):**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "Email already exists"
  }
}
```

### Admin Login

```
POST /api/dashboard/auth/login
```

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "secure_password"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "uid": "admin123",
      "email": "admin@example.com",
      "role": "admin",
      "displayName": "Admin User"
    }
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid email or password"
  }
}
```

**Error Response (403):**

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Access denied. Admin privileges required."
  }
}
```

### Verify Admin Session

```
GET /api/dashboard/auth/verify
```

**Headers:**

```
Authorization: Bearer {token}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "uid": "admin123",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

## Bookings Management

### Get All Bookings

Retrieve all bookings with comprehensive filtering options.

```
GET /api/dashboard/bookings
```

**Query Parameters:**

- `startDate` (optional): Filter bookings from this date (YYYY-MM-DD)
- `endDate` (optional): Filter bookings until this date (YYYY-MM-DD)
- `status` (optional): Filter by booking status (pending, confirmed, completed, cancelled)
- `vehicleType` (optional): Filter by vehicle type
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of results per page (default: 20)
- `sort` (optional): Sort field (default: "pickupDate")
- `order` (optional): Sort order - "asc" or "desc" (default: "desc")

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking123",
        "userId": "user456",
        "customer": {
          "fullName": "John Doe",
          "email": "john@example.com",
          "phone": "+44123456789"
        },
        "pickupDate": "2024-06-20",
        "pickupTime": "14:00",
        "locations": {
          "pickup": {
            "address": "123 Oxford Street, London",
            "coordinates": {
              "lat": 51.5152,
              "lng": -0.1422
            }
          },
          "dropoff": {
            "address": "Heathrow Airport, London",
            "coordinates": {
              "lat": 51.47,
              "lng": -0.4543
            }
          },
          "additionalStops": []
        },
        "vehicle": {
          "id": "executive-saloon",
          "name": "Executive"
        },
        "price": {
          "amount": 85.5,
          "currency": "GBP"
        },
        "status": "confirmed",
        "createdAt": "2024-06-15T10:30:00Z",
        "updatedAt": "2024-06-15T11:45:00Z"
      }
      // More bookings...
    ],
    "pagination": {
      "total": 120,
      "pages": 6,
      "currentPage": 1,
      "limit": 20
    }
  }
}
```

### Get Booking Calendar Data

Retrieve bookings in a calendar-friendly format.

```
GET /api/dashboard/bookings/calendar
```

**Query Parameters:**

- `startDate`: Start date for calendar view (YYYY-MM-DD)
- `endDate`: End date for calendar view (YYYY-MM-DD)
- `status` (optional): Filter by booking status

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "booking123",
        "title": "John Doe - Executive",
        "start": "2024-06-20T14:00:00",
        "end": "2024-06-20T15:30:00",
        "status": "confirmed",
        "customer": "John Doe",
        "pickupLocation": "123 Oxford Street, London",
        "dropoffLocation": "Heathrow Airport, London",
        "vehicleType": "Executive"
      }
      // More events...
    ]
  }
}
```

### Get Booking Details

Retrieve detailed information about a specific booking.

```
GET /api/dashboard/bookings/:id
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "booking123",
    "userId": "user456",
    "customer": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+44123456789"
    },
    "pickupDate": "2024-06-20",
    "pickupTime": "14:00",
    "locations": {
      "pickup": {
        "address": "123 Oxford Street, London",
        "coordinates": {
          "lat": 51.5152,
          "lng": -0.1422
        }
      },
      "dropoff": {
        "address": "Heathrow Airport, London",
        "coordinates": {
          "lat": 51.47,
          "lng": -0.4543
        }
      },
      "additionalStops": []
    },
    "passengers": {
      "count": 2,
      "checkedLuggage": 1,
      "handLuggage": 1
    },
    "vehicle": {
      "id": "executive-saloon",
      "name": "Executive"
    },
    "journey": {
      "distance_miles": 18.5,
      "duration_minutes": 45
    },
    "price": {
      "amount": 85.5,
      "currency": "GBP",
      "breakdown": {
        "baseFare": 12.5,
        "distanceFare": 65.0,
        "timeSurcharge": 0,
        "additionalStopFees": 0,
        "specialFees": [
          {
            "name": "Heathrow Airport Dropoff Fee",
            "amount": 8.0
          }
        ]
      }
    },
    "specialRequests": "Extra bottled water please",
    "status": "confirmed",
    "timeline": [
      {
        "status": "pending",
        "timestamp": "2024-06-15T10:30:00Z"
      },
      {
        "status": "confirmed",
        "timestamp": "2024-06-15T11:45:00Z",
        "updatedBy": "admin123"
      }
    ],
    "createdAt": "2024-06-15T10:30:00Z",
    "updatedAt": "2024-06-15T11:45:00Z"
  }
}
```

### Update Booking

Update a booking's details or status.

```
PUT /api/dashboard/bookings/:id
```

**Request Body:**

```json
{
  "status": "confirmed",
  "pickupDate": "2024-06-21",
  "pickupTime": "15:00"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "booking123",
    "message": "Booking updated successfully",
    "updatedFields": ["status", "pickupDate", "pickupTime"]
  }
}
```

### Delete Booking

Delete a booking from the system.

```
DELETE /api/dashboard/bookings/:id
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Booking deleted successfully",
    "id": "booking123"
  }
}
```

## User Management

### Get All Users

Retrieve a list of all users with filtering options.

```
GET /api/dashboard/users
```

**Query Parameters:**

- `role` (optional): Filter by user role ("user" or "admin")
- `query` (optional): Search users by name or email
- `page` (optional): Page number for pagination
- `limit` (optional): Number of results per page

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "uid": "user123",
        "email": "john@example.com",
        "displayName": "John Doe",
        "phone": "+44123456789",
        "role": "user",
        "createdAt": "2024-01-15T10:30:00Z",
        "lastLogin": "2024-06-15T09:45:00Z",
        "bookingsCount": 5
      }
      // More users...
    ],
    "pagination": {
      "total": 150,
      "pages": 8,
      "currentPage": 1,
      "limit": 20
    }
  }
}
```

### Get User Details

Retrieve detailed information about a specific user, including their booking history.

```
GET /api/dashboard/users/:uid
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "uid": "user123",
      "email": "john@example.com",
      "displayName": "John Doe",
      "phone": "+44123456789",
      "role": "user",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastLogin": "2024-06-15T09:45:00Z",
      "stats": {
        "totalBookings": 5,
        "completedBookings": 3,
        "cancelledBookings": 1,
        "totalSpent": 450.75
      }
    },
    "recentBookings": [
      {
        "id": "booking123",
        "pickupDate": "2024-06-20",
        "status": "confirmed",
        "amount": 85.5
      }
      // More bookings...
    ]
  }
}
```

### Update User

Update a user's details or role.

```
PUT /api/dashboard/users/:uid
```

**Request Body:**

```json
{
  "displayName": "John Smith",
  "phone": "+44987654321",
  "role": "admin"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "uid": "user123",
    "message": "User updated successfully",
    "updatedFields": ["displayName", "phone", "role"]
  }
}
```

### Disable User

Disable a user account (safer than deletion).

```
POST /api/dashboard/users/:uid/disable
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "User account disabled successfully",
    "uid": "user123"
  }
}
```

## System Analytics

### Dashboard Overview

Get summary statistics for the dashboard homepage.

```
GET /api/dashboard/analytics/overview
```

**Query Parameters:**

- `period` (optional): Time period for stats - "today", "week", "month", "year" (default: "week")

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "bookings": {
      "total": 120,
      "pending": 15,
      "confirmed": 45,
      "completed": 50,
      "cancelled": 10,
      "comparisonPercentage": 5.5 // percentage change from previous period
    },
    "revenue": {
      "total": 15250.75,
      "currency": "GBP",
      "comparisonPercentage": 7.8
    },
    "users": {
      "total": 350,
      "new": 25,
      "comparisonPercentage": 3.2
    },
    "vehicles": {
      "mostBooked": "Executive",
      "distribution": [
        { "name": "Standard Saloon", "percentage": 25 },
        { "name": "Executive", "percentage": 40 },
        { "name": "MPV (XL)", "percentage": 20 },
        { "name": "VIP Executive", "percentage": 15 }
      ]
    },
    "popularRoutes": [
      {
        "route": "Central London to Heathrow Airport",
        "count": 45
      },
      {
        "route": "Canary Wharf to London City Airport",
        "count": 30
      }
    ]
  }
}
```

### Revenue Analytics

Get detailed revenue statistics.

```
GET /api/dashboard/analytics/revenue
```

**Query Parameters:**

- `startDate` (optional): Start date for analytics (YYYY-MM-DD)
- `endDate` (optional): End date for analytics (YYYY-MM-DD)
- `interval` (optional): Data grouping - "day", "week", "month" (default: "day")

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 38560.5,
    "currency": "GBP",
    "averagePerBooking": 85.75,
    "timeline": [
      { "date": "2024-06-01", "amount": 1250.5, "bookings": 15 },
      { "date": "2024-06-02", "amount": 1450.75, "bookings": 18 }
      // More data points...
    ],
    "byVehicleType": [
      { "type": "Executive", "amount": 15780.25, "percentage": 41 },
      { "type": "Standard Saloon", "amount": 9640.5, "percentage": 25 }
      // More vehicle types...
    ],
    "byStatus": [
      { "status": "completed", "amount": 30240.75 },
      { "status": "cancelled", "amount": 1500.0 }
      // More statuses...
    ]
  }
}
```

### Booking Analytics

Get detailed booking statistics.

```
GET /api/dashboard/analytics/bookings
```

**Query Parameters:**

- `startDate` (optional): Start date for analytics
- `endDate` (optional): End date for analytics
- `interval` (optional): Data grouping - "day", "week", "month"

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 450,
    "completed": 350,
    "cancelled": 50,
    "timeline": [
      { "date": "2024-06-01", "count": 15, "completed": 12, "cancelled": 2 },
      { "date": "2024-06-02", "count": 18, "completed": 15, "cancelled": 1 }
      // More data points...
    ],
    "byHour": [
      { "hour": 8, "count": 45 },
      { "hour": 9, "count": 65 }
      // More hours...
    ],
    "byWeekday": [
      { "day": "Monday", "count": 85 },
      { "day": "Tuesday", "count": 75 }
      // More weekdays...
    ],
    "byVehicleType": [
      { "type": "Executive", "count": 185 },
      { "type": "Standard Saloon", "count": 120 }
      // More vehicle types...
    ],
    "cancellationReasons": [
      { "reason": "Change of plans", "count": 25 },
      { "reason": "Found alternative", "count": 15 }
      // More reasons...
    ]
  }
}
```

### User Analytics

Get detailed user statistics.

```
GET /api/dashboard/analytics/users
```

**Query Parameters:**

- `startDate` (optional): Start date for analytics
- `endDate` (optional): End date for analytics
- `interval` (optional): Data grouping - "day", "week", "month"

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 1250,
    "new": 125,
    "active": 850,
    "timeline": [
      { "date": "2024-06-01", "newUsers": 5, "totalBookings": 15 },
      { "date": "2024-06-02", "newUsers": 8, "totalBookings": 22 }
      // More data points...
    ],
    "topBookers": [
      {
        "uid": "user123",
        "email": "john@example.com",
        "bookings": 25,
        "spent": 2150.75
      }
      // More users...
    ],
    "retention": {
      "returning": 65, // percentage
      "oneTime": 35 // percentage
    },
    "devices": [
      { "device": "Mobile", "percentage": 65 },
      { "device": "Desktop", "percentage": 30 },
      { "device": "Tablet", "percentage": 5 }
    ]
  }
}
```

### Website Traffic

Get website traffic and visitor statistics.

```
GET /api/dashboard/analytics/traffic
```

**Query Parameters:**

- `startDate` (optional): Start date for analytics
- `endDate` (optional): End date for analytics
- `interval` (optional): Data grouping - "day", "week", "month"

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "visitors": {
      "total": 5280,
      "unique": 3450,
      "returning": 1830
    },
    "timeline": [
      { "date": "2024-06-01", "visitors": 250, "unique": 180 },
      { "date": "2024-06-02", "visitors": 275, "unique": 195 }
      // More data points...
    ],
    "pages": [
      { "path": "/", "views": 2500 },
      { "path": "/fare-estimate", "views": 1850 },
      { "path": "/booking", "views": 1250 }
      // More pages...
    ],
    "referrers": [
      { "source": "Google", "visits": 2250 },
      { "source": "Direct", "visits": 1500 },
      { "source": "Facebook", "visits": 850 }
      // More referrers...
    ],
    "devices": [
      { "type": "Mobile", "percentage": 65 },
      { "type": "Desktop", "percentage": 30 },
      { "type": "Tablet", "percentage": 5 }
    ],
    "locations": [
      { "city": "London", "visits": 2850 },
      { "city": "Manchester", "visits": 850 },
      { "city": "Birmingham", "visits": 650 }
      // More locations...
    ],
    "conversionRate": 2.8 // percentage of visitors who made a booking
  }
}
```

## System Management

### System Settings

Retrieve system configuration settings.

```
GET /api/dashboard/settings
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "pricing": {
      "congeistionCharge": 7.5,
      "dartfordCrossing": 4.0
    },
    "serviceAreas": {
      "maxDistance": 300,
      "excludedAreas": ["Outer Hebrides", "Shetland Islands"],
      "includedIslands": ["Isle of Wight", "Anglesey"]
    },
    "notifications": {
      "emailEnabled": true,
      "smsEnabled": true
    }
  }
}
```

### Update System Settings

Update system configuration settings.

```
PUT /api/dashboard/settings
```

**Request Body:**

```json
{
  "pricing": {
    "congeistionCharge": 8.0
  },
  "serviceAreas": {
    "maxDistance": 350
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Settings updated successfully",
    "updatedFields": ["pricing.congeistionCharge", "serviceAreas.maxDistance"]
  }
}
```

### Get System Logs

Retrieve system operation logs.

```
GET /api/dashboard/logs
```

**Query Parameters:**

- `level` (optional): Log level - "info", "warn", "error"
- `startDate` (optional): Filter logs from this date
- `endDate` (optional): Filter logs until this date
- `page` (optional): Page number for pagination
- `limit` (optional): Number of results per page

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2024-06-15T15:45:00Z",
        "level": "error",
        "message": "Failed to process payment for booking ID booking123",
        "details": "Payment gateway timeout",
        "source": "payment-service"
      }
      // More logs...
    ],
    "pagination": {
      "total": 850,
      "pages": 43,
      "currentPage": 1,
      "limit": 20
    }
  }
}
```

## Error Responses

All dashboard API endpoints use standardized error responses:

**Authentication Errors (401):**

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication required"
  }
}
```

**Authorization Errors (403):**

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Admin privileges required"
  }
}
```

**Validation Errors (400):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "Invalid value"
    }
  }
}
```

**Not Found Errors (404):**

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Booking not found"
  }
}
```

**Server Errors (500):**

```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Internal server error"
  }
}
```
