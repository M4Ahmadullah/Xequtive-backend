"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsapp_service_1 = require("../services/whatsapp.service");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * Webhook endpoint to receive WhatsApp messages from Ultramsg
 * This endpoint will be called by Ultramsg when messages are received
 */
router.post('/whatsapp', async (req, res) => {
    try {
        logger_1.default.info('📱 Received WhatsApp webhook:', JSON.stringify(req.body, null, 2));
        const { from, body, type, chatId, reaction } = req.body;
        // Only process messages from the Xeq Bookings group
        if (chatId !== '120363405665891669@g.us') {
            logger_1.default.info('📱 Ignoring message from non-booking group:', chatId);
            return res.status(200).json({ success: true, message: 'Ignored - not from booking group' });
        }
        // Process reactions (checkmark) to booking messages
        if (type === 'reaction' && reaction === '✅') {
            logger_1.default.info('📱 Processing checkmark reaction from:', from);
            await whatsapp_service_1.WhatsAppService.processBookingReaction({
                from,
                chatId,
                reaction,
                timestamp: new Date().toISOString()
            });
            return res.status(200).json({ success: true, message: 'Reaction processed' });
        }
        // Ignore other message types
        if (type !== 'reaction') {
            logger_1.default.info('📱 Ignoring non-reaction message type:', type);
            return res.status(200).json({ success: true, message: 'Ignored - not a reaction' });
        }
        res.status(200).json({ success: true, message: 'Message processed' });
    }
    catch (error) {
        logger_1.default.error('❌ Error processing WhatsApp webhook:', error);
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
exports.default = router;
