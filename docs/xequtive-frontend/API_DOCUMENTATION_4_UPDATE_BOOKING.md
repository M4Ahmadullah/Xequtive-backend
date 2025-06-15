# Xequtive Booking Update API Documentation

## Introduction

This document outlines the Xequtive booking update process, which follows the same secure and comprehensive approach as the booking creation process. The update booking system ensures data integrity, fare recalculation, and maintains the platform's high security standards.

## Update Booking Process Overview

The booking update process follows these key steps:

1. **Fare Calculation**: Recalculate fares for the updated booking details
2. **Verification**: Server-side validation of update constraints
3. **24-Hour Restriction**: Prevent updates within 24 hours of pickup time
4. **Fare Verification**: Recalculate and verify fare to prevent price manipulation
5. **Booking Update**: Apply changes and store updated booking details

> **IMPORTANT SECURITY NOTE**: The backend always recalculates fares during the booking update process and never accepts client-provided fare values. This prevents potential manipulation of booking prices by users.

## Update Booking Endpoint

- **URL**: `/bookings/update-booking/:bookingId`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Updates an existing booking with server-side fare verification and constraints

### Booking Update Constraints

1. **24-Hour Rule**:

   - Bookings can only be updated MORE THAN 24 HOURS before the pickup time
   - Attempting to update within 24 hours will result in a 400 error

2. **Ownership Verification**:
   - Only the original booking owner can update the booking
   - Authentication is required and verified server-side

### Request Body

The request body follows the same structure as the booking creation endpoint:

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
      "babySeat": 1,
      "childSeat": 0,
      "boosterSeat": 0,
      "wheelchair": 0
    },
    "vehicle": {
      "id": "executive-saloon",
      "name": "Executive Saloon"
    },
    "specialRequests": "Please call when arriving",
    "travelInformation": {
      "type": "flight",
      "details": {
        "airline": "British Airways",
        "flightNumber": "BA123",
        "departureAirport": "Heathrow",
        "scheduledDeparture": "2024-06-20T16:00:00Z"
      }
    }
  }
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "bookingId": "45hptG5q4a0m68CZVzNd",
    "message": "Booking successfully updated",
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
          "baseFare": 12.5,
          "distanceCharge": 108.0,
          "additionalStopFee": 0,
          "timeMultiplier": 0,
          "specialLocationFees": 7.5,
          "waitingCharge": 0
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

### Error Responses

1. **24-Hour Update Restriction (400 Bad Request)**

```json
{
  "success": false,
  "error": {
    "code": "UPDATE_NOT_ALLOWED",
    "message": "Bookings cannot be updated within 24 hours of the pickup time",
    "details": "You can only update bookings more than 24 hours before pickup."
  }
}
```

2. **Unauthorized Update (403 Forbidden)**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_UPDATE",
    "message": "You are not authorized to update this booking",
    "details": "Only the booking owner can modify the booking."
  }
}
```

3. **Validation Error (400 Bad Request)**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid booking update data",
    "details": "Specific validation error messages"
  }
}
```

## Complete Booking Update Process Example

### Step 1: Calculate Updated Fares

Use the `/api/fare-estimate/enhanced` endpoint with the new booking details to get updated fare estimates.

### Step 2: Update Booking

```bash
curl -X POST "http://localhost:5555/api/bookings/update-booking/45hptG5q4a0m68CZVzNd" \
-H "Content-Type: application/json" \
--cookie "token=[your-authentication-cookie]" \
-d '{
  "booking": {
    "locations": {
      "pickup": {
        "address": "Tower Bridge, London, UK",
        "coordinates": {
          "lat": 51.5055,
          "lng": -0.0754
        }
      }
    },
    "datetime": {
      "date": "2024-06-20",
      "time": "15:00"
    }
  }
}'
```

## Security Features

1. **Authentication Required**: Only authenticated users can update bookings
2. **Ownership Verification**: Ensures users can only update their own bookings
3. **Fare Recalculation**: Server-side fare verification prevents price manipulation
4. **24-Hour Protection**: Prevents last-minute booking modifications

## Rate Limiting

- **Booking Update Requests**: 5 update requests per hour per user
- Exceeding the rate limit will result in a 429 Too Many Requests error

## Recommended Frontend Implementation

1. Disable update button within 24 hours of pickup
2. Show clear error messages if update is not allowed
3. Recalculate fares before submitting update
4. Handle potential errors gracefully
5. Confirm user intent before submitting updates

## Booking Status After Update

- The booking status remains `pending` after an update
- If significant changes are made, the status might be reset to require re-confirmation

## Travel Information Updates

- Optional travel information (flight/train details) can be added or modified
- Travel information is validated against the pickup/dropoff locations
- Airline/train operator details must match the route

## Notifications

- Email notifications are sent to the user upon successful booking update
- Notifications include details of the changes made
- Driver is automatically notified of booking modifications
