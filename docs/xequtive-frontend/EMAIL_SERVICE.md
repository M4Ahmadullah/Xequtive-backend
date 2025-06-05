# Email Service Documentation

## Overview

Xequtive uses [Resend](https://resend.com) for sending transactional emails. The email sending functionality is fully implemented in the backend, and the frontend only needs to make API calls that trigger email sending when appropriate.

## Current Development Status

> **IMPORTANT NOTE FOR FRONTEND TEAM**:
>
> The email service is currently running in **development simulation mode**. This means:
>
> - Email API endpoints will return success responses
> - Verification tokens and reset links are still generated and work correctly
> - No actual emails are being sent to users
> - Backend logs show what would have been sent
>
> This allows frontend development to proceed without needing real email delivery.
> When we acquire and verify our domain, we'll switch to actually sending emails.

The email service is **fully implemented in the backend** and ready to use. The backend handles:

- API key management via environment variables
- Email template rendering
- Sending logic and retries (currently simulated)
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
- Full email functionality will be enabled once we purchase and verify our domain with Resend.

There are no hardcoded URLs in the backend - everything is controlled through these environment variables.

## Email Authentication Flows

The application supports the following email-based authentication flows:

### 1. Email Verification Flow

This is a two-step process:

1. **Request Verification Email**: User enters email and name, backend validates and generates verification token
2. **Complete Signup**: User clicks link in the verification URL, completes registration with password

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

In development mode, the verification URL is logged in the backend console but not actually emailed.
The URL format is: `${FRONTEND_URL}/auth/signup?token=VERIFICATION_TOKEN&email=user@example.com`

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

1. **Request Password Reset**: User enters email, backend generates reset token
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

In development mode, the reset URL is logged in the backend console but not actually emailed.
The URL format is: `${FRONTEND_URL}/reset-password?token=RESET_TOKEN`

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

## Development Testing

During development, the frontend team should:

1. Use the backend endpoints normally
2. Check with the backend team to get verification tokens and URLs from the backend logs
3. For testing registration flows, use the verification token from logs to proceed
4. For testing password reset, use the reset token from logs to proceed

This approach allows complete testing of all flows without actual email delivery.

## Frontend Implementation Guidelines

When implementing features that trigger emails:

1. **Environment Variables**: Always use environment variables for API URLs and other configuration
2. **Error Handling**: Don't show errors to users if email sending fails (the backend handles this gracefully)
3. **User Feedback**: Provide appropriate feedback for actions that trigger emails (e.g., "Check your email for a reset link")
4. **Testing**: In development, coordinate with backend to get tokens from backend logs
5. **Retry Handling**: Provide UI options for users to request another verification or reset email if needed

## Future Email Plans

Once we purchase and verify our domain:

1. We will update the EMAIL_SENDER_ADDRESS to use our domain
2. Enable actual email sending in the backend
3. No frontend changes will be needed - everything will just start working

This separation ensures the frontend can be developed and tested independently of the actual email delivery mechanism.

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
