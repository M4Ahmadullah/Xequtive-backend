# Admin Booking Edit Feature

This document provides comprehensive guidance for the admin booking edit functionality in the Xequtive Admin Dashboard.

## Overview

The admin booking edit feature allows administrators to modify any aspect of existing bookings, including pricing, locations, dates, vehicle types, and customer information (except email). This powerful tool enables admins to handle customer requests, corrections, and special circumstances.

## Key Features

- ✅ **Complete Booking Control**: Update all booking fields except customer email
- ✅ **Admin Override Capabilities**: Override pricing, distance, and time calculations
- ✅ **Audit Trail**: All changes are logged with admin information and timestamps
- ✅ **Flexible Updates**: Update individual fields or multiple fields at once
- ✅ **Validation**: Comprehensive validation for all field types
- ✅ **Security**: Admin-only access with authentication required

## API Endpoint

### Update Booking (Admin Only)

**Endpoint:** `PUT /api/dashboard/bookings/:id`

**Authentication:** Required (Admin dashboard authentication)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Booking ID (Firebase document ID) |

**Request Body:** `AdminBookingUpdateRequest`

All fields are optional - only provided fields will be updated.

## Request Body Schema

### Basic Booking Information

```json
{
  "bookingType": "one-way" | "return" | "hourly",
  "status": "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"
}
```

### Customer Information (Email Cannot Be Changed)

```json
{
  "firstName": "string",
  "lastName": "string", 
  "phone": "+44123456789"
}
```

### Location Information

```json
{
  "locations": {
    "pickup": {
      "address": "string",
      "coordinates": {
        "lat": 51.5074,
        "lng": -0.1278
      }
    },
    "dropoff": {
      "address": "string",
      "coordinates": {
        "lat": 51.4700,
        "lng": -0.4543
      }
    }
  }
}
```

### Date and Time Information

```json
{
  "pickupDate": "2025-09-20",
  "pickupTime": "14:30",
  "returnDate": "2025-09-21",
  "returnTime": "16:00"
}
```

### Vehicle Information

```json
{
  "vehicleType": "saloon" | "executive-saloon" | "executive-mpv" | "luxury-vehicle" | "mpv-6" | "mpv-8"
}
```

### Pricing Information (Admin Override)

```json
{
  "pricing": {
    "baseFare": 50.00,
    "distanceCharge": 25.00,
    "timeCharge": 15.00,
    "airportFee": 5.00,
    "waitingCharge": 10.00,
    "totalFare": 105.00,
    "hourlyRate": 30.00
  }
}
```

### Distance and Duration (Admin Override)

```json
{
  "distance": {
    "miles": 15.5,
    "kilometers": 24.9,
    "duration": 45
  }
}
```

### Hourly Booking Specific

```json
{
  "hours": 4
}
```

### Additional Information

```json
{
  "passengers": 2,
  "luggage": 1,
  "specialRequests": "Please call when arriving",
  "notes": "Admin notes about this booking"
}
```

### Payment Information

```json
{
  "paymentMethod": "cash" | "card" | "corporate",
  "paymentStatus": "pending" | "paid" | "failed" | "refunded"
}
```

### Driver Assignment

```json
{
  "driverId": "driver_001",
  "driverName": "John Smith",
  "driverPhone": "+447123456789"
}
```

### Flight Information

```json
{
  "flightNumber": "BA123",
  "terminal": "Terminal 5"
}
```

### Admin Override Information

```json
{
  "adminOverride": {
    "pricingOverridden": true,
    "distanceOverridden": false,
    "timeOverridden": true,
    "reason": "Customer requested upgrade and extended hours"
  }
}
```

## Example Requests

### 1. Update Booking Status and Driver

```bash
curl -X PUT "http://localhost:5555/api/dashboard/bookings/VWxEUjE87MVbjeI9NxBw" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "driverId": "driver_001",
    "driverName": "John Smith",
    "driverPhone": "+447123456789",
    "adminOverride": {
      "pricingOverridden": false,
      "distanceOverridden": false,
      "timeOverridden": false,
      "reason": "Booking confirmed and driver assigned"
    }
  }' \
  -b cookies.txt
```

### 2. Update Pricing and Vehicle Type

```bash
curl -X PUT "http://localhost:5555/api/dashboard/bookings/VWxEUjE87MVbjeI9NxBw" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "executive-mpv",
    "pricing": {
      "baseFare": 120,
      "totalFare": 120,
      "hourlyRate": 30
    },
    "adminOverride": {
      "pricingOverridden": true,
      "distanceOverridden": false,
      "timeOverridden": false,
      "reason": "Customer upgraded to executive MPV"
    }
  }' \
  -b cookies.txt
```

