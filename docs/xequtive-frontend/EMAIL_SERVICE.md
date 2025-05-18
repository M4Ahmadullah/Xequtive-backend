# Email Service Documentation

## Overview

Xequtive uses [Resend](https://resend.com) for sending transactional emails. The email sending functionality is fully implemented in the backend, and the frontend only needs to make API calls that trigger email sending when appropriate.

## Configuration Status

The email service is **fully configured in the backend** and ready to use. The backend handles:

- API key management via environment variables
- Email template rendering
- Sending logic and retries
- Error handling and logging

All configuration is done through environment variables in the `.env` file. These are **required**:

```
# Email Service Configuration
RESEND_API_KEY=your_resend_api_key
EMAIL_SENDER_ADDRESS="Xequtive <onboarding@resend.dev>"

# Frontend URLs for Email Templates (REQUIRED)
FRONTEND_URL=http://localhost:3000
LOGO_URL=http://localhost:3000/logo.png
```

**Important**:

- The `FRONTEND_URL` and `LOGO_URL` environment variables are **required** and control where all email links point to and the logo image displayed in all email templates.
- The system is currently configured to use `"Xequtive <onboarding@resend.dev>"` as the sender email address, which is the free onboarding address provided by Resend that doesn't require domain verification.

There are no hardcoded URLs in the backend - everything is controlled through these environment variables.

## Email Authentication Flows

The application supports the following email-based authentication flows:

### 1. Email Verification Flow

This is a two-step process:

1. **Request Verification Email**: User enters email and name, backend validates and sends verification email
2. **Complete Signup**: User clicks link in email, completes registration with password

#### API Endpoints:

**Step 1: Request Email Verification**

```
POST /api/auth/verify-email
```

Request body:

```json
{
  "email": "user@example.com",
  "fullName": "User Name"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Verification email sent successfully",
    "email": "user@example.com"
  }
}
```

The email contains a link with format: `${FRONTEND_URL}/auth/signup?token=VERIFICATION_TOKEN&email=user@example.com`

**Step 2: Verify Token**

```
GET /api/auth/verify-token?token=VERIFICATION_TOKEN
```

Response:

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "fullName": "User Name"
  }
}
```

**Step 3: Complete Signup**

```
POST /api/auth/signup
```

Request body:

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "User Name",
  "phone": "1234567890" // Optional
}
```

### 2. Password Reset Flow

Also a two-step process:

1. **Request Password Reset**: User enters email, backend sends reset link
2. **Reset Password**: User clicks link and enters new password

#### API Endpoints:

**Step 1: Request Password Reset**

```
POST /api/auth/forgot-password
```

Request body:

```json
{
  "email": "user@example.com"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "If the email exists, a password reset link has been sent"
  }
}
```

The email contains a link with format: `${FRONTEND_URL}/reset-password?token=RESET_TOKEN`

**Step 2: Reset Password**

```
POST /api/auth/reset-password
```

Request body:

