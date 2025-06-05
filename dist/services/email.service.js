"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const resend_1 = require("resend");
const logger_1 = __importDefault(require("../utils/logger"));
const env_1 = require("../config/env");
/**
 * Email Service for sending transactional emails via Resend
 */
class EmailService {
    // Initialize Resend once
    static initializeResend() {
        if (!this.resend) {
            if (!this.resendApiKey) {
                logger_1.default.warn("RESEND_API_KEY is not set. Email sending is disabled.");
            }
            this.resend = new resend_1.Resend(this.resendApiKey);
        }
        return this.resend;
    }
    /**
     * Get the configured sender address
     */
    static getSenderAddress() {
        return this.senderAddress;
    }
    /**
     * Send an email
     */
    static async sendEmail(to, subject, html, text) {
        try {
            // Skip sending if API key is not configured
            if (!this.resendApiKey) {
                logger_1.default.info(`Email sending skipped (no API key): ${to}, ${subject}`);
                return false;
            }
            // DEVELOPMENT MODE: Simulate email sending without actually sending
            // This helps us test the email flow without hitting Resend's limitations
            logger_1.default.info(`[DEV MODE] Simulating email to: ${to}`);
            logger_1.default.info(`[DEV MODE] Email subject: ${subject}`);
            logger_1.default.info(`[DEV MODE] Email content: ${text || html.substring(0, 100)}...`);
            // Return true to simulate success
            return true;
            // COMMENTED OUT FOR NOW - Uncomment this for production use
            /*
            const resend = this.initializeResend();
            const { data, error } = await resend.emails.send({
              from: this.senderAddress,
              to,
              subject,
              html,
              text: text || "",
            });
      
            if (error) {
              logger.error(`Failed to send email: ${error.message}`);
              return false;
            }
      
            logger.info(`Email sent successfully: ${data?.id}`);
            return true;
            */
        }
        catch (error) {
            logger_1.default.error(`Error sending email: ${error.message}`);
            // In development, we'll simulate success for easier testing
            if (process.env.NODE_ENV === "development") {
                logger_1.default.info(`[DEV MODE] Simulating successful email sending to: ${to}`);
                logger_1.default.info(`[DEV MODE] Email subject: ${subject}`);
                logger_1.default.info(`[DEV MODE] Email would contain: ${text || html.substring(0, 100)}...`);
                return true;
            }
            return false;
        }
    }
    /**
     * Sends an account verification email
     */
    static async sendVerificationEmail(email, name, verificationUrl) {
        const subject = "Verify Your Xequtive Account";
        const html = this.getVerificationEmailTemplate(name, verificationUrl);
        return this.sendEmail(email, subject, html);
    }
    /**
     * Sends a welcome email
     */
    static async sendWelcomeEmail(email, name) {
        const subject = "Welcome to Xequtive!";
        const html = this.getWelcomeEmailTemplate(name);
        return this.sendEmail(email, subject, html);
    }
    /**
     * Sends a forgot password email
     */
    static async sendForgotPasswordEmail(email, resetUrl) {
        const subject = "Reset Your Xequtive Password";
        const html = this.getForgotPasswordEmailTemplate(resetUrl);
        return this.sendEmail(email, subject, html);
    }
    /**
     * Sends a password reset confirmation email
     */
    static async sendPasswordResetConfirmationEmail(email, name) {
        const subject = "Your Xequtive Password Has Been Reset";
        const html = this.getPasswordResetConfirmationEmailTemplate(name);
        return this.sendEmail(email, subject, html);
    }
    /**
     * Sends a profile completion email
     */
    static async sendProfileCompletionEmail(email, name) {
        const subject = "Your Xequtive Profile is Complete";
        const html = this.getProfileCompletionEmailTemplate(name);
        return this.sendEmail(email, subject, html);
    }
    /**
     * Sends a booking confirmation email
     */
    static async sendBookingConfirmationEmail(email, bookingData) {
        const subject = `Booking Confirmation: #${bookingData.id}`;
        const html = this.getBookingConfirmationEmailTemplate(bookingData);
        return this.sendEmail(email, subject, html);
    }
    /**
     * Sends a booking cancellation email
     */
    static async sendBookingCancellationEmail(email, bookingData) {
        const subject = `Booking Cancellation: #${bookingData.id}`;
        const html = this.getBookingCancellationEmailTemplate(bookingData);
        return this.sendEmail(email, subject, html);
    }
    /**
     * Sends a booking reminder email
     */
    static async sendBookingReminderEmail(email, bookingData) {
        const subject = `Reminder: Your Upcoming Booking #${bookingData.id}`;
        const html = this.getBookingReminderEmailTemplate(bookingData);
        return this.sendEmail(email, subject, html);
    }
    // Email templates
    static getVerificationEmailTemplate(name, verificationUrl) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Xequtive Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.logoUrl}" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Hello ${name},</h1>
          <p>Thank you for signing up with Xequtive. Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Verify Your Email</a>
          </div>
          <p>If the button above doesn't work, copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #7f8c8d;">${verificationUrl}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
    }
    static getWelcomeEmailTemplate(name) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Xequtive</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.logoUrl}" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Welcome to Xequtive, ${name}!</h1>
          <p>Thank you for joining Xequtive - London's premium transport service.</p>
          <p>We're excited to have you on board and can't wait to provide you with exceptional travel experiences.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/dashboard" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Visit Your Dashboard</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
    }
    static getForgotPasswordEmailTemplate(resetUrl) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Xequtive Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.logoUrl}" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Reset Your Password</h1>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          <p>If the button above doesn't work, copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #7f8c8d;">${resetUrl}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
    }
    static getPasswordResetConfirmationEmailTemplate(name) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset Successful</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.logoUrl}" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Hello ${name},</h1>
          <p>Your Xequtive account password has been successfully reset.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/login" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Login to Your Account</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
    }
    static getProfileCompletionEmailTemplate(name) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Profile Completion Confirmed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.logoUrl}" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Hello ${name},</h1>
          <p>Thank you for completing your profile information. Your Xequtive account is now fully set up and ready to use.</p>
          <p>You can now enjoy all features of our service:</p>
          <ul style="padding-left: 20px;">
            <li>Book premium rides and chauffeur services</li>
            <li>Access your personalized dashboard</li>
            <li>Track your ride history</li>
            <li>Manage your payment methods</li>
          </ul>
          <p>We look forward to providing you with exceptional transportation services.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/dashboard" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Visit Your Dashboard</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
    }
    static getBookingConfirmationEmailTemplate(bookingData) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.logoUrl}" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Booking Confirmation</h1>
          <p>Dear ${bookingData.fullName},</p>
          <p>Your booking has been confirmed. Here are the details:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Booking ID:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Date:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.pickupDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Time:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.pickupTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Pickup:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.pickupLocation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Destination:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.dropoffLocation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Vehicle:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.vehicleType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Price:</td>
                <td style="padding: 8px 0;">£${bookingData.price.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <p>Your driver will arrive at the pickup location at the scheduled time.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/bookings/${bookingData.id}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Manage Booking</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
    }
    static getBookingCancellationEmailTemplate(bookingData) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Cancellation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.logoUrl}" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Booking Cancellation</h1>
          <p>Dear ${bookingData.fullName},</p>
          <p>Your booking has been cancelled as requested. Here are the details:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Booking ID:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Date:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.pickupDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Time:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.pickupTime}</td>
              </tr>
              ${bookingData.cancellationReason
            ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Cancellation Reason:</td>
                <td style="padding: 8px 0;">${bookingData.cancellationReason}</td>
              </tr>
              `
            : ""}
            </table>
          </div>
          
          <p>If you did not request this cancellation or need further assistance, please contact our customer support team.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/bookings" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">View Your Bookings</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
    }
    static getBookingReminderEmailTemplate(bookingData) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${this.logoUrl}" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Your Ride is Coming Up!</h1>
          <p>Dear ${bookingData.fullName},</p>
          <p>This is a friendly reminder about your upcoming booking with Xequtive:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Booking ID:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Date:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.pickupDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Time:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.pickupTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Pickup:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.pickupLocation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Destination:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.dropoffLocation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Vehicle:</td>
                <td style="padding: 8px 0;">${bookingData.vehicleType}</td>
              </tr>
            </table>
          </div>
          
          <p>Your driver will arrive at the pickup location at the scheduled time. We'll send you driver details shortly before your journey.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/bookings/${bookingData.id}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Manage Booking</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
    }
}
exports.EmailService = EmailService;
EmailService.resend = null;
EmailService.senderAddress = process.env.EMAIL_SENDER_ADDRESS || "Xequtive <onboarding@resend.dev>";
EmailService.resendApiKey = process.env.RESEND_API_KEY || "";
EmailService.frontendUrl = env_1.env.email.frontendUrl || "";
EmailService.logoUrl = env_1.env.email.logoUrl || "";
