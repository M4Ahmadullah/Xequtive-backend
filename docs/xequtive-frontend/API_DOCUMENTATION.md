# Xequtive API Documentation

## Introduction

Xequtive is a premium taxi booking platform designed for executive and luxury transportation services. This backend API powers the Xequtive frontend website and admin dashboard, enabling users to:

- Calculate accurate fare estimates based on distance, traffic, and vehicle type
- Book premium transportation services with various vehicle options
- Manage bookings through an admin dashboard
- Track booking status and history

The platform focuses on providing a seamless, high-end transportation experience with transparent pricing and premium vehicle options ranging from standard saloons to luxury vehicles. Mobile application support is planned for future development.

### Key Features

- **Advanced Fare Calculation**: Real-time fare estimates considering distance, traffic conditions, time of day, and vehicle type
- **Multiple Vehicle Classes**: Standard Saloon, Executive Saloon, Executive MPV, and Luxury Vehicle options
- **Additional Stops**: Support for multi-stop journeys with accurate fare adjustments
- **Admin Dashboard**: Comprehensive booking management for administrators
- **Firebase Authentication**: Secure user authentication and authorization
- **Mapbox Integration**: Precise distance and traffic calculations

## API Security

All sensitive endpoints in this API are protected with authentication to ensure that only authorized users can access the data and services. The API employs several security measures:

### Authentication Middleware

- **Token Verification**: All protected endpoints use Firebase token verification
- **Role-Based Access Control**: Admin-only endpoints require admin role verification
- **JWT Token Format**: Tokens must be provided in the Authorization header using the Bearer scheme

### Password Security Guidelines

The authentication system follows these security best practices:

1. **Password Transmission**:

   - Passwords should be sent as plain text over HTTPS/TLS encrypted connections
   - Do NOT hash passwords on the client side before sending to the API
   - All API endpoints enforce HTTPS to ensure secure password transmission

2. **Authentication Flow**:

   - User credentials are securely transmitted to the backend
   - Backend verifies credentials with Firebase Authentication
   - Firebase handles proper password hashing and security
   - Authentication tokens are returned to the client for subsequent requests

3. **Token Handling**:
   - Store tokens securely on the client (preferably in memory or secure storage)
   - Never store tokens in localStorage or cookies without proper security measures
   - Include the token in the Authorization header for all authenticated requests
   - Handle token expiration by implementing proper refresh mechanisms
   - Tokens are valid for 5 days for all signed-in users

### Protected Resources

The following resources require authentication:

- **Fare Estimation**: Protected to ensure only authenticated users can get fare estimates
- **Bookings**: All booking operations require authentication, with admin-specific operations having additional role verification
- **User Management**: Admin privilege management endpoints are protected with admin role verification
- **Detailed Health Status**: Only authenticated users can view detailed system health information

## Base URL

```
http://localhost:5555/api
```

For production, this will change to your deployed domain.

## Authentication

### Sign Up

- **URL:** `/auth/signup`
- **Method:** `POST`
- **Rate Limit:** 10 requests per hour per IP address
- **Description:** Register a new user account.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe",
    "phone": "+441234567890" // Optional
  }
  ```

#### Success Response

- **Code:** 201 Created
- **Content:**
  ```json
  {
    "success": true,
    "data": {
      "uid": "user_id_here",
      "email": "user@example.com",
      "displayName": "John Doe",
      "phone": "+441234567890",
      "role": "user",
      "token": "jwt_token_here",
      "expiresIn": "432000"
    }
  }
  ```

#### Error Response

- **Code:** 400 Bad Request
- **Content:**

  ```json
  {
    "success": false,
    "error": {
      "message": "Invalid signup data",
      "details": "Password must be at least 6 characters long"
    }
  }
  ```

- **Code:** 409 Conflict
- **Content:**

  ```json
  {
    "success": false,
    "error": {
      "message": "The email address is already in use by another account."
    }
  }
  ```

- **Code:** 429 Too Many Requests
- **Content:**
  ```json
  {
    "success": false,
    "error": {
      "message": "Too many authentication attempts, please try again later.",
      "code": "AUTH_RATE_LIMIT_EXCEEDED",
      "details": "You have exceeded the rate limit for authentication requests."
    }
  }
  ```

### Sign In

- **URL:** `/auth/signin`
- **Method:** `POST`
- **Rate Limit:** 10 requests per hour per IP address
- **Description:** Authenticate a user and get a token.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

#### Success Response

- **Code:** 200 OK
- **Content:**
  ```json
  {
    "success": true,
    "data": {
      "uid": "user_id_here",
      "email": "user@example.com",
      "displayName": "John Doe",
      "phone": "+441234567890",
      "role": "user",
      "token": "jwt_token_here",
      "expiresIn": "432000"
    }
  }
  ```

#### Error Response

- **Code:** 400 Bad Request
- **Content:**

  ```json
  {
    "success": false,
    "error": {
      "message": "Invalid login data",
      "details": "Invalid email format"
    }
  }
  ```

- **Code:** 401 Unauthorized
- **Content:**

  ```json
  {
    "success": false,
    "error": {
      "message": "Invalid email or password"
    }
  }
  ```

- **Code:** 429 Too Many Requests
- **Content:**
  ```json
  {
    "success": false,
    "error": {
      "message": "Too many authentication attempts, please try again later.",
      "code": "AUTH_RATE_LIMIT_EXCEEDED",
      "details": "You have exceeded the rate limit for authentication requests."
    }
  }
  ```

### Sign Out

- **URL:** `/auth/signout`
- **Method:** `POST`
- **Description:** Sign out the current user.
- **Auth Required:** No

#### Success Response

- **Code:** 200 OK
- **Content:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Signed out successfully"
    }
  }
  ```