### 3. Update Locations and Times

```bash
curl -X PUT "http://localhost:5555/api/dashboard/bookings/VWxEUjE87MVbjeI9NxBw" \
  -H "Content-Type: application/json" \
  -d '{
    "locations": {
      "pickup": {
        "address": "Updated Pickup Address, London",
        "coordinates": {
          "lat": 51.5074,
          "lng": -0.1278
        }
      },
      "dropoff": {
        "address": "Heathrow Airport Terminal 5",
        "coordinates": {
          "lat": 51.4700,
          "lng": -0.4543
        }
      }
    },
    "pickupDate": "2025-09-20",
    "pickupTime": "14:30",
    "adminOverride": {
      "pricingOverridden": false,
      "distanceOverridden": true,
      "timeOverridden": false,
      "reason": "Updated pickup location and added dropoff"
    }
  }' \
  -b cookies.txt
```

### 4. Comprehensive Update

```bash
curl -X PUT "http://localhost:5555/api/dashboard/bookings/VWxEUjE87MVbjeI9NxBw" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "firstName": "Fahiq",
    "lastName": "Kohistani",
    "phone": "+447752411502",
    "vehicleType": "executive-mpv",
    "hours": 4,
    "passengers": 2,
    "luggage": 1,
    "specialRequests": "Please call when arriving",
    "notes": "Customer requested executive MPV upgrade",
    "paymentMethod": "card",
    "paymentStatus": "paid",
    "driverId": "driver_001",
    "driverName": "John Smith",
    "driverPhone": "+447123456789",
    "pricing": {
      "baseFare": 120,
      "distanceCharge": 0,
      "timeCharge": 0,
      "airportFee": 0,
      "waitingCharge": 0,
      "totalFare": 120,
      "hourlyRate": 30
    },
    "distance": {
      "miles": 0,
      "kilometers": 0,
      "duration": 240
    },
    "adminOverride": {
      "pricingOverridden": true,
      "distanceOverridden": false,
      "timeOverridden": true,
      "reason": "Customer upgraded to executive MPV and extended hours"
    }
  }' \
  -b cookies.txt
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "VWxEUjE87MVbjeI9NxBw",
    "message": "Booking updated successfully",
    "updatedFields": [
      "status",
      "firstName", 
      "lastName",
      "phone",
      "vehicleType",
      "hours",
      "passengers",
      "luggage",
      "specialRequests",
      "notes",
      "paymentMethod",
      "paymentStatus",
      "driverId",
      "driverName",
      "driverPhone",
      "pricing",
      "distance",
      "adminOverride"
    ],
    "booking": {
      // Complete updated booking object
    }
  }
}
```

### Error Responses

**Authentication Required:**
```json
{
  "success": false,
  "error": {
    "message": "Authentication token required",
    "code": "auth/token-required"
  }
}
```

**Admin Access Required:**
```json
{
  "success": false,
  "error": {
    "message": "Admin access required",
    "code": "dashboard/admin-required"
  }
}
```

**Booking Not Found:**
```json
{
  "success": false,
  "error": {
    "message": "Booking not found",
    "code": "dashboard/booking-not-found"
  }
}
```

