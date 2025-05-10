# Xequtive Fare Calculation System Documentation

## Executive Summary

Xequtive's fare calculation system is designed to provide transparent, consistent, and fair pricing for all journeys across our range of premium vehicles. This document provides a detailed overview of how fares are calculated, what factors influence pricing, and how our system handles various scenarios.

## Core Components

### 1. Route Planning and Distance Calculation

Our system uses the Mapbox Directions API, a leading mapping service, to calculate:

- Optimal routes between locations
- Total journey distance in kilometers
- Estimated journey duration in minutes
- Route segments for multi-stop journeys

For each journey, we determine the most efficient route considering road types, typical traffic patterns, and geographical constraints. The route calculation incorporates all stops in the sequence provided by the customer.

### 2. Vehicle Types and Base Pricing

Xequtive offers nine distinct vehicle classes to meet different customer needs:

| Vehicle Type          | Examples                               | Capacity                             | Base Rate (per km) | Minimum Fare |
| --------------------- | -------------------------------------- | ------------------------------------ | ------------------ | ------------ |
| Standard Saloon       | Toyota Prius, Ford Mondeo              | 4 passengers, 2 luggage              | £2.50              | £15.00       |
| Estate                | VW Passat Estate, Skoda Octavia Estate | 4 passengers, 4 luggage              | £3.00              | £18.00       |
| Large MPV             | Ford Galaxy, VW Sharan                 | 6 passengers, 4 luggage              | £3.50              | £22.00       |
| Extra Large MPV       | Ford Tourneo, VW Transporter           | 8 passengers, 8 luggage              | £4.00              | £25.00       |
| Executive Saloon      | Mercedes E-Class, BMW 5-Series         | 3 passengers, 2 luggage              | £4.50              | £30.00       |
| Executive Large MPV   | Mercedes Vito, VW Caravelle            | 7 passengers, 7 luggage              | £5.50              | £40.00       |
| VIP                   | Mercedes S-Class, BMW 7-Series         | 3 passengers, 2 luggage              | £7.00              | £50.00       |
| VIP MPV               | Mercedes V-Class                       | 6 passengers, 6 luggage              | £8.50              | £60.00       |
| Wheelchair Accessible | Specially adapted vans                 | 4 passengers + wheelchair, 2 luggage | £3.50              | £25.00       |

### 3. Premium Vehicle Features

Higher-tier vehicles include additional features:

- **Executive Vehicles**: WiFi, Bottled Water, Newspaper
- **VIP Vehicles**: WiFi, Premium Drinks, Luxury Interior, Professional Chauffeur
- **Wheelchair Accessible**: Wheelchair Ramp, Secure Wheelchair Fastening

## Detailed Fare Calculation Process

### Step 1: Base Fare Calculation

For each vehicle type, we calculate the initial fare using:

```
Initial Fare = Base Rate + (Distance in km × Base Rate per km)
```

For example, a 20 km journey in a Standard Saloon would have an initial fare of:

```
£2.50 + (20 km × £2.50/km) = £52.50
```

### Step 2: Time & Day Adjustments

We apply multipliers based on the time and day of travel:

#### Time-Based Factors:

| Time Period                    | Multiplier | Explanation                             |
| ------------------------------ | ---------- | --------------------------------------- |
| Weekday Peak (7-10 AM, 4-7 PM) | 1.5        | 50% surcharge during weekday rush hours |
| Night Hours (10 PM - 5 AM)     | 1.3        | 30% surcharge for night-time services   |
| Weekend Peak (10 AM - 8 PM)    | 1.2        | 20% surcharge during busy weekend hours |

#### Day-Based Factors:

| Day Type                   | Multiplier | Explanation                        |
| -------------------------- | ---------- | ---------------------------------- |
| Weekends (Saturday/Sunday) | 1.2        | 20% surcharge for weekend services |
| Public Holidays            | 1.4        | 40% surcharge for holiday services |

These multipliers are applied to the initial fare:

```
Adjusted Fare = Initial Fare × Time Multiplier
```

Multiple multipliers may apply. For example, a journey at 11 PM on a Saturday would have both the Night Hours (1.3) and Weekend (1.2) multipliers:

```
Adjusted Fare = Initial Fare × 1.3 × 1.2
```

### Step 3: Additional Charges

We add fees for additional services:

- **Additional Stops**: £5.00 per stop (beyond pickup and dropoff locations)
- **Wait Time**: Currently not charged but planned for future implementation

```
Fare with Extras = Adjusted Fare + (Number of Additional Stops × £5.00)
```

### Step 4: Minimum Fare Protection

To ensure driver earnings on short journeys, we apply a minimum fare:

```
Final Fare = MAX(Fare with Extras, Minimum Fare for Vehicle Type)
```

For example, if a Standard Saloon journey calculates to £13.50 but the minimum fare is £15.00, the customer will be charged £15.00.

