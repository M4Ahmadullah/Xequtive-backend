# WhatsApp Integration with Ultramsg

This document explains how to set up and use the WhatsApp integration for booking notifications using Ultramsg.

## Overview

The WhatsApp integration automatically sends booking notifications to a WhatsApp group called "Xeq Booking" whenever a new booking is created. This helps the team stay informed about new bookings in real-time.

## Setup Instructions

### 1. Ultramsg Account Setup

1. Go to [Ultramsg.com](https://ultramsg.com) and create an account
2. Create a new WhatsApp instance
3. Connect your WhatsApp number to the instance
4. Note down your:
   - **Instance ID** (e.g., `instance123456`)
   - **API Token** (e.g., `token_abc123def456`)

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```env
# WhatsApp Integration (Ultramsg)
ULTRA_MSG_TOKEN=mmsq4hioinz0iqn4
ULTRA_MSG_INSTANCE_ID=instance145786
```

### 3. WhatsApp Group Setup

1. Create a WhatsApp group named exactly **"Xeq Bookings"**
2. Add the WhatsApp number connected to your Ultramsg instance to this group
3. Make sure the bot has permission to send messages in the group

## How It Works

### Automatic Notifications

When a booking is created through either:
- `/api/bookings/create-enhanced` (Xequtive bookings)
- `/api/hourly-bookings/create` (Executive Cars bookings)

The system will automatically:
1. Send a confirmation email to the customer
2. Send a WhatsApp notification to the "Xeq Bookings" group

### Message Format

The WhatsApp message includes:
- 📋 Reference number
- 👤 Customer details (name, phone, email)
- 📅 Booking details (type, date, time, locations)
- 🚙 Vehicle information
- 💰 Price
- 👥 Passenger and luggage details
- 📝 Special requests
- ⏰ Status and creation timestamp

### Example Message

```
🚗 *NEW BOOKING CREATED*

📋 *Reference:* XEQ_105
👤 *Customer:* John Smith
📞 *Phone:* +44 7700 900123
📧 *Email:* john.smith@example.com

📅 *Booking Details:*
• *Type:* One-way
• *Date:* 2024-01-15
• *Time:* 14:30
• *Pickup:* London Heathrow Airport Terminal 2
• *Dropoff:* Westminster, London SW1A 1AA

🚙 *Vehicle:* Executive Sedan
💰 *Price:* £85.50

👥 *Passengers:* 2
• *Luggage:* 2 checked luggage, 2 hand luggage, 1 baby seat

📝 *Special Requests:* Please assist with luggage and provide child seat

⏰ *Status:* Pending
🕐 *Created:* 15/01/2024, 10:30:00
```

## Testing

### Test Script

Run the test script to verify your integration:

```bash
node test-whatsapp-integration.js
```

This will:
1. Test the WhatsApp service connectivity
2. Send a sample booking notification
3. Verify the message appears in your "Xeq Booking" group

### Manual Testing

Create a test booking through the API and check if the WhatsApp notification appears in the group.

## Troubleshooting

### Common Issues

1. **"WhatsApp service not configured"**
   - Check that `ULTRA_MSG_TOKEN` and `ULTRA_MSG_INSTANCE_ID` are set in your `.env` file
   - Restart your server after adding the environment variables

2. **"WhatsApp service is not connected"**
   - Verify your Ultramsg instance is active
   - Check that your WhatsApp number is properly connected
   - Ensure your API token is correct

3. **Messages not appearing in group**
   - Verify the group name is exactly "Xeq Bookings"
   - Check that the WhatsApp number is added to the group
   - Ensure the bot has permission to send messages

4. **API errors**
   - Check Ultramsg API documentation for error codes
   - Verify your instance ID and token are correct
   - Check if you have sufficient credits in your Ultramsg account

### Logs

The system logs WhatsApp notification attempts. Check your server logs for:
- `📱 Sending WhatsApp notification for booking XEQ_XXX`
- `✅ WhatsApp notification sent successfully`
- `❌ Failed to send WhatsApp notification`

## Configuration Options

### Group Name

To change the group name, modify the `GROUP_NAME` constant in `src/services/whatsapp.service.ts`:

```typescript
private static readonly GROUP_NAME = 'Your Custom Group Name';
```

### Message Format

To customize the message format, modify the `formatBookingMessage` method in `src/services/whatsapp.service.ts`.

## Security Notes

- The WhatsApp service runs asynchronously and won't block booking creation if it fails
- API tokens should be kept secure and not exposed in logs
- The service gracefully handles errors without affecting the main booking flow

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Ultramsg documentation
3. Check server logs for specific error messages
4. Test with the provided test script
