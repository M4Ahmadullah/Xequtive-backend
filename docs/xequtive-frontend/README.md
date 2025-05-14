# Xequtive Frontend API Documentation

This directory contains the documentation for the Xequtive API endpoints to be used by the frontend application.

## Documentation Files

1. **API_DOCUMENTATION.md** - Core API documentation covering:

   - Base endpoints
   - Authentication
   - Fare estimation
   - General API conventions

2. **API_DOCUMENTATION_2.md** - Booking creation documentation:

   - Booking creation process
   - Request and response formats
   - Security features

3. **API_DOCUMENTATION_3.md** - User booking management:

   - Booking status flow
   - Retrieving user bookings
   - Filtering bookings by status
   - Cancelling bookings
   - Frontend implementation examples

4. **fare-calculation-documentation.md** - Detailed information on fare calculation:
   - Base fare structures
   - Distance and time calculations
   - Time-based multipliers
   - Special case handling
   - Examples with distance in miles

## Using the API

The API uses a consistent response format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data specific to each endpoint
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

## Authentication & Security

**IMPORTANT**: All protected endpoints require a valid Firebase authentication token in the request header:

```
Authorization: Bearer <firebase-id-token>
```

### Authentication Process

1. **Sign Up**: Register a new user with `/api/auth/signup`
2. **Sign In**: Authenticate with `/api/auth/signin` to receive a JWT token
3. **Authorization**: Include the token in all API requests
4. **Sign Out**: End the session with `/api/auth/signout`

### Rate Limiting

The API implements several rate limiting tiers to prevent abuse:

1. **General API Rate Limit**: 100 requests per 15 minutes per IP
2. **Authentication Endpoints**: 10 requests per hour per IP
3. **Booking Creation**: 5 booking requests per hour per IP

When a rate limit is exceeded, the API will return a 429 status code with details about the limit.
Frontend applications should handle these errors gracefully.

### Security Best Practices

1. **Token Storage**:

   - NEVER store authentication tokens in localStorage or cookies without proper security measures
   - Use memory storage or secure storage solutions for tokens
   - Implement token refresh mechanisms to handle token expiration (tokens are valid for 5 days/432000 seconds)

2. **Sensitive Data**:

   - Avoid storing sensitive booking information client-side
   - Always validate data on the server side
   - Use HTTPS for all API requests

3. **Error Handling**:

   - Implement proper error handling for authentication failures
   - Provide clear feedback to users when authentication issues occur
   - Automatically redirect to login when unauthorized responses are received

4. **Access Control**:

   - Users can only access their own bookings
   - Admin-specific endpoints are protected with additional middleware
   - All booking operations validate the requesting user's permissions

## API Base URL

For development:

```
http://localhost:5555/api
```

For production, this will be your deployed API domain.

## Need Help?

If you need help or find issues with the API, please contact the backend development team through the appropriate channels.

## Recent Updates

All distances in the API are now measured in miles instead of kilometers. The key changes include:

1. All API responses use `distance_miles` instead of `distance_km`
2. All duration values use `duration_minutes` instead of `duration_min`
3. All vehicle rates are now quoted in per-mile rates
4. All fare calculations use miles as the base unit of distance

Please ensure your frontend application is updated to reflect these changes.

# Xequtive Backend

Backend services for Xequtive, a luxury transport provider.

## Features

- User authentication and account management
- Fare calculation based on routes, vehicle types, and special conditions
- Booking management
- Service area restrictions

## Service Area Restrictions

Xequtive services are restricted to specific areas within the United Kingdom:

- All locations must be within UK boundaries
- Some remote areas are excluded (e.g., Northern Scottish Highlands, Outer Hebrides)
- Only specific islands are serviced (Isle of Wight, Anglesey)
- Maximum journey distance is 300 miles

The API will validate that all pickup and dropoff locations are within the service area and return appropriate error messages for locations outside our service boundaries.

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables in `.env` file (see `.env.example`)
4. Run the development server with `npm run dev`

## API Documentation

For detailed API documentation, refer to the [API Documentation](API_DOCUMENTATION.md) file.

## Contributing

Please follow our coding standards and submit a pull request for any changes.

## License

This project is proprietary and confidential.