### Step 5: Final Rounding

For simplicity in payment processing and communication:

```
Final Charged Fare = ROUND UP(Final Fare to nearest £0.50)
```

For example, £87.30 would be rounded to £87.50.

## Example Fare Calculations

### Example 1: Short Local Trip

**Scenario**: Tuesday at 2 PM, 5 km journey in a Standard Saloon with no additional stops

**Calculation**:

1. Initial Fare = £2.50 + (5 km × £2.50/km) = £15.00
2. Time Multiplier = 1.0 (off-peak)
3. Adjusted Fare = £15.00 × 1.0 = £15.00
4. No additional stops = £0.00
5. Fare with Extras = £15.00
6. Minimum Fare Check: £15.00 vs. £15.00 (equals minimum)
7. Final Fare = £15.00

### Example 2: Airport Transfer (Peak Hour)

**Scenario**: Monday at 8 AM, 30 km journey in an Executive Saloon with one additional stop

**Calculation**:

1. Initial Fare = £4.50 + (30 km × £4.50/km) = £139.50
2. Time Multiplier = 1.5 (weekday peak hour)
3. Adjusted Fare = £139.50 × 1.5 = £209.25
4. One additional stop = £5.00
5. Fare with Extras = £209.25 + £5.00 = £214.25
6. Minimum Fare Check: £214.25 vs. £30.00 (exceeds minimum)
7. Final Fare = £214.50 (rounded up)

### Example 3: Weekend Night Journey

**Scenario**: Saturday at 11 PM, 15 km journey in a VIP vehicle with no additional stops

**Calculation**:

1. Initial Fare = £7.00 + (15 km × £7.00/km) = £112.00
2. Time Multipliers = 1.3 (night) × 1.2 (weekend) = 1.56
3. Adjusted Fare = £112.00 × 1.56 = £174.72
4. No additional stops = £0.00
5. Fare with Extras = £174.72
6. Minimum Fare Check: £174.72 vs. £50.00 (exceeds minimum)
7. Final Fare = £175.00 (rounded up)

## Special Case Handling

### Very Long Journeys

For exceptionally long journeys (over 100 km), the standard fare calculation applies without adjustments. The example below shows how the fare would be calculated for a very long journey:

**Scenario**: 500 km journey in a Standard Saloon during off-peak hours

**Calculation**:

1. Initial Fare = £2.50 + (500 km × £2.50/km) = £1,252.50
2. Time Multiplier = 1.0 (off-peak)
3. Adjusted Fare = £1,252.50
4. Final Fare = £1,252.50

### Multiple Additional Stops

Each additional stop adds £5.00 to the fare. For journeys with multiple stops:

**Scenario**: 20 km journey with 3 additional stops in an Estate car

**Calculation**:

1. Initial Fare = £3.00 + (20 km × £3.00/km) = £63.00
2. Assuming off-peak: £63.00
3. Three additional stops = 3 × £5.00 = £15.00
4. Fare with Extras = £63.00 + £15.00 = £78.00
5. Final Fare = £78.00

## ETA Calculation

Estimated Time of Arrival (ETA) is provided to customers based on:

- A base ETA value for each vehicle type (ranging from 5-15 minutes)
- The estimated journey duration from Mapbox (in minutes)

| Vehicle Type                  | Base ETA to Pickup |
| ----------------------------- | ------------------ |
| Standard Saloon               | 5 minutes          |
| Estate                        | 6 minutes          |
| Large MPV                     | 8 minutes          |
| Extra Large MPV               | 10 minutes         |
| Executive Saloon              | 7 minutes          |
| Executive Large MPV           | 9 minutes          |
| VIP                           | 12 minutes         |
| VIP MPV                       | 15 minutes         |
| Wheelchair Accessible Vehicle | 10 minutes         |

## Future Enhancements Planned

1. **Dynamic Traffic-Based Pricing**: Adjustments based on real-time traffic conditions
2. **Wait Time Charges**: Additional fees for waiting time at pickup or stops
3. **Weather Condition Adjustments**: Surcharges during adverse weather
4. **Dynamic ETA**: Calculation based on actual driver locations
5. **Loyalty Discounts**: Reduced fares for frequent customers

## Technical Implementation

The fare calculation system is implemented as part of the Xequtive backend API:

- **Technology**: Node.js with Express framework
- **External APIs**: Mapbox Directions API for route planning
- **Security**: All fare calculations require authentication
- **Response Time**: Fare calculations typically complete in under 2 seconds

## Glossary of Terms

- **Base Rate**: The starting charge for a journey with a particular vehicle type
- **Per Kilometer Rate**: The amount charged per kilometer of the journey
- **Minimum Fare**: The lowest fare that will be charged, regardless of calculated fare
- **Time Multiplier**: A factor applied to the fare based on time of day
- **ETA**: Estimated Time of Arrival - the predicted time for a vehicle to reach the pickup location
