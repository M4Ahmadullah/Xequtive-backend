# Xequtive Dashboard API Documentation

This document provides a comprehensive guide to the Xequtive Dashboard API endpoints, authentication, and data structures.

## Table of Contents

1. [Authentication](#authentication)
2. [Analytics Endpoints](#analytics-endpoints)
3. [System Settings](#system-settings)
4. [System Logs](#system-logs)

## Authentication

The dashboard uses a separate authentication system from the main user-facing application.

### Admin Signup

Creates a new admin user. The first admin can be created without authentication, but subsequent admins must be created by existing admins.

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
    "displayName": "Admin User",
    "role": "admin",
    "message": "Admin account created successfully"
  }
}
```

### Admin Login

Authenticates an admin user and returns a JWT token.

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
    "role": "admin",
    "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ZDhjZWU0ZTYwYmYwMzYxNmM1ODg4NTJiMjA5MTZkNjRjMzRmYmEiLCJ0eXAiOiJKV1QifQ...",
    "expiresIn": "432000"
  }
}
```

### Verify Session

Verifies an admin session token.

**Endpoint:** `POST /api/dashboard/auth/verify`

**Headers:**

```
Authorization: Bearer <token>
```

**Request:**

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY3ZDhjZWU0ZTYwYmYwMzYxNmM1ODg4NTJiMjA5MTZkNjRjMzRmYmEiLCJ0eXAiOiJKV1QifQ..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uid": "pte6O20XF8ccOQdMciPTYiCHlJO2",
    "email": "admin@example.com",
    "role": "admin",
    "authenticated": true
  }
}
```

## Analytics Endpoints

These endpoints provide analytics data for the dashboard.

### Revenue Analytics

Provides revenue analytics data, including total revenue, average per booking, and breakdowns by vehicle type and status.

**Endpoint:** `GET /api/dashboard/analytics/revenue`

**Query Parameters:**

- `startDate` (optional): Start date for analytics (YYYY-MM-DD)
- `endDate` (optional): End date for analytics (YYYY-MM-DD)
- `interval` (optional): Interval for timeline data (`day`, `week`, `month`)

**Headers:**

```
Authorization: Bearer <token>
```

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
      },
      {
        "date": "2025-05-14",
        "amount": 460,
        "bookings": 3
      },
      {
        "date": "2025-05-15",
        "amount": 491.5,
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
        "type": "Wheelchair Accessible Vehicle",
        "amount": 491.5,
        "percentage": 1
      },
      {
        "type": "Standard Saloon",
        "amount": 410,
        "percentage": 1
      },
      {
        "type": "VIP Executive",
        "amount": 50,
        "percentage": 0
      }
    ],
    "byStatus": [
      {
        "status": "cancelled",
        "amount": 56081
      }
    ]
  }
}
```

### Bookings Analytics

Provides booking analytics data, including total bookings, completed bookings, cancelled bookings, and various breakdowns.

**Endpoint:** `GET /api/dashboard/analytics/bookings`

**Query Parameters:**

- `startDate` (optional): Start date for analytics (YYYY-MM-DD)
- `endDate` (optional): End date for analytics (YYYY-MM-DD)
- `interval` (optional): Interval for timeline data (`day`, `week`, `month`)

**Headers:**

