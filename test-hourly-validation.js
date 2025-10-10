// Test script for booking validation
const { enhancedFareEstimateSchema } = require('./src/validation/booking.schema');

// Test hourly booking with 25 hours (should fail)
const testData = {
  locations: {
    pickup: {
      address: "London Heathrow Airport",
      coordinates: { lat: 51.4700, lng: -0.4543 }
    },
    dropoff: {
      address: "London City Centre", 
      coordinates: { lat: 51.5074, lng: -0.1278 }
    }
  },
  datetime: {
    date: "2024-01-15",
    time: "10:00"
  },
  passengers: {
    count: 2,
    checkedLuggage: 1,
    handLuggage: 2,
    mediumLuggage: 0,
    babySeat: 0,
    boosterSeat: 0,
    childSeat: 0,
    wheelchair: 0
  },
  bookingType: "hourly",
  hours: 25
};

try {
  const result = enhancedFareEstimateSchema.parse(testData);
  console.log("✅ Validation passed - this should NOT happen for 25 hours");
} catch (error) {
  console.log("❌ Validation failed as expected:");
  console.log(error.errors.map(e => e.message).join(", "));
}

// Test hourly booking with 20 hours (should pass)
const testData2 = { ...testData, hours: 20 };
try {
  const result = enhancedFareEstimateSchema.parse(testData2);
  console.log("✅ Validation passed for 20 hours - correct!");
} catch (error) {
  console.log("❌ Validation failed for 20 hours:");
  console.log(error.errors.map(e => e.message).join(", "));
}

