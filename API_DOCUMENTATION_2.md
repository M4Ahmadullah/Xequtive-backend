# Xequtive Booking API Documentation

## Introduction

This document outlines the Xequtive booking process API, which follows the fare calculation process (described in the main API documentation). The booking system is designed with security in mind, implementing server-side fare verification to ensure data integrity.

## Booking Process Overview

The booking process follows these steps:

1. **Fare Calculation**: User receives fare estimates for all vehicle types
2. **Vehicle Selection**: User selects a specific vehicle type
3. **Details Entry**: User provides personal and booking details
4. **Verification**: Backend verifies details and recalculates fare
5. **Completion**: Booking is created and stored in the database

## Booking Creation Endpoint

- **URL**: `/bookings/create-enhanced`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Creates a booking with server-side fare verification
- **Request Body**:
  ```json
  {
    "customer": {
      "fullName": "John Smith",
      "email": "john.smith@example.com",
      "phone": "+447123456789"
    },
    "booking": {
      "locations": {
        "pickup": {
          "address": "Piccadilly Circus, London, UK",
          "coordinates": {
            "lat": 51.51,
            "lng": -0.1348
          }
        },
        "dropoff": {
          "address": "Heathrow Airport, London, UK",
          "coordinates": {
            "lat": 51.47,
            "lng": -0.4543
          }
        }
      },
      "datetime": {
        "date": "2024-06-20",
        "time": "14:00"
      },
      "passengers": {
        "count": 2,
        "checkedLuggage": 1,
        "handLuggage": 1
      },
      "vehicle": {
        "id": "executive-saloon",
        "name": "Executive Saloon"
      },
      "specialRequests": "Please call when arriving"
    }
  }
  ```
- **Note**: The customer object is optional when the user is authenticated. The backend will automatically use the stored profile data.
- **Success Response (201)**:
  ```json
  {
    "success": true,
    "data": {
      "bookingId": "45hptG5q4a0m68CZVzNd",
      "message": "Booking successfully created",
      "details": {
        "fullName": "John Smith",
        "pickupDate": "2024-06-20",
        "pickupTime": "14:00",
        "pickupLocation": "Piccadilly Circus, London, UK",
        "dropoffLocation": "Heathrow Airport, London, UK",
        "vehicle": "Executive Saloon",
        "price": {
          "amount": 128,
          "currency": "GBP"
        },
        "journey": {
          "distance_km": 27.4,
          "duration_min": 52
        },
        "status": "pending"
      }
    }
  }
  ```
