# Email Verification System Documentation

## 🎯 **Overview**

The Xequtive backend now includes a comprehensive **email verification system** for account creation. This system ensures that users provide valid email addresses during registration by sending a 6-digit verification code.

## 🔐 **Security Features**

- **6-digit verification code** with 5-minute expiry
- **Rate limiting** (1 minute between requests)
- **Attempt limiting** (3 attempts per code)
- **Automatic cleanup** of expired codes
- **Professional email templates** with Xequtive branding
- **Secure code generation** using cryptographically secure random numbers
- **Duplicate email prevention** - Checks if email already exists before sending OTP

## 📋 **API Endpoints**

### Base URL
```
https://your-backend-domain.com/api/email-verification
```

### Endpoints
- `POST /request` - Request email verification code
- `POST /verify` - Verify email verification code
- `POST /resend` - Resend email verification code
- `POST /check-status` - Check if verification is still valid

---

## 🚀 **Step-by-Step Integration**

### **Step 1: Request Email Verification Code**

**Endpoint**: `POST /api/email-verification/request`

**Request**:
```javascript
const requestEmailVerification = async (email) => {
  try {
    const response = await fetch('/api/email-verification/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error requesting email verification:', error);
    return { success: false, error: { message: 'Network error' } };
  }
};
```

**Success Response**:
```json
{
  "success": true,
  "message": "Email verification code sent to your email address"
}
```

**Error Responses**:
```json
// Validation Error
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [{"validation": "email", "message": "Please provide a valid email address"}]
  }
}

// Rate Limiting
{
  "success": false,
  "error": {
    "message": "Please wait 1 minutes before requesting another verification code"
  }
}
```

---

### **Step 2: Verify Email Verification Code**

**Endpoint**: `POST /api/email-verification/verify`

**Request**:
```javascript
const verifyEmailVerification = async (email, otp) => {
  try {
    const response = await fetch('/api/email-verification/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error verifying email verification:', error);
    return { success: false, error: { message: 'Network error' } };
  }
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

---

### **Step 3: Resend Email Verification Code (Optional)**

**Endpoint**: `POST /api/email-verification/resend`

**Request**:
```javascript
const resendEmailVerification = async (email) => {
  try {
    const response = await fetch('/api/email-verification/resend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error resending email verification:', error);
    return { success: false, error: { message: 'Network error' } };
  }
};
```

**Success Response**:
```json
{
  "success": true,
  "message": "New email verification code sent to your email address"
}
```

---

### **Step 4: Check Verification Status (Optional)**

**Endpoint**: `POST /api/email-verification/check-status`

**Request**:
```javascript
const checkEmailVerificationStatus = async (email) => {
  try {
    const response = await fetch('/api/email-verification/check-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return { success: false, error: { message: 'Network error' } };
  }
};
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isVerified": true,
    "message": "Email verification is valid"
  }
}
```

---

## 🎨 **Frontend Implementation Example**

### **React Component Example**

```jsx
import React, { useState } from 'react';

