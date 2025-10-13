"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const axios_1 = __importDefault(require("axios"));
const qs_1 = __importDefault(require("qs"));
const env_1 = require("../config/env");
const email_service_1 = require("./email.service");
const firebase_1 = require("../config/firebase");
const logger_1 = __importDefault(require("../utils/logger"));
class WhatsAppService {
    /**
     * Send booking notification to WhatsApp group
     */
    static async sendBookingNotification(bookingData) {
        try {
            if (!env_1.env.whatsapp?.ultraMsgToken) {
                console.warn('⚠️ WhatsApp service not configured - skipping notification');
                return;
            }
            const message = this.formatBookingMessage(bookingData);
            console.log(`📱 Sending WhatsApp notification for booking ${bookingData.referenceNumber} to "Xeq Bookings" group`);
            const data = qs_1.default.stringify({
                token: env_1.env.whatsapp.ultraMsgToken,
                to: this.GROUP_ID,
                body: message
            });
            const response = await axios_1.default.post(`${this.ULTRA_MSG_API_URL}/${env_1.env.whatsapp.instanceId}/messages/chat`, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000 // 10 second timeout
            });
            if (response.data.sent) {
                console.log(`✅ WhatsApp notification sent successfully for booking ${bookingData.referenceNumber}`);
            }
            else {
                console.error(`❌ Failed to send WhatsApp notification for booking ${bookingData.referenceNumber}:`, response.data);
            }
        }
        catch (error) {
            console.error(`❌ Error sending WhatsApp notification for booking ${bookingData.referenceNumber}:`, error);
            // Don't throw error to avoid breaking booking creation
        }
    }
    /**
     * Format booking data into a readable WhatsApp message
     */
    static formatBookingMessage(booking) {
        const { referenceNumber, fullName, pickupDate, pickupTime, pickupLocation, dropoffLocation, vehicleType, price, bookingType, phoneNumber, email, passengers, specialRequests, hours, returnDate, returnTime } = booking;
        // Format booking type
        let formattedBookingType = bookingType.charAt(0).toUpperCase() + bookingType.slice(1);
        if (bookingType === 'one-way') {
            formattedBookingType = 'One-way';
        }
        else if (bookingType === 'return') {
            formattedBookingType = 'Return';
        }
        else if (bookingType === 'hourly') {
            formattedBookingType = 'Hourly';
        }
        // Format date with day of week
        const date = new Date(pickupDate);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()} ${dayName}`;
        // Format time
        const time = new Date(`2000-01-01T${pickupTime}`);
        const formattedTime = time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        // Format luggage
        let luggageText = '';
        if (passengers) {
            const luggageItems = [];
            if (passengers.checkedLuggage && passengers.checkedLuggage > 0) {
                luggageItems.push(`${passengers.checkedLuggage} checked`);
            }
            if (passengers.handLuggage && passengers.handLuggage > 0) {
                luggageItems.push(`${passengers.handLuggage} hand`);
            }
            if (passengers.mediumLuggage && passengers.mediumLuggage > 0) {
                luggageItems.push(`${passengers.mediumLuggage} medium`);
            }
            if (passengers.babySeat && passengers.babySeat > 0) {
                luggageItems.push(`${passengers.babySeat} baby seat(s)`);
            }
            if (passengers.childSeat && passengers.childSeat > 0) {
                luggageItems.push(`${passengers.childSeat} child seat(s)`);
            }
            if (passengers.boosterSeat && passengers.boosterSeat > 0) {
                luggageItems.push(`${passengers.boosterSeat} booster seat(s)`);
            }
            if (passengers.wheelchair && passengers.wheelchair > 0) {
                luggageItems.push(`${passengers.wheelchair} wheelchair(s)`);
            }
            luggageText = luggageItems.join(', ') || '';
        }
        // Format contact info
        let contactText = '';
        if (phoneNumber && email) {
            contactText = `${phoneNumber} | ${email}`;
        }
        else if (phoneNumber) {
            contactText = phoneNumber;
        }
        else if (email) {
            contactText = email;
        }
        // Format created timestamp
        const createdTime = new Date().toLocaleString('en-GB', {
            timeZone: 'Europe/London',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        let message = `*NEW BOOKING:* ${referenceNumber}\n\n`;
        message += `*Type:* ${formattedBookingType}\n\n`;
        message += `*Date:* ${dayName}, ${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}\n\n`;
        message += `*Time:* ${formattedTime}\n\n`;
        message += `*Pickup:* ${pickupLocation}\n\n`;
        if (dropoffLocation && bookingType !== 'hourly') {
            message += `*Dropoff:* ${dropoffLocation}\n\n`;
        }
        else if (bookingType === 'hourly') {
            message += `*Dropoff:* Hourly booking - driver stays with you\n\n`;
        }
        message += `*Vehicle:* ${vehicleType}\n\n`;
        message += `*Fare:* £${price.toFixed(2)}\n`;
        message += `_________________________\n\n`;
        message += `*Name:* ${fullName}\n`;
        message += `*Passengers:* ${passengers?.count || 1}\n`;
        message += `*Luggage*: ${luggageText}\n`;
        message += `*Special Requests*: ${specialRequests || ''}\n\n`;
        message += `*Contact*: ${contactText}\n`;
        message += `*Email*: ${email || ''}\n`;
        message += `*Status:* Pending\n`;
        message += `*Created:* ${createdTime}`;
        return message;
    }
    /**
     * Send booking confirmation message to WhatsApp group
     */
    static async sendBookingConfirmation(bookingData) {
        try {
            if (!env_1.env.whatsapp?.ultraMsgToken) {
                console.warn('⚠️ WhatsApp service not configured - skipping confirmation notification');
                return;
            }
            const message = this.formatBookingConfirmationMessage(bookingData);
            console.log(`📱 Sending WhatsApp confirmation for booking ${bookingData.referenceNumber} to "Xeq Bookings" group`);
            const data = qs_1.default.stringify({
                token: env_1.env.whatsapp.ultraMsgToken,
                to: this.GROUP_ID,
                body: message
            });
            const response = await axios_1.default.post(`${this.ULTRA_MSG_API_URL}/${env_1.env.whatsapp.instanceId}/messages/chat`, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000 // 10 second timeout
            });
            if (response.data.sent) {
                console.log(`✅ WhatsApp confirmation sent successfully for booking ${bookingData.referenceNumber}`);
            }
            else {
                console.error(`❌ Failed to send WhatsApp confirmation for booking ${bookingData.referenceNumber}:`, response.data);
            }
        }
        catch (error) {
            console.error(`❌ Error sending WhatsApp confirmation for booking ${bookingData.referenceNumber}:`, error);
            // Don't throw error to avoid breaking booking confirmation
        }
    }
    /**
     * Format booking confirmation data into WhatsApp message
     */
    static formatBookingConfirmationMessage(booking) {
        const { referenceNumber, pickupDate, pickupTime, pickupLocation, dropoffLocation, vehicleType, price, bookingType, vehicleMake, vehicleColor, vehicleReg, driverName, driverPhone } = booking;
        // Format booking type
        let formattedBookingType = bookingType.charAt(0).toUpperCase() + bookingType.slice(1);
        if (bookingType === 'one-way') {
            formattedBookingType = 'One-way';
        }
        else if (bookingType === 'return') {
            formattedBookingType = 'Return';
        }
        else if (bookingType === 'hourly') {
            formattedBookingType = 'Hourly';
        }
        // Format date
        const date = new Date(pickupDate);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
        // Format time
        const time = new Date(`2000-01-01T${pickupTime}`);
        const formattedTime = time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        let message = `*BOOKING CONFIRMATION*\n\n`;
        message += `Thank you for booking with XEQUTIVE CARS. Your trip is confirmed.\n\n`;
        message += `*Ref:* ${referenceNumber}\n\n`;
        message += `*Type:* ${formattedBookingType}\n\n`;
        message += `*Date:* ${formattedDate}\n\n`;
        message += `*Time:* ${formattedTime}\n\n`;
        message += `*Pickup:* ${pickupLocation}\n\n`;
        if (dropoffLocation && bookingType !== 'hourly') {
            message += `*Dropoff:* ${dropoffLocation}\n\n`;
        }
        else if (bookingType === 'hourly') {
            message += `*Dropoff:* Hourly booking - driver stays with you\n\n`;
        }
        message += `*Vehicle:* ${vehicleType}\n\n`;
        message += `*Fare:* £${price.toFixed(2)}\n`;
        message += `______________________________\n\n`;
        if (vehicleMake) {
            message += `*Vehicle Make:* ${vehicleMake}\n\n`;
        }
        if (vehicleColor) {
            message += `*Colour*: ${vehicleColor}\n\n`;
        }
        if (vehicleReg) {
            message += `*Reg*: ${vehicleReg}\n\n`;
        }
        if (driverName) {
            message += `*Driver*: ${driverName}\n\n`;
        }
        message += `______________________________\n\n`;
        message += `For cancellations or urgent changes (within 24-hrs) contact: ${driverPhone || '+447831054649'} 📱`;
        return message;
    }
    /**
     * Process WhatsApp reactions (checkmark) to booking messages
     */
    static async processBookingReaction(reaction) {
        try {
            logger_1.default.info(`📱 Processing booking reaction from ${reaction.from}: ${reaction.reaction}`);
            // Find the most recent pending booking
            logger_1.default.info(`🔍 Searching for most recent pending booking...`);
            const booking = await this.findMostRecentPendingBooking();
            if (booking) {
                logger_1.default.info(`✅ Found pending booking: ${booking.referenceNumber} (ID: ${booking.id})`);
                logger_1.default.info(`📧 Booking email: ${booking.customer?.email || 'No email found'}`);
                // Update booking status to confirmed
                logger_1.default.info(`🔄 Updating booking status to confirmed...`);
                await this.updateBookingStatus(booking.id, 'confirmed');
                // Send confirmation email to customer
                logger_1.default.info(`📧 Sending confirmation email...`);
                await this.sendBookingConfirmationEmail(booking);
                // Send notification back to WhatsApp group
                logger_1.default.info(`📱 Sending notification to WhatsApp group...`);
                await this.sendConfirmationNotification(booking.referenceNumber);
                logger_1.default.info(`✅ Booking ${booking.referenceNumber} confirmed via checkmark reaction, email sent, and notification sent to group`);
            }
            else {
                logger_1.default.warn(`⚠️ No pending booking found for reaction from ${reaction.from}`);
                logger_1.default.info(`🔍 This could mean: 1) No bookings exist, 2) All bookings are already confirmed, or 3) There's an issue with the query`);
            }
        }
        catch (error) {
            logger_1.default.error('❌ Error processing booking reaction:', error);
        }
    }
    static async processIncomingMessage(message) {
        try {
            logger_1.default.info(`📱 Processing incoming WhatsApp message from ${message.from}: ${message.body || 'No body'}`);
            // Check if this is a booking confirmation message
            const confirmationData = message.body ? this.parseBookingConfirmationMessage(message.body) : null;
            if (confirmationData) {
                logger_1.default.info(`✅ Detected booking confirmation for reference: ${confirmationData.referenceNumber}`);
                // Find the booking in Firestore
                const booking = await this.findBookingByReference(confirmationData.referenceNumber);
                if (booking) {
                    // Update booking status to confirmed
                    await this.updateBookingStatus(booking.id, 'confirmed');
                    // Send confirmation email to customer
                    await this.sendBookingConfirmationEmail(booking);
                    // Send notification back to WhatsApp group
                    await this.sendConfirmationNotification(confirmationData.referenceNumber);
                    logger_1.default.info(`✅ Booking ${confirmationData.referenceNumber} confirmed, email sent, and notification sent to group`);
                }
                else {
                    logger_1.default.warn(`⚠️ Booking not found for reference: ${confirmationData.referenceNumber}`);
                }
            }
            else {
                logger_1.default.info('📱 Message is not a booking confirmation - ignoring');
            }
        }
        catch (error) {
            logger_1.default.error('❌ Error processing incoming WhatsApp message:', error);
        }
    }
    /**
     * Parse booking confirmation message from support team
     * Expected format: Full booking confirmation message with "*BOOKING CONFIRMATION*" header
     * or simple patterns like "CONFIRMED: XEQ_123"
     */
    static parseBookingConfirmationMessage(messageBody) {
        const trimmedMessage = messageBody.trim();
        // Check if this is a full booking confirmation message with the specific format
        if (trimmedMessage.includes('*BOOKING CONFIRMATION*') && trimmedMessage.includes('*Ref:*')) {
            // Extract reference number from the message
            const refMatch = trimmedMessage.match(/\*Ref:\*\s*([A-Z]+_\d+)/i);
            if (refMatch) {
                return { referenceNumber: refMatch[1] };
            }
        }
        // Fallback: Look for simple confirmation patterns
        const upperMessage = trimmedMessage.toUpperCase();
        const confirmationPatterns = [
            /CONFIRMED:\s*([A-Z]+_\d+)/i,
            /BOOKING\s+CONFIRMED:\s*([A-Z]+_\d+)/i,
            /DRIVER\s+ASSIGNED:\s*([A-Z]+_\d+)/i,
            /READY:\s*([A-Z]+_\d+)/i,
            /OK:\s*([A-Z]+_\d+)/i,
            /DONE:\s*([A-Z]+_\d+)/i
        ];
        for (const pattern of confirmationPatterns) {
            const match = upperMessage.match(pattern);
            if (match && match[1]) {
                return { referenceNumber: match[1] };
            }
        }
        // Also check for simple patterns like "XEQ_123 ✓" or "XEQ_123 CONFIRMED"
        const simplePattern = /([A-Z]+_\d+)\s*[✓✅]|([A-Z]+_\d+)\s*CONFIRMED/i;
        const simpleMatch = upperMessage.match(simplePattern);
        if (simpleMatch && (simpleMatch[1] || simpleMatch[2])) {
            return { referenceNumber: simpleMatch[1] || simpleMatch[2] };
        }
        return null;
    }
    /**
     * Find the most recent pending booking from both collections
     */
    static async findMostRecentPendingBooking() {
        try {
            // Check regular bookings collection
            const bookingsRef = firebase_1.firestore.collection('bookings');
            const bookingsSnapshot = await bookingsRef
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            // Check hourly bookings collection
            const hourlyBookingsRef = firebase_1.firestore.collection('hourlyBookings');
            const hourlyBookingsSnapshot = await hourlyBookingsRef
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            // Find the most recent booking from both collections
            let mostRecentBooking = null;
            let mostRecentTime = 0;
            // Check regular bookings
            if (!bookingsSnapshot.empty) {
                const doc = bookingsSnapshot.docs[0];
                const bookingData = doc.data();
                const createdAt = bookingData.createdAt?.toDate?.() || new Date(bookingData.createdAt);
                if (createdAt.getTime() > mostRecentTime) {
                    mostRecentBooking = { id: doc.id, ...bookingData };
                    mostRecentTime = createdAt.getTime();
                }
            }
            // Check hourly bookings
            if (!hourlyBookingsSnapshot.empty) {
                const doc = hourlyBookingsSnapshot.docs[0];
                const bookingData = doc.data();
                const createdAt = bookingData.createdAt?.toDate?.() || new Date(bookingData.createdAt);
                if (createdAt.getTime() > mostRecentTime) {
                    mostRecentBooking = { id: doc.id, ...bookingData };
                    mostRecentTime = createdAt.getTime();
                }
            }
            return mostRecentBooking;
        }
        catch (error) {
            logger_1.default.error('❌ Error finding most recent pending booking:', error);
            return null;
        }
    }
    static async findBookingByReference(referenceNumber) {
        try {
            const bookingsRef = firebase_1.firestore.collection('bookings');
            const snapshot = await bookingsRef.where('referenceNumber', '==', referenceNumber).limit(1).get();
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        }
        catch (error) {
            logger_1.default.error('❌ Error finding booking by reference:', error);
            return null;
        }
    }
    /**
     * Update booking status in Firestore (tries both collections)
     */
    static async updateBookingStatus(bookingId, status) {
        try {
            // Try regular bookings collection first
            try {
                await firebase_1.firestore.collection('bookings').doc(bookingId).update({
                    status,
                    confirmedAt: new Date(),
                    updatedAt: new Date()
                });
                logger_1.default.info(`✅ Updated booking ${bookingId} status to ${status} in bookings collection`);
                return;
            }
            catch (error) {
                // If not found in bookings, try hourly bookings collection
                try {
                    await firebase_1.firestore.collection('hourlyBookings').doc(bookingId).update({
                        status,
                        confirmedAt: new Date(),
                        updatedAt: new Date()
                    });
                    logger_1.default.info(`✅ Updated booking ${bookingId} status to ${status} in hourlyBookings collection`);
                    return;
                }
                catch (hourlyError) {
                    logger_1.default.error(`❌ Booking ${bookingId} not found in either collection:`, error);
                    throw error; // Throw the original error
                }
            }
        }
        catch (error) {
            logger_1.default.error('❌ Error updating booking status:', error);
            throw error;
        }
    }
    /**
     * Send booking confirmation email to customer
     */
    static async sendBookingConfirmationEmail(booking) {
        try {
            await email_service_1.EmailService.sendBookingConfirmationEmail(booking.customer.email, {
                id: booking.id,
                referenceNumber: booking.referenceNumber,
                fullName: booking.customer.fullName,
                pickupDate: booking.pickupDate,
                pickupTime: booking.pickupTime,
                pickupLocation: booking.locations?.pickup?.address || 'Pickup location not specified',
                dropoffLocation: booking.bookingType === 'hourly' ? 'Hourly booking - driver stays with you' : booking.locations?.dropoff?.address || 'Dropoff location not specified',
                vehicleType: booking.vehicle.name,
                price: booking.vehicle.price.amount
            });
            logger_1.default.info(`✅ Confirmation email sent to ${booking.customer.email} for booking ${booking.referenceNumber}`);
        }
        catch (error) {
            logger_1.default.error('❌ Error sending booking confirmation email:', error);
            throw error;
        }
    }
    /**
     * Send confirmation notification back to WhatsApp group
     */
    static async sendConfirmationNotification(referenceNumber) {
        try {
            const message = `✅ Confirmation Email Triggered for ${referenceNumber}`;
            const data = qs_1.default.stringify({
                token: env_1.env.whatsapp.ultraMsgToken,
                to: this.GROUP_ID,
                body: message
            });
            const response = await axios_1.default.post(`${this.ULTRA_MSG_API_URL}/${env_1.env.whatsapp.instanceId}/messages/chat`, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            });
            if (response.data?.sent) {
                logger_1.default.info(`✅ Confirmation notification sent to WhatsApp group for ${referenceNumber}`);
            }
            else {
                logger_1.default.warn(`⚠️ Failed to send confirmation notification for ${referenceNumber}:`, response.data);
            }
        }
        catch (error) {
            logger_1.default.error(`❌ Error sending confirmation notification for ${referenceNumber}:`, error);
            // Don't throw error - this is not critical for the main flow
        }
    }
    /**
     * Test WhatsApp service connectivity
     */
    static async testConnection() {
        try {
            if (!env_1.env.whatsapp?.ultraMsgToken) {
                console.warn('⚠️ WhatsApp service not configured');
                return false;
            }
            const data = qs_1.default.stringify({
                token: env_1.env.whatsapp.ultraMsgToken
            });
            const response = await axios_1.default.post(`${this.ULTRA_MSG_API_URL}/${env_1.env.whatsapp.instanceId}/instance/status`, data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 5000
            });
            const isConnected = response.data?.status === 'connected';
            console.log(`📱 WhatsApp service status: ${isConnected ? 'Connected' : 'Disconnected'}`);
            return isConnected;
        }
        catch (error) {
            console.error('❌ Error testing WhatsApp service:', error);
            return false;
        }
    }
}
exports.WhatsAppService = WhatsAppService;
WhatsAppService.ULTRA_MSG_API_URL = 'https://api.ultramsg.com';
WhatsAppService.GROUP_ID = '120363405665891669@g.us'; // Xeq Bookings group ID