- **Error Response (400, 401, 500)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid booking data",
      "details": "Error details if available"
    }
  }
  ```

## Complete Booking Process Example

Here's a complete example showing the booking flow from fare calculation to booking creation:

### Step 1: Calculate Fares for All Vehicle Types

**Request:**

```bash
curl -X POST "http://localhost:5555/api/fare-estimate/enhanced" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer [your-token]" \
-d '{
  "locations": {
    "pickup": {
      "address": "Piccadilly Circus, London, UK",
      "coordinates": {
        "lat": 51.5100,
        "lng": -0.1348
      }
    },
    "dropoff": {
      "address": "Heathrow Airport, London, UK",
      "coordinates": {
        "lat": 51.4700,
        "lng": -0.4543
      }
    }
  },
  "datetime": {
    "date": "2024-06-20",
    "time": "14:00"
  },
  "passengers": {
    "count": 2,
    "checkedLuggage": 1,
    "handLuggage": 1
  }
}'
```

**Response:** See fare estimation response from main documentation.

### Step 2: Create Booking with Selected Vehicle

**Request:**

```bash
curl -X POST "http://localhost:5555/api/bookings/create-enhanced" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer [your-token]" \
-d '{
  "customer": {
    "fullName": "John Smith",
    "email": "john.smith@example.com",
    "phone": "+447123456789"
  },
  "booking": {
    "locations": {
      "pickup": {
        "address": "Piccadilly Circus, London, UK",
        "coordinates": {
          "lat": 51.5100,
          "lng": -0.1348
        }
      },
      "dropoff": {
        "address": "Heathrow Airport, London, UK",
        "coordinates": {
          "lat": 51.4700,
          "lng": -0.4543
        }
      }
    },
    "datetime": {
      "date": "2024-06-20",
      "time": "14:00"
    },
    "passengers": {
      "count": 2,
      "checkedLuggage": 1,
      "handLuggage": 1
    },
    "vehicle": {
      "id": "executive-saloon",
      "name": "Executive Saloon"
    },
    "specialRequests": "Please call when arriving"
  }
}'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "bookingId": "45hptG5q4a0m68CZVzNd",
    "message": "Booking successfully created",
    "details": {
      "fullName": "John Smith",
      "pickupDate": "2024-06-20",
      "pickupTime": "14:00",
      "pickupLocation": "Piccadilly Circus, London, UK",
      "dropoffLocation": "Heathrow Airport, London, UK",
      "vehicle": "Executive Saloon",
      "price": {
        "amount": 128,
        "currency": "GBP"
      },
      "journey": {
        "distance_km": 27.4,
        "duration_min": 52
      },
      "status": "pending"
    }
  }
}
```

## Security Features

To ensure fare integrity and prevent manipulation, the booking endpoint implements these security measures:

1. **Server-side Fare Calculation**: All fares are recalculated on the server using the same algorithm as the fare estimation endpoint
2. **Client Data Validation**: All input data is validated against strict schemas
3. **Authentication Required**: All booking endpoints require valid user authentication

## Get User Bookings

Retrieves all bookings for the authenticated user, sorted by creation date (newest first).

- **URL:** `/api/bookings/user`
- **Method:** `GET`
- **Auth Required:** Yes
- **Description:** Gets all bookings for the authenticated user. Results are limited to the 100 most recent bookings.
- **Query Parameters:**
  - `status` (optional): Filter by booking status. Multiple statuses can be comma-separated (e.g., `status=confirmed,assigned,in_progress`).

### Success Response

- **Code:** 200 OK
- **Content:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "Y1fyFP1CYkaF7dF1b1Sk",
        "pickupDate": "2024-07-15",
        "pickupTime": "10:30",
        "pickupLocation": {
          "address": "Westminster, London, UK"
        },
        "dropoffLocation": {
          "address": "Gatwick Airport, London, UK"
        },
        "vehicleType": "Executive Saloon",
        "price": 444.5,
        "status": "confirmed",
        "journey": {
          "distance_km": 64.8,
          "duration_min": 85
        },
        "createdAt": "2025-05-10T02:25:14.180Z"
      },
      {
        "id": "pXaEDFEAjiZQ9KQCenu0",
        "pickupDate": "2025-05-29",
        "pickupTime": "00:40",
        "pickupLocation": {
          "address": "Central London"
        },
        "dropoffLocation": {
          "address": "London Heathrow Airport (LHR)"
        },
        "vehicleType": "Large MPV",
        "price": 129.5,
        "status": "confirmed",
        "journey": {
          "distance_km": 27.4,
          "duration_min": 39
        },
        "createdAt": "2025-05-10T02:16:49.031Z"
      }
    ]
  }
  ```

### Error Response

- **Code:** 401 Unauthorized
- **Content:**
  ```json
  {
    "success": false,
    "error": {
      "message": "Authentication required"
    }
  }
  ```

OR

- **Code:** 500 Internal Server Error
- **Content:**
  ```json
  {
    "success": false,
    "error": {
      "message": "Failed to fetch bookings",
      "details": "Error details here"
    }
  }
  ```

## Booking Management Features

### Filtering User Bookings by Status

You can filter bookings by status to retrieve only bookings with specific statuses:

**Example Request:**

```bash
GET /api/bookings/user?status=confirmed
```

This will return only confirmed bookings. You can request multiple statuses by comma-separating them:

```bash
GET /api/bookings/user?status=confirmed,in_progress
```

Common status groupings:

1. **Active Bookings**: Use `status=confirmed,assigned,in_progress` to get only upcoming and in-progress bookings
2. **Historical Bookings**: Use `status=completed,cancelled,no_show` to get only past bookings

### Cancelling a Booking

To cancel a booking, use the following endpoint:

- **URL:** `/api/bookings/user/bookings/:id/cancel`
