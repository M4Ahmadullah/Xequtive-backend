# Xequtive Booking API Documentation

## Introduction

This document outlines the Xequtive booking process API, which follows the fare calculation process (described in the main API documentation). The booking system is designed with security in mind, implementing server-side fare verification to ensure data integrity.

## Booking Process Overview

The booking process follows these steps:

1. **Fare Calculation**: User receives fare estimates for all vehicle types using Mapbox Directions API (replacing Google Distance Matrix)
2. **Vehicle Selection**: User selects a specific vehicle type
3. **Details Entry**: User provides personal and booking details
4. **Verification**: Backend verifies details and recalculates fare using Mapbox Directions API (replacing Google Distance Matrix) (never trusting client-provided fare values)
5. **Completion**: Booking is created and stored in the database

> **IMPORTANT SECURITY NOTE**: The backend always recalculates fares during the booking process using Mapbox Directions API (replacing Google Distance Matrix) and never accepts client-provided fare values. This prevents potential manipulation of fare prices by users. All fare calculations happen on the server using the same algorithm as the fare estimation endpoint, ensuring consistent and secure pricing.

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
      "phoneNumber": "+447123456789"
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
        "handLuggage": 1,
        "mediumLuggage": 0,
        "babySeat": 0,
        "childSeat": 0,
        "boosterSeat": 0,
        "wheelchair": 0
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
          "currency": "GBP",
          "breakdown": {
            "distanceCharge": 108.0,
            "minimumFare": 34.40,
            "additionalStopFee": 0,
            "timeSurcharge": 0,
            "airportFee": 7.5,
            "specialZoneFees": 0
          }
        },
        "journey": {
          "distance_miles": 27.4,
          "duration_minutes": 52
        },
        "status": "pending",
        "notifications": [
          "Your destination is Heathrow Airport. A £7.50 airport fee has been added."
        ]
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
--cookie "token=[your-authentication-cookie]" \
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
    "handLuggage": 1,
    "mediumLuggage": 0,
    "babySeat": 0,
    "childSeat": 0,
    "boosterSeat": 0,
    "wheelchair": 0
  }
}'
```

**Response:** See fare estimation response from main documentation.

### Step 2: Create Booking with Selected Vehicle

**Request:**

```bash
curl -X POST "http://localhost:5555/api/bookings/create-enhanced" \
-H "Content-Type: application/json" \
--cookie "token=[your-authentication-cookie]" \
-d '{
  "customer": {
    "fullName": "John Smith",
    "email": "john.smith@example.com",
    "phoneNumber": "+447123456789"
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
        "currency": "GBP",
        "breakdown": {
          "distanceCharge": 108.0,
          "minimumFare": 34.40,
          "additionalStopFee": 0,
          "timeSurcharge": 0,
          "airportFee": 7.5,
          "specialZoneFees": 0
        }
      },
      "journey": {
        "distance_miles": 27.4,
        "duration_minutes": 52
      },
      "status": "pending",
      "notifications": [
        "Your destination is Heathrow Airport. A £7.50 airport fee has been added."
      ]
    }
  }
}
```

## Security Features

To ensure fare integrity and prevent manipulation, the booking endpoint implements these security measures:

1. **Server-side Fare Calculation**: All fares are recalculated on the server using Mapbox Directions API (replacing Google Distance Matrix) and the same slab-based distance pricing algorithm as the fare estimation endpoint
2. **No Client-Side Fare Input**: The API never accepts fare values from the client, preventing price manipulation
3. **Minimum Fare Enforcement**: The system automatically applies minimum fare rules to ensure fair pricing
4. **Client Data Validation**: All input data is validated against strict schemas
5. **Authentication Required**: All booking endpoints require valid user authentication
6. **Fare Breakdown**: Detailed fare breakdown is provided in the response for transparency

When the client submits a booking request, the server:

1. Validates all journey details (locations, date/time, vehicle type, etc.)
2. Recalculates the fare completely from scratch using Mapbox Directions API (replacing Google Distance Matrix), validated data and slab-based pricing
3. Applies minimum fare rules if the calculated fare is below the vehicle's minimum
4. Applies any special charges automatically (based on locations, time, etc.)
5. Creates the booking with the server-calculated fare
6. Returns the complete fare details including a breakdown

This approach ensures that users cannot manipulate fare prices even if they modify API requests.

## User Bookings API

### Get User's Bookings

**Endpoint:** `GET /api/bookings/user`

**Description:** Retrieve all bookings for the authenticated user

**Authentication:** Required (cookie-based)

**Request Body:** None

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking123",
        "userId": "user456",
        "locationId": "location789",
        "startTime": "2023-12-15T09:00:00.000Z",
        "endTime": "2023-12-15T11:00:00.000Z",
        "status": "confirmed",
        "createdAt": "2023-12-01T12:00:00.000Z",
        "updatedAt": "2023-12-01T12:00:00.000Z",
        "location": {
          "id": "location789",
          "name": "Conference Room A",
          "description": "10-person meeting room with projector",
          "address": "123 Business Ave, Floor 5"
        }
      }
      // Additional bookings...
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10
    }
  }
}
```

