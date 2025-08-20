# Enhanced Taxi Booking System - New Features

## Overview

The Enhanced Taxi Booking System now supports **three booking types**, giving users the same flexibility they have in the Executive Cars system:

1. **One-Way** (default) - Point-to-point transportation
2. **Hourly** - Event-based hourly bookings (3-12 hours)
3. **Return** - Wait-and-return or later-date return journeys

## New Booking Types

### 1. One-Way Bookings
- **Default behavior** - No changes to existing functionality
- **Distance-based pricing** using the slab-based system
- **All existing features** remain intact (airport fees, surcharges, etc.)

**Example Request:**
```json
{
  "locations": {
    "pickup": { "address": "Heathrow Terminal 5", "coordinates": {...} },
    "dropoff": { "address": "City of London", "coordinates": {...} }
  },
  "datetime": { "date": "2024-08-12", "time": "10:00" },
  "passengers": { "count": 4, ... },
  "bookingType": "one-way"  // Optional, this is the default
}
```

### 2. Hourly Bookings
- **Duration**: 3-12 hours (same as Executive Cars system)
- **Pricing**: Fixed hourly rates per vehicle type
- **Distance**: Not relevant for hourly bookings
- **Perfect for**: Events, meetings, sightseeing, group transportation

**Example Request:**
```json
{
  "locations": {
    "pickup": { "address": "Heathrow Terminal 5", "coordinates": {...} },
    "dropoff": { "address": "City of London", "coordinates": {...} }
  },
  "datetime": { "date": "2024-08-12", "time": "10:00" },
  "passengers": { "count": 4, ... },
  "bookingType": "hourly",
  "hours": 6  // Required for hourly bookings
}
```

**Hourly Rates (same as Executive Cars):**
- **Saloon**: £30.00 (3-6h), £25.00 (6-12h)
- **Estate**: £35.00 (3-6h), £30.00 (6-12h)
- **MPV-6 Seater**: £35.00 (3-6h), £35.00 (6-12h)
- **MPV-8 Seater**: £40.00 (3-6h), £35.00 (6-12h)
- **Executive Saloon**: £45.00 (3-6h), £40.00 (6-12h)
- **Executive MPV-8**: £55.00 (3-6h), £50.00 (6-12h)
- **VIP-Saloon**: £75.00 (3-6h), £70.00 (6-12h)
- **VIP-SUV/MPV**: £85.00 (3-6h), £80.00 (6-12h)

### 3. Return Bookings
- **Two types**:
  - **Wait-and-Return**: Driver waits and returns (same day)
  - **Later-Date Return**: Separate pickup and return dates
- **Pricing**: Distance doubled + 10% discount
- **Perfect for**: Airport transfers, business meetings, day trips

**Example Request (Wait-and-Return):**
```json
{
  "locations": {
    "pickup": { "address": "Heathrow Terminal 5", "coordinates": {...} },
    "dropoff": { "address": "City of London", "coordinates": {...} }
  },
  "datetime": { "date": "2024-08-12", "time": "10:00" },
  "passengers": { "count": 4, ... },
  "bookingType": "return",
  "returnType": "wait-and-return"
}
```

**Example Request (Later-Date Return):**
```json
{
  "locations": {
    "pickup": { "address": "Heathrow Terminal 5", "coordinates": {...} },
    "dropoff": { "address": "City of London", "coordinates": {...} }
  },
  "datetime": { "date": "2024-08-12", "time": "10:00" },
  "passengers": { "count": 4, ... },
  "bookingType": "return",
  "returnType": "later-date",
  "returnDate": "2024-08-14",
  "returnTime": "16:00"
}
```

## API Endpoints

### Enhanced Fare Estimation
- **Endpoint**: `POST /api/fare-estimate/enhanced`
- **Authentication**: Required
- **New Parameters**:
  - `bookingType`: "one-way" | "hourly" | "return" (default: "one-way")
  - `hours`: number (3-12, required for hourly bookings)
  - `returnType`: "wait-and-return" | "later-date" (required for return bookings)
  - `returnDate`: string (YYYY-MM-DD, required for later-date returns)
  - `returnTime`: string (HH:MM, required for later-date returns)

