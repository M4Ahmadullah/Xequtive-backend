# Xequtive Fare Calculation Documentation

## Overview

This document details the fare calculation methodology used by Xequtive for all vehicle types. Our system ensures transparent, consistent pricing while accounting for factors such as distance, time of day, vehicle class, and additional services.

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

1. **Route Calculation**: Using Mapbox API, we calculate the optimized route between all provided locations
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

| Vehicle Type        | Capacity (Passengers) | Base Fare (£) | Per Mile Rate (£) |  Waiting Time   |
| ------------------- | :-------------------: | :-----------: | :---------------: | :-------------: |
| Standard Saloon     |           4           |     £5.00     |       £2.95       | £25.00 per hour |
| Estate              |           4           |     £7.50     |       £3.95       | £30.00 per hour |
| MPV-6               |           6           |    £12.50     |       £4.75       | £35.00 per hour |
| MPV-8               |           8           |    £20.00     |       £3.95       | £45.00 per hour |
| Executive Saloon    |           3           |    £12.50     |       £4.95       | £45.00 per hour |
| VIP Executive\*     |           3           |      N/A      |        N/A        | £75.00 per hour |
| VIP Executive MPV\* |           6           |      N/A      |        N/A        | £95.00 per hour |
| WAV                 |           4           |    £12.50     |       £4.75       | £35.00 per hour |

\*VIP vehicles are priced on a custom quote basis depending on specific requirements. These premium services are typically booked on an hourly basis (minimum 3-4 hours) rather than point-to-point journeys and include additional premium services by default. Please contact our team for a personalized quote.

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
  - Spacious seating arrangement for family travel
  - Flexible interior configuration

- **MPV-8**: Ford Tourneo, Mercedes Vito
  - Accommodates 8 passengers with 6 luggage items
  - Maximum capacity for both passengers and luggage
  - Ideal for group travel or large families

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

## Fare Calculation Formula

The total fare is calculated using the following formula:

```
Total Fare = Base Fare + (Distance in miles × Per Mile Rate) + Additional Charges
```

Where:

- Base Fare: Fixed starting fare for each vehicle type
- Per Mile Rate: Rate charged per mile traveled
- Additional Charges: Includes time multipliers, additional stops, waiting time, and other surcharges

## Additional Charges

### Additional Stops

| Vehicle Type      | Per Additional Stop (£) |
| ----------------- | :---------------------: |
| Standard Saloon   |          £2.50          |
| Estate            |          £3.50          |
| MPV-6             |          £4.50          |
| MPV-8             |          £4.50          |
| Executive Saloon  |          £5.50          |
| VIP Executive     |           N/A           |
| VIP Executive MPV |           N/A           |

### Waiting Time

Waiting time is charged at the following rates:

| Vehicle Type      | Per Minute (£) | Per Hour (£) |
| ----------------- | :------------: | :----------: |
| Standard Saloon   |     £0.42      |    £25.00    |
| Estate            |     £0.58      |    £30.00    |
| MPV-6             |     £0.58      |    £35.00    |
| MPV-8             |     £0.67      |    £45.00    |
| Executive Saloon  |     £0.67      |    £45.00    |
| VIP Executive     |     £1.25      |    £75.00    |
| VIP Executive MPV |     £1.58      |    £95.00    |

### Day-Trip Rates

For extended bookings, special day-trip rates apply:

| Vehicle Type      | 4-6 Hours (per hour) | 6-12 Hours (per hour) |
| ----------------- | :------------------: | :-------------------: |
| Standard Saloon   |        £25.00        |        £20.00         |
| Estate            |        £30.00        |        £25.00         |
| MPV-6             |        £40.00        |        £30.00         |
| MPV-8             |        £45.00        |        £40.00         |
| Executive Saloon  |        £45.00        |        £40.00         |
| VIP Executive     |         N/A          |          N/A          |
| VIP Executive MPV |         N/A          |          N/A          |

## Time-Based Multipliers

### Weekdays (Monday-Thursday)

- **Peak Time** (3 AM - 9 AM / 3 PM - 9 PM): Additional £3.54
- **Off-Peak** (9:01 AM - 2:59 PM / 9 PM - 4 AM): No additional charge

