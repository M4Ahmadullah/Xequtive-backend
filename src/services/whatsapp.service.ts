import axios from 'axios';
import qs from 'qs';
import { env } from '../config/env';
import { EmailService } from './email.service';
import { firestore } from '../config/firebase';
import logger from '../utils/logger';

export interface WhatsAppBookingData {
  id: string;
  referenceNumber: string;
  fullName: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  dropoffLocation?: string;
  vehicleType: string;
  price: number;
  bookingType: string;
  phoneNumber?: string;
  email?: string;
  passengers?: {
    count: number;
    checkedLuggage?: number;
    handLuggage?: number;
    mediumLuggage?: number;
    babySeat?: number;
    childSeat?: number;
    boosterSeat?: number;
    wheelchair?: number;
  };
  specialRequests?: string;
  hours?: number; // For hourly bookings
  returnDate?: string; // For return bookings
  returnTime?: string; // For return bookings
}

export interface WhatsAppIncomingMessage {
  from: string;
  body: string;
  chatId: string;
  timestamp: string;
}

export class WhatsAppService {
  private static readonly ULTRA_MSG_API_URL = 'https://api.ultramsg.com';
  private static readonly GROUP_ID = '120363405665891669@g.us'; // Xeq Bookings group ID

  /**
   * Send booking notification to WhatsApp group
   */
  static async sendBookingNotification(bookingData: WhatsAppBookingData): Promise<void> {
    try {
      if (!env.whatsapp?.ultraMsgToken) {
        console.warn('⚠️ WhatsApp service not configured - skipping notification');
        return;
      }

      const message = this.formatBookingMessage(bookingData);
      
      console.log(`📱 Sending WhatsApp notification for booking ${bookingData.referenceNumber} to "Xeq Bookings" group`);

      const data = qs.stringify({
        token: env.whatsapp.ultraMsgToken,
        to: this.GROUP_ID,
        body: message
      });

      const response = await axios.post(`${this.ULTRA_MSG_API_URL}/${env.whatsapp.instanceId}/messages/chat`, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.sent) {
        console.log(`✅ WhatsApp notification sent successfully for booking ${bookingData.referenceNumber}`);
      } else {
        console.error(`❌ Failed to send WhatsApp notification for booking ${bookingData.referenceNumber}:`, response.data);
      }
    } catch (error) {
      console.error(`❌ Error sending WhatsApp notification for booking ${bookingData.referenceNumber}:`, error);
      // Don't throw error to avoid breaking booking creation
    }
  }