```json
{
  "token": "RESET_TOKEN",
  "password": "newSecurePassword"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

## How Emails Are Sent

Emails are sent automatically by the backend in response to various events:

1. **User Registration**: Welcome emails are sent when users complete registration
2. **Email Verification**: Verification emails sent when users start the signup process
3. **OAuth Sign-up**: Welcome emails are sent after OAuth sign-up is completed
4. **Profile Completion**: Confirmation emails when users complete their profile
5. **Password Management**: Emails for password reset requests and confirmations
6. **Booking Flow**: Confirmation and cancellation emails during the booking process

## Frontend Integration Points

Here are the key points where the frontend interacts with the backend that trigger emails.

**Important Note**: Always use environment variables in your frontend code for API URLs. Don't hardcode `localhost` or other domains. Configure your frontend `.env` file with:

```
REACT_APP_API_BASE_URL=http://localhost:5555/api
# or for production
# REACT_APP_API_BASE_URL=https://api.xequtive.com/api
```

Then in your API calls:

### User Authentication

- **Email Verification**: When a user begins signup, to verify their email

  ```typescript
  // This API call will trigger a verification email:
  const response = await axios.post(
    `${process.env.REACT_APP_API_BASE_URL}/auth/verify-email`,
    {
      email,
      fullName,
    }
  );
  ```

- **User Registration**: When a user completes signup with verified email, a welcome email is sent

  ```typescript
  // This API call will trigger a welcome email:
  const response = await axios.post(
    `${process.env.REACT_APP_API_BASE_URL}/auth/signup`,
    {
      email,
      password,
      fullName,
      phone,
    }
  );
  ```

- **Profile Completion**: After OAuth login when completing profile

  ```typescript
  // This API call will trigger a profile completion email:
  const response = await axios.post(
    `${process.env.REACT_APP_API_BASE_URL}/auth/complete-profile`,
    {
      fullName,
      phone,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  ```

- **Password Reset**: When requesting a password reset

  ```typescript
  // This API call will trigger a password reset email:
  const response = await axios.post(
    `${process.env.REACT_APP_API_BASE_URL}/auth/forgot-password`,
    {
      email,
    }
  );
  ```

- **Password Reset Completion**: When the user sets a new password, a confirmation email is sent
  ```typescript
  // This API call will trigger a password reset confirmation email:
  const response = await axios.post(
    `${process.env.REACT_APP_API_BASE_URL}/auth/reset-password`,
    {
      token,
      password,
    }
  );
  ```

### Booking Management

- **Booking Creation**: When a booking is confirmed

  ```typescript
  // This API call will trigger a booking confirmation email:
  const response = await axios.post(
    `${process.env.REACT_APP_API_BASE_URL}/bookings/create-enhanced`,
    bookingData,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  ```

- **Booking Cancellation**: When a booking is cancelled
  ```typescript
  // This API call will trigger a booking cancellation email:
  const response = await axios.post(
    `${process.env.REACT_APP_API_BASE_URL}/bookings/user/bookings/${bookingId}/cancel`,
    { cancellationReason: reason },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  ```

## Email URLs and Links

All URLs in emails (links to verify email, reset password, go to dashboard, etc.) use the `FRONTEND_URL` environment variable. This means:

- In development, links will point to your local frontend (e.g., `http://localhost:3000/verify?token=123`)
- In production, links will point to your production frontend (e.g., `https://xequtive.com/verify?token=123`)

The correct URL is determined by the backend environment variable, not hardcoded. This ensures emails work correctly in all environments.

## Email Types and Templates

All emails use responsive HTML templates with consistent branding. Here are the supported email types:

### 1. Account Verification Email

Sent when a user needs to verify their email address.

### 2. Welcome Email

Sent after a user creates an account to welcome them to the platform.

### 3. Forgot Password Email

Sent when a user requests a password reset.

### 4. Password Reset Confirmation Email

Sent when a user successfully resets their password.

### 5. Profile Completion Email

Sent when a user completes their profile with required information.

### 6. Booking Confirmation Email

Sent when a user successfully books a ride.

### 7. Booking Cancellation Email

Sent when a booking is cancelled.

### 8. Booking Reminder Email

Sent to remind users of upcoming bookings.

## Testing Emails in Development

During development, you can test the email sending functionality using the backend test endpoint:

```typescript
// Example of testing email sending from the frontend during development:
const testEmail = async () => {
  try {
    await axios.post(`${process.env.REACT_APP_API_BASE_URL}/test-email`, {
      to: "test@example.com",
      name: "Test User",
      type: "welcome", // One of: welcome, booking, cancel, reminder, profile, verify, password-reset, password-reset-confirm
    });
    console.log("Test email sent successfully");
  } catch (error) {
    console.error("Error sending test email:", error);
  }
};
```

## Environment Setup Instructions

1. **Backend Configuration**: Ensure your backend `.env` file includes the required email variables:

   ```
   # Email Service
   RESEND_API_KEY=your_resend_api_key
   EMAIL_SENDER_ADDRESS="Xequtive <onboarding@resend.dev>"

   # Frontend URLs (REQUIRED)
   FRONTEND_URL=http://localhost:3000        # For development
   LOGO_URL=http://localhost:3000/logo.png   # For development

   # In production:
   # FRONTEND_URL=https://xequtive.com
   # LOGO_URL=https://xequtive.com/logo.png
   ```

2. In your frontend project, create `.env` files for different environments:

   - `.env.development` - For local development
   - `.env.production` - For production deployment
   - `.env.staging` - For staging environment (optional)

3. Configure the API base URL in each environment file:

   ```
   # Development (.env.development)
   REACT_APP_API_BASE_URL=http://localhost:5555/api

   # Production (.env.production)
   REACT_APP_API_BASE_URL=https://api.xequtive.com/api

   # Staging (.env.staging)
   REACT_APP_API_BASE_URL=https://staging-api.xequtive.com/api
   ```

4. Create a central API client that uses these environment variables:

   ```typescript
   // src/services/api.ts
   import axios from "axios";

   const apiClient = axios.create({
     baseURL: process.env.REACT_APP_API_BASE_URL,
     timeout: 10000,
     headers: {
       "Content-Type": "application/json",
     },
   });

   export default apiClient;
   ```

5. Use this API client throughout your application:

   ```typescript
   // src/services/auth.service.ts
   import apiClient from "./api";

   export const AuthService = {
     login: async (email, password) => {
       return apiClient.post("/auth/signin", { email, password });
     },

     requestPasswordReset: async (email) => {
       return apiClient.post("/auth/forgot-password", { email });
     },

     verifyEmail: async (email, fullName) => {
       return apiClient.post("/auth/verify-email", { email, fullName });
     },

     resetPassword: async (token, password) => {
       return apiClient.post("/auth/reset-password", { token, password });
     },
     // ...other auth methods
   };
   ```

## Frontend Implementation Guidelines

When implementing features that trigger emails:

1. **Environment Variables**: Always use environment variables for API URLs and other configuration
2. **Error Handling**: Don't show errors to users if email sending fails (the backend handles this gracefully)
3. **User Feedback**: Provide appropriate feedback for actions that trigger emails (e.g., "Check your email for a reset link")
4. **Testing**: Use the test endpoint during development to ensure emails are rendering correctly
5. **Retry Handling**: The backend handles retries, but provide UI options for users to request another email if needed

## Confirming Email Status

The backend doesn't provide direct feedback about email delivery status to the frontend for security reasons. The frontend should:

1. Assume emails were sent successfully if the API returns a success response
2. Provide UI guidance for users to check spam folders
3. Offer a resend option for critical emails like verification and password reset

## Email Content Management

Email templates are managed in the backend. If design changes are needed:

1. Coordinate with the backend team to update the email templates
2. Use the test endpoint to preview changes
3. Consider implementing a template preview in the admin dashboard if frequent changes are needed
