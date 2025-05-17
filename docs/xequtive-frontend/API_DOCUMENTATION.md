# Xequtive API Documentation

## Introduction

Xequtive is a premium taxi booking platform designed for executive and luxury transportation services. This backend API powers the Xequtive frontend website, enabling users to:

- Calculate accurate fare estimates based on distance, traffic, and vehicle type
- Book premium transportation services with various vehicle options
- Track booking status and history

The platform focuses on providing a seamless, high-end transportation experience with transparent pricing and premium vehicle options ranging from standard saloons to luxury vehicles. Mobile application support is planned for future development.

### Key Features

- **Advanced Fare Calculation**: Real-time fare estimates considering distance, traffic conditions, time of day, and vehicle type
- **Multiple Vehicle Classes**: Standard Saloon, Executive Saloon, Executive MPV, and Luxury Vehicle options
- **Additional Stops**: Support for multi-stop journeys with accurate fare adjustments
- **Firebase Authentication**: Secure user authentication
- **Mapbox Integration**: Precise distance and traffic calculations

## API Security

All sensitive endpoints in this API are protected with authentication to ensure that only authorized users can access the data and services. The API employs several security measures:

### Authentication Middleware

- **Cookie-Based Authentication**: All protected endpoints use secure HTTP-only cookies for authentication
- **Token Verification**: Tokens stored in cookies are verified using Firebase verification
- **Fallback Bearer Authentication**: For compatibility, the API also accepts Bearer tokens in the Authorization header

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
   - Authentication tokens are set as secure HTTP-only cookies
   - Subsequent requests automatically include the cookie

3. **Cookie Security**:
   - Tokens are stored in secure, HttpOnly cookies that can't be accessed by JavaScript
   - Cookies use SameSite=Strict to prevent CSRF attacks
   - Frontend doesn't need to manually store or send tokens
   - Cookies are automatically cleared on logout
   - Cookies expire after 5 days for all signed-in users

### Protected Resources

The following resources require authentication:

- **Fare Estimation**: Protected to ensure only authenticated users can get fare estimates
- **Bookings**: All booking operations require authentication
- **Detailed Health Status**: Only authenticated users can view detailed system health information

## Base URL

```
http://localhost:5555/api
```

For production, this will change to your deployed domain.

## Cookie Management

The API uses secure HTTP-only cookies for authentication. When a user signs in or signs up, they receive a cookie that is automatically included in subsequent requests.

### Cookie Format

The authentication cookie:

- Is named `token`
- Has the HttpOnly flag set (cannot be accessed by JavaScript)
- Has the Secure flag set in production environments (only sent over HTTPS)
- Has SameSite=Strict to prevent CSRF attacks
- Contains a Firebase authentication token

### Cookie Expiration

Authentication cookies expire after 5 days (432000 seconds). The frontend doesn't need to handle cookie expiration explicitly, as the browser manages this automatically. However, it should:

1. Call the `/auth/me` endpoint on initial page load to check authentication status
2. Handle 401 responses by redirecting to the login page when needed
3. Use the `/auth/signout` endpoint to properly clear cookies on logout

### CORS and Cookies

For the cookies to work properly in cross-origin scenarios:

1. The frontend must include credentials in requests:

   ```javascript
   fetch("/api/auth/me", {
     credentials: "include", // This is crucial for cookies to be sent
   });
   ```

2. The backend has been configured to:
   - Set `Access-Control-Allow-Credentials: true`
   - Specify exact domains in `Access-Control-Allow-Origin` (not wildcards)
   - Include `Set-Cookie` in `Access-Control-Expose-Headers`

### Example Authentication Implementation

