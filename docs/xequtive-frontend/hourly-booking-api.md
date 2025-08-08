# XEQUTIVE CARS - Executive Cars Booking API Documentation

## Overview

The Executive Cars Booking API provides endpoints for creating and managing premium transportation bookings with support for **three distinct booking types**:

### **1. One-Way (Point-to-Point)**
- Single transfer from A → B (optionally with pre-declared stops)
- **Pricing**: Distance/time based with surcharges
- **Required**: Pickup, dropoff, date, time, passengers, luggage
- **Optional**: Additional stops
- **Map**: Shows calculated route from A to B including stops

### **2. Hourly (4-24h)**
- You hire a car + driver for a fixed number of hours
- Driver stays with you and follows your itinerary
- **Pricing**: Hours × hourly rate × number of vehicles, plus surcharges
- **Required**: Pickup location, date, time, hours (4-24), passengers, luggage, number of vehicles
- **Optional**: Dropoff location, additional stops
- **Map**: Shows pickup and optional stops (no strict route required)

### **3. Return**
Two modes available:
- **Wait-and-return**: Driver waits at destination and returns you later
- **Later date/time**: Two separate scheduled one-way journeys
- **Pricing**: Sum of two one-way fares or one-way × 2 minus discount; or one-way legs + hourly wait component
- **Required**: Outbound pickup/dropoff, return pickup/dropoff, dates/times for both journeys
- **Map**: Shows two routes (or one with indicated return)

## Base URL
```
https://your-api-domain.com/api/hourly-bookings
```

## Authentication
All endpoints require authentication via Firebase ID token in the Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

## Branding Information
All Executive Cars bookings include branding information:
```json
{
  "branding": {
    "name": "Executive Cars",
    "description": "Premium event and group transportation services",
    "type": "executive-cars",
    "category": "event-group-booking"
  }
}
```

## Endpoints

### 1. Health Check
**GET** `/api/hourly-booking-health`

Check if the Executive Cars booking system is operational.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Executive Cars booking system is operational",
    "endpoints": {
      "fareEstimate": "/api/hourly-bookings/fare-estimate",
      "createBooking": "/api/hourly-bookings/create",
      "getUserBookings": "/api/hourly-bookings/user",
      "cancelBooking": "/api/hourly-bookings/:id/cancel"
    },
    "features": [
      "One-Way fare calculation (distance-based)",
      "Hourly fare calculation (4-24 hours)",
      "Return booking with wait charges",
      "Multiple vehicle types support",
      "Time-based surcharges",
      "Equipment fees for extra passengers/luggage",
      "Group/Organisation booking support",
      "Multiple vehicles booking",
      "Executive Cars branding"
    ],
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Fare Estimation (Step 1)
**POST** `/api/hourly-bookings/fare-estimate`

Calculate fare estimates for all available vehicle types based on booking type.

#### **One-Way Request:**
```json
{
  "bookingType": "one-way",
  "datetime": {
    "date": "2024-08-10",
    "time": "12:00"
  },
  "passengers": {
    "count": 4,
    "luggage": 2
  },
  "numVehicles": 1,
  "oneWayDetails": {
    "pickupLocation": {
      "lat": 51.5074,
      "lng": -0.1278
    },
    "dropoffLocation": {
      "lat": 51.4700,
      "lng": -0.4543
    },
    "additionalStops": [
      {
        "lat": 51.5053,
        "lng": 0.0550
      }
    ]
  }
}
```

#### **Hourly Request:**
```json
{
  "bookingType": "hourly",
  "datetime": {
    "date": "2024-08-10",
    "time": "12:00"
  },
  "passengers": {
    "count": 6,
    "luggage": 4
  },
  "numVehicles": 1,
  "hourlyDetails": {
    "hours": 8,
    "pickupLocation": {
      "lat": 51.5074,
      "lng": -0.1278
    },
    "dropoffLocation": {
      "lat": 51.4700,
      "lng": -0.4543
    },
    "additionalStops": [
      {
        "lat": 51.5053,
        "lng": 0.0550
      }
    ]
  }
}
```