**Pagination Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 10)
- `sortBy`: Field to sort by (default: "startTime")
- `sortOrder`: Sort direction, either "asc" or "desc" (default: "asc")

**Filtering Query Parameters:**

- `status`: Filter by booking status (e.g., "confirmed", "canceled", "pending")
- `startDate`: Filter bookings starting from this date (ISO format)
- `endDate`: Filter bookings until this date (ISO format)

**Example: Retrieving Filtered Bookings**

```javascript
// Frontend code example
const getFilteredBookings = async (status, startDate, page = 1, limit = 10) => {
  const queryParams = new URLSearchParams({
    status,
    startDate: startDate.toISOString(),
    page,
    limit,
  }).toString();

  const response = await fetch(`${API_URL}/api/bookings/user?${queryParams}`, {
    credentials: "include", // This includes the auth cookie automatically
  });

  const data = await response.json();
  if (data.success) {
    return data.data;
  } else {
    throw new Error(data.error.message);
  }
};
```

### Create Booking

**Endpoint:** `POST /api/bookings`

**Description:** Create a new booking for the authenticated user

**Authentication:** Required (cookie-based)

**Request Body:**

```json
{
  "locationId": "location789",
  "startTime": "2023-12-20T14:00:00.000Z",
  "endTime": "2023-12-20T16:00:00.000Z",
  "attendees": ["attendee1@example.com", "attendee2@example.com"],
  "notes": "Quarterly planning meeting"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "newbooking123",
      "userId": "user456",
      "locationId": "location789",
      "startTime": "2023-12-20T14:00:00.000Z",
      "endTime": "2023-12-20T16:00:00.000Z",
      "status": "confirmed",
      "createdAt": "2023-12-05T09:30:00.000Z",
      "updatedAt": "2023-12-05T09:30:00.000Z",
      "attendees": ["attendee1@example.com", "attendee2@example.com"],
      "notes": "Quarterly planning meeting",
      "location": {
        "id": "location789",
        "name": "Conference Room A",
        "description": "10-person meeting room with projector",
        "address": "123 Business Ave, Floor 5"
      }
    }
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "message": "Location is not available during the requested time slot",
    "code": "booking/time-slot-unavailable"
  }
}
```

### Cancel Booking

**Endpoint:** `DELETE /api/bookings/:id`

**Description:** Cancel a booking for the authenticated user

**Authentication:** Required (cookie-based)

**URL Parameters:**

- `id`: The ID of the booking to cancel