**Invalid Data:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid booking update data",
    "code": "dashboard/invalid-data",
    "details": "phone: Invalid phone number format, hours: Hours must be between 3 and 24"
  }
}
```

## Frontend Integration Guide

### 1. Authentication Setup

Ensure your dashboard is authenticated with admin credentials:

```javascript
// Login to dashboard
const loginResponse = await fetch('/api/dashboard/auth/hardcoded-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'xequtivecars@gmail.com',
    password: 'xequtive2025'
  })
});
```

### 2. Update Booking Function

```javascript
// Update booking with admin privileges
const updateBooking = async (bookingId, updateData) => {
  try {
    const response = await fetch(`/api/dashboard/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData)
    });

    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error.message);
    }
  } catch (error) {
    console.error('Failed to update booking:', error);
    throw error;
  }
};

// Usage examples
await updateBooking('VWxEUjE87MVbjeI9NxBw', {
  status: 'confirmed',
  driverId: 'driver_001',
  driverName: 'John Smith'
});

await updateBooking('VWxEUjE87MVbjeI9NxBw', {
  vehicleType: 'executive-mpv',
  pricing: { totalFare: 120, hourlyRate: 30 },
  adminOverride: {
    pricingOverridden: true,
    reason: 'Customer upgrade request'
  }
});
```

### 3. React Component Example

```jsx
import React, { useState } from 'react';

const BookingEditModal = ({ booking, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    status: booking.status || '',
    vehicleType: booking.vehicleType || '',
    passengers: booking.passengers || 1,
    luggage: booking.luggage || 0,
    specialRequests: booking.specialRequests || '',
    notes: booking.notes || '',
    paymentMethod: booking.paymentMethod || '',
    paymentStatus: booking.paymentStatus || '',
    driverId: booking.driverId || '',
    driverName: booking.driverName || '',
    driverPhone: booking.driverPhone || '',
    pricing: {
      baseFare: booking.pricing?.baseFare || 0,
      distanceCharge: booking.pricing?.distanceCharge || 0,
      timeCharge: booking.pricing?.timeCharge || 0,
      airportFee: booking.pricing?.airportFee || 0,
      waitingCharge: booking.pricing?.waitingCharge || 0,
      totalFare: booking.pricing?.totalFare || 0,
      hourlyRate: booking.pricing?.hourlyRate || 0,
    },
    adminOverride: {
      pricingOverridden: booking.adminOverride?.pricingOverridden || false,
      distanceOverridden: booking.adminOverride?.distanceOverridden || false,
      timeOverridden: booking.adminOverride?.timeOverridden || false,
      reason: booking.adminOverride?.reason || '',
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateBooking(booking.id, formData);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Booking {booking.referenceNumber}</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Status */}
          <div className="form-group">
            <label>Status:</label>
            <select 
              value={formData.status} 
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Vehicle Type */}
          <div className="form-group">
            <label>Vehicle Type:</label>
            <select 
              value={formData.vehicleType} 
              onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
            >
              <option value="saloon">Standard Saloon</option>
              <option value="executive-saloon">Executive Saloon</option>
              <option value="executive-mpv">Executive MPV</option>
              <option value="luxury-vehicle">Luxury Vehicle</option>
              <option value="mpv-6">MPV-6</option>
              <option value="mpv-8">MPV-8</option>
            </select>
          </div>

          {/* Pricing Override */}
          <div className="form-group">
            <label>
              <input 
                type="checkbox" 
                checked={formData.adminOverride.pricingOverridden}
                onChange={(e) => setFormData({
                  ...formData, 
                  adminOverride: {
                    ...formData.adminOverride, 
                    pricingOverridden: e.target.checked
                  }
                })}
              />
              Override Pricing
            </label>
          </div>

          {formData.adminOverride.pricingOverridden && (
            <div className="pricing-override">
              <div className="form-group">
                <label>Base Fare:</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.pricing.baseFare}
                  onChange={(e) => setFormData({
                    ...formData, 
                    pricing: {...formData.pricing, baseFare: parseFloat(e.target.value)}
                  })}
                />
              </div>
              <div className="form-group">
                <label>Total Fare:</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.pricing.totalFare}
                  onChange={(e) => setFormData({
                    ...formData, 
                    pricing: {...formData.pricing, totalFare: parseFloat(e.target.value)}
                  })}
                />
              </div>
            </div>
          )}

          {/* Driver Assignment */}
          <div className="form-group">
            <label>Driver Name:</label>
            <input 
              type="text" 
              value={formData.driverName}
              onChange={(e) => setFormData({...formData, driverName: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Driver Phone:</label>
            <input 
              type="text" 
              value={formData.driverPhone}
              onChange={(e) => setFormData({...formData, driverPhone: e.target.value})}
            />
          </div>

          {/* Admin Notes */}
          <div className="form-group">
            <label>Admin Notes:</label>
            <textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="3"
            />
          </div>

          {/* Override Reason */}
          <div className="form-group">
            <label>Override Reason:</label>
            <textarea 
              value={formData.adminOverride.reason}
              onChange={(e) => setFormData({
                ...formData, 
                adminOverride: {...formData.adminOverride, reason: e.target.value}
              })}
              rows="2"
              placeholder="Reason for admin override..."
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Update Booking</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingEditModal;
```

## Validation Rules

### Field Validation

| Field | Validation Rules |
|-------|------------------|
| `phone` | Must match regex: `^\+?[1-9]\d{1,14}$` |
| `hours` | Integer between 3 and 24 (for hourly bookings) |
| `passengers` | Integer, minimum 1 |
| `luggage` | Integer, minimum 0 |
| `pickupDate` | Format: `YYYY-MM-DD` |
| `pickupTime` | Format: `HH:MM` |
| `vehicleType` | Must be valid enum value |
| `status` | Must be valid enum value |
| `paymentMethod` | Must be valid enum value |
| `paymentStatus` | Must be valid enum value |
| `coordinates.lat` | Number between -90 and 90 |
| `coordinates.lng` | Number between -180 and 180 |

### Business Logic Validation

- **Return Bookings**: If `bookingType` is "return", `returnDate` and `returnTime` are required
- **Hourly Bookings**: If `bookingType` is "hourly", `hours` is required
- **Email Protection**: Customer email cannot be changed (not included in schema)

## Audit Trail

All booking updates are logged with the following information:

```json
{
  "adminLogs": [
    {
      "action": "booking_updated",
      "adminId": "admin-1758472421347",
      "adminEmail": "xequtivecars@gmail.com",
      "timestamp": "2025-09-21T16:33:41.347Z",
      "updatedFields": ["status", "driverId", "driverName"],
      "reason": "Booking confirmed and driver assigned"
    }
  ]
}
```

## Best Practices

### 1. Admin Override Usage
- Always provide a clear reason for overrides
- Use pricing overrides sparingly and document the reason
- Consider customer impact before making changes

### 2. Field Updates
- Update only necessary fields to minimize audit trail noise
- Group related updates in single requests when possible
- Validate data on the frontend before sending requests

### 3. Driver Assignment
- Assign drivers only when booking is confirmed
- Update driver information if driver changes
- Include driver contact information for customer communication

### 4. Pricing Overrides
- Document the reason for pricing changes
- Consider impact on customer satisfaction
- Use override flags to track manual pricing adjustments

## Security Considerations

1. **Admin-Only Access**: All endpoints require admin authentication
2. **Email Protection**: Customer email cannot be modified
3. **Audit Logging**: All changes are logged with admin information
4. **Input Validation**: All data is validated before processing
5. **Rate Limiting**: Consider implementing rate limiting for update operations

## Error Handling

### Common Error Scenarios

1. **Invalid Booking ID**: Returns 404 with "Booking not found"
2. **Unauthorized Access**: Returns 401 with "Authentication token required"
3. **Non-Admin Access**: Returns 403 with "Admin access required"
4. **Invalid Data**: Returns 400 with detailed validation errors
5. **Server Errors**: Returns 500 with generic error message

### Frontend Error Handling

```javascript
const handleBookingUpdate = async (bookingId, updateData) => {
  try {
    const result = await updateBooking(bookingId, updateData);
    showSuccessMessage(`Booking updated successfully. Fields updated: ${result.updatedFields.join(', ')}`);
  } catch (error) {
    if (error.message.includes('Booking not found')) {
      showErrorMessage('Booking not found. Please refresh the page.');
    } else if (error.message.includes('Admin access required')) {
      showErrorMessage('You do not have permission to edit bookings.');
    } else if (error.message.includes('Invalid')) {
      showErrorMessage(`Validation error: ${error.message}`);
    } else {
      showErrorMessage('Failed to update booking. Please try again.');
    }
  }
};
```

## Monitoring and Analytics

### Key Metrics to Track
- **Update Frequency**: How often bookings are modified
- **Common Update Types**: Most frequently updated fields
- **Admin Activity**: Which admins make the most changes
- **Override Usage**: Frequency of pricing/distance/time overrides

### Dashboard KPIs
- Total booking updates today/week/month
- Average fields updated per modification
- Most common update reasons
- Admin activity distribution

## Troubleshooting

### Common Issues

**1. Validation Errors**
- Check field formats (phone, date, time)
- Verify enum values (vehicleType, status, etc.)
- Ensure required fields for specific booking types

**2. Permission Errors**
- Verify admin authentication
- Check user role in session
- Ensure valid session token

**3. Booking Not Found**
- Verify booking ID is correct
- Check if booking was deleted
- Refresh booking list

**4. Update Failures**
- Check network connectivity
- Verify request format
- Check server logs for errors

## Support

For technical support or questions about the admin booking edit feature:
- Check the main dashboard documentation
- Review API response error codes
- Contact the backend development team

---

**Last Updated:** September 21, 2025  
**Version:** 1.0  
**Compatibility:** Xequtive Dashboard v2.0+