#### **Return Request (Wait-and-Return):**
```json
{
  "bookingType": "return",
  "datetime": {
    "date": "2024-08-10",
    "time": "12:00"
  },
  "passengers": {
    "count": 4,
    "luggage": 2
  },
  "numVehicles": 1,
  "returnDetails": {
    "outboundPickup": {
      "lat": 51.5074,
      "lng": -0.1278
    },
    "outboundDropoff": {
      "lat": 51.4700,
      "lng": -0.4543
    },
    "outboundDateTime": {
      "date": "2024-08-10",
      "time": "12:00"
    },
    "outboundStops": [
      {
        "lat": 51.5053,
        "lng": 0.0550
      }
    ],
    "returnType": "wait-and-return",
    "waitDuration": 2
  }
}
```

#### **Return Request (Later Date):**
```json
{
  "bookingType": "return",
  "datetime": {
    "date": "2024-08-10",
    "time": "12:00"
  },
  "passengers": {
    "count": 4,
    "luggage": 2
  },
  "numVehicles": 1,
  "returnDetails": {
    "outboundPickup": {
      "lat": 51.5074,
      "lng": -0.1278
    },
    "outboundDropoff": {
      "lat": 51.4700,
      "lng": -0.4543
    },
    "outboundDateTime": {
      "date": "2024-08-10",
      "time": "12:00"
    },
    "outboundStops": [
      {
        "lat": 51.5053,
        "lng": 0.0550
      }
    ],
    "returnType": "later-date",
    "returnPickup": {
      "lat": 51.4700,
      "lng": -0.4543
    },
    "returnDropoff": {
      "lat": 51.5074,
      "lng": -0.1278
    },
    "returnDateTime": {
      "date": "2024-08-10",
      "time": "18:00"
    },
    "returnStops": [
      {
        "lat": 51.5053,
        "lng": 0.0550
      }
    ]
  }
}
```

#### **Response:**
```json
{
  "success": true,
  "data": {
    "fare": {
      "vehicleOptions": [
        {
          "id": "executive",
          "name": "Executive Saloon",
          "description": "Premium ride in a Mercedes E-Class or equivalent",
          "capacity": {
            "passengers": 3,
            "luggage": 2
          },
          "price": {
            "amount": 115,
            "currency": "GBP",
            "messages": [
              "Distance: 25.9 miles",
              "Duration: 82 minutes",
              "Additional stops (1): £5.00",
              "Equipment fees: £5.00"
            ],
            "breakdown": {
              "baseFare": 0,
              "distanceCharge": 103.97,
              "equipmentFees": 5,
              "timeSurcharge": 0
            }
          },
          "imageUrl": "/images/vehicles/executive-saloon.jpg"
        }
      ],
      "bookingType": "one-way",
      "notifications": [
        "One-Way journey: Point-to-point transfer",
        "Additional stops: 1 stops included"
      ],
      "pricingMessages": [
        "One-Way pricing: Distance-based fare with time surcharges",
        "Additional stops add extra charges"
      ],
      "branding": {
        "name": "Executive Cars",
        "description": "Premium event and group transportation services",
        "type": "executive-cars",
        "category": "event-group-booking"
      }
    }
  }
}
```

### 3. Create Executive Cars Booking (Step 2)
**POST** `/api/hourly-bookings/create`

Create a new Executive Cars booking after the user selects a vehicle and provides their details.

