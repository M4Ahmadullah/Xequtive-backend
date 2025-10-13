# Email Verification System - Frontend Integration Guide

## 🎯 **Overview**

The Xequtive backend now includes a **2-step email verification system** for account creation. This ensures all users have verified email addresses before completing registration.

## 🔄 **Integration Flow**

```
1. User enters email & password → 2. Send verification code → 3. User enters code → 4. Complete registration
```

## 📋 **API Endpoints**

### **Base URL**
```
/api/email-verification
```

### **Available Endpoints**
- `POST /request` - Send verification code to email
- `POST /verify` - Verify the 6-digit code
- `POST /resend` - Resend verification code
- `POST /check-status` - Check if verification is still valid

---

## 🚀 **Step-by-Step Implementation**

### **Step 1: Request Verification Code**

**When to use**: After user enters email and password, before creating account

```javascript
const requestEmailVerification = async (email) => {
  const response = await fetch('/api/email-verification/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};
```

**Success Response**:
```json
{
  "success": true,
  "message": "Email verification code sent to your email address"
}
```

**Error Response** (Rate Limited):
```json
{
  "success": false,
  "error": {
    "message": "Please wait 1 minutes before requesting another verification code"
  }
}
```

### **Step 2: Verify Code**

**When to use**: After user enters the 6-digit code from their email

```javascript
const verifyEmailCode = async (email, code) => {
  const response = await fetch('/api/email-verification/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp: code })
  });
  return response.json();
};
```

**Success Response**:
```json
{
  "success": true,
  "message": "Email verified successfully. You can now complete your account registration."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired verification code. Please request a new one."
  }
}
```

### **Step 3: Resend Code (Optional)**

**When to use**: If user didn't receive the code or it expired

```javascript
const resendVerificationCode = async (email) => {
  const response = await fetch('/api/email-verification/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};
```

---

## 🎨 **Frontend UI Implementation**

### **Recommended User Flow**

1. **Registration Form** (Email + Password)
2. **Verification Code Form** (6-digit input)
3. **Success Page** (Account created)

### **React Component Example**

```jsx
import React, { useState } from 'react';

const EmailVerificationSignup = () => {
  const [step, setStep] = useState(1); // 1: Email/Password, 2: Verify Code, 3: Success
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Request verification code
  const handleRequestVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate email and password first
    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    const result = await requestEmailVerification(email);
    
    if (result.success) {
      setSuccess('Verification code sent to your email!');
      setStep(2);
    } else {
      setError(result.error.message);
    }
    
    setLoading(false);
  };

  // Step 2: Verify code and create account
  const handleVerifyAndCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const verifyResult = await verifyEmailCode(email, verificationCode);
    
    if (verifyResult.success) {
      // Now create the account
      const accountResult = await createAccount(email, password);
      
      if (accountResult.success) {
        setSuccess('Account created successfully!');
        setStep(3);
      } else {
        setError('Account creation failed. Please try again.');
      }
    } else {
      setError(verifyResult.error.message);
    }
    
    setLoading(false);
  };

  // Resend verification code
  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    
    const result = await resendVerificationCode(email);
    
    if (result.success) {
      setSuccess('New verification code sent!');
    } else {
      setError(result.error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="email-verification-signup">
      {step === 1 && (
        <form onSubmit={handleRequestVerification}>
          <h2>Create Your Account</h2>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyAndCreateAccount}>
          <h2>Verify Your Email</h2>
          <p>We sent a 6-digit code to <strong>{email}</strong></p>
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Verify & Create Account'}
          </button>
          <button type="button" onClick={handleResendCode} disabled={loading}>
            {loading ? 'Sending...' : 'Resend Code'}
          </button>
          <button type="button" onClick={() => setStep(1)}>
            Back to Email/Password
          </button>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </form>
      )}

      {step === 3 && (
        <div className="success-page">
          <h2>Welcome to Xequtive!</h2>
          <p>Your account has been created successfully.</p>
          <button onClick={() => window.location.href = '/login'}>
            Go to Login
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailVerificationSignup;
```

---

## ⏱️ **Important Timing & Limits**

- **Code Expiry**: 5 minutes
- **Rate Limit**: 1 minute between requests
- **Max Attempts**: 3 attempts per code
- **Code Format**: 6 digits (numbers only)

---

## 🎯 **UX Best Practices**

### **1. User Experience**
- Show clear step indicators (Step 1 of 2, Step 2 of 2)
- Auto-focus on the verification code input
- Show countdown timer for code expiry
- Provide "Resend Code" option
- Allow users to go back to previous step

### **2. Error Handling**
- Show specific error messages
- Handle rate limiting gracefully
- Provide clear instructions for expired codes
- Show loading states during API calls

### **3. Validation**
- Validate email format before sending
- Validate code format (6 digits only)
- Show real-time validation feedback
- Prevent form submission with invalid data

---

## 🧪 **Testing**

### **Test the Integration**

```bash
# 1. Request verification code
curl -X POST http://localhost:5555/api/email-verification/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Verify code (use actual code from email)
curl -X POST http://localhost:5555/api/email-verification/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'
```

---

## 📧 **Email Template Preview**

Users will receive a professional email with:
- **Subject**: "Verify Your Email - Xequtive"
- **Green-themed design** with Xequtive branding
- **Large, highlighted 6-digit code**
- **Clear instructions** and security information
- **"Complete Verification" button**

---

## 🚨 **Common Error Scenarios**

### **Rate Limiting**
```json
{
  "success": false,
  "error": {
    "message": "Please wait 1 minutes before requesting another verification code"
  }
}
```
**UX Solution**: Show countdown timer, disable resend button

### **Invalid Code**
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired verification code. Please request a new one."
  }
}
```
**UX Solution**: Show error message, offer resend option

### **Expired Code**
**UX Solution**: Automatically detect and offer to resend

---

## ✅ **Integration Checklist**

- [ ] Implement email/password form
- [ ] Add verification code form
- [ ] Handle API responses
- [ ] Add error handling
- [ ] Implement rate limiting UX
- [ ] Add loading states
- [ ] Test with real email addresses
- [ ] Test error scenarios
- [ ] Add success page

---

## 🎉 **Ready to Go!**

The email verification system is fully tested and production-ready. Follow this guide to integrate it seamlessly into your signup flow!

**Need help?** Contact the backend team for any integration questions.
