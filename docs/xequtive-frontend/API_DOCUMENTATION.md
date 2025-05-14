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
              "currency": "GBP",
              "breakdown": {
                "baseFare": 5.0,
                "distanceCharge": 66.5,
                "additionalStopFee": 0,
                "timeMultiplier": 0,
                "specialLocationFees": 0,
                "waitingCharge": 0
              }
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
              "currency": "GBP",
              "breakdown": {
                "baseFare": 7.5,
                "distanceCharge": 78.0,
                "additionalStopFee": 0,
                "timeMultiplier": 0,
                "specialLocationFees": 0,
                "waitingCharge": 0
              }
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
              "currency": "GBP",
              "breakdown": {
                "baseFare": 12.5,
                "distanceCharge": 87.5,
                "additionalStopFee": 0,
                "timeMultiplier": 0,
                "specialLocationFees": 0,
                "waitingCharge": 0
              }
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
            "eta": 7,
            "imageUrl": "/images/vehicles/executive-saloon.jpg",
            "features": ["WiFi", "Bottled Water", "Professional Chauffeur"]
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
              "currency": "GBP",
              "breakdown": {
                "baseFare": 25.0,
                "distanceCharge": 131.5,
                "additionalStopFee": 0,
                "timeMultiplier": 0,
                "specialLocationFees": 0,
                "waitingCharge": 0
              }
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
              "currency": "GBP",
              "breakdown": {
                "baseFare": 199.5,
                "distanceCharge": 0,
                "additionalStopFee": 0,
                "timeMultiplier": 0,
                "specialLocationFees": 0,
                "waitingCharge": 0
              }
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
              "currency": "GBP",
              "breakdown": {
                "baseFare": 242.0,
                "distanceCharge": 0,
                "additionalStopFee": 0,
                "timeMultiplier": 0,
                "specialLocationFees": 0,
                "waitingCharge": 0
              }
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
        },
        "notifications": [
          "Your destination is Heathrow Airport. A £7.50 airport fee has been added for premium vehicles.",
          "Your journey is during peak hours (Weekday). A £3.54 peak time charge has been added.",
          "Your route passes through the Congestion Charge Zone. A £7.50 charge has been added."
        ]
      }
    }
  }
  ```

- **Important Note**: The `journey` property is a key component of the response and is required by the frontend to display journey details to users. It must always be included in the response with both `distance_miles` and `duration_minutes` properties to ensure proper UI rendering.

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
   - Base Rate: £5.00 base fare, £2.95/mile
   - Minimum Fare: £15.00

2. **Estate** - Mercedes E-Class Estate, Volkswagen Passat Estate

   - Capacity: 4 passengers, 4 luggage items
   - Base Rate: £7.50 base fare, £3.95/mile
   - Minimum Fare: £18.00

3. **MPV (XL)** - Ford Galaxy, Volkswagen Sharan

   - Capacity: 6 passengers, 4 luggage items
   - Base Rate: £12.50 base fare, £4.75/mile
   - Minimum Fare: £22.00

4. **MPV (XXL)** - Ford Tourneo, Mercedes Vito

   - Capacity: 8 passengers, 6 luggage items
   - Base Rate: £20.00 base fare, £3.95/mile
   - Minimum Fare: £25.00

5. **Executive** - Mercedes E-Class, BMW 5-Series

   - Capacity: 3 passengers, 2 luggage items
   - Base Rate: £12.50 base fare, £4.95/mile
   - Minimum Fare: £30.00
   - Features: WiFi, Bottled Water, Professional Chauffeur, Flight Tracking

6. **Executive MPV** - Mercedes V-Class, Volkswagen Caravelle

   - Capacity: 8 passengers, 5 luggage items
   - Base Rate: £25.00 base fare, £5.95/mile
   - Minimum Fare: £40.00
   - Features: WiFi, Bottled Water, Professional Chauffeur, Flight Tracking, Extra Legroom

7. **VIP Executive** - Mercedes S-Class, BMW 7-Series

   - Capacity: 3 passengers, 2 luggage items
   - Rate: Custom quotes based on hourly rates (£75.00 per hour)
   - Minimum Fare: £50.00
   - Features: WiFi, Premium Drinks, Luxury Interior, Professional Chauffeur, Priority Service, Privacy Partition

8. **VIP Executive MPV** - Mercedes V-Class Luxury

   - Capacity: 6 passengers, 4 luggage items
   - Rate: Custom quotes based on hourly rates (£95.00 per hour)
   - Minimum Fare: £60.00
   - Features: WiFi, Premium Drinks, Luxury Interior, Professional Chauffeur, Priority Service, Enhanced Climate Control

9. **Wheelchair Accessible Vehicle (WAV)** - Specially adapted vans
   - Capacity: 4 passengers + wheelchair, 2 luggage items
   - Base Rate: £12.50 base fare, £4.75/mile
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
Initial Fare = Base Fare + (Distance in miles × Per Mile Rate)
```