```
Authorization: Bearer <token>
```

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
      },
      {
        "date": "2025-05-14",
        "count": 3,
        "completed": 0,
        "cancelled": 3
      },
      {
        "date": "2025-05-15",
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
        "hour": 1,
        "count": 1
      }
    ],
    "byWeekday": [
      {
        "day": "Monday",
        "count": 0
      },
      {
        "day": "Tuesday",
        "count": 1
      },
      {
        "day": "Wednesday",
        "count": 3
      },
      {
        "day": "Thursday",
        "count": 1
      },
      {
        "day": "Friday",
        "count": 0
      },
      {
        "day": "Saturday",
        "count": 0
      },
      {
        "day": "Sunday",
        "count": 0
      }
    ],
    "byVehicleType": [
      {
        "type": "Standard Saloon",
        "count": 2
      },
      {
        "type": "VIP",
        "count": 1
      },
      {
        "type": "VIP Executive",
        "count": 1
      },
      {
        "type": "Wheelchair Accessible Vehicle",
        "count": 1
      }
    ],
    "cancellationReasons": [
      {
        "reason": "Cancelled by user",
        "count": 5
      }
    ]
  }
}
```

### User Analytics

Provides user analytics data, including total users, new users, active users, and various breakdowns.

**Endpoint:** `GET /api/dashboard/analytics/users`

**Query Parameters:**

- `startDate` (optional): Start date for analytics (YYYY-MM-DD)
- `endDate` (optional): End date for analytics (YYYY-MM-DD)
- `interval` (optional): Interval for timeline data (`day`, `week`, `month`)

**Headers:**

```
Authorization: Bearer <token>
```

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
      },
      {
        "date": "2025-05-07",
        "newUsers": 1,
        "totalBookings": 0
      },
      {
        "date": "2025-05-09",
        "newUsers": 1,
        "totalBookings": 0
      },
      {
        "date": "2025-05-10",
        "newUsers": 3,
        "totalBookings": 0
      },
      {
        "date": "2025-05-13",
        "newUsers": 1,
        "totalBookings": 1
      },
      {
        "date": "2025-05-14",
        "newUsers": 0,
        "totalBookings": 3
      },
      {
        "date": "2025-05-15",
        "newUsers": 0,
        "totalBookings": 1
      }
    ],
    "topBookers": [
      {
        "uid": "8Z7t5GsOmTdCKukau97p2TZzGyq1",
        "email": "user1@example.com",
        "bookings": 4,
        "spent": 0
      },
      {
        "uid": "v6hbC4zKXrXUaN3DS9kI10ddHth2",
        "email": "user2@example.com",
        "bookings": 1,
        "spent": 0
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

### Traffic Analytics

Provides website traffic analytics data, including visitors, pages, referrers, and devices.

**Endpoint:** `GET /api/dashboard/analytics/traffic`

**Query Parameters:**

- `startDate` (optional): Start date for analytics (YYYY-MM-DD)
- `endDate` (optional): End date for analytics (YYYY-MM-DD)
- `interval` (optional): Interval for timeline data (`day`, `week`, `month`)

**Headers:**

```
Authorization: Bearer <token>
```

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
      },
      {
        "date": "2025-05-10",
        "visitors": 110,
        "unique": 66
      },
      {
        "date": "2025-05-11",
        "visitors": 20,
        "unique": 12
      },
      {
        "date": "2025-05-13",
        "visitors": 130,
        "unique": 78
      },
      {
        "date": "2025-05-14",
        "visitors": 100,
        "unique": 60
      }
    ],
    "pages": [
      {
        "path": "/",
        "views": 190
      },
      {
        "path": "/fare-estimate",
        "views": 114
      },
      {
        "path": "/booking",
        "views": 76
      },
      {
        "path": "/about",
        "views": 19
      },
      {
        "path": "/contact",
        "views": 11
      }
    ],
    "referrers": [
      {
        "source": "Google",
        "visits": 152
      },
      {
        "source": "Direct",
        "visits": 114
      },
      {
        "source": "Facebook",
        "visits": 57
      },
      {
        "source": "Instagram",
        "visits": 38
      },
      {
        "source": "Twitter",
        "visits": 19
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
        "city": "TW6 2FA",
        "visits": 20
      },
      {
        "city": "Piccadilly Circus",
        "visits": 10
      },
      {
        "city": "England",
        "visits": 10
      }
    ],
    "conversionRate": 10
  }
}
```

## System Settings

Manages system settings for the application.

### Get System Settings

Retrieves the current system settings.

**Endpoint:** `GET /api/dashboard/settings`

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "pricing": {
      "congestionCharge": 8.0,
      "dartfordCrossing": 4.0
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
      "smsEnabled": true
    },
    "updatedAt": "2025-05-15T03:36:28.537Z",
    "updatedBy": "pte6O20XF8ccOQdMciPTYiCHlJO2"
  }
}
```

### Update System Settings

Updates the system settings.

**Endpoint:** `PUT /api/dashboard/settings`

**Headers:**

```
Authorization: Bearer <token>
```

**Request:**

```json
{
  "pricing": {
    "congestionCharge": 8.0,
    "dartfordCrossing": 4.0
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
    "smsEnabled": true
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

## System Logs

Retrieves system logs for monitoring and debugging.

### Get System Logs

Retrieves system logs with optional filtering.

**Endpoint:** `GET /api/dashboard/logs`

**Query Parameters:**

- `level` (optional): Filter logs by level (`info`, `warn`, `error`)
- `startDate` (optional): Filter logs from this date (YYYY-MM-DD)
- `endDate` (optional): Filter logs to this date (YYYY-MM-DD)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of logs per page (default: 20)

**Headers:**

```
Authorization: Bearer <token>
```

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
          "ipAddress": "192.168.1.1"
        }
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

Note: If there are no logs, the response will contain an empty array and pagination details, as shown below:

```json
{
  "success": true,
  "data": {
    "logs": [],
    "pagination": {
      "total": 0,
      "pages": 0,
      "currentPage": 1,
      "limit": 20
    }
  }
}
```
