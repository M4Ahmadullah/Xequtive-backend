# Xequtive Fare Calculation Documentation

## Overview

This document details the fare calculation methodology used by Xequtive for all vehicle types. Our system ensures transparent, consistent pricing while accounting for factors such as distance, time of day, vehicle class, and additional services.

## Executive Cars vs Executive Taxi

Xequtive operates two distinct booking systems:

### **Executive Taxi (Point-to-Point)**
- Standard taxi service for direct journeys
- **NEW**: Now supports one-way, hourly (3-12 hours), and return bookings
- Uses the fare calculation system documented here
- Available through `/api/fare-estimate/enhanced` endpoint
- **NEW**: Hourly bookings use tiered pricing (3-6h vs 6-12h)
- **NEW**: Return bookings receive 10% discount

### **Executive Cars (Event & Group Transportation)**
- Specialized service for events, hourly bookings, and group travel
- Separate pricing structure with dedicated rates
- Available through `/api/hourly-bookings/fare-estimate` endpoint
- Includes hourly bookings (3-12 hours), one-way, and return journeys
- **Return Bookings**: 10% discount applied to all fares

## User Input and Fare Calculation Flow

Our fare calculation system requires the following information from users to generate accurate fare estimates:

1. **Journey Details**:

   - Pickup location (address and/or coordinates)
   - Dropoff location (address and/or coordinates)
   - Any additional stops (addresses and/or coordinates)
   - Date and time of pickup

2. **Passenger Information**:

   - Number of passengers
   - Amount of luggage (checked and hand luggage)

3. **Vehicle Preference**:
   - Selected vehicle type

### Fare Calculation Process

Once this information is provided, our system follows these steps to calculate the fare:

1. **Route Calculation**: Using Mapbox Directions API (replacing Google Distance Matrix API), we calculate the optimized route between all provided locations
2. **Distance Determination**: Total journey distance in miles is measured along the calculated route
3. **Time Estimation**: Travel duration is estimated based on the route and typical traffic conditions
4. **Base Fare Application**: The appropriate base fare and per-mile rate is applied based on the selected vehicle
5. **Time Multiplier**: System checks if the journey falls within peak hours, weekends, or night hours
6. **Additional Charges**: Extra stops, waiting time, and special services are added
7. **Location-Based Fees**: Airport and congestion zone charges are automatically detected and applied
8. **Final Calculation**: All components are combined and rounded to provide the final fare estimate

## Automated Location Detection for Special Zones

Our system now includes intelligent location detection that automatically identifies when a journey involves airports or congestion charge zones, ensuring accurate pricing without requiring manual input.

### Airport Detection

The system automatically detects when a pickup or dropoff location is at one of London's major airports:

- **How It Works**: We maintain geofenced boundaries around Heathrow, Gatwick, Luton, Stansted, and City Airport
- **Automatic Application**: When a pickup or dropoff point falls within these boundaries, the appropriate airport fee is automatically added
- **User Notification**: A message is displayed to the user: "Your journey includes airport pickup/dropoff at [Airport Name]. An airport fee of £[Amount] has been added to your fare."

### Congestion Charge Zone Detection

The system detects when a journey passes through London's Congestion Charge Zone (CCZ):

- **Route Analysis**: Our system analyzes the calculated route to determine if it passes through the CCZ
- **Automatic Application**: If the route crosses the CCZ, the £7.50 charge is automatically added
- **User Notification**: A message is displayed: "Your journey passes through the Congestion Charge Zone. A £7.50 charge has been added to your fare."
- **Time-Based Application**: The charge is only applied during CCZ operating hours (Monday to Friday, 7am to 6pm)

### Dartford Crossing Detection

For journeys crossing the River Thames via the Dartford Crossing:

- **Route Analysis**: The system detects if the calculated route includes the Dartford Crossing
- **Automatic Application**: If the crossing is part of the route, the £4.00 charge is automatically added
- **User Notification**: A message is displayed: "Your journey includes the Dartford Crossing. A £4.00 charge has been added to your fare."

## Vehicle Types and Base Pricing