#### **One-Way Booking Request:**
```json
{
  "customer": {
    "fullName": "John Smith",
    "email": "john.smith@example.com",
    "phoneNumber": "+44123456789",
    "groupName": "ABC Corporation"
  },
  "bookingType": "one-way",
  "datetime": {
    "date": "2024-08-10",
    "time": "12:00"
  },
  "passengers": {
    "count": 4,
    "luggage": 2
  },
  "vehicle": {
    "id": "executive",
    "name": "Executive Saloon"
  },
  "numVehicles": 1,
  "specialRequests": "Please ensure driver speaks English",
  "oneWayDetails": {
    "pickupLocation": {
      "address": "London Heathrow Airport, London",
      "coordinates": {
        "lat": 51.4700,
        "lng": -0.4543
      }
    },
    "dropoffLocation": {
      "address": "London City Airport, London",
      "coordinates": {
        "lat": 51.5053,
        "lng": 0.0550
      }
    },
    "additionalStops": [
      {
        "address": "London Bridge Station, London",
        "coordinates": {
          "lat": 51.5074,
          "lng": -0.1278
        }
      }
    ]
  }
}
```

#### **Hourly Booking Request:**
```json
{
  "customer": {
    "fullName": "John Smith",
    "email": "john.smith@example.com",
    "phoneNumber": "+44123456789",
    "groupName": "ABC Corporation"
  },
  "bookingType": "hourly",
  "datetime": {
    "date": "2024-08-10",
    "time": "12:00"
  },
  "passengers": {
    "count": 6,
    "luggage": 4
  },
  "vehicle": {
    "id": "mpv-6",
    "name": "MPV-6 Seater"
  },
  "numVehicles": 1,
  "specialRequests": "Please ensure driver speaks English",
  "hourlyDetails": {
    "hours": 8,
    "pickupLocation": {
      "address": "London Heathrow Airport, London",
      "coordinates": {
        "lat": 51.4700,
        "lng": -0.4543
      }
    },
    "dropoffLocation": {
      "address": "London City Airport, London",
      "coordinates": {
        "lat": 51.5053,
        "lng": 0.0550
      }
    },
    "additionalStops": [
      {
        "address": "London Bridge Station, London",
        "coordinates": {
          "lat": 51.5074,
          "lng": -0.1278
        }
      }
    ]
  }
}
```

#### **Return Booking Request:**
```json
{
  "customer": {
    "fullName": "John Smith",
    "email": "john.smith@example.com",
    "phoneNumber": "+44123456789",
    "groupName": "ABC Corporation"
  },
  "bookingType": "return",
  "datetime": {
    "date": "2024-08-10",
    "time": "12:00"
  },
  "passengers": {
    "count": 4,
    "luggage": 2
  },
  "vehicle": {
    "id": "executive",
    "name": "Executive Saloon"
  },
  "numVehicles": 1,
  "specialRequests": "Please ensure driver speaks English",
  "returnDetails": {
    "outboundPickup": {
      "address": "London Heathrow Airport, London",
      "coordinates": {
        "lat": 51.4700,
        "lng": -0.4543
      }
    },
    "outboundDropoff": {
      "address": "London City Airport, London",
      "coordinates": {
        "lat": 51.5053,
        "lng": 0.0550
      }
    },
    "outboundDateTime": {
      "date": "2024-08-10",
      "time": "12:00"
    },
    "outboundStops": [
      {
        "address": "London Bridge Station, London",
        "coordinates": {
          "lat": 51.5074,
          "lng": -0.1278
        }
      }
    ],
    "returnType": "wait-and-return",
    "waitDuration": 2
  }
}
```