```javascript
// Example React code using cookies for authentication

// Login function
async function login(email, password) {
  try {
    const response = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Login failed");
    }

    // No need to store tokens, they're in the cookie
    return data.data; // Return user data
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include", // Important for cookies
    });

    if (!response.ok) {
      return null; // Not authenticated
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Auth check error:", error);
    return null;
  }
}

// Logout function
async function logout() {
  try {
    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "include", // Important for cookies
    });

    // Cookie is automatically cleared by the server
    // Navigate to login page or update UI
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}
```

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
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/fare-estimate/enhanced`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // This is crucial for cookies to be sent
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

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          // Redirect to login page
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to calculate fare");
      }

      const data = await response.json();
      // Handle the response
    } catch (error) {
      console.error("Error calculating fare:", error);
    }
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

## Service Area Restrictions

Xequtive currently only services locations within the United Kingdom, with some additional geographical restrictions:

### UK Service Boundaries

All pickup and dropoff locations must be within the following boundaries:

- Southwest corner: 49.9° N, 8.65° W
- Northeast corner: 58.7° N, 1.76° E

These boundaries encompass mainland United Kingdom, including England, Wales, and most of Scotland.

### Excluded Areas

The following areas are not serviced:

1. **Northern Scottish Highlands** - Remote areas of northern Scotland are outside our service area.
2. **Outer Hebrides** - These islands are not currently serviced.
3. **Orkney Islands** - These islands are not currently serviced.
4. **Shetland Islands** - These islands are not currently serviced.

### Serviced Islands

The following islands are included in our service area:

1. **Isle of Wight**
2. **Anglesey**

### Maximum Journey Distance

There is a maximum journey distance of 300 miles. Fare calculations for journeys exceeding this distance will return an error.

### API Validation

The API will reject requests with locations outside these service areas with appropriate error messages:

```json
{
  "success": false,
  "error": {
    "code": "LOCATION_NOT_SERVICEABLE",
    "message": "Failed to calculate fare estimate",
    "details": "Pickup location: We currently only service locations within the United Kingdom."
  }
}
```

#### Error Codes

The API may return the following error codes related to service area restrictions:

| Error Code                 | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `LOCATION_NOT_SERVICEABLE` | Indicates that one or more locations are outside our service area |
| `INVALID_LOCATION`         | Indicates that Mapbox couldn't find a route between the locations |

#### Examples of Error Responses

**Outside UK Boundaries:**

```json
{
  "success": false,
  "error": {
    "code": "LOCATION_NOT_SERVICEABLE",
    "message": "Failed to calculate fare estimate",
    "details": "Pickup location: We currently only service locations within the United Kingdom."
  }
}
```

**In Excluded Area:**

```json
{
  "success": false,
  "error": {
    "code": "LOCATION_NOT_SERVICEABLE",
    "message": "Failed to calculate fare estimate",
    "details": "Dropoff location: We don't currently service the Outer Hebrides islands."
  }
}
```

**Journey Too Long:**

```json
{
  "success": false,
  "error": {
    "code": "LOCATION_NOT_SERVICEABLE",
    "message": "Failed to calculate fare estimate",
    "details": "We don't currently support journeys longer than 300 miles. Your journey is approximately 325 miles."
  }
}
```

### Frontend Implementation

It is recommended that frontend implementations:

1. Restrict map selection to within UK boundaries
2. Display excluded areas on the map (when applicable)
3. Show appropriate error messages when users attempt to select non-serviceable locations

Refer to the service area configuration (`src/config/serviceArea.ts`) for the exact boundaries and implementation details.

## Authentication

### Authentication Endpoints

Below is a reference table of all authentication endpoints available in the API:

| Endpoint                 | Method | Description                               | Sets Cookie   | Requires Auth |
| ------------------------ | ------ | ----------------------------------------- | ------------- | ------------- |
| `/auth/signup`           | POST   | Create a new user account                 | Yes           | No            |
| `/auth/signin`           | POST   | Authenticate a user with email/password   | Yes           | No            |
| `/auth/google`           | POST   | Authenticate a user with Google OAuth     | Yes           | No            |
| `/auth/complete-profile` | POST   | Complete profile after OAuth sign-in      | No            | Yes           |
| `/auth/signout`          | POST   | Log out the current user                  | Clears cookie | No            |
| `/auth/me`               | GET    | Get the current user's profile            | No            | Yes           |
| `/auth/verify-session`   | GET    | Verify the current authentication session | No            | Yes           |

### Authentication Methods

#### 1. Email/Password Authentication

Regular email and password authentication is used when users sign up directly through the Xequtive platform.

```javascript
// Example sign-up request
const response = await fetch("/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    email: "user@example.com",
    password: "securepassword123",
    fullName: "John Doe",
    phone: "+447123456789",
  }),
});

// Example sign-in request
const response = await fetch("/api/auth/signin", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    email: "user@example.com",
    password: "securepassword123",
  }),
});
```

#### 2. Google OAuth Authentication

Google OAuth authentication is a two-step process:

1. Authenticate with Google and send the ID token to the server
2. Complete the user profile with a phone number if needed (required for booking)

**Step 1: Google Authentication**

```javascript
// First, authenticate with Google using Firebase client SDK
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const auth = getAuth();
const provider = new GoogleAuthProvider();

// Trigger Google sign-in
const result = await signInWithPopup(auth, provider);
// Get the ID token
const idToken = await result.user.getIdToken();

// Send the ID token to your backend
const response = await fetch("/api/auth/google", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ idToken }),
});

const data = await response.json();

// Check if profile needs to be completed
if (data.success && !data.data.profileComplete) {
  // Redirect user to profile completion form
  redirectToProfileCompletion();
}
```

**Step 2: Complete Profile (if needed)**

If the user's profile is incomplete (missing phone number), they need to complete it:

```javascript
// After user fills in the form with their phone number
const response = await fetch("/api/auth/complete-profile", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    fullName: "John Doe",
    phone: "+447123456789",
  }),
});

const data = await response.json();
if (data.success) {
  // Profile completed successfully
  redirectToDashboard();
}
```

### Authentication Response

All authentication endpoints return the same structure on success:

```json
{
  "success": true,
  "data": {
    "uid": "user123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "phone": "+447123456789",
    "role": "user",
    "profileComplete": true,
    "authProvider": "google"
  }
}
```

The `profileComplete` field indicates whether the user's profile has all required information. For Google OAuth users, this will be `false` until they provide their phone number.

The `authProvider` field indicates which authentication method the user used to sign in:

- `"email"` - Email/password authentication
- `"google"` - Google OAuth

### Authentication Flow

The typical authentication flow for the Xequtive frontend works as follows:

1. **User Registration/Login**:

   - Option A: Call `/auth/signup` with user details to create a new account
   - Option B: Call `/auth/signin` with email/password to authenticate
   - Option C: Use Google OAuth and call `/auth/google` with the ID token

2. **Profile Completion**:

   - For Google OAuth users with incomplete profiles, call `/auth/complete-profile`

3. **Auth Check**:

   - On app initialization, call `/auth/me` to check if the user is already authenticated

4. **Protected Routes**:

   - For routes requiring authentication, verify auth status before rendering

5. **Logout**:
   - Call `/auth/signout` to end the user's session

All authentication endpoints use cookie-based authentication where the authentication token is securely stored in an HTTP-only cookie that is automatically included in subsequent requests when using `credentials: 'include'` in fetch requests.