### Enhanced Booking Creation
- **Endpoint**: `POST /api/bookings/create-enhanced`
- **Authentication**: Required
- **Same new parameters** as fare estimation

## Pricing Logic

### One-Way Bookings
- **Standard distance-based pricing** using slab system
- **All existing fees apply**: airport fees, time surcharges, special zones
- **No changes** to current pricing structure

### Hourly Bookings
- **Distance-based pricing replaced** with hourly rates
- **Airport fees still apply** (pickup/dropoff)
- **Time surcharges still apply** (peak/off-peak)
- **Equipment fees still apply** (baby seats, wheelchairs, etc.)
- **Formula**: `(Hourly Rate × Hours) + Airport Fees + Time Surcharges + Equipment Fees`

### Return Bookings
- **Distance doubled** (outbound + return)
- **10% discount applied** to total fare
- **All fees doubled** (airport fees, time surcharges, etc.)
- **Formula**: `(Base Fare × 2) × 0.9`

## Validation Rules

### Hourly Bookings
- **Hours**: Must be between 3 and 12
- **Error**: "Hourly bookings must be between 3 and 12 hours"

### Return Bookings
- **Return Type**: Required when `bookingType` is "return"
- **Return Date**: Required when `returnType` is "later-date"
- **Return Time**: Required when `returnType` is "later-date"

## Response Messages

### Hourly Bookings
- **Message**: "Hourly rate (X hours): £Y.YY/hour"
- **Distance Charge**: Set to 0 in breakdown
- **Total Fare**: Based on hourly calculation

### Return Bookings
- **Message**: "Return journey: Distance doubled"
- **Message**: "Return discount (10%): -£Y.YY"
- **Distance Charge**: Doubled in breakdown
- **Total Fare**: Includes 10% discount

## Backward Compatibility

- **All existing requests** continue to work unchanged
- **Default behavior** remains one-way bookings
- **No breaking changes** to existing API contracts
- **Optional parameters** for new features

## Testing Examples

### Test 1: Hourly Booking (6 hours)
```bash
curl -X POST http://localhost:5555/api/fare-estimate/enhanced \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "locations": {
      "pickup": {"address": "Heathrow Terminal 5", "coordinates": {"lat": 51.4700, "lng": -0.4873}},
      "dropoff": {"address": "City of London", "coordinates": {"lat": 51.5156, "lng": -0.0919}}
    },
    "datetime": {"date": "2024-08-12", "time": "10:00"},
    "passengers": {"count": 4, "checkedLuggage": 0, "handLuggage": 0, "mediumLuggage": 0, "babySeat": 0, "boosterSeat": 0, "childSeat": 0, "wheelchair": 0},
    "numVehicles": 1,
    "bookingType": "hourly",
    "hours": 6
  }'
```

### Test 2: Return Booking
```bash
curl -X POST http://localhost:5555/api/fare-estimate/enhanced \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "locations": {
      "pickup": {"address": "Heathrow Terminal 5", "coordinates": {"lat": 51.4700, "lng": -0.4873}},
      "dropoff": {"address": "City of London", "coordinates": {"lat": 51.5156, "lng": -0.0919}}
    },
    "datetime": {"date": "2024-08-12", "time": "10:00"},
    "passengers": {"count": 4, "checkedLuggage": 0, "handLuggage": 0, "mediumLuggage": 0, "babySeat": 0, "boosterSeat": 0, "childSeat": 0, "wheelchair": 0},
    "numVehicles": 1,
    "bookingType": "return",
    "returnType": "wait-and-return"
  }'
```

## Benefits

1. **Unified Experience**: Same booking types across both systems
2. **Flexibility**: Users can choose the most appropriate booking type
3. **No Price Changes**: All existing pricing remains exactly the same
4. **Enhanced Functionality**: More options for different use cases
5. **Consistent API**: Same parameter structure across all booking types

## Summary

The Enhanced Taxi Booking System now provides **complete feature parity** with the Executive Cars system for booking types, while maintaining all existing pricing and functionality. Users can seamlessly switch between one-way, hourly, and return bookings based on their specific needs, all through the same familiar API endpoints. 