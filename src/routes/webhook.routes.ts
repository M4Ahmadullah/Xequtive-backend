import { Router } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import logger from '../utils/logger';

const router = Router();

/**
 * Webhook endpoint to receive WhatsApp messages from Ultramsg
 * This endpoint will be called by Ultramsg when messages are received
 */
router.post('/whatsapp', async (req, res) => {
  try {
    logger.info('📱 Received WhatsApp webhook:', JSON.stringify(req.body, null, 2));

    const { from, body, type, chatId, reaction } = req.body;

    // Only process messages from the Xeq Bookings group
    if (chatId !== '120363405665891669@g.us') {
      logger.info('📱 Ignoring message from non-booking group:', chatId);
      return res.status(200).json({ success: true, message: 'Ignored - not from booking group' });
    }

    // Process reactions (checkmark) to booking messages
    if (type === 'reaction' && reaction === '✅') {
      logger.info('📱 Processing checkmark reaction from:', from);
      await WhatsAppService.processBookingReaction({
        from,
        chatId,
        reaction,
        timestamp: new Date().toISOString()
      });
      return res.status(200).json({ success: true, message: 'Reaction processed' });
    }

    // Ignore other message types
    if (type !== 'reaction') {
      logger.info('📱 Ignoring non-reaction message type:', type);
      return res.status(200).json({ success: true, message: 'Ignored - not a reaction' });
    }

    res.status(200).json({ success: true, message: 'Message processed' });
  } catch (error) {
    logger.error('❌ Error processing WhatsApp webhook:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Test endpoint to verify webhook is working
 */
router.get('/whatsapp/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'WhatsApp webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

export default router;
