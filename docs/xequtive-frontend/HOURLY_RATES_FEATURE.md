# 🕐 Hourly Rates Feature - Frontend Implementation Guide

## **Overview**
The backend now includes **hourly rates** for all vehicle types in the enhanced booking system. This feature allows the frontend to display the hourly rate for each vehicle when customers are booking hourly services.

## **What's New**

### **✅ Hourly Rates Added to Vehicle Information**
Every vehicle now includes an `hourlyRate` field when the booking type is "hourly":

```json
{
  "vehicle": {
    "id": "saloon",
    "name": "Standard Saloon",
    "price": {
      "amount": 45.00,
      "currency": "GBP"
    },
    "hourlyRate": 30  // NEW: Hourly rate in GBP per hour
  }
}
```

### **✅ Available Hourly Rates by Vehicle Type**

| Vehicle Type | Hourly Rate | Description |
|-------------|-------------|-------------|
| **Standard Saloon** | £30/hour | Comfortable and efficient standard saloon |
| **Estate** | £30/hour | Spacious vehicle with extra luggage space |
| **MPV-6 Seater** | £35/hour | Spacious vehicle for up to 6 passengers |
| **MPV-8 Seater** | £45/hour | Large vehicle for up to 8 passengers |
| **Executive Saloon** | £45/hour | Premium saloon with enhanced comfort |
| **Executive MPV** | £45/hour | Premium MPV with enhanced comfort |
| **VIP Saloon** | £50/hour | Luxury saloon with premium features |
| **VIP SUV/MPV** | £50/hour | Luxury SUV/MPV with premium features |

## **Frontend Implementation**

### **1. Display Hourly Rates in Booking Form**

When the booking type is "hourly", show the hourly rate for each vehicle:

```jsx
// Example React component
const VehicleOption = ({ vehicle, bookingType }) => {
  return (
    <div className="vehicle-option">
      <h3>{vehicle.name}</h3>
      <p>Capacity: {vehicle.capacity.passengers} passengers, {vehicle.capacity.luggage} luggage</p>
      
      {/* Show hourly rate for hourly bookings */}
      {bookingType === "hourly" && vehicle.hourlyRate && (
        <div className="hourly-rate">
          <span className="rate-label">Hourly Rate:</span>
          <span className="rate-value">£{vehicle.hourlyRate}/hour</span>
        </div>
      )}
      
      <div className="price">
        <span className="amount">£{vehicle.price.amount}</span>
        <span className="currency">{vehicle.price.currency}</span>
      </div>
    </div>
  );
};
```

### **2. Show Hourly Rate in Booking Confirmation**

Display the hourly rate in the booking confirmation page:

```jsx
const BookingConfirmation = ({ booking }) => {
  return (
    <div className="booking-confirmation">
      <h2>Booking Confirmed</h2>
      
      <div className="booking-details">
        <h3>Vehicle Details</h3>
        <p><strong>Vehicle:</strong> {booking.vehicle.name}</p>
        
        {/* Show hourly rate for hourly bookings */}
        {booking.bookingType === "hourly" && booking.vehicle.hourlyRate && (
          <p><strong>Hourly Rate:</strong> £{booking.vehicle.hourlyRate}/hour</p>
        )}
        
        <p><strong>Total Price:</strong> £{booking.vehicle.price.amount}</p>
      </div>
    </div>
  );
};
```

### **3. Update Vehicle Selection UI**

Enhance the vehicle selection to highlight hourly rates:

