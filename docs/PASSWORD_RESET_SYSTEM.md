# Password Reset System Documentation

## Overview

The Xequtive backend now includes a comprehensive **3-step password reset system** with OTP (One-Time Password) verification for enhanced security.

## 🔐 **Security Features**

- **6-digit OTP** with 10-minute expiry
- **Rate limiting** (1 minute between requests)
- **Attempt limiting** (3 attempts per OTP)
- **Automatic cleanup** of expired OTPs
- **Secure email templates** with security warnings
- **No user enumeration** (same response for existing/non-existing users)

## 📋 **API Endpoints**

### 1. Request Password Reset
**Endpoint**: `POST /api/password-reset/request`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "If an account with this email exists, you will receive a password reset OTP"
}
```

**What happens**:
- Validates email format
- Checks if user exists (without revealing existence)
- Generates 6-digit OTP
- Stores OTP in Firestore with expiry
- Sends OTP email to user
- Implements rate limiting

---

### 2. Verify OTP
**Endpoint**: `POST /api/password-reset/verify-otp`

**Request Body**:
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP verified successfully. You can now reset your password."
}
```

**What happens**:
- Validates OTP format (6 digits)
- Checks OTP expiry and attempts
- Marks OTP as verified if correct
- Increments attempt counter

---

### 3. Reset Password
**Endpoint**: `POST /api/password-reset/reset`

**Request Body**:
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password."
}
```

**What happens**:
- Validates password strength
- Confirms passwords match
- Verifies OTP is still valid
- Updates Firebase Auth password
- Invalidates OTP
- Sends confirmation email

---

### 4. Check OTP Status
**Endpoint**: `POST /api/password-reset/check-otp-status`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isVerified": true,
    "message": "OTP is valid"
  }
}
```

## 🔒 **Password Requirements**

Passwords must meet these criteria:
- **Minimum 8 characters**
- **Maximum 128 characters**
- **At least one uppercase letter**
- **At least one lowercase letter**
- **At least one number**
- **At least one special character** (`@$!%*?&`)

## 📧 **Email Templates**

### OTP Email Template
- **Subject**: "Your Password Reset OTP - Xequtive"
- **Content**: 
  - Large, highlighted OTP code
  - Security information (10-minute expiry, 3 attempts)
  - Security warning for unauthorized requests
  - Professional Xequtive branding

### Confirmation Email Template
- **Subject**: "Password Reset Successful - Xequtive"
- **Content**:
  - Confirmation of successful password reset
  - Security notice for unauthorized changes
  - Login button to access account

## 🗄️ **Database Structure**

### OTP Collection (`otps`)
```javascript
{
  email: "user@example.com",
  otp: "123456",
  purpose: "password-reset",
  expiresAt: Date,
  attempts: 0,
  verified: false,
  createdAt: Date,
  verifiedAt: Date, // Set when OTP is verified
  invalidatedAt: Date // Set when OTP is used
}
```

## ⚡ **Rate Limiting & Security**

### Rate Limiting
- **1 minute** between OTP requests per email
- **3 attempts** per OTP before invalidation
- **5 minutes** OTP expiry time

### Security Measures
- **No user enumeration** - same response for all emails
- **OTP invalidation** after successful password reset
- **Automatic cleanup** of expired OTPs
- **Secure password hashing** via Firebase Auth
- **Email security warnings** in templates

## 🧪 **Testing the System**

### Test Flow
1. **Request OTP**:
   ```bash
   curl -X POST http://localhost:5555/api/password-reset/request \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com"}'
   ```

2. **Verify OTP**:
   ```bash
   curl -X POST http://localhost:5555/api/password-reset/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "otp": "123456"}'
   ```

3. **Reset Password**:
   ```bash
   curl -X POST http://localhost:5555/api/password-reset/reset \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "otp": "123456", "newPassword": "NewPass123!", "confirmPassword": "NewPass123!"}'
   ```

## 🚨 **Error Handling**

### Common Error Responses

**Validation Errors**:
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [{"validation": "email", "message": "Please provide a valid email address"}]
  }
}
```

**Rate Limiting**:
```json
{
  "success": false,
  "error": {
    "message": "Please wait 0.5 minutes before requesting another OTP"
  }
}
```

**Invalid OTP**:
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired OTP. Please request a new one."
  }
}
```

**Weak Password**:
```json
{
  "success": false,
  "error": {
    "message": "Password is too weak. Please choose a stronger password."
  }
}
```

## 🔧 **Frontend Integration**

### Recommended Frontend Flow

1. **Password Reset Request Page**:
   - Email input field
   - "Send OTP" button
   - Rate limiting feedback

2. **OTP Verification Page**:
   - 6-digit OTP input
   - "Verify OTP" button
   - Resend OTP option (after rate limit)

3. **New Password Page**:
   - New password input
   - Confirm password input
   - Password strength indicator
   - "Reset Password" button

4. **Success Page**:
   - Confirmation message
   - "Login" button

### Frontend API Integration
```javascript
// Request OTP
const requestOTP = async (email) => {
  const response = await fetch('/api/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};

// Verify OTP
const verifyOTP = async (email, otp) => {
  const response = await fetch('/api/password-reset/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  return response.json();
};

// Reset Password
const resetPassword = async (email, otp, newPassword, confirmPassword) => {
  const response = await fetch('/api/password-reset/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword, confirmPassword })
  });
  return response.json();
};
```

## 📊 **Monitoring & Logs**

All password reset activities are logged with these prefixes:
- `✅ OTP created for password reset`
- `✅ OTP verified successfully`
- `✅ Password reset successfully`
- `⚠️ No valid OTP found`
- `⚠️ OTP expired`
- `⚠️ Too many OTP attempts`
- `❌ Error in password reset`

## 🎯 **Next Steps**

The password reset system is now fully functional and ready for production use. The frontend team can integrate with these endpoints to provide a seamless password reset experience for users.
