"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const firebase_1 = require("../config/firebase");
const crypto_1 = __importDefault(require("crypto"));
const email_service_1 = require("./email.service");
const env_1 = require("../config/env");
class AuthService {
    /**
     * Verify Firebase ID token and get user data
     */
    static async verifyToken(token) {
        const decodedToken = await firebase_1.auth.verifyIdToken(token);
        return {
            uid: decodedToken.uid,
            email: decodedToken.email || "",
            role: decodedToken.role || "user",
        };
    }
    /**
     * Generate and store email verification token
     * @param email The email to verify
     * @param fullName The user's full name
     * @returns The verification token
     */
    static async generateEmailVerificationToken(email, fullName) {
        // Generate a random token
        const token = crypto_1.default.randomBytes(32).toString("hex");
        // Store the token in Firestore with expiration (30 minutes from now)
        await firebase_1.firestore
            .collection("emailVerifications")
            .doc(token)
            .set({
            email,
            fullName,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        });
        return token;
    }
    /**
     * Send verification email with token
     * @param email The email to verify
     * @param fullName The user's full name
     * @returns Success status
     */
    static async sendVerificationEmail(email, fullName) {
        try {
            // Generate verification token
            const token = await this.generateEmailVerificationToken(email, fullName);
            // Create verification URL with the token
            const verificationUrl = `${env_1.env.email.frontendUrl}/auth/signup?token=${token}&email=${encodeURIComponent(email)}`;
            // Send the verification email
            return await email_service_1.EmailService.sendVerificationEmail(email, fullName, verificationUrl);
        }
        catch (error) {
            console.error("Error sending verification email:", error);
            return false;
        }
    }
    /**
     * Validate an email verification token
     * @param token The verification token
     * @returns The verification data if valid, null otherwise
     */
    static async validateEmailVerificationToken(token) {
        try {
            // Get token document from Firestore
            const tokenDoc = await firebase_1.firestore
                .collection("emailVerifications")
                .doc(token)
                .get();
            if (!tokenDoc.exists) {
                return null; // Token doesn't exist
            }
            const tokenData = tokenDoc.data();
            if (!tokenData) {
                return null;
            }
            // Check if token has expired
            const expiresAt = new Date(tokenData.expiresAt);
            if (expiresAt < new Date()) {
                // Token expired, delete it
                await firebase_1.firestore.collection("emailVerifications").doc(token).delete();
                return null;
            }
            return {
                email: tokenData.email,
                fullName: tokenData.fullName,
            };
        }
        catch (error) {
            console.error("Error validating email verification token:", error);
            return null;
        }
    }
    /**
     * Login with email and password
     */
    static async loginWithEmail(email, password) {
        try {
            // Since Firebase Admin SDK doesn't support email/password login,
            // we need to use the REST API with the Firebase API key
            const apiKey = process.env.FIREBASE_API_KEY;
            if (!apiKey) {
                throw new Error("Firebase API key is missing");
            }
            // Use the Firebase Auth REST API directly
            const fetch = (await Promise.resolve().then(() => __importStar(require("node-fetch")))).default;
            const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    returnSecureToken: true,
                }),
            });
            const authData = await authResponse.json();
            if (!authResponse.ok) {
                throw new Error(authData.error?.message || "Authentication failed");
            }
            // Fetch user profile from Firestore
            const userDoc = await firebase_1.firestore
                .collection("users")
                .doc(authData.localId)
                .get();
            const userData = userDoc.data();
            // Generate a custom token with extended expiration (5 days)
            // This is a workaround since Firebase REST API doesn't allow us to extend ID token expiration
            // First, create a custom token which doesn't have expiration
            const customToken = await firebase_1.auth.createCustomToken(authData.localId, {
                role: userData?.role || "user",
                expiresIn: 432000, // 5 days in seconds
            });
            // Exchange the custom token for an ID token
            const tokenResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: customToken,
                    returnSecureToken: true,
                }),
            });
            const tokenData = await tokenResponse.json();
            if (!tokenResponse.ok) {
                // Fall back to the original token if there's an issue
                console.warn("Could not extend token duration, using standard duration token");
                return {
                    uid: authData.localId,
                    email: authData.email,
                    displayName: userData?.fullName || authData.displayName,
                    phone: userData?.phone || null,
                    role: userData?.role || "user",
                    token: authData.idToken,
                    expiresIn: "432000", // Report 5 days even though token may expire sooner
                };
            }
            return {
                uid: authData.localId,
                email: authData.email,
                displayName: userData?.fullName || authData.displayName,
                phone: userData?.phone || null,
                role: userData?.role || "user",
                token: tokenData.idToken,
                expiresIn: "432000", // 5 days in seconds
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Register a new user with email, password, and profile data
     */
    static async registerWithEmail(email, password, fullName, phone) {
        try {
            // Create user in Firebase Authentication
            const userRecord = await firebase_1.auth.createUser({
                email,
                password,
                displayName: fullName,
                phoneNumber: phone,
            });
            // Set custom claims for regular user
            await firebase_1.auth.setCustomUserClaims(userRecord.uid, { role: "user" });
            // Create user document in Firestore with profile data
            await firebase_1.firestore
                .collection("users")
                .doc(userRecord.uid)
                .set({
                email: userRecord.email,
                fullName: fullName,
                phone: phone || null,
                role: "user",
                createdAt: new Date().toISOString(),
            });
            // Get a token for the new user with extended expiration
            const customToken = await firebase_1.auth.createCustomToken(userRecord.uid, {
                role: "user",
                expiresIn: 432000, // 5 days in seconds
            });
            // Convert custom token to ID token using the REST API
            const apiKey = process.env.FIREBASE_API_KEY;
            if (!apiKey) {
                throw new Error("Firebase API key is missing");
            }
            const fetch = (await Promise.resolve().then(() => __importStar(require("node-fetch")))).default;
            const tokenResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: customToken,
                    returnSecureToken: true,
                }),
            });
            const tokenData = await tokenResponse.json();
            if (!tokenResponse.ok) {
                throw new Error(tokenData.error?.message || "Token exchange failed");
            }
            // Send welcome email (non-blocking)
            email_service_1.EmailService.sendWelcomeEmail(email, fullName).catch((error) => {
                console.error("Failed to send welcome email:", error);
            });
            return {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: fullName,
                phone: phone || null,
                role: "user",
                token: tokenData.idToken,
                expiresIn: "432000", // 5 days in seconds
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Get user by email
     */
    static async getUserByEmail(email) {
        return firebase_1.auth.getUserByEmail(email);
    }
    /**
     * Get user by UID
     */
    static async getUserByUid(uid) {
        return firebase_1.auth.getUser(uid);
    }
    /**
     * Process Google OAuth sign-in
     * @param idToken The ID token from Google
     */
    static async processGoogleSignIn(idToken) {
        try {
            // Verify the Google ID token
            const decodedToken = await firebase_1.auth.verifyIdToken(idToken);
            // Check if user exists already in our system
            let userRecord;
            try {
                userRecord = await firebase_1.auth.getUser(decodedToken.uid);
            }
            catch (error) {
                // User doesn't exist in our system yet, but may exist in Firebase Auth
                // This would be rare but is handled for completeness
                console.log("User not found in system, but might exist in Firebase Auth");
            }
            // Get user profile from Firestore if it exists
            const userDoc = await firebase_1.firestore
                .collection("users")
                .doc(decodedToken.uid)
                .get();
            const userData = userDoc.data();
            // If user doesn't have a Firestore record, create one with available data
            let profileComplete = true;
            if (!userData) {
                // Create basic user document in Firestore
                const newUserData = {
                    email: decodedToken.email || "",
                    fullName: decodedToken.name || "",
                    // Phone is missing for Google OAuth
                    phone: null,
                    role: "user",
                    createdAt: new Date().toISOString(),
                    profileComplete: false, // Mark profile as incomplete
                    authProvider: "google", // Track authentication provider
                };
                await firebase_1.firestore
                    .collection("users")
                    .doc(decodedToken.uid)
                    .set(newUserData);
                profileComplete = false;
            }
            else {
                // Check if existing user has phone number (required field)
                profileComplete = !!userData.phone;
            }
            // Set custom claims for regular user if needed
            try {
                const currentClaims = (await firebase_1.auth.getUser(decodedToken.uid)).customClaims || {};
                if (!currentClaims.role) {
                    await firebase_1.auth.setCustomUserClaims(decodedToken.uid, {
                        ...currentClaims,
                        role: "user",
                    });
                }
            }
            catch (error) {
                console.error("Error setting custom claims:", error);
            }
            // Generate a custom token with extended expiration (5 days)
            const customToken = await firebase_1.auth.createCustomToken(decodedToken.uid, {
                role: "user",
                expiresIn: 432000, // 5 days in seconds
            });
            // Exchange the custom token for an ID token
            const apiKey = process.env.FIREBASE_API_KEY;
            if (!apiKey) {
                throw new Error("Firebase API key is missing");
            }
            const fetch = (await Promise.resolve().then(() => __importStar(require("node-fetch")))).default;
            const tokenResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: customToken,
                    returnSecureToken: true,
                }),
            });
            const tokenData = await tokenResponse.json();
            if (!tokenResponse.ok) {
                throw new Error(tokenData.error?.message || "Token exchange failed");
            }
            return {
                uid: decodedToken.uid,
                email: decodedToken.email || "",
                displayName: userData?.fullName || decodedToken.name || "",
                phone: userData?.phone || null,
                role: "user",
                token: tokenData.idToken,
                expiresIn: "432000", // 5 days in seconds
                profileComplete: profileComplete,
                authProvider: "google",
            };
        }
        catch (error) {
            console.error("Google sign-in error:", error);
            throw error;
        }
    }
    /**
     * Complete user profile after OAuth sign-in
     */
    static async completeUserProfile(uid, fullName, phone) {
        try {
            // Update user in Firebase Auth
            await firebase_1.auth.updateUser(uid, {
                displayName: fullName,
                phoneNumber: phone,
            });
            // Get user email from Firebase
            const userRecord = await firebase_1.auth.getUser(uid);
            const email = userRecord.email || "";
            // Update user document in Firestore
            await firebase_1.firestore.collection("users").doc(uid).update({
                fullName,
                phone,
                profileComplete: true,
                updatedAt: new Date().toISOString(),
            });
            // Get updated user record
            const userDoc = await firebase_1.firestore.collection("users").doc(uid).get();
            const userData = userDoc.data();
            // Send welcome email if this is a new user (non-blocking)
            if (userData?.authProvider === "google") {
                email_service_1.EmailService.sendWelcomeEmail(email, fullName).catch((error) => {
                    console.error("Failed to send welcome email:", error);
                });
            }
            // Send profile completion email (non-blocking)
            email_service_1.EmailService.sendProfileCompletionEmail(email, fullName).catch((error) => {
                console.error("Failed to send profile completion email:", error);
            });
            return {
                uid,
                email: userData?.email,
                displayName: fullName,
                phone,
                role: "user",
                profileComplete: true,
            };
        }
        catch (error) {
            console.error("Error completing user profile:", error);
            throw error;
        }
    }
    // Helper methods for Google OAuth temporary codes
    static async storeTemporaryCode(uid, email) {
        const tempCode = crypto_1.default.randomBytes(32).toString("hex");
        await firebase_1.firestore
            .collection("tempAuthCodes")
            .doc(tempCode)
            .set({
            uid,
            email,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        });
        return tempCode;
    }
    static async validateTemporaryCode(code) {
        const tempAuthDoc = await firebase_1.firestore
            .collection("tempAuthCodes")
            .doc(code)
            .get();
        if (!tempAuthDoc.exists) {
            return null;
        }
        const tempAuthData = tempAuthDoc.data();
        if (!tempAuthData) {
            return null;
        }
        // Check if code has expired
        if (new Date(tempAuthData.expiresAt) < new Date()) {
            // Delete expired code
            await firebase_1.firestore.collection("tempAuthCodes").doc(code).delete();
            return null;
        }
        // Delete the code, it's no longer needed after validation
        await firebase_1.firestore.collection("tempAuthCodes").doc(code).delete();
        return {
            uid: tempAuthData.uid,
            email: tempAuthData.email,
        };
    }
}
exports.AuthService = AuthService;
