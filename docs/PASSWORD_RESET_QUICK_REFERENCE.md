# Password Reset System - Quick Reference

## 🚀 **Quick Start**

### **API Base URL**
```
http://localhost:5555/api/password-reset
```

### **3-Step Flow**
1. **Request OTP** → `POST /request`
2. **Verify OTP** → `POST /verify-otp`  
3. **Reset Password** → `POST /reset`

---

## 📋 **API Calls**

### **1. Request OTP**
```javascript
fetch('http://localhost:5555/api/password-reset/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
})
```

### **2. Verify OTP**
```javascript
fetch('http://localhost:5555/api/password-reset/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'user@example.com', 
    otp: '123456' 
  })
})
```

### **3. Reset Password**
```javascript
fetch('http://localhost:5555/api/password-reset/reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'user@example.com',
    otp: '123456',
    newPassword: 'NewPassword123!',
    confirmPassword: 'NewPassword123!'
  })
})
```

---

## ✅ **Success Responses**

```json
// Step 1: OTP Sent
{ "success": true, "message": "If an account with this email exists, you will receive a password reset OTP" }

// Step 2: OTP Verified  
{ "success": true, "message": "OTP verified successfully. You can now reset your password." }

// Step 3: Password Reset
{ "success": true, "message": "Password reset successfully. You can now login with your new password." }
```

---

## ❌ **Common Errors**

```json
// Invalid Email
{ "success": false, "error": { "message": "Validation failed", "details": [...] } }

// Rate Limited
{ "success": false, "error": { "message": "Please wait 1 minutes before requesting another OTP" } }

// Invalid OTP
{ "success": false, "error": { "message": "Invalid or expired OTP. Please request a new one." } }

// Weak Password
{ "success": false, "error": { "message": "Password is too weak. Please choose a stronger password." } }

// Password Mismatch
{ "success": false, "error": { "message": "Validation failed", "details": [...] } }
```

---

## 🔒 **Password Requirements**

- **8+ characters**
- **1 uppercase letter**
- **1 lowercase letter** 
- **1 number**
- **1 special character** (`@$!%*?&`)

---

## ⏱️ **Timing & Limits**

- **OTP Expiry**: 5 minutes
- **Rate Limit**: 1 minute between requests
- **Max Attempts**: 3 attempts per OTP

---

## 🎯 **Frontend Flow**

```
[Email Input] → [Send OTP] → [OTP Input] → [Verify] → [New Password] → [Reset] → [Success]
```

---

## 🧪 **Test with cURL**

```bash
# 1. Request OTP
curl -X POST http://localhost:5555/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Verify OTP (use actual OTP from email)
curl -X POST http://localhost:5555/api/password-reset/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'

# 3. Reset Password
curl -X POST http://localhost:5555/api/password-reset/reset \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456", "newPassword": "NewPass123!", "confirmPassword": "NewPass123!"}'
```

---

## 📧 **Email Templates**

- **OTP Email**: Professional template with large OTP code
- **Confirmation Email**: Success notification with login button
- **Sender**: `Xequtive <info@xeqcars.com>`

---

## 🔧 **Troubleshooting**

| Issue | Solution |
|-------|----------|
| 500 Internal Server Error | Check Firebase configuration |
| Rate limiting not working | Verify OTP queries are working |
| Email not sending | Check Resend API key |
| OTP not found | Check Firestore indexes |

---

## 📚 **Full Documentation**

See `FRONTEND_PASSWORD_RESET_INTEGRATION.md` for complete integration guide with React examples, error handling, and best practices.

---

## ✅ **System Status**

- ✅ **OTP Generation**: Working
- ✅ **Email Sending**: Working  
- ✅ **Rate Limiting**: Working
- ✅ **Password Validation**: Working
- ✅ **Firebase Integration**: Working
- ✅ **Error Handling**: Working

**🎉 Ready for Production!**