| Vehicle Type        | Capacity (Passengers) | Base Fare (£) | Per Mile Rate (£) | Waiting Time (per hour) |
| ------------------- | :-------------------: | :-----------: | :---------------: | :---------------------: |
| Standard Saloon     |           4           |     £6.50     |       £2.95       |         £25.00          |
| Estate              |           4           |     £6.50     |       £3.45       |         £30.00          |
| MPV-6               |           6           |    £12.50     |       £6.45       |         £35.00          |
| MPV-8               |           8           |    £18.50     |       £6.95       |         £45.00          |
| Executive Saloon    |           3           |    £10.50     |       £5.95       |         £45.00          |
| Executive MPV-8     |           6           |    £20.50     |       £7.95       |         £55.00          |
| VIP Executive       |           3           |    £35.00     |       £7.45       |         £75.00          |
| VIP Executive MPV   |           6           |    £35.00     |       £7.95       |         £95.00          |
| WAV                 |           4           |    £12.50     |       £4.75       |         £35.00          |

## Vehicle Features

### Standard Vehicles

- **Standard Saloon**: Toyota Prius, Ford Mondeo
  - Accommodates 4 passengers with 2 standard luggage items
  - Economical and comfortable for city travel
  - Ideal for individual and small group travel

- **Estate**: Mercedes E-Class Estate, Volkswagen Passat Estate
  - Accommodates 4 passengers with 4 standard luggage items
  - Extra luggage space for airport transfers or shopping trips
  - Perfect balance of comfort and capacity

- **MPV-6**: Ford Galaxy, Volkswagen Sharan
  - Accommodates 6 passengers with 4 luggage items
  - Spacious seating arrangement for group travel
  - Flexible interior configuration

- **MPV-8**: Ford Tourneo, Mercedes Vito
  - Accommodates 8 passengers with 6 luggage items
  - Maximum capacity for both passengers and luggage
  - Ideal for group transportation

### Premium Vehicles

- **Executive Saloon**: Mercedes E-Class, BMW 5-Series
  - Accommodates 3 passengers with 2 luggage items
  - WiFi, bottled water, professional chauffeur, flight tracking
  - Premium comfort for business travel and special occasions

- **VIP Executive**: Mercedes S-Class, BMW 7-Series
  - Accommodates 3 passengers with 2 luggage items
  - WiFi, premium drinks, luxury interior, professional chauffeur, priority service, privacy partition
  - Ultimate luxury experience for high-profile clients

- **VIP Executive MPV**: Mercedes V-Class Luxury
  - Accommodates 6 passengers with 4 luggage items
  - WiFi, premium drinks, luxury interior, professional chauffeur, priority service, enhanced climate control
  - Premium group transportation with the highest level of service

### Special Vehicles

- **Wheelchair Accessible Vehicle (WAV)**: Specially adapted vans
  - Accommodates 4 passengers + wheelchair, 2 luggage items
  - Wheelchair ramp and secure wheelchair fastening
  - Trained drivers for wheelchair assistance
  - Ideal for accessible transportation needs

## Enhanced Taxi Booking Types

**NEW**: The Enhanced Taxi system now supports three distinct booking types, providing flexibility for different travel needs:

### **1. One-Way Bookings (Default)**
- **Description**: Standard point-to-point journey
- **Pricing**: Distance-based fare calculation using slab pricing
- **Use Case**: Airport transfers, business meetings, shopping trips
- **Additional Features**: All standard features (time surcharges, airport fees, special zones)

### **2. Hourly Bookings (3-12 Hours)**
- **Description**: Continuous service where the driver stays with you
- **Pricing**: Tiered hourly rates × number of hours
  - **3-6 Hours**: Higher hourly rates for shorter durations
  - **6-12 Hours**: Lower hourly rates for longer durations
- **Use Case**: Business meetings, shopping trips, city tours, event transportation
- **Additional Features**: 
  - Waiting time included in hourly rate
  - Same tiered pricing as Executive Cars system
  - Distance-based pricing replaced with hourly pricing

### **3. Return Bookings**
- **Description**: Round-trip journeys with two options
- **Pricing**: Distance doubled + 10% discount applied
- **Options**:
  - **Wait-and-Return**: Driver waits at destination and returns you later
  - **Later-Date**: Two separate scheduled one-way journeys
- **Use Case**: Business meetings, airport pickups with return, day trips
- **Additional Features**: 
  - 10% discount on total fare
  - Flexible return timing
  - Same pricing structure as Executive Cars return bookings

### **Enhanced Taxi vs Executive Cars Pricing**
- **One-Way**: Uses standard Enhanced Taxi pricing (slab-based distance rates)
- **Hourly**: Uses Executive Cars hourly rates (tiered 3-6h vs 6-12h)
- **Return**: Uses Executive Cars return logic (distance doubled + 10% discount)
- **All Other Features**: Time surcharges, airport fees, special zones remain the same

