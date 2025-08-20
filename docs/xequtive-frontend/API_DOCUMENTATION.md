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
- **Firebase Authentication**: Secure user authentication using Google Firebase
- **Mapbox Directions Integration**: Precise distance and traffic calculations using Mapbox Directions API (replacing Google Distance Matrix)
- **🆕 Wait & Return Feature**: Choose between "wait-and-return" (no return date needed) or "later-date" return bookings

## 🆕 New Return Booking Types

We've introduced a new **Wait & Return** feature for both Enhanced and Hourly booking systems:

### Return Type Options:
1. **Wait & Return** (`returnType: "wait-and-return"`)
   - Driver waits at destination and returns
   - **No return date required**
   - Same pricing as regular return bookings

2. **Later Date** (`returnType: "later-date"`)
   - Scheduled return on different date/time
   - **Return date and time required**
   - Two separate journeys calculated

### Usage:
```json
{
  "bookingType": "return",
  "returnType": "wait-and-return",  // NEW FIELD
  "returnDate": "2025-01-20",       // Optional for wait-and-return
  "returnTime": "18:00"             // Optional for wait-and-return
}
```

📖 **See full documentation**: [Wait & Return Feature Guide](./WAIT_AND_RETURN_FEATURE.md)

## 🆕 Smart Reverse Route for Return Bookings

**Return bookings now use an intelligent routing system:**

- **Outbound Journey**: Calculated with pickup → stops → dropoff
- **Return Journey**: Automatically reverses the outbound route (dropoff → stops in reverse → pickup)
- **No Manual Stops Required**: The system intelligently handles the return route
- **Consistent Pricing**: Return journey uses the same distance calculation as outbound
- **10% Discount**: Applied to the total round-trip fare

**Example**: If your outbound journey is A → B → C → D, your return will be D → C → B → A automatically.

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

### Executive Cars System (Hourly/Event Bookings)

Xequtive offers a separate "Executive Cars" system for event and group transportation services, distinct from the standard "Executive Taxi" point-to-point service.

**Key Features:**
- **Hourly Bookings**: 3-12 hours of service with tiered pricing
- **One-Way Bookings**: Point-to-point journeys with Executive Cars pricing
- **Return Bookings**: Round-trip journeys with 10% discount
- **Event & Group Transportation**: Specialized for corporate events, weddings, tours
- **Multiple Vehicle Support**: Book multiple vehicles for large groups

**Booking Types:**
1. **One-Way**: Standard point-to-point journey
2. **Hourly**: 3-12 hours of continuous service (driver stays with you)
3. **Return**: Round-trip with wait-and-return or later-date options

**Tiered Hourly Pricing:**
- **3-6 Hours**: Higher hourly rates for shorter durations
- **6-12 Hours**: Lower hourly rates for longer durations

### Enhanced Fare Estimation (Executive Taxi)

The enhanced fare estimation endpoint calculates fares for all available vehicle types, taking into account:

- Distance and duration using Mapbox Directions API for accurate routing (replacing Google Distance Matrix)
- Slab-based pricing system for different distance ranges
- Minimum fare requirements per vehicle type
- Time-based pricing (peak hours, weekends)
- Special zones (airports, congestion charge)
- Additional services (child seats, luggage)
- **NEW**: Support for one-way, hourly (3-12 hours), and return bookings

**Important**: Our fare calculation system uses Mapbox Directions API for precise distance and duration calculations (replacing Google Distance Matrix). Fares are calculated using:
1. **Distance-based charges** using a slab pricing system (different rates for different distance ranges)
2. **Minimum fare enforcement** to ensure fair pricing for short journeys
3. **Additional fees** for airports, special zones, and extra services
4. **Time-based surcharges** for peak hours and weekends
5. **NEW**: Hourly rates for hourly bookings and return discounts for return journeys

The minimum fare acts as a floor price - if the distance-based calculation plus additional fees is less than the minimum fare, the minimum fare is applied instead.

**NEW: Enhanced Taxi now supports three booking types:**

1. **One-Way** (default): Standard point-to-point journey with distance-based pricing
2. **Hourly**: 3-12 hours of continuous service with tiered hourly rates  
3. **Return**: Round-trip journeys with 10% discount applied (no stops allowed - uses smart reverse route)

**⚠️ IMPORTANT: Reference Number Structure**

- **Business Reference**: All new bookings now generate sequential reference numbers in `XEQ_XXX` format (e.g., `XEQ_100`, `XEQ_101`, `XEQ_102`)
- **Firebase ID**: The system also generates a Firebase document ID (e.g., `ADzZOJTM5MOfquSOrQQb`) for internal use
- **Frontend Usage**: Always use the `referenceNumber` field for user display and customer service, NOT the Firebase ID
- **API Calls**: Use the `bookingId` (Firebase ID) for subsequent API operations like updates and cancellations