**Request Body:** None

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "booking123",
    "status": "canceled",
    "updatedAt": "2023-12-07T10:15:00.000Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "message": "Booking not found",
    "code": "booking/not-found"
  }
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "error": {
    "message": "Cannot cancel booking less than 24 hours before start time",
    "code": "booking/cancellation-too-late"
  }
}
```

# Xequtive Booking Creation API

This document outlines the API endpoints for creating bookings with the Xequtive service.

## Overview

The booking creation process is designed to be secure and user-friendly, with built-in fare verification to ensure pricing accuracy.

## API Security Requirements

All booking endpoints are protected and require authentication. The API uses Firebase Authentication with secure HTTP-only cookies.

Authentication is handled automatically when using `credentials: 'include'` in fetch/axios requests:

```javascript
fetch("/api/bookings/user", {
  credentials: "include", // This includes the auth cookie automatically
});
```

For curl examples, include the cookie as shown:

```
curl -X POST "http://localhost:5555/api/bookings/create-enhanced" \
-H "Content-Type: application/json" \
--cookie "token=[your-authentication-cookie]" \
-d '{ ... }'
```

## Rate Limiting

Booking creation is subject to rate limiting to prevent abuse. Users are limited to 5 booking creation requests per hour per IP address.

If the limit is exceeded, the API will respond with:

```json
{
  "success": false,
  "error": {
    "message": "Too many booking requests, please try again later.",
    "code": "BOOKING_RATE_LIMIT_EXCEEDED",
    "details": "You have exceeded the rate limit for booking creation."
  }
}
```

## Creating a Booking

### Enhanced Booking Creation

- **URL:** `/api/bookings/create-enhanced`
- **Method:** `POST`
- **Auth Required:** Yes
- **Rate Limit:** 5 requests per hour per IP address
- **Description:** Creates a booking with integrated fare verification.

#### Request Body

```json
{
  "customer": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+441234567890"
  },
  "booking": {
    "locations": {
      "pickup": {
        "address": "Kings Cross, London, UK",
        "coordinates": {
          "lat": 51.5309,
          "lng": -0.1233
        }
      },
      "dropoff": {
        "address": "Paddington, London, UK",
        "coordinates": {
          "lat": 51.5151,
          "lng": -0.1764
        }
      },
      "additionalStops": [
        {
          "address": "Baker Street, London, UK",
          "coordinates": {
            "lat": 51.5226,
            "lng": -0.1571
          }
        }
      ]
    },
    "datetime": {
      "date": "2024-07-20",
      "time": "14:00"
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
      "name": "Standard Saloon"
    },
    "specialRequests": "Please wait at the entrance"
  }
}
```

**Notes:**

- If the `customer` object is omitted, the system will use the authenticated user's profile information instead
- Available vehicle IDs: "standard-saloon", "estate", "large-mpv", "extra-large-mpv", "executive-saloon", "vip", "vip-mpv", "wav" (wheelchair-accessible)

**IMPORTANT: All passenger fields are REQUIRED, even if set to 0:**

```json
{
  "passengers": {
    "count": 2,           // REQUIRED: Min 1, Max 16
    "checkedLuggage": 1,  // REQUIRED: Min 0, Max 8
    "handLuggage": 1,     // REQUIRED: Min 0, Max 8
    "mediumLuggage": 0,   // REQUIRED: Min 0, Max 8
    "babySeat": 0,        // REQUIRED: Min 0, Max 5
    "childSeat": 0,       // REQUIRED: Min 0, Max 5
    "boosterSeat": 0,     // REQUIRED: Min 0, Max 5
    "wheelchair": 0       // REQUIRED: Min 0, Max 2
  }
}
```

#### Success Response

- **Code:** 201 Created
- **Content:**
  ```json
  {
    "success": true,
    "data": {
      "bookingId": "wyoKmdmPeW777kV8SWTe",
      "message": "Booking successfully created",
      "details": {
        "fullName": "John Doe",
        "pickupDate": "2024-07-20",
        "pickupTime": "14:00",
        "pickupLocation": "Kings Cross, London, UK",
        "dropoffLocation": "Paddington, London, UK",
        "additionalStops": ["Baker Street, London, UK"],
        "vehicle": "Standard Saloon",
        "price": {
          "amount": 21.5,
          "currency": "GBP",
          "breakdown": {
            "baseFare": 5.0,
            "distanceCharge": 14.75,
            "additionalStopFee": 2.5,
            "timeMultiplier": 0,
            "specialLocationFees": 0,
            "waitingCharge": 0
          }
        },
        "journey": {
          "distance_miles": 5.0,
          "duration_minutes": 22
        },
        "status": "pending",
        "notifications": ["Your fare includes an additional stop fee of £2.50"]
      }
    }
  }
  ```

#### Error Responses

- **Code:** 400 Bad Request
- **Content:** Returned when the request data is invalid
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid request format",
      "details": {
        "summary": "The request contains validation errors. Please check the error details below.",
        "receivedData": {}, // The data that was sent
        "missingFields": {
          "locations": "Missing entirely",
          "datetime": {
            "date": "Missing date",
            "time": "Missing time"
          },
          "passengers": {
            "count": "Missing passenger count",
            "checkedLuggage": "Missing checked luggage count",
            "handLuggage": "Missing hand luggage count"
          }
        },
        "validationErrors": {
          "locations": [
            {
              "field": "locations.pickup.address",
              "message": "Pickup address is required",
              "expected": "string",
              "received": null,
              "suggestion": "Please provide a valid pickup address"
            }
          ]
        }
      }
    }
  }
  ```