#### **Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "executive_cars_123456",
    "message": "Executive Cars one-way booking successfully created",
    "details": {
      "customerName": "John Smith",
      "bookingType": "one-way",
      "pickupDate": "2024-08-10",
      "pickupTime": "12:00",
      "pickupLocation": "London Heathrow Airport, London",
      "vehicle": "Executive Saloon",
      "price": {
        "amount": 115,
        "currency": "GBP"
      },
      "status": "pending",
      "branding": {
        "name": "Executive Cars",
        "description": "Premium event and group transportation services",
        "type": "executive-cars",
        "category": "event-group-booking"
      },
      "dropoffLocation": "London City Airport, London",
      "hours": 8,
      "returnDetails": {
        "returnType": "wait-and-return",
        "returnDateTime": "2024-08-10 18:00",
        "waitDuration": 2
      }
    }
  }
}
```

### 4. Get User's Executive Cars Bookings
**GET** `/api/hourly-bookings/user?status=pending,confirmed`

Retrieve all Executive Cars bookings for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "executive_cars_123456",
      "bookingType": "one-way",
      "pickupDate": "2024-08-10",
      "pickupTime": "12:00",
      "pickupLocation": {
        "address": "London Heathrow Airport, London"
      },
      "vehicleType": "Executive Saloon",
      "price": 115,
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "branding": {
        "name": "Executive Cars",
        "description": "Premium event and group transportation services",
        "type": "executive-cars",
        "category": "event-group-booking"
      },
      "dropoffLocation": {
        "address": "London City Airport, London"
      },
      "hours": 8,
      "returnDetails": {
        "returnType": "wait-and-return",
        "returnDateTime": "2024-08-10 18:00",
        "waitDuration": 2
      }
    }
  ]
}
```

### 5. Cancel Executive Cars Booking
**POST** `/api/hourly-bookings/:id/cancel`

Cancel an existing Executive Cars booking.

**Request Body:**
```json
{
  "cancellationReason": "Event postponed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Executive Cars booking cancelled successfully",
    "id": "executive_cars_123456",
    "status": "cancelled"
  }
}
```

## Frontend Integration Flow

### Step 1: Fare Estimation
1. User selects booking type (One-Way, Hourly, or Return)
2. User fills out the appropriate form fields based on booking type:

#### **One-Way Form:**
- Pickup location (required)
- Dropoff location (required)
- Additional stops (optional)
- Date and time
- Number of passengers
- Number of luggage pieces
- Number of vehicles

#### **Hourly Form:**
- Pickup location (required)
- Dropoff location (optional)
- Additional stops (optional)
- Date and time
- Hours (4-24, required)
- Number of passengers
- Number of luggage pieces
- Number of vehicles

#### **Return Form:**
- Outbound pickup location (required)
- Outbound dropoff location (required)
- Outbound date and time (required)
- Outbound stops (optional)
- Return type selection:
  - **Wait-and-return**: Wait duration (required)
  - **Later date/time**: Return pickup, dropoff, date, time (all required)
- Number of passengers
- Number of luggage pieces
- Number of vehicles

3. Frontend sends this data to `/fare-estimate`
4. Backend returns available vehicle options with prices and booking type-specific messaging
5. Frontend displays vehicle options to user with appropriate notifications and pricing messages

### Step 2: Booking Creation
1. User selects a vehicle from the options
2. User fills in their details:
   - Full Name (pre-filled from account if available)
   - Email Address (pre-filled from account if available)
   - Contact Number (pre-filled from account if available)
   - Group/Organisation Name (optional)
   - Additional Notes/Special Requests (optional)

3. Frontend sends complete booking data to `/create`
4. Backend creates the Executive Cars booking and returns confirmation with booking type-specific details

## Database Separation

Executive Cars bookings are stored separately from Executive Taxi bookings:

- **Executive Cars**: Stored in `hourlyBookings` collection with `bookingType: "one-way" | "hourly" | "return"`
- **Executive Taxi**: Stored in `bookings` collection with different structure

This ensures complete separation and prevents mixing of different booking types.

## Vehicle Types and Pricing

| Vehicle Type | One-Way Rate | Hourly Rate | Capacity | Description |
|--------------|--------------|-------------|----------|-------------|
| Standard Saloon | Distance-based | £25/hour | 4 passengers, 2 luggage | Comfortable and efficient standard saloon |
| Estate | Distance-based | £30/hour | 4 passengers, 3 luggage | Spacious vehicle with extra luggage space |
| MPV-6 Seater | Distance-based | £45/hour | 6 passengers, 3 luggage | Spacious vehicle for up to 6 passengers |
| MPV-8 Seater | Distance-based | £60/hour | 8 passengers, 4 luggage | Maximum capacity for passengers and luggage |
| Executive Saloon | Distance-based | £50/hour | 3 passengers, 2 luggage | Premium ride in a Mercedes E-Class or equivalent |
| Executive MPV-8 | Distance-based | £75/hour | 6 passengers, 4 luggage | Premium group transportation |
| VIP-Saloon | Distance-based | £80/hour | 3 passengers, 2 luggage | Ultimate luxury saloon experience |
| VIP-SUV/MPV | Distance-based | £100/hour | 6 passengers, 4 luggage | Premium SUV/MPV for ultimate luxury group travel |