### **Enhanced Taxi Hourly Rates (3-12 Hours)**

**NEW**: Enhanced Taxi now uses the same tiered hourly pricing as Executive Cars:

| Vehicle Type | 3-6 Hours | 6-12 Hours |
|-------------|-----------|-------------|
| Saloon | £30.00 | £25.00 |
| Estate | £35.00 | £30.00 |
| MPV-6 Seater | £35.00 | £35.00 |
| MPV-8 Seater | £40.00 | £35.00 |
| Executive Saloon | £45.00 | £40.00 |
| Executive MPV-8 | £55.00 | £50.00 |
| VIP-Saloon | £75.00 | £70.00 |
| VIP-SUV/MPV | £85.00 | £80.00 |

**Hourly Pricing Notes**:
- **3-6 Hours**: Higher hourly rates for shorter durations
- **6-12 Hours**: Lower hourly rates for longer durations
- **Total Fare**: Hours × hourly rate + additional fees (airport fees, time surcharges, special zones)
- **Waiting Time**: Included in hourly rate, no additional charges
- **Distance**: Not used for hourly bookings (replaced by hourly pricing)

## Pricing Structure Overview

### Distance-Based Pricing
Our fare calculation uses a granular, multi-tiered distance-based pricing model. Each vehicle type has unique per-mile rates across 10 distinct distance ranges:

1. 0-4 miles
2. 4.1-10.9 miles
3. 11-20 miles
4. 21-40 miles
5. 41-60 miles
6. 61-80 miles
7. 81-99 miles
8. 100-149 miles
9. 150-299 miles
10. 300+ miles

### Detailed Per Mile Rates

| Vehicle Type | 0-4 miles | 4.1-10.9 miles | 11-20 miles | 21-40 miles | 41-60 miles | 61-80 miles | 81-99 miles | 100-149 miles | 150-299 miles | 300+ miles |
|-------------|-----------|----------------|-------------|-------------|-------------|-------------|-------------|---------------|---------------|------------|
| Standard Saloon | £3.95 | £2.95 | £2.80 | £2.66 | £2.36 | £2.21 | £1.92 | £1.77 | £1.62 | £1.48 |
| Estate | £4.95 | £3.45 | £3.28 | £3.11 | £2.76 | £2.59 | £2.24 | £2.07 | £1.90 | £1.73 |
| MPV-6 Seater | £6.95 | £6.45 | £5.97 | £4.35 | £3.39 | £3.55 | £3.23 | £3.06 | £2.90 | £2.74 |
| MPV-8 Seater | £7.95 | £6.95 | £6.43 | £4.69 | £4.00 | £3.82 | £3.48 | £3.30 | £3.13 | £2.95 |
| Executive Saloon | £7.95 | £5.95 | £5.50 | £4.02 | £3.42 | £3.27 | £2.98 | £2.83 | £2.68 | £2.53 |
| Executive MPV-8 | £7.95 | £7.95 | £6.56 | £6.16 | £5.96 | £5.76 | £4.77 | £4.57 | £3.78 | £3.58 |
| VIP Executive | £7.95 | £7.45 | £7.26 | £5.03 | £4.28 | £4.10 | £3.73 | £3.54 | £3.35 | £3.17 |
| VIP Executive MPV | £8.95 | £7.95 | £7.55 | £7.16 | £6.76 | £6.36 | £6.16 | £5.96 | £5.37 | £4.97 |

### Time-Based Surcharges

#### **Weekday Surcharges (Monday-Thursday)**

**NON-PEAK (12:00 AM - 5:59 AM):**
- **All Vehicle Types**: No surcharge

**PEAK-MEDIUM (6:00 AM - 2:59 PM):**
- **Saloon**: £3.00
- **Estate**: £3.00
- **MPV-6**: £3.00
- **MPV-8**: £3.00
- **Executive Saloon**: £5.00
- **Executive MPV**: £5.00
- **VIP-Saloon**: £7.00
- **VIP-SUV**: £7.00

**PEAK-HIGH (3:00 PM - 11:59 PM):**
- **Saloon**: £3.00
- **Estate**: £3.00
- **MPV-6**: £5.00
- **MPV-8**: £5.00
- **Executive Saloon**: £7.00
- **Executive MPV**: £7.00
- **VIP-Saloon**: £9.00
- **VIP-SUV**: £9.00

#### **Weekend Surcharges (Friday-Sunday)**