OR

- **Code:** 400 Bad Request
- **Content:** Returned when location is not serviceable
  ```json
  {
    "success": false,
    "error": {
      "code": "LOCATION_NOT_SERVICEABLE",
      "message": "Failed to calculate fare estimate",
      "details": "We currently only service locations within the United Kingdom."
    }
  }
  ```

OR

- **Code:** 400 Bad Request
- **Content:** Returned when route cannot be found
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_LOCATION",
      "message": "Failed to calculate fare estimate",
      "details": "No routes found between the provided locations."
    }
  }
  ```

OR

- **Code:** 401 Unauthorized
- **Content:** Returned when authentication is missing
  ```json
  {
    "success": false,
    "error": {
      "code": "AUTH_REQUIRED",
      "message": "Authentication required"
    }
  }
  ```

## Fare Calculation Details

The booking API integrates with our fare calculation system. For detailed information about fare calculation methodology, vehicle types, and pricing, please refer to the main API documentation (`API_DOCUMENTATION.md`) and the dedicated fare calculation documentation (`fare-calculation-documentation.md`).

When creating a booking, the system will:

1. Validate journey details (locations, date/time, passenger count)
2. Calculate the fare using the same algorithm as the fare estimation endpoint
3. Apply any applicable special charges (airport fees, congestion charge, etc.)
4. Return the total fare with a detailed breakdown

The response will include notifications about any automatically detected fees, such as:

- Peak time charges
- Additional stop fees
- Airport pickup/dropoff fees
- Congestion charge zone fees
- Dartford crossing fees

## Client Implementation Example

```javascript
const createBooking = async (bookingData) => {
  try {
    // Create booking request
    const response = await fetch(`${API_URL}/api/bookings/create-enhanced`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // This includes the auth cookie automatically
      body: JSON.stringify(bookingData),
    });

    const data = await response.json();

    if (data.success) {
      return data.data; // Booking confirmation details
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

// Example usage - with customer information
const bookingWithCustomer = {
  customer: {
    fullName: "John Doe",
    email: "john@example.com",
    phoneNumber: "+441234567890",
  },
  booking: {
    locations: {
      pickup: {
        address: "Kings Cross, London, UK",
        coordinates: { lat: 51.5309, lng: -0.1233 },
      },
      dropoff: {
        address: "Paddington, London, UK",
        coordinates: { lat: 51.5151, lng: -0.1764 },
      },
    },
    datetime: { date: "2024-07-20", time: "14:00" },
    passengers: { count: 2, checkedLuggage: 1, handLuggage: 1 },
    vehicle: { id: "standard-saloon", name: "Standard Saloon" },
    specialRequests: "Please wait at the entrance",
  },
};

// Example usage - without customer information (uses user profile)
const bookingWithoutCustomer = {
  booking: {
    locations: {
      pickup: {
        address: "Kings Cross, London, UK",
        coordinates: { lat: 51.5309, lng: -0.1233 },
      },
      dropoff: {
        address: "Paddington, London, UK",
        coordinates: { lat: 51.5151, lng: -0.1764 },
      },
    },
    datetime: { date: "2024-07-20", time: "14:00" },
    passengers: { count: 2, checkedLuggage: 1, handLuggage: 1 },
    vehicle: { id: "standard-saloon", name: "Standard Saloon" },
    specialRequests: "Please wait at the entrance",
  },
};

// Create booking
const confirmation = await createBooking(bookingWithCustomer);
console.log("Booking confirmed:", confirmation);
```

**Example: Cancelling a Booking**

```javascript
// Frontend code example
const cancelBooking = async (bookingId, reason) => {
  const response = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // This includes the auth cookie automatically
    body: JSON.stringify({
      cancellationReason: reason || "Cancelled by user",
    }),
  });

  const data = await response.json();
  if (data.success) {
    return data.data; // Cancellation success details
  } else {
    throw new Error(data.error.message);
  }
};
```

**Example: Retrieving Active Bookings**

```javascript
// Frontend code example
const getActiveBookings = async () => {
  const response = await fetch(
    `${API_URL}/api/bookings/user?status=pending,confirmed,assigned,in_progress`,
    {
      credentials: "include", // This includes the auth cookie automatically
    }
  );

  const data = await response.json();
  if (data.success) {
    return data.data; // Array of active bookings
  } else {
    throw new Error(data.error.message);
  }
};
```

### Additional Request Charges

The following additional charges apply when requested:

1. **Luggage Options**

   - Hand Luggage: No additional charge
   - Medium Luggage: Every 2 medium bags charged as 1 large bag at £10.00
   - Checked Luggage: Standard rates apply

2. **Child Safety Equipment**

   - Baby Seat (0-18 Months): £10.00 each
   - Child Seat (18 Months - 4 Years): £10.00 each
   - Booster Seat (4-6 Years): £10.00 each

3. **Accessibility Equipment**
   - Foldable Wheelchair: £25.00 each

### Response Messages

The API will include messages for each additional charge in the response:

```json
{
  "success": true,
  "data": {
    "fare": {
      "amount": 125.5,
      "currency": "GBP",
      "messages": [
        "2 medium bags charged as 1 large bag at £10.00",
        "1 baby seat at £10.00",
        "1 booster seat at £10.00"
      ],
      "breakdown": {
        "baseFare": 85.5,
        "distanceFare": 20.0,
        "additionalRequestFees": [
          { "name": "Medium Luggage", "amount": 10.0 },
          { "name": "Baby Seat (0-18 Months)", "amount": 10.0 },
          { "name": "Booster Seat (4-6 Years)", "amount": 10.0 }
        ]
      }
    }
  }
}
```

# API Documentation - Part 2

## Booking Endpoints

### Create Enhanced Booking

**Endpoint**: `POST /api/bookings/create-enhanced`

**Authentication**: Required (Bearer token or cookie)

**Request Format**:

```json
{
  "customer": {
    "fullName": "John Smith",
    "email": "john.smith@example.com",
            "phoneNumber": "+447700900123"
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
      },
      "additionalStops": [
        {
          "address": "789 Baker St, London, UK",
          "coordinates": {
            "lat": 51.5144,
            "lng": -0.1275
          }
        }
      ]
    },
    "datetime": {
      "date": "2024-04-20", // Format: YYYY-MM-DD
      "time": "14:00" // Format: HH:mm (24-hour)
    },
    "passengers": {
      "count": 2, // Min: 1, Max: 8
      "checkedLuggage": 1, // Min: 0, Max: 8
      "handLuggage": 1, // Min: 0, Max: 8
      "mediumLuggage": 2, // Min: 0, Max: 8
      "babySeat": 1, // Min: 0, Max: 4
      "boosterSeat": 1, // Min: 0, Max: 4
      "childSeat": 0, // Min: 0, Max: 4
      "wheelchair": 0 // Min: 0, Max: 2
    },
    "vehicle": {
      "id": "standard-saloon",
      "name": "Standard Saloon"
    },
    "specialRequests": "Please ensure baby seat and booster seat are properly installed."
  }
}
```

**Response Format**:

```json
{
  "success": true,
  "data": {
    "bookingId": "XQ-123456",
    "verificationToken": "abc123xyz789",
    "verifiedFare": {
      "vehicleId": "standard-saloon",
      "vehicleName": "Standard Saloon",
      "price": {
        "amount": 85.5,
        "currency": "GBP"
      },
      "distance_miles": 15.5,
      "duration_minutes": 45
    },
    "expiresIn": 300 // seconds until verification expires
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": {
    "message": "Validation error",
    "code": "VALIDATION_ERROR",
    "details": "booking.locations.pickup.address: Pickup address is required"
  }
}
```

### Confirm Booking

**Endpoint**: `POST /api/bookings/confirm`

**Authentication**: Required (Bearer token or cookie)

**Request Format**:

```json
{
  "bookingId": "XQ-123456",
  "verificationToken": "abc123xyz789",
  "customerConsent": true
}
```

**Response Format**:

```json
{
  "success": true,
  "data": {
    "bookingId": "XQ-123456",
    "message": "Booking confirmed successfully",
    "details": {
      "fullName": "John Smith",
      "pickupDate": "2024-04-20",
      "pickupTime": "14:00",
      "pickupLocation": "Piccadilly Circus, London, UK",
      "dropoffLocation": "Heathrow Airport, London, UK",
      "vehicle": "Standard Saloon",
      "price": {
        "amount": 85.5,
        "currency": "GBP"
      },
      "status": "confirmed"
    }
  }
}
```

### Cancel Booking

**Endpoint**: `POST /api/bookings/{bookingId}/cancel`

**Authentication**: Required (Bearer token or cookie)

**Request Format**:

```json
{
  "cancellationReason": "Change of plans" // Optional
}
```

**Response Format**:

```json
{
  "success": true,
  "data": {
    "message": "Booking cancelled successfully",
    "id": "XQ-123456",
    "status": "cancelled"
  }
}
```

## Vehicle Types

The following vehicle types are available for bookings:

1. **Standard Saloon** (`standard-saloon`)

   - Capacity: 4 passengers, 2 luggage
   - Examples: Toyota Prius, Ford Mondeo

2. **Estate** (`estate`)

   - Capacity: 4 passengers, 4 luggage
   - Examples: Mercedes E-Class Estate, Volkswagen Passat Estate

3. **MPV-6** (`large-mpv`)

   - Capacity: 6 passengers, 4 luggage
   - Examples: Ford Galaxy, Volkswagen Sharan

4. **MPV-8** (`extra-large-mpv`)

   - Capacity: 8 passengers, 6 luggage
   - Examples: Ford Tourneo, Mercedes Vito

5. **Executive Saloon** (`executive-saloon`)

   - Capacity: 3 passengers, 2 luggage
   - Examples: Mercedes E-Class, BMW 5-Series

6. **VIP Executive** (`vip`)

   - Capacity: 3 passengers, 2 luggage
   - Examples: Mercedes S-Class, BMW 7-Series

7. **VIP Executive MPV** (`vip-mpv`)

   - Capacity: 6 passengers, 4 luggage
   - Examples: Mercedes V-Class Luxury

8. **Wheelchair Accessible** (`wav`)
   - Capacity: 4 passengers + wheelchair, 2 luggage
   - Examples: Specially adapted vans

## 🚨 CRITICAL: Frontend Troubleshooting Guide

### Common Booking Creation Failures:

1. **"Required" Validation Error**: 
   - **Cause**: Missing required passenger fields
   - **Solution**: Always include ALL passenger fields, even if set to 0
   ```javascript
   // ❌ WRONG - Missing fields
   "passengers": {
     "count": 2,
     "checkedLuggage": 1,
     "handLuggage": 1
   }
   
   // ✅ CORRECT - All fields included
   "passengers": {
     "count": 2,
     "checkedLuggage": 1,
     "handLuggage": 1,
     "mediumLuggage": 0,  // Required!
     "babySeat": 0,       // Required!
     "childSeat": 0,      // Required!
     "boosterSeat": 0,    // Required!
     "wheelchair": 0      // Required!
   }
   ```

2. **"Invalid Vehicle ID" Error**:
   - **Cause**: Using wrong vehicle IDs
   - **Solution**: Use only these valid IDs: `standard-saloon`, `estate`, `large-mpv`, `extra-large-mpv`, `executive-saloon`, `vip`, `vip-mpv`, `wav`

3. **"Invalid phone number format" Error**:
   - **Cause**: Phone number contains spaces or invalid characters
   - **Solution**: Strip all spaces from phone number before sending
   ```javascript
   // ❌ WRONG - Contains spaces
   "phoneNumber": "+447899 966 666"
   
   // ✅ CORRECT - No spaces
   "phoneNumber": "+447899966666"
   
   // Frontend fix:
   const cleanPhone = phoneNumber.replace(/\s+/g, '');
   ```

4. **Authentication Errors**:
   - **Solution**: Always include `credentials: "include"` in fetch requests

## Booking Process Flow

1. Get fare estimate using `POST /api/fare-estimate/enhanced`
2. Create booking using `POST /api/bookings/create-enhanced`
3. Confirm booking using `POST /api/bookings/confirm`

The booking process includes a verification step to ensure fare accuracy and prevent price manipulation. The verification token expires after 5 minutes (300 seconds).