Where:

- **Base Fare**: A fixed amount charged for each journey (varies by vehicle type)
- **Per Mile Rate**: The per-mile charge for the distance traveled (varies by vehicle type)

#### 3. Time-Based Adjustments

Fares are adjusted based on the time and day of travel:

- **Peak Hours (Weekdays, Monday-Thursday)**:
  - Morning Rush: 3:00 AM - 9:00 AM (Fixed £3.54 additional charge)
  - Evening Rush: 3:00 PM - 9:00 PM (Fixed £3.54 additional charge)
- **Peak Hours (Friday)**:
  - Morning Rush: 3:00 AM - 9:00 AM (Special rates apply)
  - Evening Rush: 3:00 PM - 11:59 PM (Special rates apply)
- **Weekend**:
  - Saturday and Sunday (Special rates apply)

#### 4. Special Zone Detection and Charges

The system automatically detects and applies charges for special zones:

- **Congestion Charge Zone**: £7.50 if the route passes through London's Congestion Charge Zone
- **Dartford Crossing**: £4.00 if the route includes the Dartford Crossing
- **Airport Pickup Fees**: £6.00-£10.00 depending on the airport
- **Airport Dropoff Fees**: £6.00-£7.00 depending on the airport

##### Airport Pickup Fees

| Airport      | Fee (£) |
| ------------ | :-----: |
| Heathrow     |  £7.50  |
| Gatwick      |  £8.00  |
| Luton        |  £6.00  |
| Stansted     | £10.00  |
| City Airport |  £6.50  |

##### Airport Dropoff Fees

| Airport      | Fee (£) |
| ------------ | :-----: |
| Heathrow     |  £6.00  |
| Gatwick      |  £6.00  |
| Luton        |  £6.00  |
| Stansted     |  £7.00  |
| City Airport |  £6.50  |

#### 5. Additional Charges

- **Additional Stop Fee**: Varies by vehicle type (£2.50-£5.50 per additional stop)
- **Waiting Time**: Charged per minute or hour based on vehicle type

| Vehicle Type      | Per Minute (£) | Per Hour (£) |
| ----------------- | :------------: | :----------: |
| Standard Saloon   |     £0.42      |    £25.00    |
| Estate            |     £0.58      |    £30.00    |
| MPV (XL)          |     £0.58      |    £35.00    |
| MPV (XXL)         |     £0.67      |    £45.00    |
| Executive         |     £0.67      |    £45.00    |
| Executive MPV     |     £0.75      |    £55.00    |
| VIP Executive     |     £1.25      |    £75.00    |
| VIP Executive MPV |     £1.58      |    £95.00    |

#### 6. Minimum Fare Application

To ensure driver earnings for very short trips, a minimum fare is applied if the calculated fare is lower than the vehicle type's minimum fare:

```
Final Fare = MAX(Fare with Extras, Minimum Fare)
```

#### 7. Final Adjustments

- **Rounding**: The final fare is rounded up to the nearest £0.50 for simplicity
- **Currency**: All fares are calculated in GBP (£)

