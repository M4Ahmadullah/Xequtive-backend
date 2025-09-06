# 🕐 Wait and Return Timer Update - Frontend Implementation Guide

## Overview

The backend has been updated to support a **timer functionality for wait-and-return bookings** and **removed the 10% discount** from all return bookings. This document outlines the changes and what the frontend team needs to implement.

## 🚨 Key Changes

### 1. **Timer Functionality Added**
- Wait-and-return bookings now support a **timer up to 12 hours**
- Timer is **within the same day** (not overnight)
- Timer is **optional** - if not specified, defaults to "Up to 12 hours"

### 2. **10% Discount Removed**
- **All return bookings** no longer receive a 10% discount
- This applies to both `wait-and-return` and `later-date` return types
- Fare calculations are now based on full pricing without discounts

## 📋 Frontend Implementation Requirements

### 1. **Add Timer Input Field**

For wait-and-return bookings, add a timer input field:

```typescript
// Add to your booking form state
interface BookingFormState {
  // ... existing fields
  waitDuration?: number; // Hours (0-12)
}

// Add to your form UI
{bookingType === "return" && returnType === "wait-and-return" && (
  <div className="timer-input">
    <label htmlFor="waitDuration">
      Driver Wait Time (Hours)
    </label>
    <select 
      id="waitDuration"
      value={waitDuration || ""}
      onChange={(e) => setWaitDuration(Number(e.target.value))}
    >
      <option value="">Up to 12 hours (default)</option>
      <option value="1">1 hour</option>
      <option value="2">2 hours</option>
      <option value="3">3 hours</option>
      <option value="4">4 hours</option>
      <option value="5">5 hours</option>
      <option value="6">6 hours</option>
      <option value="7">7 hours</option>
      <option value="8">8 hours</option>
      <option value="9">9 hours</option>
      <option value="10">10 hours</option>
      <option value="11">11 hours</option>
      <option value="12">12 hours</option>
    </select>
    <p className="help-text">
      Maximum wait time is 12 hours within the same day
    </p>
  </div>
)}
```

### 2. **Update API Request Structure**

Include the `waitDuration` field in your API requests:

```typescript
// Enhanced fare estimation request
const fareEstimateRequest = {
  locations: {
    pickup: { /* pickup location */ },
    dropoff: { /* dropoff location */ }
  },
  datetime: { /* date and time */ },
  passengers: { /* passenger details */ },
  bookingType: "return",
  returnType: "wait-and-return",
  waitDuration: 6, // Optional: 0-12 hours
  // ... other fields
};

// Booking creation request
const bookingRequest = {
  customer: { /* customer details */ },
  booking: {
    locations: { /* locations */ },
    datetime: { /* date and time */ },
    passengers: { /* passenger details */ },
    waitDuration: 6, // Optional: 0-12 hours
    // ... other fields
  }
};
```

### 3. **Update Validation**

Add client-side validation for the timer:

```typescript
// Validation rules
const validateWaitDuration = (waitDuration: number | undefined, returnType: string) => {
  if (returnType === "wait-and-return" && waitDuration !== undefined) {
    if (waitDuration < 0 || waitDuration > 12) {
      return "Wait duration must be between 0 and 12 hours";
    }
  }
  return null;
};

// Use in your form validation
const validationErrors = {
  // ... other validations
  waitDuration: validateWaitDuration(waitDuration, returnType)
};
```

### 4. **Update UI Messages**

Remove any references to the 10% discount in your UI:

```typescript
// ❌ REMOVE these messages
"Return bookings receive a 10% discount"
"Save 10% with return bookings"

// ✅ UPDATE to these messages
"Return bookings: Driver waits and returns"
"Wait time: Up to 12 hours (within same day)"
```

### 5. **Update Fare Display**

The backend will now return different messages in the fare breakdown:

```typescript
// Expected fare breakdown messages for wait-and-return:
[
  "Return journey: Driver waits at destination and returns",
  "Return route: Smart reverse of outbound journey",
  "Driver wait time: 6 hours", // or "Up to 12 hours" if not specified
  "Return journey: Distance doubled (outbound + reverse route)"
  // Note: No discount message will be included
]

// Expected fare breakdown messages for later-date return:
[
  "Return journey: Scheduled return on different date/time",
  "Return route: Smart reverse of outbound journey",
  "Return journey: Distance doubled (outbound + reverse route)"
  // Note: No discount message will be included
]
```

## 🔧 API Changes

### Enhanced Fare Estimation Endpoint

**Endpoint:** `POST /api/fare/enhanced`

**New Field:**
```typescript
{
  // ... existing fields
  waitDuration?: number; // 0-12 hours, optional
}
```

**Validation:**
- `waitDuration` is optional
- If provided, must be between 0 and 12
- Only applies to `wait-and-return` bookings
- Ignored for `later-date` bookings

### Booking Creation Endpoint

**Endpoint:** `POST /api/bookings`

**New Field:**
```typescript
{
  customer: { /* customer details */ },
  booking: {
    // ... existing fields
    waitDuration?: number; // 0-12 hours, optional
  }
}
```

## 📊 Expected Behavior

### Wait-and-Return with Timer
```typescript
// Request
{
  bookingType: "return",
  returnType: "wait-and-return",
  waitDuration: 6
}

// Response messages
[
  "Return journey: Driver waits at destination and returns",
  "Return route: Smart reverse of outbound journey",
  "Driver wait time: 6 hours",
  "Return journey: Distance doubled (outbound + reverse route)"
]
```

### Wait-and-Return without Timer
```typescript
// Request
{
  bookingType: "return",
  returnType: "wait-and-return"
  // No waitDuration specified
}

// Response messages
[
  "Return journey: Driver waits at destination and returns",
  "Return route: Smart reverse of outbound journey",
  "Driver wait time: Up to 12 hours (within same day)",
  "Return journey: Distance doubled (outbound + reverse route)"
]
```

### Later-Date Return
```typescript
// Request
{
  bookingType: "return",
  returnType: "later-date",
  returnDate: "2024-07-21",
  returnTime: "10:00"
}

// Response messages
[
  "Return journey: Scheduled return on different date/time",
  "Return route: Smart reverse of outbound journey",
  "Return journey: Distance doubled (outbound + reverse route)"
]
```

## ⚠️ Important Notes

1. **Timer is Optional**: If `waitDuration` is not provided, the system defaults to "Up to 12 hours"
2. **Same Day Only**: Timer is within the same day, not overnight
3. **No Discount**: All return bookings now use full pricing without discounts
4. **Validation**: Client-side validation should ensure `waitDuration` is between 0-12
5. **UI Updates**: Remove all references to 10% discount in the frontend

## 🧪 Testing

Test the following scenarios:

1. **Wait-and-return with timer** (1-12 hours)
2. **Wait-and-return without timer** (should default to "Up to 12 hours")
3. **Later-date return** (should not show timer messages)
4. **Invalid timer values** (should show validation errors)
5. **Fare calculations** (should not include discount messages)

## 📞 Support

If you encounter any issues with the implementation, contact the backend team. The backend changes are complete and tested.

---

**Last Updated:** January 2024  
**Version:** 1.0  
**Status:** Ready for Implementation