  /**
   * Format booking data into a readable WhatsApp message
   */
  private static formatBookingMessage(booking: WhatsAppBookingData): string {
    const { referenceNumber, fullName, pickupDate, pickupTime, pickupLocation, dropoffLocation, vehicleType, price, bookingType, phoneNumber, email, passengers, specialRequests, hours, returnDate, returnTime } = booking;

    // Format booking type
    let formattedBookingType = bookingType.charAt(0).toUpperCase() + bookingType.slice(1);
    if (bookingType === 'one-way') {
      formattedBookingType = 'One-way';
    } else if (bookingType === 'return') {
      formattedBookingType = 'Return';
    } else if (bookingType === 'hourly') {
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
    } else if (phoneNumber) {
      contactText = phoneNumber;
    } else if (email) {
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
    } else if (bookingType === 'hourly') {
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
  static async sendBookingConfirmation(bookingData: WhatsAppBookingData & {
    vehicleMake?: string;
    vehicleColor?: string;
    vehicleReg?: string;
    driverName?: string;
    driverPhone?: string;
  }): Promise<void> {
    try {
      if (!env.whatsapp?.ultraMsgToken) {
        console.warn('⚠️ WhatsApp service not configured - skipping confirmation notification');
        return;
      }

      const message = this.formatBookingConfirmationMessage(bookingData);
      
      console.log(`📱 Sending WhatsApp confirmation for booking ${bookingData.referenceNumber} to "Xeq Bookings" group`);

      const data = qs.stringify({
        token: env.whatsapp.ultraMsgToken,
        to: this.GROUP_ID,
        body: message
      });

      const response = await axios.post(`${this.ULTRA_MSG_API_URL}/${env.whatsapp.instanceId}/messages/chat`, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.sent) {
        console.log(`✅ WhatsApp confirmation sent successfully for booking ${bookingData.referenceNumber}`);
      } else {
        console.error(`❌ Failed to send WhatsApp confirmation for booking ${bookingData.referenceNumber}:`, response.data);
      }
    } catch (error) {
      console.error(`❌ Error sending WhatsApp confirmation for booking ${bookingData.referenceNumber}:`, error);
      // Don't throw error to avoid breaking booking confirmation
    }
  }

  /**
   * Format booking confirmation data into WhatsApp message
   */
  private static formatBookingConfirmationMessage(booking: WhatsAppBookingData & {
    vehicleMake?: string;
    vehicleColor?: string;
    vehicleReg?: string;
    driverName?: string;
    driverPhone?: string;
  }): string {
    const { 
      referenceNumber, 
      pickupDate, 
      pickupTime, 
      pickupLocation, 
      dropoffLocation, 
      vehicleType, 
      price, 
      bookingType,
      vehicleMake,
      vehicleColor,
      vehicleReg,
      driverName,
      driverPhone
    } = booking;

    // Format booking type
    let formattedBookingType = bookingType.charAt(0).toUpperCase() + bookingType.slice(1);
    if (bookingType === 'one-way') {
      formattedBookingType = 'One-way';
    } else if (bookingType === 'return') {
      formattedBookingType = 'Return';
    } else if (bookingType === 'hourly') {
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
    } else if (bookingType === 'hourly') {
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
   * Process incoming WhatsApp messages to detect booking confirmations
   */
  static async processIncomingMessage(message: WhatsAppIncomingMessage): Promise<void> {
    try {
      logger.info(`📱 Processing incoming WhatsApp message from ${message.from}: ${message.body}`);

      // Check if this is a booking confirmation message
      const confirmationData = this.parseBookingConfirmationMessage(message.body);
      
      if (confirmationData) {
        logger.info(`✅ Detected booking confirmation for reference: ${confirmationData.referenceNumber}`);
        
        // Find the booking in Firestore
        const booking = await this.findBookingByReference(confirmationData.referenceNumber);
        
        if (booking) {
          // Update booking status to confirmed
          await this.updateBookingStatus(booking.id, 'confirmed');
          
          // Send confirmation email to customer
          await this.sendBookingConfirmationEmail(booking);
          
          logger.info(`✅ Booking ${confirmationData.referenceNumber} confirmed and email sent to customer`);
        } else {
          logger.warn(`⚠️ Booking not found for reference: ${confirmationData.referenceNumber}`);
        }
      } else {
        logger.info('📱 Message is not a booking confirmation - ignoring');
      }
    } catch (error) {
      logger.error('❌ Error processing incoming WhatsApp message:', error);
    }
  }

  /**
   * Parse booking confirmation message from support team
   * Expected format: "CONFIRMED: XEQ_123" or "BOOKING CONFIRMED: XEQ_123" or similar
   */
  private static parseBookingConfirmationMessage(messageBody: string): { referenceNumber: string } | null {
    const trimmedMessage = messageBody.trim().toUpperCase();
    
    // Look for confirmation patterns
    const confirmationPatterns = [
      /CONFIRMED:\s*([A-Z]+_\d+)/i,
      /BOOKING\s+CONFIRMED:\s*([A-Z]+_\d+)/i,
      /DRIVER\s+ASSIGNED:\s*([A-Z]+_\d+)/i,
      /READY:\s*([A-Z]+_\d+)/i,
      /OK:\s*([A-Z]+_\d+)/i,
      /DONE:\s*([A-Z]+_\d+)/i
    ];

    for (const pattern of confirmationPatterns) {
      const match = trimmedMessage.match(pattern);
      if (match && match[1]) {
        return { referenceNumber: match[1] };
      }
    }

    // Also check for simple patterns like "XEQ_123 ✓" or "XEQ_123 CONFIRMED"
    const simplePattern = /([A-Z]+_\d+)\s*[✓✅]|([A-Z]+_\d+)\s*CONFIRMED/i;
    const simpleMatch = trimmedMessage.match(simplePattern);
    if (simpleMatch && (simpleMatch[1] || simpleMatch[2])) {
      return { referenceNumber: simpleMatch[1] || simpleMatch[2] };
    }

    return null;
  }

  /**
   * Find booking by reference number in Firestore
   */
  private static async findBookingByReference(referenceNumber: string): Promise<any> {
    try {
      const bookingsRef = firestore.collection('bookings');
      const snapshot = await bookingsRef.where('referenceNumber', '==', referenceNumber).limit(1).get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      return null;
    } catch (error) {
      logger.error('❌ Error finding booking by reference:', error);
      return null;
    }
  }

  /**
   * Update booking status in Firestore
   */
  private static async updateBookingStatus(bookingId: string, status: string): Promise<void> {
    try {
      await firestore.collection('bookings').doc(bookingId).update({
        status,
        confirmedAt: new Date(),
        updatedAt: new Date()
      });
      
      logger.info(`✅ Updated booking ${bookingId} status to ${status}`);
    } catch (error) {
      logger.error('❌ Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation email to customer
   */
  private static async sendBookingConfirmationEmail(booking: any): Promise<void> {
    try {
      await EmailService.sendBookingConfirmationEmail(booking.customer.email, {
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
      logger.info(`✅ Confirmation email sent to ${booking.customer.email} for booking ${booking.referenceNumber}`);
    } catch (error) {
      logger.error('❌ Error sending booking confirmation email:', error);
      throw error;
    }
  }

  /**
   * Test WhatsApp service connectivity
   */
  static async testConnection(): Promise<boolean> {
    try {
      if (!env.whatsapp?.ultraMsgToken) {
        console.warn('⚠️ WhatsApp service not configured');
        return false;
      }

      const data = qs.stringify({
        token: env.whatsapp.ultraMsgToken
      });

      const response = await axios.post(`${this.ULTRA_MSG_API_URL}/${env.whatsapp.instanceId}/instance/status`, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      });

      const isConnected = response.data?.status === 'connected';
      console.log(`📱 WhatsApp service status: ${isConnected ? 'Connected' : 'Disconnected'}`);
      return isConnected;
    } catch (error) {
      console.error('❌ Error testing WhatsApp service:', error);
      return false;
    }
  }
}