#### 8. Examples of Fare Variations

- **Short Local Trip (5 miles) in Standard Saloon**:
  - Off-peak: £19.75 (£5.00 base + 5 miles × £2.95/mile = £19.75)
  - Peak hour weekday: £23.29 (£19.75 + £3.54 peak charge = £23.29)
- **Airport Transfer (30 miles) in Executive**:
  - Off-peak: £160.50 (£12.50 base + 30 miles × £4.95/mile = £160.50)
  - Peak hour weekday: £164.04 (£160.50 + £3.54 peak charge = £164.04)
  - With airport pickup at Heathrow: £171.54 (£164.04 + £7.50 airport fee = £171.54)
- **Long Distance Journey (100 miles) in VIP Executive**:
  - VIP services use hourly rates, typically quoted separately

#### 9. Automated Location Detection

Our system includes intelligent location detection that automatically identifies when a journey involves airports or congestion charge zones, ensuring accurate pricing without requiring manual input.

- **Airport Detection**: Geofenced boundaries around major airports automatically apply appropriate fees
- **Congestion Zone Detection**: Routes passing through London's Congestion Charge Zone automatically include the fee
- **Dartford Crossing Detection**: Routes including the Dartford Crossing automatically include the fee

#### 10. Response Notifications

The API response includes notifications about any automatically detected fees, such as:

```json
"notifications": [
  "Your journey is during peak hours (Weekday). A £3.54 peak time charge has been added.",
  "Your destination is Heathrow Airport. A £6.00 airport dropoff fee has been added.",
  "Your route passes through the Congestion Charge Zone. A £7.50 charge has been added."
]
```

### Understanding Fare Notifications

The notification messages are a key element of the enhanced fare calculation response. These human-readable messages explain any special conditions or additional charges applied to the journey fare. The frontend should prominently display these notifications to provide transparency about pricing.

#### Types of Notifications

1. **Time-based Notifications**

   - Peak hour charges: `"Your journey is during peak hours (Weekday). A £3.54 peak time charge has been added."`
   - Weekend pricing: `"Your journey is during weekend hours. A £3.00 weekend surcharge has been added."`

2. **Special Zone Notifications**

   - Congestion charges: `"Your route passes through the Congestion Charge Zone. A £7.50 charge has been added."`
   - Alternate message when outside charging hours: `"Your route passes through CCZ but outside charging hours - no fee applied."`
   - Dartford Crossing: `"Your journey includes the Dartford Crossing. A £4.00 charge has been added."`

3. **Airport Fee Notifications**

   - Airport pickup: `"Your journey includes airport pickup at Heathrow. A £7.50 fee has been added."`
   - Airport dropoff: `"Your journey includes airport dropoff at Gatwick. A £6.00 fee has been added."`

4. **Other Special Circumstances**
   - Additional stops: `"Your journey includes 2 additional stops. A fee of £5.00 has been added."`

#### Implementation Guidance

The frontend should:

- Display these notifications prominently in the fare quote section
- Use appropriate styling to make them noticeable (e.g., info boxes with distinctive icons)
- Allow users to expand/collapse detailed fare breakdowns
- Consider grouping notifications by type for journeys with multiple special conditions

These notifications help users understand why certain journeys may cost more than others and reduce customer service inquiries about fare calculations.

#### 11. Security Note on Fare Verification

For security reasons, when a booking is created, the backend always recalculates the fare from scratch based on the provided journey details, regardless of any fare values shown to the user previously. This prevents potential fare manipulation and ensures pricing integrity. The booking process:

1. Accepts journey details (locations, time, vehicle type) from the client
2. Performs server-side validation of all inputs
3. Recalculates the fare using the server-side algorithm
4. Creates the booking with the verified fare
5. Returns a detailed breakdown of the fare calculation

The client application should never send fare values to the booking endpoints, as these will be ignored by the server.

For more detailed information about fare calculation, including day-trip rates, holiday surcharges, and additional services, please refer to the dedicated fare calculation documentation (`fare-calculation-documentation.md`).