## Token Management

The API uses JWT tokens for authentication. When a user signs in or signs up, they receive a token that should be included in subsequent requests.

### Token Format

Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Token Expiration

Tokens expire after 5 days (432000 seconds). Your frontend should handle token expiration by either:

1. Refreshing the token before it expires
2. Redirecting to the login page when a 401 response is received

## Fare Estimation Endpoints

### Enhanced Fare Estimation (All Vehicle Types)

- **URL**: `/fare-estimate/enhanced`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Returns fare estimates for ALL vehicle types based on the provided journey details

- **Request Headers**:

  ```
  Content-Type: application/json
  Authorization: Bearer <firebase-token>
  ```

- **Example Authentication**:

  ```javascript
  // Frontend code example (React/Next.js)
  const calculateFare = async () => {
    // Get Firebase token (make sure user is logged in)
    const user = auth.currentUser;
    if (!user) {
      console.error("User not logged in");
      return;
    }

    const token = await user.getIdToken();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/fare-estimate/enhanced`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          locations: {
            pickup: {
              address: "Piccadilly Circus, London, UK",
              coordinates: { lat: 51.51, lng: -0.1348 },
            },
            dropoff: {
              address: "Heathrow Airport, London, UK",
              coordinates: { lat: 51.47, lng: -0.4543 },
            },
          },
          datetime: {
            date: "2024-06-20",
            time: "14:00",
          },
          passengers: {
            count: 2,
            checkedLuggage: 1,
            handLuggage: 1,
          },
        }),
      }
    );

    const data = await response.json();
    // Handle the response
  };
  ```

- **Request Body**:

  ```json
  {
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
      "date": "2024-06-20",
      "time": "14:00"
    },
    "passengers": {
      "count": 2,
      "checkedLuggage": 1,
      "handLuggage": 1
    }
  }
  ```

- **Success Response (200)**:

  ```json
  {
    "success": true,
    "data": {
      "fare": {
        "baseFare": 78.5,
        "totalDistance": 27.4,
        "estimatedTime": 52,
        "currency": "GBP",
        "vehicleOptions": [
          {
            "id": "standard-saloon",
            "name": "Standard Saloon",
            "description": "Comfortable ride for up to 4 passengers",
            "capacity": {
              "passengers": 4,
              "luggage": 2
            },
            "price": {
              "amount": 71.5,
              "currency": "GBP"
            },
            "eta": 5,
            "imageUrl": "/images/vehicles/standard-saloon.jpg"
          },
          {
            "id": "estate",
            "name": "Estate",
            "description": "Spacious vehicle with extra luggage space",
            "capacity": {
              "passengers": 4,
              "luggage": 4
            },
            "price": {
              "amount": 85.5,
              "currency": "GBP"
            },
            "eta": 6,
            "imageUrl": "/images/vehicles/estate.jpg"
          },
          {
            "id": "large-mpv",
            "name": "Large MPV",
            "description": "Spacious vehicle for up to 6 passengers",
            "capacity": {
              "passengers": 6,
              "luggage": 4
            },
            "price": {
              "amount": 100,
              "currency": "GBP"
            },
            "eta": 8,
            "imageUrl": "/images/vehicles/large-mpv.jpg"
          },
          {
            "id": "executive-saloon",
            "name": "Executive Saloon",
            "description": "Premium ride in a Mercedes E-Class or equivalent",
            "capacity": {
              "passengers": 3,
              "luggage": 2
            },
            "price": {
              "amount": 128,
              "currency": "GBP"
            },
            "eta": 7,
            "imageUrl": "/images/vehicles/executive-saloon.jpg",
            "features": ["WiFi", "Bottled Water", "Newspaper"]
          },
          {
            "id": "executive-mpv",
            "name": "Executive Large MPV",
            "description": "Premium Mercedes-Vito or equivalent",
            "capacity": {
              "passengers": 7,
              "luggage": 7
            },
            "price": {
              "amount": 156.5,
              "currency": "GBP"
            },
            "eta": 9,
            "imageUrl": "/images/vehicles/executive-mpv.jpg",
            "features": ["WiFi", "Bottled Water", "Extra Legroom"]
          },
          {
            "id": "vip",
            "name": "VIP",
            "description": "Luxury Mercedes S-Class or equivalent",
            "capacity": {
              "passengers": 3,
              "luggage": 2
            },
            "price": {
              "amount": 199.5,
              "currency": "GBP"
            },
            "eta": 12,
            "imageUrl": "/images/vehicles/vip.jpg",
            "features": [
              "WiFi",
              "Premium Drinks",
              "Luxury Interior",
              "Professional Chauffeur"
            ]
          },
          {
            "id": "vip-mpv",
            "name": "VIP MPV",
            "description": "Luxury Mercedes V-Class or equivalent",
            "capacity": {
              "passengers": 6,
              "luggage": 6
            },
            "price": {
              "amount": 242,
              "currency": "GBP"
            },
            "eta": 15,
            "imageUrl": "/images/vehicles/vip-mpv.jpg",
            "features": [
              "WiFi",
              "Premium Drinks",
              "Luxury Interior",
              "Professional Chauffeur"
            ]
          }
        ],
        "journey": {
          "distance_miles": 27.4,
          "duration_minutes": 52
        }
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
      "message": "Validation error",
      "details": "locations: Required, datetime: Required, passengers: Required"
    }
  }
  ```

- **Error Codes**:
  - `VALIDATION_ERROR`: Request data did not pass validation
  - `INVALID_LOCATION`: Locations could not be routed (no valid route found)
  - `FARE_CALCULATION_ERROR`: General error during fare calculation

### Vehicle Types

The enhanced fare estimation endpoint calculates fares for all of the following vehicle types:

1. **Standard Saloon** - Toyota Prius, Ford Mondeo

   - Capacity: 4 passengers, 2 luggage items
   - Base Rate: £2.50/mile
   - Minimum Fare: £15.00

2. **Estate** - Volkswagen Passat Estate, Skoda Octavia Estate

   - Capacity: 4 passengers, 4 luggage items
   - Base Rate: £3.00/mile
   - Minimum Fare: £18.00

3. **Large MPV** - Ford Galaxy, Volkswagen Sharan

   - Capacity: 6 passengers, 4 luggage items
   - Base Rate: £3.50/mile
   - Minimum Fare: £22.00

4. **Extra Large MPV** - Ford Tourneo, Volkswagen Transporter

   - Capacity: 8 passengers, 8 luggage items
   - Base Rate: £4.00/mile
   - Minimum Fare: £25.00

5. **Executive Saloon** - Mercedes E-Class, BMW 5-Series

   - Capacity: 3 passengers, 2 luggage items
   - Base Rate: £4.50/mile
   - Minimum Fare: £30.00
   - Features: WiFi, Bottled Water, Newspaper

6. **Executive Large MPV** - Mercedes Vito, Volkswagen Caravelle

   - Capacity: 7 passengers, 7 luggage items
   - Base Rate: £5.50/mile
   - Minimum Fare: £40.00
   - Features: WiFi, Bottled Water, Extra Legroom

7. **VIP** - Mercedes S-Class, BMW 7-Series

   - Capacity: 3 passengers, 2 luggage items
   - Base Rate: £7.00/mile
   - Minimum Fare: £50.00
   - Features: WiFi, Premium Drinks, Luxury Interior, Professional Chauffeur

8. **VIP MPV** - Mercedes V-Class

   - Capacity: 6 passengers, 6 luggage items
   - Base Rate: £8.50/mile
   - Minimum Fare: £60.00
   - Features: WiFi, Premium Drinks, Luxury Interior, Professional Chauffeur

9. **Wheelchair Accessible Vehicle (WAV)** - Specially adapted vans
   - Capacity: 4 passengers + wheelchair, 2 luggage items
   - Base Rate: £3.50/mile
   - Minimum Fare: £25.00
   - Features: Wheelchair Ramp, Secure Wheelchair Fastening

### Comprehensive Fare Calculation Logic

Our fare calculation system uses a sophisticated algorithm that considers multiple factors to provide accurate and fair pricing across all vehicle types. Here's a detailed explanation of how fares are calculated:

#### 1. Route Calculation

- **Mapping Provider**: We use Mapbox's Directions API to calculate routes between locations
- **Coordinates Processing**: All location coordinates (pickup, stops, dropoff) are formatted and sent to Mapbox
- **Route Selection**: The optimal route is automatically selected based on distance and road conditions
- **Multiple Destinations**: For journeys with additional stops, the route is calculated as: pickup → all stops (in order) → final destination
- **Distance Measurement**: Total journey distance is measured in miles and calculated by summing all route segments
- **Time Estimation**: Estimated journey time is calculated in minutes based on typical driving speeds and route conditions

#### 2. Base Fare Calculation

For each vehicle type, the initial fare is calculated as:

```
Initial Fare = Base Rate + (Distance in miles × Base Rate per mile)
```

Where:

- **Base Rate**: A fixed amount charged for each journey (varies by vehicle type)
- **Distance Charge**: The journey distance multiplied by the vehicle's per-mile rate

#### 3. Time-Based Adjustments

Fares are adjusted based on the time and day of travel:

- **Peak Hours (Weekdays)**:
  - Morning Rush: 7:00 AM - 10:00 AM (50% surcharge, 1.5× multiplier)
  - Evening Rush: 4:00 PM - 7:00 PM (50% surcharge, 1.5× multiplier)
- **Peak Hours (Weekends)**:
  - 10:00 AM - 8:00 PM (20% surcharge, 1.2× multiplier)
- **Night Hours**:
  - 10:00 PM - 5:00 AM (30% surcharge, 1.3× multiplier)
- **Weekends**:
  - Saturday and Sunday (20% surcharge, 1.2× multiplier, applied in addition to any time-based multipliers)
- **Holidays**:
  - Major public holidays (40% surcharge, 1.4× multiplier, applied in addition to any time-based multipliers)

These multipliers are applied to the initial fare:

```
Adjusted Fare = Initial Fare × Time Multiplier
```

#### 4. Additional Charges

- **Stop Fee**: £5.00 per additional stop
- **Wait Time**: Not currently implemented, but planned for future (will charge per minute of waiting)

```
Fare with Extras = Adjusted Fare + (Number of Stops × Stop Fee)
```

#### 5. Minimum Fare Application

To ensure driver earnings for very short trips, a minimum fare is applied if the calculated fare is lower than the vehicle type's minimum fare:

```
Final Fare = MAX(Fare with Extras, Minimum Fare)
```

#### 6. Final Adjustments

- **Rounding**: The final fare is rounded up to the nearest £0.50 for simplicity
- **Currency**: All fares are calculated in GBP (£)

#### 7. Examples of Fare Variations

- **Short Local Trip (5 miles) in Standard Saloon**:
  - Off-peak: £15.00 (minimum fare applies)
  - Peak hour weekday: £18.75
  - Night hours: £16.75
- **Airport Transfer (30 miles) in Executive Saloon**:
  - Off-peak: £138.00
  - Peak hour weekday: £207.00
  - Weekend: £165.60
- **Long Distance Journey (100 miles) in VIP Vehicle**:
  - Off-peak: £707.00
  - Peak hour weekday: £1,060.50
  - Night and weekend combined: £1,103.00

#### 8. Special Circumstances

- **Remote Areas**: Standard rates apply, but longer ETAs may be shown
- **Bad Weather**: Currently no automatic surcharge, but may be implemented in future versions
- **Major Events**: No automatic surcharge, but fares may be higher due to peak hour classification
- **Low Availability**: No dynamic pricing based on vehicle availability (fixed pricing model)
- **Traffic Conditions**: Current version does not include traffic-based surcharges, but route timing accounts for typical traffic patterns

#### 9. How ETAs Are Calculated

- **Base ETA**: Each vehicle type has a standard ETA (time to reach the pickup location)
- **Standard Saloon**: 5 minutes
- **Estate**: 6 minutes
- **Large MPV**: 8 minutes
- **Extra Large MPV**: 10 minutes
- **Executive Saloon**: 7 minutes
- **Executive Large MPV**: 9 minutes
- **VIP**: 12 minutes
- **VIP MPV**: 15 minutes
- **Wheelchair Accessible Vehicle**: 10 minutes

These ETAs represent the average time for a vehicle to reach the pickup location based on typical availability and are not adjusted for current driver locations or traffic conditions in the current implementation.
