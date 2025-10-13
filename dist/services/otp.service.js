"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const logger_1 = __importDefault(require("../utils/logger"));
class OTPService {
    /**
     * Generate a random 6-digit OTP
     */
    static generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    /**
     * Create and store OTP for email verification
     */
    static async createEmailVerificationOTP(email) {
        try {
            // Rate limiting disabled for development
            // TODO: Re-enable rate limiting in production
            // Generate new OTP
            const otp = this.generateOTP();
            const expiresAt = firestore_1.Timestamp.fromDate(new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000));
            const createdAt = firestore_1.Timestamp.fromDate(new Date());
            const otpData = {
                email: email.toLowerCase(),
                otp,
                purpose: 'email-verification',
                expiresAt,
                attempts: 0,
                verified: false,
                createdAt
            };
            // Store in Firestore
            await firebase_1.firestore.collection('otps').add(otpData);
            logger_1.default.info(`✅ Email verification OTP created for: ${email}`);
            return otp;
        }
        catch (error) {
            logger_1.default.error('❌ Error creating email verification OTP:', error);
            throw error;
        }
    }
    /**
     * Create and store OTP for password reset
     */
    static async createPasswordResetOTP(email) {
        try {
            // Rate limiting disabled for development
            // TODO: Re-enable rate limiting in production
            // Generate new OTP
            const otp = this.generateOTP();
            const expiresAt = firestore_1.Timestamp.fromDate(new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000));
            const createdAt = firestore_1.Timestamp.fromDate(new Date());
            const otpData = {
                email: email.toLowerCase(),
                otp,
                purpose: 'password-reset',
                expiresAt,
                attempts: 0,
                verified: false,
                createdAt
            };
            // Store in Firestore
            await firebase_1.firestore.collection('otps').add(otpData);
            logger_1.default.info(`✅ OTP created for password reset: ${email}`);
            return otp;
        }
        catch (error) {
            logger_1.default.error('❌ Error creating password reset OTP:', error);
            throw error;
        }
    }
    /**
     * Verify OTP for email verification
     */
    static async verifyEmailVerificationOTP(email, otp) {
        try {
            const otpDoc = await this.getValidOTP(email, 'email-verification');
            if (!otpDoc) {
                logger_1.default.warn(`⚠️ No valid email verification OTP found for email: ${email}`);
                return false;
            }
            const otpData = otpDoc.data();
            // Check if OTP has expired
            if (new Date() > otpData.expiresAt.toDate()) {
                logger_1.default.warn(`⚠️ Email verification OTP expired for email: ${email}`);
                await this.markOTPAsExpired(otpDoc.id);
                return false;
            }
            // Check if too many attempts
            if (otpData.attempts >= this.MAX_ATTEMPTS) {
                logger_1.default.warn(`⚠️ Too many email verification OTP attempts for email: ${email}`);
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
                logger_1.default.info(`✅ Email verification OTP verified successfully for email: ${email}`);
                return true;
            }
            logger_1.default.warn(`⚠️ Invalid email verification OTP attempt for email: ${email}`);
            return false;
        }
        catch (error) {
            logger_1.default.error('❌ Error verifying email verification OTP:', error);
            return false;
        }
    }
    /**
     * Verify OTP for password reset
     */
    static async verifyPasswordResetOTP(email, otp) {
        try {
            const otpDoc = await this.getValidOTP(email, 'password-reset');
            if (!otpDoc) {
                logger_1.default.warn(`⚠️ No valid OTP found for email: ${email}`);
                return false;
            }
            const otpData = otpDoc.data();
            // Check if OTP has expired
            if (new Date() > otpData.expiresAt.toDate()) {
                logger_1.default.warn(`⚠️ OTP expired for email: ${email}`);
                await this.markOTPAsExpired(otpDoc.id);
                return false;
            }
            // Check if too many attempts
            if (otpData.attempts >= this.MAX_ATTEMPTS) {
                logger_1.default.warn(`⚠️ Too many OTP attempts for email: ${email}`);
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
                logger_1.default.info(`✅ OTP verified successfully for email: ${email}`);
                return true;
            }
            logger_1.default.warn(`⚠️ Invalid OTP attempt for email: ${email}`);
            return false;
        }
        catch (error) {
            logger_1.default.error('❌ Error verifying OTP:', error);
            return false;
        }
    }
    /**
     * Check if email verification OTP is verified and valid
     */
    static async isEmailVerificationOTPVerified(email) {
        try {
            const otpDoc = await this.getValidOTP(email, 'email-verification');
            if (!otpDoc) {
                return false;
            }
            const otpData = otpDoc.data();
            // Check if OTP is verified and not expired
            return otpData.verified && new Date() <= otpData.expiresAt.toDate();
        }
        catch (error) {
            logger_1.default.error('❌ Error checking email verification OTP status:', error);
            return false;
        }
    }
    /**
     * Check if OTP is verified and valid for password reset
     */
    static async isOTPVerified(email) {
        try {
            const otpDoc = await this.getVerifiedOTP(email, 'password-reset');
            if (!otpDoc) {
                return false;
            }
            const otpData = otpDoc.data();
            // Check if OTP is verified and not expired
            return otpData.verified && new Date() <= otpData.expiresAt.toDate();
        }
        catch (error) {
            logger_1.default.error('❌ Error checking OTP verification status:', error);
            return false;
        }
    }
    /**
     * Invalidate email verification OTP after successful verification
     */
    static async invalidateEmailVerificationOTP(email) {
        try {
            const otpDoc = await this.getValidOTP(email, 'email-verification');
            if (otpDoc) {
                await otpDoc.ref.update({
                    verified: false,
                    invalidatedAt: new Date()
                });
                logger_1.default.info(`✅ Email verification OTP invalidated for email: ${email}`);
            }
        }
        catch (error) {
            logger_1.default.error('❌ Error invalidating email verification OTP:', error);
        }
    }
    /**
     * Invalidate OTP after successful password reset
     */
    static async invalidateOTP(email) {
        try {
            const otpDoc = await this.getValidOTP(email, 'password-reset');
            if (otpDoc) {
                await otpDoc.ref.update({
                    verified: false,
                    invalidatedAt: new Date()
                });
                logger_1.default.info(`✅ OTP invalidated for email: ${email}`);
            }
        }
        catch (error) {
            logger_1.default.error('❌ Error invalidating OTP:', error);
        }
    }
    /**
     * Get valid OTP document from Firestore (unverified)
     */
    static async getValidOTP(email, purpose) {
        const otpsRef = firebase_1.firestore.collection('otps');
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
    static async getVerifiedOTP(email, purpose) {
        const otpsRef = firebase_1.firestore.collection('otps');
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
    static async getRecentOTP(email, purpose) {
        const otpsRef = firebase_1.firestore.collection('otps');
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
        return docs.length > 0 ? docs[0].data() : null;
    }
    /**
     * Mark OTP as expired
     */
    static async markOTPAsExpired(otpId) {
        try {
            await firebase_1.firestore.collection('otps').doc(otpId).update({
                verified: false,
                expired: true,
                expiredAt: new Date()
            });
        }
        catch (error) {
            logger_1.default.error('❌ Error marking OTP as expired:', error);
        }
    }
    /**
     * Clean up expired OTPs (can be run as a scheduled job)
     */
    static async cleanupExpiredOTPs() {
        try {
            const now = new Date();
            const otpsRef = firebase_1.firestore.collection('otps');
            const snapshot = await otpsRef
                .where('expiresAt', '<', now)
                .get();
            const batch = firebase_1.firestore.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            logger_1.default.info(`✅ Cleaned up ${snapshot.docs.length} expired OTPs`);
        }
        catch (error) {
            logger_1.default.error('❌ Error cleaning up expired OTPs:', error);
        }
    }
}
exports.OTPService = OTPService;
OTPService.OTP_LENGTH = 6;
OTPService.OTP_EXPIRY_MINUTES = 5;
OTPService.MAX_ATTEMPTS = 3;
OTPService.RATE_LIMIT_MINUTES = 1;