```jsx
const VehicleSelection = ({ vehicles, bookingType, selectedHours }) => {
  return (
    <div className="vehicle-selection">
      <h3>Select Vehicle</h3>
      
      {vehicles.map(vehicle => (
        <div key={vehicle.id} className="vehicle-card">
          <div className="vehicle-info">
            <h4>{vehicle.name}</h4>
            <p>{vehicle.capacity.passengers} passengers • {vehicle.capacity.luggage} luggage</p>
          </div>
          
          <div className="pricing">
            {/* Show hourly rate prominently for hourly bookings */}
            {bookingType === "hourly" && vehicle.hourlyRate && (
              <div className="hourly-rate-section">
                <div className="rate-display">
                  <span className="rate">£{vehicle.hourlyRate}</span>
                  <span className="unit">/hour</span>
                </div>
                {selectedHours && (
                  <div className="total-estimate">
                    Est. Total: £{(vehicle.hourlyRate * selectedHours).toFixed(2)}
                  </div>
                )}
              </div>
            )}
            
            <div className="base-price">
              <span className="amount">£{vehicle.price.amount}</span>
              <span className="currency">{vehicle.price.currency}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## **API Response Structure**

### **Enhanced Fare Estimate Response**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "saloon",
        "name": "Standard Saloon",
        "price": {
          "amount": 45.00,
          "currency": "GBP"
        },
        "hourlyRate": 30,  // NEW: Only present for hourly bookings
        "capacity": {
          "passengers": 4,
          "luggage": 2
        }
      }
    ]
  }
}
```

### **Booking Confirmation Response**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "booking-id",
      "referenceNumber": "XEQ_123",
      "bookingType": "hourly",
      "hours": 6,
      "vehicle": {
        "id": "saloon",
        "name": "Standard Saloon",
        "price": {
          "amount": 180.00,
          "currency": "GBP"
        },
        "hourlyRate": 30  // NEW: Hourly rate included
      }
    }
  }
}
```

## **Important Notes**

### **⚠️ When Hourly Rates Are Included**
- **Only for hourly bookings**: The `hourlyRate` field is only present when `bookingType === "hourly"`
- **Not for one-way/return**: One-way and return bookings don't include hourly rates
- **Always in GBP**: All hourly rates are in British Pounds (GBP)

### **✅ Frontend Validation**
- Check if `vehicle.hourlyRate` exists before displaying
- Use conditional rendering: `{vehicle.hourlyRate && <HourlyRateDisplay />}`
- Handle cases where hourly rate might be 0 or undefined

### **🎯 User Experience**
- **Clear Display**: Show hourly rates prominently in vehicle selection
- **Total Calculation**: Calculate estimated total (rate × hours) for better UX
- **Confirmation**: Include hourly rate in booking confirmation
- **Consistent Formatting**: Use consistent currency formatting (£XX/hour)

## **CSS Styling Suggestions**

```css
.hourly-rate {
  background: #e8f5e8;
  border: 1px solid #4caf50;
  border-radius: 4px;
  padding: 8px 12px;
  margin: 8px 0;
}

.hourly-rate .rate-label {
  font-weight: 600;
  color: #2e7d32;
}

.hourly-rate .rate-value {
  font-size: 1.2em;
  font-weight: bold;
  color: #1b5e20;
}

.rate-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.rate {
  font-size: 1.5em;
  font-weight: bold;
  color: #2e7d32;
}

.unit {
  font-size: 0.9em;
  color: #666;
}
```

## **Testing**

### **Test Cases**
1. **Hourly Booking**: Verify hourly rates are displayed
2. **One-way Booking**: Verify hourly rates are NOT displayed
3. **Return Booking**: Verify hourly rates are NOT displayed
4. **All Vehicle Types**: Test all 8 vehicle types have correct hourly rates
5. **Rate Calculation**: Test total calculation (rate × hours)

### **Sample Test Data**
```javascript
// Test hourly booking response
const hourlyBooking = {
  bookingType: "hourly",
  hours: 4,
  vehicle: {
    id: "saloon",
    name: "Standard Saloon",
    hourlyRate: 30,  // Should be present
    price: { amount: 120, currency: "GBP" }
  }
};

// Test one-way booking response
const oneWayBooking = {
  bookingType: "one-way",
  vehicle: {
    id: "saloon",
    name: "Standard Saloon",
    // hourlyRate should NOT be present
    price: { amount: 45, currency: "GBP" }
  }
};
```

## **Summary**

The hourly rates feature provides:
- ✅ **Clear Pricing**: Customers see exactly what they'll pay per hour
- ✅ **Better UX**: Transparent pricing for hourly services
- ✅ **Consistent Data**: All vehicle types include hourly rates
- ✅ **Flexible Display**: Easy to show/hide based on booking type

**The frontend team can now implement clear, transparent hourly rate display for all hourly bookings!**

---

**Last Updated:** January 2024  
**Version:** 1.0  
**Status:** Ready for Frontend Implementation
