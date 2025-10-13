# Email Verification System - Quick Reference

## 🚀 **Quick Start**

### **API Base URL**
```
/api/email-verification
```

### **2-Step Flow**
1. **Request Code** → `POST /request`
2. **Verify Code** → `POST /verify`

---

## 📋 **API Calls**

### **1. Request Verification Code**
```javascript
fetch('/api/email-verification/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
})
```

### **2. Verify Code**
```javascript
fetch('/api/email-verification/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'user@example.com', 
    otp: '123456' 
  })
})
```

### **3. Resend Code (Optional)**
```javascript
fetch('/api/email-verification/resend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
})
```

### **4. Check Status (Optional)**
```javascript
fetch('/api/email-verification/check-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
})
```

---

## ✅ **Success Responses**

```json
// Step 1: Code Sent
{ "success": true, "message": "Email verification code sent to your email address" }

// Step 2: Code Verified  
{ "success": true, "message": "Email verified successfully. You can now complete your account registration." }

// Resend: New Code Sent
{ "success": true, "message": "New email verification code sent to your email address" }
```

---

## ❌ **Common Errors**

```json
// Invalid Email
{ "success": false, "error": { "message": "Validation failed", "details": [...] } }

// Rate Limited
{ "success": false, "error": { "message": "Please wait 1 minutes before requesting another verification code" } }

// Invalid Code
{ "success": false, "error": { "message": "Invalid or expired verification code. Please request a new one." } }
```

---

## ⏱️ **Timing & Limits**

- **Code Expiry**: 5 minutes
- **Rate Limit**: 1 minute between requests
- **Max Attempts**: 3 attempts per code
- **Code Length**: 6 digits (numbers only)

---

## 🎯 **Frontend Flow**

```
[Email Input] → [Send Code] → [Code Input] → [Verify] → [Success]
```

---

## 🧪 **Test with cURL**

```bash
# 1. Request verification code
curl -X POST http://localhost:5555/api/email-verification/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Verify code (use actual code from email)
curl -X POST http://localhost:5555/api/email-verification/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'

# 3. Check status
curl -X POST http://localhost:5555/api/email-verification/check-status \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 4. Resend code
curl -X POST http://localhost:5555/api/email-verification/resend \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## 📧 **Email Template**

- **Subject**: "Verify Your Email - Xequtive"
- **Content**: Welcome message with green-themed 6-digit code
- **Sender**: `Xequtive <info@xeqcars.com>`
- **Features**: Professional branding, clear instructions, security warnings

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

## 📚 **Full Documentation**

See `EMAIL_VERIFICATION_SYSTEM.md` for complete integration guide with React examples, error handling, and best practices.

---

## ✅ **System Status**

- ✅ **Code Generation**: Working
- ✅ **Email Sending**: Working  
- ✅ **Rate Limiting**: Working
- ✅ **Code Verification**: Working
- ✅ **Firebase Integration**: Working
- ✅ **Error Handling**: Working

**🎉 Ready for Production!**