### Weekend (Friday)

- **Peak Time** (3 AM - 9 AM / 3 PM - 11:59 PM): Special rates apply
- **Off-Peak** (9:01 AM - 2:59 PM): Standard weekend rates

### Weekend (Saturday-Sunday)

- **All Day**: Special weekend rates apply

## Additional Fees

### Toll Charges

- **Congestion Charge Zone (CCZ)** - Zone 1: £7.50
- **Dartford Crossing**: £4.00

### Airport Fees

#### Airport Dropoff Fees

| Airport      | Fee (£) |
| ------------ | :-----: |
| Heathrow     |  £6.00  |
| Gatwick      |  £6.00  |
| Luton        |  £6.00  |
| Stansted     |  £7.00  |
| City Airport |  £6.50  |

#### Airport Pickup Fees

| Airport      | Fee (£) |
| ------------ | :-----: |
| Heathrow     |  £7.50  |
| Gatwick      |  £8.00  |
| Luton        |  £6.00  |
| Stansted     | £10.00  |
| City Airport |  £6.50  |

## Additional Services and Premium Options

### Meet and Greet Service

For airport pickups, we offer a professional meet and greet service:

- Driver meets customers at arrivals with a name board
- 45 minutes of free waiting time from the actual flight arrival
- **Additional Cost**: Included in the airport pickup fee

### Corporate Account Benefits

- Priority dispatch during peak hours
- Dedicated account manager
- Monthly invoicing and detailed trip reports
- Volume-based discounts available
- Custom branded service available for larger accounts

### Special Occasions Package

- Complimentary chilled water and refreshments
- Decorative options available upon request (weddings, anniversaries)
- Extended vehicle selection time
- **Additional Cost**: From £25 depending on requirements

## Seasonal and Event Pricing Adjustments

### Holiday Season Surcharges

- **Christmas Eve & Christmas Day**: 50% surcharge
- **New Year's Eve (after 6pm) & New Year's Day**: 50% surcharge
- **Bank Holidays**: 25% surcharge

### Major Event Surcharges

For major sporting events, concerts and festivals:

- **Standard Event Surcharge**: 15% on all fares
- **Premium Events** (Wimbledon Finals, FA Cup Final, etc.): 25% on all fares

## Example Calculations

### Example 1: Standard Saloon Journey

- **Distance**: 10 miles
- **Time**: Tuesday, 8:00 AM (Peak Time)
- **Vehicle**: Standard Saloon
- **Additional Stops**: None

Calculation:

```
Base Fare = £5.00
Distance Charge = 10 miles × £2.95 = £29.50
Peak Time Charge = £3.54
Total Fare = £5.00 + £29.50 + £3.54 = £38.04
```

### Example 2: Executive Journey with Airport Pickup

- **Distance**: 25 miles
- **Time**: Friday, 6:00 PM (Weekend Peak)
- **Vehicle**: Executive
- **Route**: Heathrow Airport to Central London

Calculation:

```
Base Fare = £12.50
Distance Charge = 25 miles × £4.95 = £123.75
Airport Pickup Fee = £7.50
Weekend Peak Charge = (Applicable rate)
Total Fare = £12.50 + £123.75 + £7.50 + (Weekend charge) = £143.75 + (Weekend charge)
```

### Example 3: MPV-6 with Waiting Time and Additional Stops

- **Distance**: 15 miles
- **Time**: Monday, 2:00 PM (Off-Peak)
- **Vehicle**: MPV-6
- **Additional Stops**: 1
- **Waiting Time**: 30 minutes

Calculation:

```
Base Fare = £12.50
Distance Charge = 15 miles × £4.75 = £71.25
Additional Stop = £4.50
Waiting Time = 30 minutes × £0.58 = £17.40
Total Fare = £12.50 + £71.25 + £4.50 + £17.40 = £105.65
```

### Example 4: Day Trip with Executive MPV

- **Distance**: Local use only
- **Time**: Saturday, 10:00 AM - 6:00 PM (8 hours)
- **Vehicle**: Executive MPV
- **Service**: Wedding transportation