**Frontend Implementation Guide:**
```javascript
// ✅ CORRECT: Extract reference number for user display
const userReference = response.data.details.referenceNumber; // "XEQ_105"

// ✅ CORRECT: Extract Firebase ID for API calls
const apiCallId = response.data.bookingId; // "ADzZOJTM5MOfquSOrQQb"

// ❌ WRONG: Never show Firebase ID to users
const wrongReference = response.data.bookingId; // "ADzZOJTM5MOfquSOrQQb"
```

**Important Validation Rules:**
- **Hourly bookings**: No dropoff location required, driver stays with you
- **Return bookings**: Cannot include stops array - uses smart reverse route
- **One-way bookings**: Full stops support maintained

**Note:** The backend now properly handles hourly bookings without requiring a dropoff location. The fare calculation service automatically recognizes hourly bookings and adjusts validation accordingly.

**Endpoint**: `POST /api/fare-estimate/enhanced`

**Authentication**: Required (Bearer token or cookie)

**Request Format**:

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
    "stops": [] // Optional array of stop addresses
  },
  "datetime": {
    "date": "2024-04-20", // Format: YYYY-MM-DD
    "time": "14:00" // Format: HH:mm (24-hour)
  },
  "passengers": {
    "count": 2, // Required: Min: 1, Max: 16
    "checkedLuggage": 1, // Required: Min: 0, Max: 8
    "handLuggage": 1, // Required: Min: 0, Max: 8
    "mediumLuggage": 2, // Required: Min: 0, Max: 8
    "babySeat": 1, // Required: Min: 0, Max: 5
    "boosterSeat": 1, // Required: Min: 0, Max: 5
    "childSeat": 0, // Required: Min: 0, Max: 5
    "wheelchair": 0 // Required: Min: 0, Max: 2
  },
  "bookingType": "one-way", // NEW: "one-way" | "hourly" | "return" (default: "one-way")
  "hours": 6, // NEW: Required for hourly bookings, Min: 3, Max: 12
  "returnType": "wait-and-return", // NEW: Required for return bookings, "wait-and-return" | "later-date"
  "returnDate": "2024-04-20", // NEW: Required for later-date returns, Format: YYYY-MM-DD
  "returnTime": "18:00" // NEW: Required for later-date returns, Format: HH:mm
}
```

**NEW: Booking Type Details**

1. **One-Way Bookings** (`bookingType: "one-way"`):
   - Standard distance-based pricing
   - Stops are allowed and supported
   - No additional fields required
   - Default behavior if no bookingType specified

2. **Hourly Bookings** (`bookingType: "hourly"`):
   - Requires `hours` field (3-12 hours)
   - **No dropoff location required** - driver stays with you
   - Uses tiered hourly rates:
     - **3-6 hours**: Higher hourly rates
     - **6-12 hours**: Lower hourly rates
   - Distance-based pricing is replaced with hourly pricing
   - Same hourly rates as Executive Cars system

3. **Return Bookings** (`bookingType: "return"`):
   - Requires `returnType` field
   - **Wait-and-Return**: Driver waits at destination and returns you later
   - **Later-Date**: Two separate scheduled one-way journeys
   - **10% discount** applied to total fare
   - **No stops allowed** - uses smart reverse route for return journey
   - **Smart Reverse Route**: Return journey automatically reverses the outbound route with any stops
   - For later-date returns, requires `returnDate` and `returnTime`

**Validation Rules**:

1. **Locations**:

   - Pickup and dropoff locations are required
   - Each location must have both address (string) and coordinates (lat/lng)
   - Latitude must be between -90 and 90
   - Longitude must be between -180 and 180
   - Stops array is optional

2. **Datetime**:

   - Both date and time are required
   - Date must be in YYYY-MM-DD format
   - Time must be in HH:mm format (24-hour)

3. **Passengers**:
   - All passenger fields are required
   - `count`: Integer between 1 and 16
   - `checkedLuggage`, `handLuggage`, `mediumLuggage`: Integer between 0 and 8
   - `babySeat`, `boosterSeat`, `childSeat`: Integer between 0 and 5
   - `wheelchair`: Integer between 0 and 2

4. **NEW: Booking Type Validation**:
   - `bookingType`: Must be "one-way", "hourly", or "return"
   - `hours`: Required for hourly bookings, integer between 3 and 12
   - `returnType`: Required for return bookings, must be "wait-and-return" or "later-date"
   - `returnDate` and `returnTime`: Required for later-date returns, must be valid date/time formats
   - **Return bookings cannot have stops** - validation will reject return bookings with stops array

**Error Response Format**:

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
        ],
        "datetime": [
          {
            "field": "datetime.date",
            "message": "Invalid date format",
            "expected": "YYYY-MM-DD",
            "received": "2024/04/20",
            "suggestion": "Date must be in YYYY-MM-DD format"
          }
        ],
        "passengers": [
          {
            "field": "passengers.count",
            "message": "Number must be greater than or equal to 1",
            "expected": "number >= 1",
            "received": 0,
            "suggestion": "Minimum value is 1"
          }
        ]
      }
    }
  }
}
```

