# Wait & Return Feature Documentation

## Overview
We've implemented a new **"Wait & Return"** option for both **Enhanced Booking (Taxi Booking)** and **Hourly Booking (Executive Cars)** systems. This allows customers to choose between two return booking types without requiring a return date for wait-and-return bookings.

## Frontend Integration

### New Field: `returnType`
Add this field to your return booking forms:

```typescript
returnType: "wait-and-return" | "later-date"
```

## UI Implementation

### 1. Enhanced Booking (Taxi Booking)
When user selects `bookingType: "return"`, show:

```jsx
// Radio buttons or toggle
<div className="return-type-selection">
  <input 
    type="radio" 
    value="wait-and-return" 
    checked={returnType === "wait-and-return"}
    onChange={(e) => setReturnType(e.target.value)}
  />
  <label>Wait & Return</label>
  <small>Driver waits at destination and returns</small>

  <input 
    type="radio" 
    value="later-date" 
    checked={returnType === "later-date"}
    onChange={(e) => setReturnType(e.target.value)}
  />
  <label>Return on Different Date</label>
  <small>Schedule return journey for later</small>
</div>

{/* Conditionally show return date/time fields */}
{returnType === "later-date" && (
  <div className="return-date-fields">
    <input 
      type="date" 
      value={returnDate}
      onChange={(e) => setReturnDate(e.target.value)}
      required
    />
    <input 
      type="time" 
      value={returnTime}
      onChange={(e) => setReturnTime(e.target.value)}
      required
    />
  </div>
)}
```

### 2. Hourly Booking (Executive Cars)
Same UI implementation as Enhanced Booking.

## API Request Format

### Enhanced Fare Estimate
```json
POST /api/fare-estimate/enhanced

{
  "locations": {
    "pickup": { "address": "...", "coordinates": {...} },
    "dropoff": { "address": "...", "coordinates": {...} }
  },
  "datetime": { "date": "2025-01-20", "time": "14:30" },
  "passengers": { "count": 2, "checkedLuggage": 1, ... },
  "bookingType": "return",
  "returnType": "wait-and-return",  // NEW FIELD
  "returnDate": "2025-01-20",       // Optional - only for "later-date"
  "returnTime": "18:00"             // Optional - only for "later-date"
}
```

### Enhanced Booking Creation
```json
POST /api/bookings/create-enhanced

{
  "customer": { "fullName": "...", "email": "...", "phone": "..." },
  "booking": {
    "locations": {...},
    "datetime": {...},
    "passengers": {...},
    "vehicle": {...},
    "bookingType": "return",
    "returnType": "wait-and-return",  // NEW FIELD
    "returnDate": "2025-01-20",       // Optional - only for "later-date"
    "returnTime": "18:00"             // Optional - only for "later-date"
  }
}
```

### Hourly Fare Estimate
```json
POST /api/hourly-bookings/fare-estimate

{
  "bookingType": "return",
  "datetime": { "date": "2025-01-20", "time": "14:30" },
  "passengers": { "count": 2, "luggage": 1 },
  "returnDetails": {
    "outboundPickup": { "lat": 51.5074, "lng": -0.1278 },
    "outboundDropoff": { "lat": 51.4994, "lng": -0.1245 },
    "outboundDateTime": { "date": "2025-01-20", "time": "14:30" },
    "returnType": "wait-and-return",     // NEW FIELD
    "waitDuration": 2,                   // Hours - for wait-and-return
    "returnDateTime": {                  // Optional - only for "later-date"
      "date": "2025-01-20",
      "time": "18:00"
    }
  }
}
```

## Validation Rules

### Wait & Return (`returnType: "wait-and-return"`)
- ✅ **No return date required**
- ✅ **No return time required**
- ✅ Driver waits at destination
- ✅ Same pricing as regular return (distance × 2 + 10% discount)

### Later Date (`returnType: "later-date"`)
- ❌ **Return date required** (YYYY-MM-DD format)
- ❌ **Return time required** (HH:MM format, 24-hour)
- ✅ Return date must be same day or later
- ✅ Two separate journeys calculated

## Response Format

### Fare Estimate Response
```json
{
  "success": true,
  "data": {
    "vehicleOptions": [
      {
        "id": "standard-saloon",
        "name": "Standard Saloon",
        "price": {
          "amount": 45,
          "currency": "GBP",
          "messages": [
            "Return journey: Driver waits at destination and returns",
            "Driver wait time: unlimited",
            "Return journey: Distance doubled",
            "Return discount (10%): -£5.00"
          ]
        }
      }
    ]
  }
}
```

### Booking Creation Response
```json
{
  "success": true,
  "data": {
    "bookingId": "abc123",
    "referenceNumber": "XEQ_100",
    "message": "Booking successfully created",
    "details": {
      "bookingType": "return",
      "returnType": "wait-and-return",
      "status": "pending"
    }
  }
}
```

## Frontend State Management

### React Example
```typescript
const [bookingType, setBookingType] = useState<'one-way' | 'hourly' | 'return'>('one-way');
const [returnType, setReturnType] = useState<'wait-and-return' | 'later-date'>('wait-and-return');
const [returnDate, setReturnDate] = useState<string>('');
const [returnTime, setReturnTime] = useState<string>('');

// Validation
const isReturnDateRequired = bookingType === 'return' && returnType === 'later-date';

const validateForm = () => {
  if (isReturnDateRequired) {
    if (!returnDate || !returnTime) {
      setError('Return date and time are required for later-date returns');
      return false;
    }
  }
  return true;
};
```

## Error Handling

### Common Validation Errors
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Return date and time are required for later-date returns",
    "details": "Please select a return date and time"
  }
}
```

## Pricing Logic

Both return types use the same pricing calculation:
1. **Calculate one-way fare**
2. **Double the fare** (for return journey)
3. **Apply 10% discount**
4. **Add time surcharges** and other fees

The only difference is in the messaging:
- **Wait & Return**: Shows "Driver wait time: unlimited"
- **Later Date**: Shows "Return date: YYYY-MM-DD" and "Return time: HH:MM"

## Testing Scenarios

### Test Case 1: Wait & Return
```json
{
  "bookingType": "return",
  "returnType": "wait-and-return"
  // No returnDate or returnTime needed
}
```

**Expected**: ✅ Success, no validation errors

### Test Case 2: Later Date (Valid)
```json
{
  "bookingType": "return",
  "returnType": "later-date",
  "returnDate": "2025-01-20",
  "returnTime": "18:00"
}
```

**Expected**: ✅ Success

### Test Case 3: Later Date (Invalid)
```json
{
  "bookingType": "return",
  "returnType": "later-date"
  // Missing returnDate and returnTime
}
```

**Expected**: ❌ Validation error

## Migration Notes

### Existing Bookings
- All existing return bookings will continue to work
- No database migration required
- Existing bookings without `returnType` are treated as `"later-date"`

### Backward Compatibility
- API accepts both old and new request formats
- Old format automatically maps to `returnType: "later-date"`
- No breaking changes to existing frontend code

## Summary

1. **Add `returnType` field** to return booking forms
2. **Show/hide return date fields** based on `returnType`
3. **Include `returnType` in API requests** for return bookings
4. **Handle new response messages** for better UX
5. **Test both return types** thoroughly

The backend is ready and waiting for frontend integration! 🚀