Calculation:

```
6-12 Hours Rate = 8 hours × £50.00 = £400.00
Special Occasions Package = £25.00
Weekend Surcharge = (Applicable rate)
Total Fare = £400.00 + £25.00 + (Weekend surcharge) = £425.00 + (Weekend surcharge)
```

### Example 5: Standard Saloon with Congestion Charge

- **Distance**: 12 miles
- **Time**: Wednesday, 4:00 PM (Peak Time)
- **Vehicle**: Standard Saloon
- **Route**: Through Congestion Charge Zone

Calculation:

```
Base Fare = £5.00
Distance Charge = 12 miles × £2.95 = £35.40
Peak Time Charge = £3.54
Congestion Charge = £7.50
Total Fare = £5.00 + £35.40 + £3.54 + £7.50 = £51.44
```

### Example 6: Journey with Automated Zone Detection

- **Distance**: 18 miles
- **Time**: Monday, 10:00 AM (Off-Peak)
- **Vehicle**: Estate
- **Route**: Westminster to Canary Wharf via CCZ, then to Stansted Airport

Calculation:

```
Base Fare = £7.50
Distance Charge = 18 miles × £3.95 = £71.10
Congestion Charge (automatically detected) = £7.50
Airport Dropoff Fee (automatically detected) = £7.00
Total Fare = £7.50 + £71.10 + £7.50 + £7.00 = £93.10

User Notifications:
- "Your route passes through the Congestion Charge Zone. A £7.50 charge has been added."
- "Your destination is Stansted Airport. An airport dropoff fee of £7.00 has been added."
```

## Minimum Fare Protection

To ensure driver earnings on very short journeys, a minimum fare is applied if the calculated fare is lower than the minimum threshold for each vehicle type.

## Fare Rounding

For customer convenience, all final fares are rounded up to the nearest £0.50.

## Additional Notes

1. All prices are inclusive of VAT where applicable.
2. Fares may be subject to change during major public holidays or events.
3. For journeys over 100 miles, special rates may apply.
4. Corporate accounts may receive discounted rates according to contract terms.
5. Pre-booked journeys more than 24 hours in advance may be eligible for off-peak rates regardless of actual journey time.
6. For journeys requiring a toll or crossing fee not listed, the actual cost will be added to the final fare.
7. Multiple hour waiting periods may be eligible for reduced hourly rates.
8. All prices are effective from June 2023 and subject to periodic review.

## Booking Terms

1. Cancellation fees apply for bookings cancelled with less than 24 hours notice.
2. For airport pickups, flight details must be provided at the time of booking.
3. Child seats must be requested at the time of booking.
4. A non-refundable deposit may be required for certain premium services or peak time bookings.
5. Our drivers will wait up to 15 minutes beyond the scheduled pickup time for standard bookings, and 45 minutes for airport pickups (based on actual flight arrival time).

## Passenger Information and Additional Services

### Luggage Types and Charges

1. **Hand Luggage**

   - Small bags and carry-on items
   - No additional charge
   - Included in base fare

2. **Medium Luggage** (NEW)

   - Medium-sized bags
   - Pricing: Every 2 medium bags are charged as 1 large bag at £10.00
   - Example: 4 medium bags = 2 large bag equivalents = £20.00

3. **Checked Luggage**
   - Large suitcases and bags
   - Standard rates apply based on vehicle type

### Child Safety Equipment

1. **Baby Seat (0-18 Months)**

   - Maximum: 5 baby seats
   - Price: £10.00 per seat
   - Age Range: 0-18 Months

2. **Child Seat (18 Months - 4 Years)**

   - Maximum: 5 child seats
   - Price: £10.00 per seat
   - Age Range: 18 Months - 4 Years

3. **Booster Seat (4-6 Years)**
   - Maximum: 5 booster seats
   - Price: £10.00 per seat
   - Age Range: 4-6 Years

### Accessibility Equipment

1. **Foldable Wheelchair**
   - £25.00 per wheelchair
   - Must be foldable to fit in vehicle
   - Driver assistance with loading/unloading included
   - Available with all vehicle types except VIP Executive
