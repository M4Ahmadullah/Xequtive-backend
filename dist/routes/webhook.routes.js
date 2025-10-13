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
        const { from, body, type, chatId } = req.body;
        // Only process messages from the Xeq Bookings group
        if (chatId !== '120363405665891669@g.us') {
            logger_1.default.info('📱 Ignoring message from non-booking group:', chatId);
            return res.status(200).json({ success: true, message: 'Ignored - not from booking group' });
        }
        // Only process text messages
        if (type !== 'chat') {
            logger_1.default.info('📱 Ignoring non-text message type:', type);
            return res.status(200).json({ success: true, message: 'Ignored - not a text message' });
        }
        // Process the message for booking confirmation
        await whatsapp_service_1.WhatsAppService.processIncomingMessage({
            from,
            body,
            chatId,
            timestamp: new Date().toISOString()
        });
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