**NON-PEAK (12:00 AM - 5:59 AM):**
- **All Vehicle Types**: No surcharge

**PEAK-MEDIUM (6:00 AM - 2:59 PM):**
- **All Vehicle Types**: No surcharge

**PEAK-HIGH (3:00 PM - 11:59 PM):**
- **Saloon**: £3.00
- **Estate**: £3.00
- **MPV-6**: £3.00
- **MPV-8**: £3.00
- **Executive Saloon**: £7.00
- **Executive MPV**: £5.00
- **VIP-Saloon**: £5.00
- **VIP-SUV**: £7.00

### Minimum Fares

| Vehicle Type | Minimum Fare |
|-------------|--------------|
| Standard Saloon | £12.40 |
| Estate | £13.40 |
| MPV-6 Seater | £16.40 |
| MPV-8 Seater | £51.20 |
| Executive Saloon | £20.40 |
| Executive MPV-8 | £44.30 |
| VIP Executive | £66.80 |
| VIP Executive MPV | £70.80 |

## Additional Charges

### Additional Stops

| Vehicle Type | Per Additional Stop (£) |
|-------------|-------------------------|
| Standard Saloon | £2.50 |
| Estate | £3.50 |
| MPV-6 | £4.50 |
| MPV-8 | £4.50 |
| Executive Saloon | £5.50 |
| VIP Executive | N/A |
| VIP Executive MPV | N/A |

### Waiting Time

| Vehicle Type | Per Minute (£) | Per Hour (£) |
|-------------|----------------|--------------|
| Standard Saloon | £0.42 | £25.00 |
| Estate | £0.58 | £30.00 |
| MPV-6 | £0.58 | £35.00 |
| MPV-8 | £0.67 | £45.00 |
| Executive Saloon | £0.67 | £45.00 |
| VIP Executive | £1.25 | £75.00 |
| VIP Executive MPV | £1.58 | £95.00 |

## Fare Calculation Formula

```
Total Fare = Base Fare + (Distance in miles × Per Mile Rate) + Additional Charges
```

## Rounding and Minimum Fare

- Fares are rounded up to the nearest £0.50
- Minimum fares apply to protect driver earnings on short trips

## Seasonal and Event Pricing

### Holiday Surcharges
- Christmas Eve & Christmas Day: 50% surcharge
- New Year's Eve (after 6pm) & New Year's Day: 50% surcharge
- Bank Holidays: 25% surcharge

### Major Event Surcharges
- Standard Event Surcharge: 15% on all fares
- Premium Events: 25% on all fares

## Special Location Fees

### Congestion Charge Zone
- £7.50 (Monday-Friday, 7am-6pm)

### Airport Fees

#### Airport Dropoff Fees
| Airport | Fee (£) |
|---------|---------|
| Heathrow | £6.00 |
| Gatwick | £7.00 |
| Luton | £6.00 |
| Stansted | £7.00 |
| City Airport | FREE |
| Birmingham | £6.00 |

#### Airport Pickup Fees

**Standard Vehicles (30-Min Wait):**
| Airport | Fee (£) |
|---------|---------|
| Heathrow | £7.50 |
| Gatwick | £10.00 |
| Luton | £11.00 |
| Stansted | £10.00 |
| City Airport | £6.90 |
| Birmingham | £9.50 |

**Executive/VIP Vehicles (60-Min Wait):**
| Airport | Fee (£) |
|---------|---------|
| Heathrow | £18.50 |
| Gatwick | £15.50 |
| Luton | £17.50 |
| Stansted | £18.00 |
| City Airport | £19.90 |
| Birmingham | £9.50 |

### Dartford Crossing
- £2.50 per crossing (reduced from £4.00)

### Blackwell & Silverstone Tunnel
- **Peak Times**: £4.00 (Monday-Friday, 6-10AM & 4-7PM)
- **Off-Peak Times**: £1.50 (All other times)

## Additional Services

### Child Safety Equipment
- Baby Seat (0-18 Months): £10.00 per seat
- Child Seat (18 Months - 4 Years): £10.00 per seat
- Booster Seat (4-6 Years): £10.00 per seat

### Accessibility Equipment
- Foldable Wheelchair: £25.00 per wheelchair

## Notes
- Prices effective from June 2023
- Subject to periodic review
- VAT inclusive where applicable
- Corporate and volume discounts may apply

## Future Enhancements
- Machine learning-based dynamic pricing
- Real-time traffic integration
- Personalized pricing models