const EmailVerificationFlow = () => {
  const [step, setStep] = useState(1); // 1: Request, 2: Verify, 3: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Request verification code
  const handleRequestVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await requestEmailVerification(email);
    
    if (result.success) {
      setSuccess('Verification code sent to your email!');
      setStep(2);
    } else {
      setError(result.error.message);
    }
    
    setLoading(false);
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await verifyEmailVerification(email, otp);
    
    if (result.success) {
      setSuccess('Email verified successfully!');
      setStep(3);
    } else {
      setError(result.error.message);
    }
    
    setLoading(false);
  };

  // Resend verification code
  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    
    const result = await resendEmailVerification(email);
    
    if (result.success) {
      setSuccess('New verification code sent!');
    } else {
      setError(result.error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="email-verification-container">
      {step === 1 && (
        <form onSubmit={handleRequestVerification}>
          <h2>Verify Your Email</h2>
          <p>Enter your email address to receive a verification code:</p>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <form onSubmit={handleVerifyCode}>
          <h2>Enter Verification Code</h2>
          <p>We sent a 6-digit code to {email}</p>
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
          <button type="button" onClick={handleResendCode} disabled={loading}>
            {loading ? 'Sending...' : 'Resend Code'}
          </button>
          <button type="button" onClick={() => setStep(1)}>
            Back to Email
          </button>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </form>
      )}

      {step === 3 && (
        <div className="success-page">
          <h2>Email Verified Successfully!</h2>
          <p>Your email has been verified. You can now complete your account registration.</p>
          <button onClick={() => window.location.href = '/complete-registration'}>
            Complete Registration
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailVerificationFlow;
```

---

## 📧 **Email Template**

### **Verification Email Template**
- **Subject**: "Verify Your Email - Xequtive"
- **Content**: 
  - Welcome message with Xequtive branding
  - Large, highlighted 6-digit verification code (green theme)
  - Clear instructions and security information
  - "Complete Verification" button linking to frontend
  - Professional styling with Xequtive logo

### **Template Features**
- **Green color scheme** (success theme)
- **Large, monospace font** for the verification code
- **Clear instructions** and security warnings
- **Professional branding** with Xequtive logo
- **Responsive design** for all devices

---

## ⏱️ **Timing & Limits**

- **Code Expiry**: 5 minutes
- **Rate Limit**: 1 minute between requests
- **Max Attempts**: 3 attempts per code
- **Code Length**: 6 digits (numbers only)

---

## 🗄️ **Database Structure**

### **OTP Collection (`otps`)**
```javascript
{
  email: "user@example.com",
  otp: "123456",
  purpose: "email-verification",
  expiresAt: Date,
  attempts: 0,
  verified: false,
  createdAt: Date,
  verifiedAt: Date, // Set when code is verified
  invalidatedAt: Date // Set when code is used
}
```

---

## 🔄 **Integration with Account Creation**

### **Recommended Flow**

1. **User enters email and password** → Frontend validates
2. **Request email verification** → `POST /api/email-verification/request`
3. **User enters verification code** → `POST /api/email-verification/verify`
4. **Create account** → Proceed with account creation
5. **Account created** → User can login

### **Frontend Integration Example**

```javascript
const handleAccountCreation = async (email, password, otp) => {
  // Step 1: Verify email first
  const verificationResult = await verifyEmailVerification(email, otp);
  
  if (!verificationResult.success) {
    throw new Error('Email verification failed');
  }
  
  // Step 2: Create account (your existing account creation logic)
  const accountResult = await createAccount(email, password);
  
  if (accountResult.success) {
    // Step 3: Invalidate the verification code
    await invalidateEmailVerificationOTP(email);
    
    return accountResult;
  }
  
  return accountResult;
};
```

---

## 🧪 **Testing the System**

### **Test Flow**
1. **Request verification code**:
   ```bash
   curl -X POST http://localhost:5555/api/email-verification/request \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Verify code** (use actual code from email):
   ```bash
   curl -X POST http://localhost:5555/api/email-verification/verify \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "otp": "123456"}'
   ```

3. **Check status**:
   ```bash
   curl -X POST http://localhost:5555/api/email-verification/check-status \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

4. **Resend code**:
   ```bash
   curl -X POST http://localhost:5555/api/email-verification/resend \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

---

## 🚨 **Error Handling**

### **Common Error Responses**

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
    "message": "Please wait 1 minutes before requesting another verification code"
  }
}
```

**Invalid Code**:
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired verification code. Please request a new one."
  }
}
```

---

## 🎯 **Best Practices**

### **1. User Experience**
- Show clear step indicators (1 of 2, 2 of 2)
- Provide helpful error messages
- Allow users to resend codes
- Show loading states during API calls
- Auto-focus on input fields

### **2. Security**
- Never store verification codes in localStorage
- Clear sensitive data after successful verification
- Implement proper error handling
- Show generic error messages for security

### **3. Validation**
- Validate email format on frontend
- Validate code format (6 digits)
- Show real-time validation feedback
- Prevent form submission with invalid data

### **4. Accessibility**
- Use proper ARIA labels
- Ensure keyboard navigation works
- Provide screen reader friendly messages
- Use semantic HTML elements

---

## 🔧 **Troubleshooting**

| Issue | Solution |
|-------|----------|
| 500 Internal Server Error | Check Firebase configuration |
| Rate limiting not working | Verify OTP queries are working |
| Email not sending | Check Resend API key |
| Code not found | Check Firestore indexes |
| Verification fails | Check code expiry and attempts |

---

## 📊 **Monitoring & Logs**

All email verification activities are logged with these prefixes:
- `✅ Email verification OTP created`
- `✅ Email verification OTP verified successfully`
- `⚠️ No valid email verification OTP found`
- `⚠️ Email verification OTP expired`
- `⚠️ Too many email verification OTP attempts`
- `❌ Error in email verification`

---

## 🚀 **Production Deployment**

### **Environment Variables**
Ensure these are set in your production environment:
```env
RESEND_API_KEY=your_resend_api_key
EMAIL_SENDER_ADDRESS="Xequtive <info@xeqcars.com>"
FRONTEND_URL=https://your-frontend-domain.com
```

### **Security Headers**
Add these security headers to your API responses:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`

---

## ✅ **System Status**

- ✅ **Code Generation**: Working
- ✅ **Email Sending**: Working  
- ✅ **Rate Limiting**: Working
- ✅ **Code Verification**: Working
- ✅ **Firebase Integration**: Working
- ✅ **Error Handling**: Working

**🎉 Ready for Production!**

---

## 📞 **Support**

If you encounter any issues during integration:

1. Check the API response for specific error messages
2. Verify all required fields are being sent
3. Ensure proper Content-Type headers are set
4. Test with the provided curl examples
5. Contact the backend team for assistance

---

## 🎉 **Ready to Go!**

The email verification system is fully tested and production-ready. Follow this guide to integrate it seamlessly into your account creation flow!
