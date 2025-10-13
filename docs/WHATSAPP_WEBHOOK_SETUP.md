# WhatsApp Webhook Integration Setup

## Overview

The system now supports **bidirectional WhatsApp integration**:

1. **Outbound**: When booking is created → Send notification to "Xeq Bookings" group
2. **Inbound**: When support team sends confirmation message → Trigger confirmation email to customer

## Webhook Endpoint

**URL**: `POST /api/webhook/whatsapp`

This endpoint receives messages from Ultramsg when messages are sent to the "Xeq Bookings" group.

## Ultramsg Webhook Configuration

To enable inbound message processing, you need to configure Ultramsg to send webhooks to your server:

### 1. Set Webhook URL in Ultramsg

Configure your Ultramsg instance to send webhooks to:
```
https://your-domain.com/api/webhook/whatsapp
```

### 2. Webhook Configuration Steps

1. Log into your Ultramsg dashboard
2. Go to your instance settings
3. Find "Webhook" or "Callback" settings
4. Set the webhook URL to: `https://your-domain.com/api/webhook/whatsapp`
5. Enable webhook for incoming messages
6. Save the configuration

## Message Processing

### Supported Confirmation Message Formats

The system will automatically detect and process booking confirmations when support team sends messages in these formats:

#### Pattern 1: Explicit Confirmation
```
CONFIRMED: XEQ_123
BOOKING CONFIRMED: XEQ_123
DRIVER ASSIGNED: XEQ_123
READY: XEQ_123
OK: XEQ_123
DONE: XEQ_123
```

#### Pattern 2: Simple Confirmation
```
XEQ_123 ✓
XEQ_123 ✅
XEQ_123 CONFIRMED
```

### What Happens When Confirmation is Detected

1. **Parse Message**: Extract booking reference number
2. **Find Booking**: Search Firestore for booking with matching reference
3. **Update Status**: Change booking status to "confirmed"
4. **Send Email**: Trigger confirmation email to customer
5. **Log Activity**: Record the confirmation process

## Testing the Webhook

### Test Endpoint
```
GET /api/webhook/whatsapp/test
```

This returns a simple status check to verify the webhook endpoint is active.

### Manual Testing

You can test the webhook by sending a POST request:

```bash
curl -X POST https://your-domain.com/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "from": "support@example.com",
    "body": "CONFIRMED: XEQ_123",
    "type": "chat",
    "chatId": "120363405665891669@g.us"
  }'
```

## Security Considerations

- The webhook only processes messages from the specific "Xeq Bookings" group ID
- Only text messages are processed (ignores media, documents, etc.)
- All webhook activity is logged for monitoring
- Failed processing doesn't break the booking system

## Environment Variables

Ensure these are set in your `.env` file:

```env
ULTRA_MSG_TOKEN=mmsq4hioinz0iqn4
ULTRA_MSG_INSTANCE_ID=instance145786
```

## Complete Workflow

### 1. Customer Creates Booking
- Booking created in system
- Initial email sent to customer (pending status)
- WhatsApp notification sent to "Xeq Bookings" group

### 2. Support Team Reviews
- Support team sees booking notification in WhatsApp group
- Support team assigns driver and confirms booking

### 3. Support Team Confirms
- Support team sends confirmation message: `CONFIRMED: XEQ_123`
- Webhook receives the message
- System updates booking status to "confirmed"
- Confirmation email sent to customer

### 4. Customer Receives Confirmation
- Customer gets final confirmation email
- Booking is now fully confirmed and ready

## Troubleshooting

### Webhook Not Receiving Messages
1. Check Ultramsg webhook configuration
2. Verify webhook URL is accessible
3. Check server logs for webhook requests
4. Test with manual POST request

### Messages Not Being Processed
1. Verify message is from correct group ID
2. Check message format matches supported patterns
3. Review server logs for parsing errors
4. Ensure booking reference exists in database

### Email Not Sending
1. Check Resend configuration
2. Verify customer email address
3. Review email service logs
4. Test email service independently

## Logs and Monitoring

All webhook activity is logged with these prefixes:
- `📱 Processing incoming WhatsApp message`
- `✅ Detected booking confirmation`
- `✅ Booking confirmed and email sent`
- `⚠️ Booking not found`
- `❌ Error processing message`

Monitor these logs to ensure the system is working correctly.
