import { Resend } from "resend";
import logger from "../utils/logger";
import { env } from "../config/env";
import { ContactMessageData } from "../types";

/**
 * Email Service for sending transactional emails via Resend
 */
export class EmailService {
  private static resend: Resend | null = null;
  private static senderAddress =
    process.env.EMAIL_SENDER_ADDRESS || "Xequtive <info@xeqcars.com>";
  private static resendApiKey = process.env.RESEND_API_KEY || "";
  private static frontendUrl = env.email.frontendUrl || "";
  private static logoUrl = env.email.logoUrl || "";

  // Initialize Resend once
  private static initializeResend(): Resend {
    if (!this.resend) {
      if (!this.resendApiKey) {
        logger.warn("RESEND_API_KEY is not set. Email sending is disabled.");
      }
      this.resend = new Resend(this.resendApiKey);
    }
    return this.resend;
  }

  /**
   * Get the configured sender address
   */
  public static getSenderAddress(): string {
    return this.senderAddress;
  }

  /**
   * Send an email
   */
  static async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    try {
      // Skip sending if API key is not configured
      if (!this.resendApiKey) {
        logger.error(`❌ RESEND_API_KEY not configured. Email not sent to: ${to} - ${subject}`);
        return false;
      }

      logger.info(`📧 Attempting to send email to: ${to} - ${subject}`);
      logger.info(`📧 Sender address: ${this.senderAddress}`);
      logger.info(`📧 API Key configured: ${this.resendApiKey ? 'Yes' : 'No'}`);

      const resend = this.initializeResend();
      const { data, error } = await resend.emails.send({
        from: this.senderAddress,
        to: [to],
        subject,
        html,
        text: text || "",
      });

      if (error) {
        logger.error(`❌ Resend API error:`, error);
        return false;
      }

      logger.info(`✅ Email sent successfully via Resend:`, {
        to,
        subject,
        messageId: data?.id,
        sender: this.senderAddress
      });

      return true;
    } catch (error: any) {
      logger.error(`❌ Email failed: ${error.message}`);

      // In development, we'll simulate success for easier testing
      if (process.env.NODE_ENV === "development") {
        logger.info(`📧 Email sent (dev mode): ${to} - ${subject}`);
        return true;
      }

      return false;
    }
  }

  /**
   * Sends an account verification email
   */
  public static async sendVerificationEmail(
    email: string,
    name: string,
    verificationUrl: string
  ): Promise<boolean> {
    const subject = "Verify Your Xequtive Account";
    const html = this.getVerificationEmailTemplate(name, verificationUrl);
    return this.sendEmail(email, subject, html);
  }

  /**
   * Sends a welcome email
   */
  public static async sendWelcomeEmail(
    email: string,
    name: string
  ): Promise<boolean> {
    const subject = "Welcome to Xequtive!";
    const html = this.getWelcomeEmailTemplate(name);
    return this.sendEmail(email, subject, html);
  }

  /**
   * Sends a forgot password email
   */
  public static async sendForgotPasswordEmail(
    email: string,
    resetUrl: string
  ): Promise<boolean> {
    const subject = "Reset Your Xequtive Password";
    const html = this.getForgotPasswordEmailTemplate(resetUrl);
    return this.sendEmail(email, subject, html);
  }

  /**
   * Sends a password reset OTP email
   */
  public static async sendPasswordResetOTPEmail(
    email: string,
    otp: string
  ): Promise<boolean> {
    const subject = "Your Password Reset OTP - Xequtive";
    const html = this.getPasswordResetOTPEmailTemplate(otp);
    return this.sendEmail(email, subject, html);
  }

  /**
   * Sends an email verification OTP email
   */
  public static async sendEmailVerificationOTPEmail(
    email: string,
    otp: string,
    name?: string
  ): Promise<boolean> {
    const subject = "Verify Your Email - Xequtive";
    const html = this.getEmailVerificationOTPEmailTemplate(otp, name);
    return this.sendEmail(email, subject, html);
  }

  /**
   * Sends a password reset confirmation email
   */
  public static async sendPasswordResetConfirmationEmail(
    email: string,
    name: string
  ): Promise<boolean> {
    const subject = "Your Xequtive Password Has Been Reset";
    const html = this.getPasswordResetConfirmationEmailTemplate(name);
    return this.sendEmail(email, subject, html);
  }

  /**
   * Sends a profile completion email
   */
  public static async sendProfileCompletionEmail(
    email: string,
    name: string
  ): Promise<boolean> {
    const subject = "Your Xequtive Profile is Complete";
    const html = this.getProfileCompletionEmailTemplate(name);
    return this.sendEmail(email, subject, html);
  }

  /**
   * Sends a booking creation email (when booking is first created)
   */
  public static async sendBookingCreationEmail(
    email: string,
    bookingData: {
      id: string;
      referenceNumber: string;
      fullName: string;
      pickupDate: string;
      pickupTime: string;
      pickupLocation: string;
      dropoffLocation: string;
      vehicleType: string;
      price: number;
    }
  ): Promise<boolean> {
    const subject = `Booking Created: ${bookingData.referenceNumber}`;
    const html = this.getBookingCreationEmailTemplate(bookingData);
    return this.sendEmail(email, subject, html);
  }
  public static async sendBookingConfirmationEmail(
    email: string,
    bookingData: {
      id: string;
      referenceNumber: string;
      fullName: string;
      pickupDate: string;
      pickupTime: string;
      pickupLocation: string;
      dropoffLocation: string;
      vehicleType: string;
      price: number;
    }
  ): Promise<boolean> {
    const subject = `Booking Confirmed: ${bookingData.referenceNumber}`;
    const html = this.getBookingConfirmationEmailTemplate(bookingData);
    return this.sendEmail(email, subject, html);
  }

  /**
   * Sends a booking cancellation email
   */
  public static async sendBookingCancellationEmail(
    email: string,
    bookingData: {
      id: string;
      fullName: string;
      pickupDate: string;
      pickupTime: string;
      cancellationReason?: string;
    }
  ): Promise<boolean> {
    const subject = `Booking Cancellation: #${bookingData.id}`;
    const html = this.getBookingCancellationEmailTemplate(bookingData);
    return this.sendEmail(email, subject, html);
  }

  /**
   * Sends a booking reminder email
   */
  public static async sendBookingReminderEmail(
    email: string,
    bookingData: {
      id: string;
      fullName: string;
      pickupDate: string;
      pickupTime: string;
      pickupLocation: string;
      dropoffLocation: string;
      vehicleType: string;
    }
  ): Promise<boolean> {
    const subject = `Reminder: Your Upcoming Booking #${bookingData.id}`;
    const html = this.getBookingReminderEmailTemplate(bookingData);
    return this.sendEmail(email, subject, html);
  }

  // Email templates
  private static getVerificationEmailTemplate(
    name: string,
    verificationUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Xequtive Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
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

  private static getWelcomeEmailTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Xequtive</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
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

  private static getForgotPasswordEmailTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Xequtive Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
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

  private static getPasswordResetConfirmationEmailTemplate(
    name: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset Successful</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
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

  private static getPasswordResetOTPEmailTemplate(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Password Reset OTP</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Password Reset Request</h1>
          <p>We received a request to reset your Xequtive account password. Use the OTP below to verify your identity:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; display: inline-block;">
              <h2 style="color: #2c3e50; font-size: 32px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h2>
            </div>
          </div>
          
          <p><strong>Important Security Information:</strong></p>
          <ul style="color: #7f8c8d;">
            <li>This OTP is valid for <strong>5 minutes</strong> only</li>
            <li>You have <strong>3 attempts</strong> to enter the correct OTP</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Never share this OTP with anyone</li>
          </ul>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>⚠️ Security Notice:</strong> If you didn't request a password reset, your account may be at risk. Please contact our support team immediately.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.<br>
            This is an automated message, please do not reply to this email.
          </p>
        </body>
      </html>
    `;
  }

  private static getEmailVerificationOTPEmailTemplate(otp: string, name?: string): string {
    const greeting = name ? `Hello ${name},` : 'Hello,';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">${greeting}</h1>
          <p>Welcome to Xequtive! To complete your account registration, please verify your email address using the verification code below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f8f8f8; border: 2px solid #8B0000; border-radius: 8px; padding: 20px; display: inline-block;">
              <h2 style="color: #8B0000; font-size: 32px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h2>
            </div>
          </div>
          
          <p><strong>Important Information:</strong></p>
          <ul style="color: #7f8c8d;">
            <li>This verification code is valid for <strong>5 minutes</strong> only</li>
            <li>You have <strong>3 attempts</strong> to enter the correct code</li>
            <li>If you didn't create an account with us, please ignore this email</li>
            <li>Never share this code with anyone</li>
          </ul>
          
          <div style="background-color: #f8f8f8; border: 1px solid #8B0000; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #8B0000;"><strong>✅ Next Steps:</strong> Enter this code in the verification form to complete your account setup and start using Xequtive services.</p>
          </div>
          
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
  }

  private static getProfileCompletionEmailTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Profile Completion Confirmed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
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

  private static getBookingCreationEmailTemplate(bookingData: {
    id: string;
    referenceNumber: string;
    fullName: string;
    pickupDate: string;
    pickupTime: string;
    pickupLocation: string;
    dropoffLocation: string;
    vehicleType: string;
    price: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Creation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Booking Creation</h1>
          <p>Dear ${bookingData.fullName},</p>
          <p>Your booking has been created and is being processed, here are the details:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Reference Number:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #e74c3c; font-weight: bold; font-size: 18px;">${bookingData.referenceNumber}</td>
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
                <td style="padding: 8px 0; font-weight: bold;">Total Fare:</td>
                <td style="padding: 8px 0; color: #27ae60; font-weight: bold; font-size: 18px;">£${bookingData.price.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <p><strong>Please quote your reference number (${bookingData.referenceNumber}) when contacting us about this booking.</strong></p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://xeqcars.com/dashboard" style="background-color: #8B0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Manage Booking</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
  }

  private static getBookingConfirmationEmailTemplate(bookingData: {
    id: string;
    referenceNumber: string;
    fullName: string;
    pickupDate: string;
    pickupTime: string;
    pickupLocation: string;
    dropoffLocation: string;
    vehicleType: string;
    price: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
          </div>
          <h1 style="color: #2c3e50; font-size: 24px;">Booking Confirmation</h1>
          <p>Dear ${bookingData.fullName},</p>
          <p>Thank you for booking with XEQUTIVE CARS. Your trip is confirmed.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Reference Number:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #e74c3c; font-weight: bold; font-size: 18px;">${bookingData.referenceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Type:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">One-way</td>
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
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Dropoff:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.dropoffLocation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Vehicle:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${bookingData.vehicleType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Fare:</td>
                <td style="padding: 8px 0; color: #27ae60; font-weight: bold; font-size: 18px;">£${bookingData.price.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #7f8c8d; font-size: 14px;">
              <strong>For cancellations or urgent changes (within 24-hrs) contact:</strong><br>
              <a href="tel:+447831054649" style="color: #3498db; text-decoration: none;">+447831054649</a>
            </p>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
  }

  private static getBookingCancellationEmailTemplate(bookingData: {
    id: string;
    fullName: string;
    pickupDate: string;
    pickupTime: string;
    cancellationReason?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Cancellation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
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
              ${
                bookingData.cancellationReason
                  ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Cancellation Reason:</td>
                <td style="padding: 8px 0;">${bookingData.cancellationReason}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>
          
          <p>If you did not request this cancellation or need further assistance, please contact our customer support team.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
  }

  private static getBookingReminderEmailTemplate(bookingData: {
    id: string;
    fullName: string;
    pickupDate: string;
    pickupTime: string;
    pickupLocation: string;
    dropoffLocation: string;
    vehicleType: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
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

  /**
   * Send contact form notification to support team
   */
  public static async sendContactNotification(contactData: ContactMessageData): Promise<boolean> {
    try {
      const supportEmail = process.env.SUPPORT_EMAIL || "support@xeqcars.com";
      const subject = `New Contact Message from ${contactData.firstName} ${contactData.lastName} - ${contactData.id}`;
      
      const html = this.getContactNotificationEmailTemplate(contactData);
      const text = this.getContactNotificationTextTemplate(contactData);

      return await this.sendEmail(supportEmail, subject, html, text);
    } catch (error) {
      logger.error("Failed to send contact notification:", error);
      return false;
    }
  }

  private static getContactNotificationEmailTemplate(contactData: ContactMessageData): string {
    const timestamp = new Date(contactData.createdAt).toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Contact Message</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://xeqcars.com/logo.png" alt="Xequtive Logo" width="150">
          </div>
          
          <h1 style="color: #2c3e50; font-size: 24px;">New Contact Message Received</h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">Message ID:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${contactData.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${contactData.firstName} ${contactData.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">
                  <a href="mailto:${contactData.email}" style="color: #3498db;">${contactData.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">
                  <a href="tel:${contactData.phone}" style="color: #3498db;">${contactData.phone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Inquiry Type:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">
                  <span style="background-color: #3498db; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; text-transform: uppercase;">
                    ${this.formatInquiryType(contactData.inquiryType)}
                  </span>
                  ${contactData.otherInquiryType ? `<br><small style="color: #666; margin-top: 4px; display: block;">${contactData.otherInquiryType}</small>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">Received:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd; font-weight: bold;">User Status:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">
                  ${contactData.userId ? '✅ Logged in user' : '❌ Anonymous user'}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0;">
                  <span style="background-color: #e74c3c; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; text-transform: uppercase;">
                    ${contactData.status}
                  </span>
                </td>
              </tr>
            </table>
          </div>
          
          <h2 style="color: #2c3e50; font-size: 18px; margin-top: 30px;">Message:</h2>
          <div style="background-color: #ffffff; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 10px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${contactData.message}</p>
          </div>
          
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #2c3e50;">
              <strong>Action Required:</strong> Please respond to this inquiry within 24 hours.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/admin/contact/${contactData.id}" style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">View in Admin Panel</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 14px; text-align: center;">
            &copy; ${new Date().getFullYear()} Xequtive Ltd. All rights reserved.
          </p>
        </body>
      </html>
    `;
  }

  private static getContactNotificationTextTemplate(contactData: ContactMessageData): string {
    const timestamp = new Date(contactData.createdAt).toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
New Contact Message Received

Message ID: ${contactData.id}
Name: ${contactData.firstName} ${contactData.lastName}
Email: ${contactData.email}
Phone: ${contactData.phone}
Inquiry Type: ${this.formatInquiryType(contactData.inquiryType)}${contactData.otherInquiryType ? ` (${contactData.otherInquiryType})` : ''}
Received: ${timestamp}
User Status: ${contactData.userId ? 'Logged in user' : 'Anonymous user'}
Status: ${contactData.status}

Message:
${contactData.message}

Action Required: Please respond to this inquiry within 24 hours.

View in Admin Panel: ${this.frontendUrl}/admin/contact/${contactData.id}
    `.trim();
  }

  /**
   * Format inquiry type for display
   */
  private static formatInquiryType(inquiryType: string): string {
    const typeMap: { [key: string]: string } = {
      'bookings': 'Bookings',
      'payments': 'Payments',
      'business-account': 'Business Account',
      'lost-property': 'Lost Property',
      'other': 'Other'
    };
    
    return typeMap[inquiryType] || inquiryType;
  }
}
