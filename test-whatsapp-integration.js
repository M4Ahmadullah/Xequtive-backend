#!/usr/bin/env node

/**
 * WhatsApp Integration Test Script
 * 
 * This script tests the WhatsApp service integration with Ultramsg
 * It will send a test booking notification to the "Xeq Booking" group
 */

import { WhatsAppService } from './src/services/whatsapp.service';

async function testWhatsAppIntegration() {
  console.log('🧪 Testing WhatsApp Integration...\n');

  // Test 1: Check service connectivity
  console.log('1️⃣ Testing WhatsApp service connectivity...');
  const isConnected = await WhatsAppService.testConnection();
  
  if (!isConnected) {
    console.log('❌ WhatsApp service is not connected. Please check your configuration.');
    console.log('   Make sure to set ULTRA_MSG_TOKEN and ULTRA_MSG_INSTANCE_ID in your .env file');
    return;
  }

  console.log('✅ WhatsApp service is connected!\n');

  // Test 2: Send sample booking notification
  console.log('2️⃣ Sending sample booking notification...');
  
  const sampleBooking = {
    id: 'test-booking-123',
    referenceNumber: 'XEQ_TEST_001',
    fullName: 'John Smith',
    pickupDate: '2024-01-15',
    pickupTime: '14:30',
    pickupLocation: 'London Heathrow Airport Terminal 2',
    dropoffLocation: 'Westminster, London SW1A 1AA',
    vehicleType: 'Executive Sedan',
    price: 85.50,
    bookingType: 'one-way',
    phoneNumber: '+44 7700 900123',
    email: 'john.smith@example.com',
    passengers: {
      count: 2,
      checkedLuggage: 2,
      handLuggage: 2,
      babySeat: 1
    },
    specialRequests: 'Please assist with luggage and provide child seat',
    hours: undefined,
    returnDate: undefined,
    returnTime: undefined
  };

  try {
    await WhatsAppService.sendBookingNotification(sampleBooking);
    console.log('✅ Sample booking notification sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send sample booking notification:', error);
  }

  console.log('\n🎉 WhatsApp integration test completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Check your "Xeq Bookings" WhatsApp group for the test message');
  console.log('2. If you see the message, the integration is working correctly');
  console.log('3. If not, check your Ultramsg configuration and group name');
  console.log('4. Make sure the group "Xeq Bookings" exists in your WhatsApp');
}

// Run the test
testWhatsAppIntegration().catch(console.error);
