# Xequtive Fare Calculator Updates

## Overview of Changes

### Distance-Based Pricing Refinement
- Introduced more granular distance ranges (10 distinct ranges)
- Implemented progressive per-mile rate reduction
- Enhanced pricing transparency and fairness

### Time-Based Surcharge Model
- Developed sophisticated time-based pricing
- Differentiated surcharges by:
  - Vehicle type
  - Day of week
  - Time of day

### Key Improvements
1. **Granular Distance Pricing**
   - 0-4 miles: Highest per-mile rate
   - Gradual rate reduction for longer journeys
   - Encourages longer trips with better value

2. **Dynamic Time Surcharges**
   - Weekday peak periods (06:00-23:59)
   - Weekend evening peak (15:00-23:59)
   - Reflects real-time demand and operational costs

3. **Minimum Fare Guarantee**
   - Ensures service sustainability
   - Varies by vehicle type
   - Protects against extremely short trips

## Technical Implementation

### Configuration Files Updated
- `src/config/vehicleTypes.ts`
- `src/config/timePricing.ts`
- `src/services/fare.service.ts`

### Calculation Method
```typescript
function calculateFare(journey) {
  const baseFare = getBaseRate(vehicleType);
  const distanceFare = calculateDistanceFare(journey.distance);
  const timeSurcharge = calculateTimeSurcharge(journey.datetime);
  const additionalFees = calculateAdditionalFees(journey);
  
  const totalFare = baseFare + distanceFare + timeSurcharge + additionalFees;
  return roundToNearestFifty(totalFare);
}
```

## Pricing Philosophy
- Transparent and fair pricing
- Reflects operational complexity
- Encourages efficient trip planning

## Future Roadmap
- Machine learning price optimization
- Real-time traffic integration
- Personalized pricing models

## Pricing Overview

This document outlines the updated pricing structure for Xequtive's transportation services, effective from the latest revision.

### Vehicle Categories

#### Standard Comfort Class
1. **Vehicle Types**:
   - Saloon
   - Estate
   - MPV-6 Seater
   - MPV-8 Seater

#### Business Class
1. **Vehicle Types**:
   - Executive Saloon
   - Executive MPV-8
   - VIP-Saloon
   - VIP-SUV/MPV

### Detailed Pricing Structure

#### Reservation Fees
| Vehicle Type | Non-Peak (2:00 AM) | Peak (8:00 PM) |
|-------------|-------------------|---------------|
| Saloon | £8.50 | £17.00 |
| Estate | £8.50 | £18.00 |
| MPV-6 Seater | £12.50 | £21.00 |
| MPV-8 Seater | £18.50 | £41.00 |
| Executive Saloon | £18.50 | £45.00 |
| Executive MPV-8 | £18.50 | £60.00 |
| VIP-Saloon | £35.00 | - |
| VIP-SUV/MPV | £35.00 | - |

#### Minimum Fares
| Vehicle Type | Minimum Fare |
|-------------|--------------|
| Saloon | £16.40 |
| Estate | £18.40 |
| MPV-6 Seater | £26.40 |
| MPV-8 Seater | £50.30 |
| Executive Saloon | £34.40 |
| Executive MPV-8 | £50.30 |
| VIP-Saloon | £66.80 |
| VIP-SUV/MPV | £70.80 |

#### Per Mile Rates
| Vehicle Type | Base Rate | 0-4 miles | 4.1-10.9 miles | 11-20 miles | 20.1-40 miles | 41-60 miles | 60.1-80 miles | 81-99 miles | 100-149 miles | 150-299 miles | 300+ miles |
|-------------|-----------|-----------|---------------|-------------|--------------|-------------|--------------|-------------|---------------|---------------|------------|
| Saloon | £2.95 | £3.95 | £2.95 | £2.80 | £2.66 | £2.36 | £2.21 | £1.92 | £1.77 | £1.62 | £1.48 |
| Estate | £3.45 | £4.95 | £3.45 | £3.28 | £3.11 | £2.76 | £2.59 | £2.24 | £2.07 | £1.90 | £1.73 |
| MPV-6 Seater | £6.45 | £6.95 | £6.45 | £5.97 | £4.35 | £3.39 | £3.55 | £3.23 | £3.06 | £2.90 | £2.74 |
| MPV-8 Seater | £6.95 | £7.95 | £6.95 | £6.43 | £4.69 | £4.00 | £3.82 | £3.48 | £3.30 | £3.13 | £2.95 |
| Executive Saloon | £5.95 | £7.95 | £5.95 | £5.50 | £4.02 | £3.42 | £3.27 | £2.98 | £2.83 | £2.68 | £2.53 |
| Executive MPV-8 | £7.95 | £7.95 | £7.95 | £6.56 | £6.16 | £5.96 | £5.76 | £4.77 | £4.57 | £3.78 | £3.58 |
| VIP-Saloon | £7.45 | £7.95 | £7.45 | £7.26 | £5.03 | £4.28 | £4.10 | £3.73 | £3.54 | £3.35 | £3.17 |
| VIP-SUV/MPV | £7.95 | £8.95 | £7.95 | £7.55 | £7.16 | £6.76 | £6.36 | £6.16 | £5.96 | £5.37 | £4.97 |

### Additional Charges

#### Additional Stops
| Vehicle Type | Cost per Additional Stop |
|-------------|---------------------------|
| Saloon | £2.50 |
| Estate | £2.50 |
| MPV-6 Seater | £4.50 |
| MPV-8 Seater | £4.50 |
| Executive Saloon | £5.50 |
| Executive MPV-8 | £5.50 |

#### Waiting Time
| Vehicle Type | Per Minute | Per Hour |
|-------------|------------|----------|
| Saloon | £0.42 | £25.00 |
| Estate | £0.58 | £30.00 |
| MPV-6 Seater | £0.58 | £35.00 |
| MPV-8 Seater | £0.67 | £45.00 |
| Executive Saloon | £0.67 | £45.00 |
| Executive MPV-8 | £0.75 | £55.00 |
| VIP-Saloon | - | £75.00 |
| VIP-SUV/MPV | - | £95.00 |

### Notes
- Prices are subject to change
- Peak and non-peak times may vary
- Additional charges may apply for special circumstances

**Last Updated:** [Current Date] 