## Pricing Structure by Booking Type

### **One-Way Pricing:**
- **Base**: Distance-based fare using slab system
- **Additional**: Time surcharges, equipment fees, stop charges
- **Formula**: Distance charge + stop charges + time surcharge + equipment fees

### **Hourly Pricing:**
- **Base**: Hours × hourly rate
- **Additional**: Time surcharges, equipment fees
- **Formula**: (Hours × hourly rate) + time surcharge + equipment fees
- **Note**: Congestion charges and airport fees apply during journey

### **Return Pricing:**
- **Wait-and-return**: Outbound + Return + Driver waiting time (50% of hourly rate)
- **Later date**: Outbound journey + Return journey (two separate one-way fares)
- **Formula**: 
  - Wait-and-return: (Outbound fare × 2) + (Wait hours × hourly rate × 0.5)
  - Later date: Outbound fare + Return fare

## Booking Type-Specific Messaging

### **One-Way Notifications:**
- "One-Way journey: Point-to-point transfer"
- "Additional stops: X stops included"

### **Hourly Notifications:**
- "Hourly booking: X hours of service"
- "Long-term booking: Extended service period" (if ≥8 hours)
- "Driver stays with you and follows your itinerary"
- "Congestion charges and airport fees will be charged during the journey"

### **Return Notifications:**
- **Wait-and-return**: "Wait-and-return: Driver waits X hours and returns", "Price includes driver waiting time"
- **Later date**: "Later date return: Two separate scheduled journeys", "Price includes both outbound and return journeys"

## User Information Fields

### Pre-filled from Account (if available):
- **Full Name**: User's display name from Firebase account
- **Email Address**: User's email from Firebase account  
- **Contact Number**: User's phone number from profile

### User Input Required:
- **Group/Organisation Name**: Optional field for corporate bookings
- **Additional Notes/Special Requests**: Optional field for special requirements

## Error Responses

### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request format",
    "details": "Booking details must match the selected booking type"
  }
}
```

### Authentication Error
```json
{
  "success": false,
  "error": {
    "message": "Authentication required",
    "code": "AUTH_REQUIRED"
  }
}
```

### Booking Not Found
```json
{
  "success": false,
  "error": {
    "message": "Executive Cars booking not found"
  }
}
```

### Permission Denied
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You don't have permission to cancel this booking"
  }
}
```

## Booking Statuses

- `pending`: Booking created, awaiting confirmation
- `confirmed`: Booking confirmed by admin
- `assigned`: Driver assigned to booking
- `in_progress`: Journey in progress
- `completed`: Journey completed
- `cancelled`: Booking cancelled
- `declined`: Booking declined by admin

## Email Notifications

The system automatically sends email notifications for:
- Executive Cars booking confirmation
- Executive Cars booking cancellation
- Executive Cars booking reminders (if implemented)

## Rate Limiting

- Fare estimation: 10 requests per minute
- Booking creation: 5 requests per minute
- Other endpoints: 20 requests per minute

## Development Notes

- All timestamps are in ISO 8601 format
- All coordinates use decimal degrees (WGS84)
- All prices are in GBP (British Pounds)
- The system uses Firebase for authentication and Firestore for data storage
- Executive Cars bookings are stored in a separate `hourlyBookings` collection with `bookingType: "one-way" | "hourly" | "return"`
- All responses include Executive Cars branding information
- Complete separation from Executive Taxi bookings ensures no data mixing
- Each booking type has specific validation rules and pricing models
- Return bookings support both wait-and-return and later-date scenarios 