**Response Format**:

```json
{
  "success": true,
  "data": {
    "fare": {
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
            "amount": 85.5,
            "currency": "GBP",
            "messages": [
              "Airport pickup fee: £15.00",
              "Baby seat fee: £10.00",
              "Booster seat fee: £10.00"
            ],
            "breakdown": {
              "distanceCharge": 40.5,
              "minimumFare": 16.40,
              "additionalStopFee": 0,
              "timeSurcharge": 3.54,
              "airportFee": 15.0,
              "specialZoneFees": 0,
              "additionalRequestFees": [
                { "name": "Baby Seat", "amount": 10.0 },
                { "name": "Booster Seat", "amount": 10.0 }
              ]
            }
          },
          "eta": 10,
          "imageUrl": "/images/vehicles/standard-saloon.jpg"
        }
        // ... other vehicle options
      ]
    }
  }
}
```

**Note**: This is a fare estimation response. When creating actual bookings, the response will include both `referenceNumber` (for user display) and `bookingId` (for API calls).

**Error Response**:

```json
{
  "success": false,
  "error": {
    "message": "Validation error",
    "code": "VALIDATION_ERROR",
    "details": "locations.pickup.address: Pickup address is required"
  }
}
```

### Additional Charges

1. **Luggage**:

   - Hand Luggage: No additional charge
   - Medium Luggage: Every 2 medium bags = 1 large bag at £10.00
   - Checked Luggage: Standard rates apply

2. **Child Safety Equipment**:

   - Baby Seat (0-18 Months): £10.00 each
   - Child Seat (18 Months - 4 Years): £10.00 each
   - Booster Seat (4-6 Years): £10.00 each

3. **Accessibility Equipment**:

   - Foldable Wheelchair: £25.00 each

4. **Special Locations**:

   - Airport Pickup/Dropoff: Varies by airport
   - Congestion Zone: £15.00 (Mon-Fri, 7am-6pm)
   - Dartford Crossing: £2.50

5. **Time-Based Charges**:
   The system automatically applies time-based surcharges based on the time of day and whether it's a weekday or weekend:

#### **Weekday Surcharges (Monday-Thursday)**

**NON-PEAK (12:00 AM - 5:59 AM):**
- **All Vehicle Types**: No surcharge

**PEAK-MEDIUM (6:00 AM - 2:59 PM):**
- **Saloon**: £3.00
- **Estate**: £3.00
- **MPV-6**: £3.00
- **MPV-8**: £3.00
- **Executive Saloon**: £5.00
- **Executive MPV**: £5.00
- **VIP-Saloon**: £7.00
- **VIP-SUV**: £7.00

**PEAK-HIGH (3:00 PM - 11:59 PM):**
- **Saloon**: £3.00
- **Estate**: £3.00
- **MPV-6**: £5.00
- **MPV-8**: £5.00
- **Executive Saloon**: £7.00
- **Executive MPV**: £7.00
- **VIP-Saloon**: £9.00
- **VIP-SUV**: £9.00

#### **Weekend Surcharges (Friday-Sunday)**

**NON-PEAK (12:00 AM - 5:59 AM):**
- **All Vehicle Types**: No surcharge

**PEAK-MEDIUM (6:00 AM - 2:59 PM):**
- **All Vehicle Types**: No surcharge

**PEAK-HIGH (3:00 PM - 11:59 PM):**
- **Saloon**: £3.00
- **Estate**: £3.00
- **MPV-6**: £3.00
- **MPV-8**: £3.00
- **Executive Saloon**: £7.00
- **Executive MPV**: £5.00
- **VIP-Saloon**: £5.00
- **VIP-SUV**: £7.00

Note: Time-based surcharges are automatically calculated and included in the final fare with clear breakdown messages.

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
| `INVALID_LOCATION`         | Indicates that Mapbox couldn't find a route between the locations (replacing Google Directions) |

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
    phoneNumber: "+447123456789",
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
    phoneNumber: "+447123456789",
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
    "phoneNumber": "+447123456789",
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
