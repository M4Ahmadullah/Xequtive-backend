# Xequtive User Booking Management API

This document outlines the Xequtive API endpoints for managing user bookings, including retrieval, filtering, cancellation, and understanding the booking status flow.

## API Security Requirements

All endpoints in this document are protected and require authentication. The API uses Firebase Authentication and secure cookies to ensure that:

1. Only authenticated users can access booking data
2. Users can only access their own bookings
3. Booking operations are secure and properly validated

### Authentication

To make authenticated requests, the API uses secure HTTP-only cookies:

- The `token` cookie is automatically set upon successful login/signup
- All requests to protected endpoints must include this cookie
- Use the `credentials: 'include'` option in fetch/axios requests to include cookies

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
const response = await fetch("http://localhost:5555/api/auth/signup", {
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
const response = await fetch("http://localhost:5555/api/auth/signin", {
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
const response = await fetch("http://localhost:5555/api/auth/google", {
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
const response = await fetch(
  "http://localhost:5555/api/auth/complete-profile",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      fullName: "John Doe",
      phone: "+447123456789",
    }),
  }
);

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

### Rate Limiting

The API implements rate limiting to prevent abuse:

1. **General API Rate Limit**: 100 requests per 15 minutes per IP address
2. **Authentication Endpoints**: 10 requests per hour per IP address
3. **Booking Creation**: 5 booking creation requests per hour per IP address

If rate limits are exceeded, the API will respond with a 429 Too Many Requests error:

```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later.",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": "You have exceeded the rate limit for API requests."
  }
}
```

Frontend applications should handle these errors gracefully by displaying appropriate messages to users.

## Booking Status Flow

Bookings go through the following status transitions:

1. **pending** - Initial status when a booking is created
2. **confirmed** - When the system confirms the booking
3. **assigned** - When a driver is assigned to the booking
4. **in_progress** - When the journey is in progress
5. **completed** - When the journey is completed

Alternative paths:

- **cancelled** - If user cancels the booking before it starts
- **no_show** - If user does not show up for the booking

The complete status flow is:

```
pending -> confirmed -> assigned -> in_progress -> completed
      |        |          |
      |        |          └-> no_show
      |        |
      └-> cancelled
```

## Retrieving User Bookings

### Get All User Bookings

Retrieves all bookings for the authenticated user, sorted by creation date (newest first).

- **URL:** `/api/bookings/user`
- **Method:** `GET`
- **Auth Required:** Yes
- **Description:** Gets all bookings for the authenticated user. Results are limited to the 100 most recent bookings.
- **Query Parameters:**
  - `status` (optional): Filter by booking status. Multiple statuses can be comma-separated (e.g., `status=confirmed,assigned,in_progress`).

#### Success Response

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
          "distance_miles": 64.8,
          "duration_minutes": 85
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
        "status": "cancelled",
        "journey": {
          "distance_miles": 27.4,
          "duration_minutes": 39
        },
        "createdAt": "2025-05-10T02:16:49.031Z"
      }
    ]
  }
  ```

#### Error Response

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

### Filtering Bookings by Status

You can filter bookings by status to retrieve only bookings with specific statuses:

**Example Request:**

```bash
GET /api/bookings/user?status=pending
```

This will return only pending bookings. You can request multiple statuses by comma-separating them:

```bash
GET /api/bookings/user?status=pending,confirmed,in_progress
```

Common status groupings:

1. **Active Bookings**: Use `status=pending,confirmed,assigned,in_progress` to get only upcoming and in-progress bookings
2. **Historical Bookings**: Use `status=completed,cancelled,no_show` to get only past bookings

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

## Cancelling a Booking

Users can cancel bookings that are in the pending, confirmed, or assigned status.

- **URL:** `/api/bookings/:id/cancel`
- **Method:** `POST`
- **Auth Required:** Yes
- **URL Parameters:**
  - `id`: The ID of the booking to cancel
- **Request Body:**

  ```json
  {
    "cancellationReason": "Change of plans"
  }
  ```

  The `cancellationReason` field is optional.

### Success Response

- **Code:** 200 OK
- **Content:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Booking cancelled successfully",
      "id": "pXaEDFEAjiZQ9KQCenu0",
      "status": "cancelled"
    }
  }
  ```

### Error Responses

- **Code:** 400 Bad Request
- **Content:** Returned when booking cannot be cancelled
  ```json
  {
    "success": false,
    "error": {
      "code": "CANNOT_CANCEL",
      "message": "Cannot cancel a booking with status: in_progress",
      "details": "Only bookings in pending, confirmed, or assigned status can be cancelled"
    }
  }
  ```

OR

- **Code:** 400 Bad Request
- **Content:** Returned when booking is already cancelled
  ```json
  {
    "success": false,
    "error": {
      "code": "ALREADY_CANCELLED",
      "message": "This booking has already been cancelled"
    }
  }
  ```

OR

- **Code:** 404 Not Found
- **Content:** Returned when booking does not exist
  ```json
  {
    "success": false,
    "error": {
      "message": "Booking not found"
    }
  }
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

## Displaying Booking Status to Users

When displaying a booking to users, use the following guidelines for showing the status:

| Status      | Display Text | Color  | Description                              |
| ----------- | ------------ | ------ | ---------------------------------------- |
| pending     | Pending      | Yellow | Booking is awaiting system confirmation  |
| confirmed   | Confirmed    | Green  | Booking has been confirmed by the system |
| assigned    | Assigned     | Blue   | Driver has been assigned to the booking  |
| in_progress | In Progress  | Blue   | Journey is currently in progress         |
| completed   | Completed    | Green  | Journey has been completed               |
| cancelled   | Cancelled    | Red    | Booking was cancelled by the user        |
| no_show     | No Show      | Red    | Customer did not show up for the booking |

**Example: Rendering Booking Status**

```jsx
const getStatusColor = (status) => {
  switch (status) {
    case "pending":
      return "yellow";
    case "confirmed":
    case "completed":
      return "green";
    case "assigned":
    case "in_progress":
      return "blue";
    case "cancelled":
    case "no_show":
      return "red";
    default:
      return "gray";
  }
};

const BookingStatusBadge = ({ status }) => {
  const displayText =
    {
      pending: "Pending",
      confirmed: "Confirmed",
      assigned: "Assigned",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
      no_show: "No Show",
    }[status] || status;

  const color = getStatusColor(status);

  return <div className={`status-badge ${color}`}>{displayText}</div>;
};
```

## Implementation Notes

1. Bookings start in the "pending" status and progress through the status flow as the system updates them
2. Users can only cancel bookings before they go into "in_progress" status
3. The frontend should refresh booking data regularly for bookings in active statuses to show updates
4. Status filters should be used to create views like "Upcoming Journeys" and "Past Journeys"
5. The booking response includes all necessary details for displaying in the user interface, including pick-up and drop-off locations, vehicle type, price, and journey details
