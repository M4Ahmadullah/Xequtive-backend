# Vehicle Capacity Update - Frontend Team

## Overview

The vehicle capacity information has been updated across all API documentation files. Please ensure your frontend displays the correct passenger and luggage capacities for each vehicle type.

## Updated Vehicle Capacities

### Standard Vehicles
| Vehicle Type | ID | Passengers | Luggage | Description |
|--------------|----|------------|---------|-------------|
| Standard Saloon | `standard-saloon` | 4 | 2 | Toyota Prius, Ford Mondeo |
| Estate | `estate` | 4 | 4 | Mercedes E-Class Estate, Volkswagen Passat Estate |
| MPV-6 | `large-mpv` | 6 | 4 | Ford Galaxy, Volkswagen Sharan |
| MPV-8 | `extra-large-mpv` | 8 | 8 | Ford Tourneo, Mercedes Vito |

### Premium Vehicles
| Vehicle Type | ID | Passengers | Luggage | Description |
|--------------|----|------------|---------|-------------|
| Executive Saloon | `executive-saloon` | 4 | 2 | Mercedes E-Class, BMW 5-Series |
| Executive MPV | `executive-mpv` | 8 | 8 | Mercedes V-Class, Volkswagen Caravelle |
| VIP Saloon | `vip` | 3 | 2 | Mercedes S-Class, BMW 7-Series |
| VIP MPV/SUV | `vip-mpv` | 6 | 6 | Mercedes V-Class Luxury, Range Rover |

### Special Vehicles
| Vehicle Type | ID | Passengers | Luggage | Description |
|--------------|----|------------|---------|-------------|
| Wheelchair Accessible | `wav` | 4 + wheelchair | 2 | Specially adapted vans |

## Key Changes Made

1. **MPV-8**: Updated from 6 to 8 luggage capacity
2. **Executive Saloon**: Updated from 3 to 4 passengers
3. **Executive MPV**: Added as new vehicle type with 8 passengers, 8 luggage
4. **VIP MPV/SUV**: Updated from 4 to 6 luggage capacity
5. **Vehicle Names**: Standardized naming convention

## Frontend Implementation

### Display Format
Use this format for displaying vehicle capacity:
```
[Vehicle Name] - [X] Passengers, [Y] Luggage
```

### Examples
- **Standard Saloon** - 4 Passengers, 2 Luggage
- **Estate** - 4 Passengers, 4 Luggage
- **MPV-6** - 6 Passengers, 4 Luggage
- **MPV-8** - 8 Passengers, 8 Luggage
- **Executive Saloon** - 4 Passengers, 2 Luggage
- **Executive MPV** - 8 Passengers, 8 Luggage
- **VIP Saloon** - 3 Passengers, 2 Luggage
- **VIP MPV/SUV** - 6 Passengers, 6 Luggage

### Validation
Ensure your frontend validation matches these capacities:
- **Passenger Count**: Must not exceed vehicle capacity
- **Luggage Count**: Must not exceed vehicle luggage capacity
- **Vehicle Selection**: Show appropriate vehicles based on passenger/luggage requirements

## API Response Fields

The enhanced user booking endpoints now return comprehensive vehicle information:

```json
{
  "vehicle": {
    "id": "executive-saloon",
    "name": "Executive Saloon",
    "price": {
      "amount": 45.5,
      "currency": "GBP"
    }
  }
}
```

## Testing Checklist

- [ ] Update vehicle capacity displays across all UI components
- [ ] Verify passenger count validation matches new capacities
- [ ] Verify luggage count validation matches new capacities
- [ ] Test vehicle selection logic with new capacities
- [ ] Update any hardcoded capacity values in frontend code
- [ ] Test booking creation with different vehicle types
- [ ] Verify capacity information in booking confirmation displays

## Contact

If you have any questions about these updates, please refer to the updated API documentation files:
- `API_DOCUMENTATION.md`
- `API_DOCUMENTATION_2.md`
- `fare-calculation-documentation.md`

---

**Last Updated**: January 2025
**Version**: 2.0
**Status**: Ready for Frontend Implementation 