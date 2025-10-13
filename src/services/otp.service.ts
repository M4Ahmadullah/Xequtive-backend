import { firestore } from '../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import logger from '../utils/logger';

export interface OTPData {
  email: string;
  otp: string;
  purpose: 'password-reset' | 'email-verification';
  expiresAt: Timestamp;
  attempts: number;
  verified: boolean;
  createdAt: Timestamp;
  verifiedAt?: Timestamp;
  invalidatedAt?: Timestamp;
}

export class OTPService {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_EXPIRY_MINUTES = 5;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RATE_LIMIT_MINUTES = 1;

  /**
   * Generate a random 6-digit OTP
   */
  private static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create and store OTP for email verification
   */
  static async createEmailVerificationOTP(email: string): Promise<string> {
    try {
      // Rate limiting disabled for development
      // TODO: Re-enable rate limiting in production

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000));
      const createdAt = Timestamp.fromDate(new Date());

      const otpData: OTPData = {
        email: email.toLowerCase(),
        otp,
        purpose: 'email-verification',
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt
      };

      // Store in Firestore
      await firestore.collection('otps').add(otpData);

      logger.info(`✅ Email verification OTP created for: ${email}`);
      return otp;
    } catch (error) {
      logger.error('❌ Error creating email verification OTP:', error);
      throw error;
    }
  }

  /**
   * Create and store OTP for password reset
   */
  static async createPasswordResetOTP(email: string): Promise<string> {
    try {
      // Rate limiting disabled for development
      // TODO: Re-enable rate limiting in production

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000));
      const createdAt = Timestamp.fromDate(new Date());

      const otpData: OTPData = {
        email: email.toLowerCase(),
        otp,
        purpose: 'password-reset',
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt
      };

      // Store in Firestore
      await firestore.collection('otps').add(otpData);

      logger.info(`✅ OTP created for password reset: ${email}`);
      return otp;
    } catch (error) {
      logger.error('❌ Error creating password reset OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP for email verification
   */
  static async verifyEmailVerificationOTP(email: string, otp: string): Promise<boolean> {
    try {
      const otpDoc = await this.getValidOTP(email, 'email-verification');
      
      if (!otpDoc) {
        logger.warn(`⚠️ No valid email verification OTP found for email: ${email}`);
        return false;
      }

      const otpData = otpDoc.data() as OTPData;

      // Check if OTP has expired
      if (new Date() > otpData.expiresAt.toDate()) {
        logger.warn(`⚠️ Email verification OTP expired for email: ${email}`);
        await this.markOTPAsExpired(otpDoc.id);
        return false;
      }

      // Check if too many attempts
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        logger.warn(`⚠️ Too many email verification OTP attempts for email: ${email}`);
        await this.markOTPAsExpired(otpDoc.id);
        return false;
      }

      // Increment attempts
      await otpDoc.ref.update({
        attempts: otpData.attempts + 1
      });

      // Check if OTP matches
      if (otpData.otp === otp) {
        // Mark as verified
        await otpDoc.ref.update({
          verified: true,
          verifiedAt: new Date()
        });
        
        logger.info(`✅ Email verification OTP verified successfully for email: ${email}`);
        return true;
      }

      logger.warn(`⚠️ Invalid email verification OTP attempt for email: ${email}`);
      return false;
    } catch (error) {
      logger.error('❌ Error verifying email verification OTP:', error);
      return false;
    }
  }

  /**
   * Verify OTP for password reset
   */
  static async verifyPasswordResetOTP(email: string, otp: string): Promise<boolean> {
    try {
      const otpDoc = await this.getValidOTP(email, 'password-reset');
      
      if (!otpDoc) {
        logger.warn(`⚠️ No valid OTP found for email: ${email}`);
        return false;
      }

      const otpData = otpDoc.data() as OTPData;

      // Check if OTP has expired
      if (new Date() > otpData.expiresAt.toDate()) {
        logger.warn(`⚠️ OTP expired for email: ${email}`);
        await this.markOTPAsExpired(otpDoc.id);
        return false;
      }

      // Check if too many attempts
      if (otpData.attempts >= this.MAX_ATTEMPTS) {
        logger.warn(`⚠️ Too many OTP attempts for email: ${email}`);
        await this.markOTPAsExpired(otpDoc.id);
        return false;
      }

      // Increment attempts
      await otpDoc.ref.update({
        attempts: otpData.attempts + 1
      });

      // Check if OTP matches
      if (otpData.otp === otp) {
        // Mark as verified
        await otpDoc.ref.update({
          verified: true,
          verifiedAt: new Date()
        });
        
        logger.info(`✅ OTP verified successfully for email: ${email}`);
        return true;
      }

      logger.warn(`⚠️ Invalid OTP attempt for email: ${email}`);
      return false;
    } catch (error) {
      logger.error('❌ Error verifying OTP:', error);
      return false;
    }
  }

  /**
   * Check if email verification OTP is verified and valid
   */
  static async isEmailVerificationOTPVerified(email: string): Promise<boolean> {
    try {
      const otpDoc = await this.getValidOTP(email, 'email-verification');
      
      if (!otpDoc) {
        return false;
      }

      const otpData = otpDoc.data() as OTPData;
      
      // Check if OTP is verified and not expired
      return otpData.verified && new Date() <= otpData.expiresAt.toDate();
    } catch (error) {
      logger.error('❌ Error checking email verification OTP status:', error);
      return false;
    }
  }

  /**
   * Check if OTP is verified and valid for password reset
   */
  static async isOTPVerified(email: string): Promise<boolean> {
    try {
      const otpDoc = await this.getVerifiedOTP(email, 'password-reset');
      
      if (!otpDoc) {
        return false;
      }

      const otpData = otpDoc.data() as OTPData;
      
      // Check if OTP is verified and not expired
      return otpData.verified && new Date() <= otpData.expiresAt.toDate();
    } catch (error) {
      logger.error('❌ Error checking OTP verification status:', error);
      return false;
    }
  }

  /**
   * Invalidate email verification OTP after successful verification
   */
  static async invalidateEmailVerificationOTP(email: string): Promise<void> {
    try {
      const otpDoc = await this.getValidOTP(email, 'email-verification');
      
      if (otpDoc) {
        await otpDoc.ref.update({
          verified: false,
          invalidatedAt: new Date()
        });
        
        logger.info(`✅ Email verification OTP invalidated for email: ${email}`);
      }
    } catch (error) {
      logger.error('❌ Error invalidating email verification OTP:', error);
    }
  }

  /**
   * Invalidate OTP after successful password reset
   */
  static async invalidateOTP(email: string): Promise<void> {
    try {
      const otpDoc = await this.getValidOTP(email, 'password-reset');
      
      if (otpDoc) {
        await otpDoc.ref.update({
          verified: false,
          invalidatedAt: new Date()
        });
        
        logger.info(`✅ OTP invalidated for email: ${email}`);
      }
    } catch (error) {
      logger.error('❌ Error invalidating OTP:', error);
    }
  }

  /**
   * Get valid OTP document from Firestore (unverified)
   */
  private static async getValidOTP(email: string, purpose: string) {
    const otpsRef = firestore.collection('otps');
    const snapshot = await otpsRef
      .where('email', '==', email.toLowerCase())
      .where('purpose', '==', purpose)
      .where('verified', '==', false)
      .limit(10)
      .get();

    // Sort by createdAt in memory to avoid composite index requirement
    const docs = snapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt.toDate();
      const bTime = b.data().createdAt.toDate();
      return bTime.getTime() - aTime.getTime();
    });

    return docs.length > 0 ? docs[0] : null;
  }

  /**
   * Get verified OTP document from Firestore
   */
  private static async getVerifiedOTP(email: string, purpose: string) {
    const otpsRef = firestore.collection('otps');
    const snapshot = await otpsRef
      .where('email', '==', email.toLowerCase())
      .where('purpose', '==', purpose)
      .where('verified', '==', true)
      .limit(10)
      .get();

    // Sort by createdAt in memory to avoid composite index requirement
    const docs = snapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt.toDate();
      const bTime = b.data().createdAt.toDate();
      return bTime.getTime() - aTime.getTime();
    });

    return docs.length > 0 ? docs[0] : null;
  }

  /**
   * Get recent OTP for rate limiting
   */
  private static async getRecentOTP(email: string, purpose: string) {
    const otpsRef = firestore.collection('otps');
    const snapshot = await otpsRef
      .where('email', '==', email.toLowerCase())
      .where('purpose', '==', purpose)
      .limit(10)
      .get();

    // Sort by createdAt in memory to avoid composite index requirement
    const docs = snapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt.toDate();
      const bTime = b.data().createdAt.toDate();
      return bTime.getTime() - aTime.getTime();
    });

    return docs.length > 0 ? docs[0].data() as OTPData : null;
  }

  /**
   * Mark OTP as expired
   */
  private static async markOTPAsExpired(otpId: string): Promise<void> {
    try {
      await firestore.collection('otps').doc(otpId).update({
        verified: false,
        expired: true,
        expiredAt: new Date()
      });
    } catch (error) {
      logger.error('❌ Error marking OTP as expired:', error);
    }
  }

  /**
   * Clean up expired OTPs (can be run as a scheduled job)
   */
  static async cleanupExpiredOTPs(): Promise<void> {
    try {
      const now = new Date();
      const otpsRef = firestore.collection('otps');
      
      const snapshot = await otpsRef
        .where('expiresAt', '<', now)
        .get();

      const batch = firestore.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      logger.info(`✅ Cleaned up ${snapshot.docs.length} expired OTPs`);
    } catch (error) {
      logger.error('❌ Error cleaning up expired OTPs:', error);
    }
  }
}
