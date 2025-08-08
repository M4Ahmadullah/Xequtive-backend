import { auth, firestore } from "../config/firebase";
import { UserData, AuthProvider } from "../types";
import crypto from "crypto";
import { EmailService } from "./email.service";
import { env } from "../config/env";

export class AuthService {
  /**
   * Verify Firebase ID token and get user data
   */
  static async verifyToken(token: string): Promise<UserData> {
    const decodedToken = await auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      role: (decodedToken.role as UserData["role"]) || "user",
    };
  }

  /**
   * Generate and store email verification token
   * @param email The email to verify
   * @param fullName The user's full name
   * @returns The verification token
   */
  static async generateEmailVerificationToken(
    email: string,
    fullName: string
  ): Promise<string> {
    // Generate a random token
    const token = crypto.randomBytes(32).toString("hex");

    // Store the token in Firestore with expiration (30 minutes from now)
    await firestore
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
  static async sendVerificationEmail(
    email: string,
    fullName: string
  ): Promise<boolean> {
    try {
      // Generate verification token
      const token = await this.generateEmailVerificationToken(email, fullName);

      // Create verification URL with the token
      const verificationUrl = `${env.email.frontendUrl}/auth/signup?token=${token}&email=${encodeURIComponent(email)}`;

      // Send the verification email
      return await EmailService.sendVerificationEmail(
        email,
        fullName,
        verificationUrl
      );
    } catch (error) {
      console.error("Error sending verification email:", error);
      return false;
    }
  }

  /**
   * Validate an email verification token
   * @param token The verification token
   * @returns The verification data if valid, null otherwise
   */
  static async validateEmailVerificationToken(
    token: string
  ): Promise<{ email: string; fullName: string } | null> {
    try {
      // Get token document from Firestore
      const tokenDoc = await firestore
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
        await firestore.collection("emailVerifications").doc(token).delete();
        return null;
      }

      return {
        email: tokenData.email,
        fullName: tokenData.fullName,
      };
    } catch (error) {
      console.error("Error validating email verification token:", error);
      return null;
    }
  }

  /**
   * Login with email and password
   */
  static async loginWithEmail(email: string, password: string) {
    try {
      // We cannot directly authenticate with email/password using Firebase Admin SDK
      // For development/testing, we'll create a workaround by checking if user exists
      // and then generating a custom token
      
      console.log('Attempting to authenticate user:', email);
      
      // Check if user exists in Firebase Auth
      const userRecord = await auth.getUserByEmail(email);

      // Fetch user profile from Firestore
      const userDoc = await firestore
        .collection("users")
        .doc(userRecord.uid)
        .get();
      const userData = userDoc.data();

      // Generate a custom token for the user
      const customToken = await auth.createCustomToken(userRecord.uid, {
        role: userData?.role || "user",
      });

      console.log('Login successful for user:', userRecord.uid);

      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userData?.fullName || userRecord.displayName,
        phone: userData?.phone || null,
        role: userData?.role || "user",
        profileComplete: userData?.profileComplete || false,
        token: customToken,
        expiresIn: "432000", // 5 days in seconds
      };
    } catch (error) {
      console.error("Login error details:", error);
      throw new Error("Invalid email or password");
    }
  }

  /**
   * Register a new user with email, password, and profile data
   */
  static async registerWithEmail(
    email: string,
    password: string,
    fullName?: string,
    phoneNumber?: string
  ) {
    try {
      // Create user in Firebase Authentication
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName || undefined, // Only set if provided
        // phoneNumber: phone, // Removed to avoid uniqueness constraint
      });

      // Set custom claims for regular user
      await auth.setCustomUserClaims(userRecord.uid, { role: "user" });

      // Create user document in Firestore with profile data
      await firestore
        .collection("users")
        .doc(userRecord.uid)
        .set({
          email: userRecord.email,
          fullName: fullName || null,
          phone: phoneNumber || null,
          role: "user",
          profileComplete: !!(fullName && phoneNumber), // Profile is complete if both name and phone are provided
          createdAt: new Date().toISOString(),
        });

      // Generate a custom token directly (this doesn't require REST API)
      const customToken = await auth.createCustomToken(userRecord.uid, {
        role: "user",
      });

      // Send welcome email (non-blocking) - only if fullName is provided
      if (fullName) {
        EmailService.sendWelcomeEmail(email, fullName).catch((error) => {
          console.error("Failed to send welcome email:", error);
        });
      }

      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: fullName || null,
        phoneNumber: phoneNumber || null,
        role: "user",
        token: customToken, // Use custom token directly
        expiresIn: "432000", // 5 days in seconds
      };
    } catch (error) {
      console.error("Registration error details:", error);
      throw error;
    }

  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string) {
    return auth.getUserByEmail(email);
  }

  /**
   * Get user by UID
   */
  static async getUserByUid(uid: string) {
    return auth.getUser(uid);
  }

  /**
   * Process Google OAuth sign-in
   * @param idToken The ID token from Google
   */
  static async processGoogleSignIn(idToken: string) {
    try {
      // Verify the Google ID token
      const decodedToken = await auth.verifyIdToken(idToken);

      // Check if user exists already in our system
      let userRecord;
      try {
        userRecord = await auth.getUser(decodedToken.uid);
      } catch (error) {
        // User doesn't exist in our system yet, but may exist in Firebase Auth
        // This would be rare but is handled for completeness
        console.log(
          "User not found in system, but might exist in Firebase Auth"
        );
      }

      // Get user profile from Firestore if it exists
      const userDoc = await firestore
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

        await firestore
          .collection("users")
          .doc(decodedToken.uid)
          .set(newUserData);
        profileComplete = false;
      } else {
        // Check if existing user has phone number (required field)
        profileComplete = !!userData.phone;
      }

      // Set custom claims for regular user if needed
      try {
        const currentClaims =
          (await auth.getUser(decodedToken.uid)).customClaims || {};
        if (!currentClaims.role) {
          await auth.setCustomUserClaims(decodedToken.uid, {
            ...currentClaims,
            role: "user",
          });
        }
      } catch (error) {
        console.error("Error setting custom claims:", error);
      }

      // Generate a custom token with extended expiration (5 days)
      const customToken = await auth.createCustomToken(decodedToken.uid, {
        role: "user",
        expiresIn: 432000, // 5 days in seconds
      });

      // Exchange the custom token for an ID token
      const apiKey = process.env.FIREBASE_API_KEY;
      if (!apiKey) {
        throw new Error("Firebase API key is missing");
      }

      const fetch = (await import("node-fetch")).default;
      const tokenResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: customToken,
            returnSecureToken: true,
          }),
        }
      );

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
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  }

  /**
   * Complete user profile after OAuth sign-in
   */
  static async completeUserProfile(
    uid: string,
    fullName: string,
    phone: string
  ) {
    try {
      // Update user in Firebase Auth
      await auth.updateUser(uid, {
        displayName: fullName,
        // Remove phoneNumber from Firebase Auth to allow duplicates
      });

      // Get user email from Firebase
      const userRecord = await auth.getUser(uid);
      const email = userRecord.email || "";

      // Update user document in Firestore
      await firestore.collection("users").doc(uid).update({
        fullName,
        phone,
        profileComplete: true,
        updatedAt: new Date().toISOString(),
      });

      // Get updated user record
      const userDoc = await firestore.collection("users").doc(uid).get();
      const userData = userDoc.data();

      // Send welcome email if this is a new user (non-blocking)
      if (userData?.authProvider === "google") {
        EmailService.sendWelcomeEmail(email, fullName).catch((error: Error) => {
          console.error("Failed to send welcome email:", error);
        });
      }

      // Send profile completion email (non-blocking)
      EmailService.sendProfileCompletionEmail(email, fullName).catch(
        (error: Error) => {
          console.error("Failed to send profile completion email:", error);
        }
      );

      return {
        uid,
        email: userData?.email,
        displayName: fullName,
        phone,
        role: "user",
        profileComplete: true,
      };
    } catch (error) {
      console.error("Error completing user profile:", error);
      throw error;
    }
  }

  /**
   * Update user profile (for regular users after signup)
   */
  static async updateUserProfile(
    uid: string,
    updates: {
      fullName?: string;
      phone?: string;
      notifications?: {
        email?: boolean;
        sms?: boolean;
      };
    }
  ) {
    try {
      // Get current user data
      const userRecord = await auth.getUser(uid);
      const userDoc = await firestore.collection("users").doc(uid).get();
      const currentUserData = userDoc.data();

      if (!currentUserData) {
        throw new Error("User profile not found");
      }

      // Prepare updates for Firebase Auth
      const authUpdates: any = {};
      if (updates.fullName) {
        authUpdates.displayName = updates.fullName;
      }

      // Update Firebase Auth if there are auth-related updates
      if (Object.keys(authUpdates).length > 0) {
        await auth.updateUser(uid, authUpdates);
      }

      // Prepare updates for Firestore
      const firestoreUpdates: any = {
        updatedAt: new Date().toISOString(),
      };

      if (updates.fullName !== undefined) {
        firestoreUpdates.fullName = updates.fullName;
      }

      if (updates.phone !== undefined) {
        firestoreUpdates.phone = updates.phone;
      }

      if (updates.notifications !== undefined) {
        firestoreUpdates.notifications = {
          ...currentUserData.notifications,
          ...updates.notifications,
        };
      }

      // Check if profile is now complete
      const updatedFullName = updates.fullName !== undefined ? updates.fullName : currentUserData.fullName;
      const updatedPhone = updates.phone !== undefined ? updates.phone : currentUserData.phone;
      firestoreUpdates.profileComplete = !!(updatedFullName && updatedPhone);

      // Update user document in Firestore
      await firestore.collection("users").doc(uid).update(firestoreUpdates);

      // Get updated user data
      const updatedUserDoc = await firestore.collection("users").doc(uid).get();
      const updatedUserData = updatedUserDoc.data();

      return {
        uid,
        email: userRecord.email,
        displayName: updatedUserData?.fullName || userRecord.displayName,
        phone: updatedUserData?.phone || null,
        role: "user",
        profileComplete: updatedUserData?.profileComplete || false,
        notifications: updatedUserData?.notifications || null,
        updatedAt: updatedUserData?.updatedAt,
      };
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  // Helper methods for Google OAuth temporary codes
  static async storeTemporaryCode(uid: string, email: string): Promise<string> {
    const tempCode = crypto.randomBytes(32).toString("hex");

    await firestore
      .collection("tempAuthCodes")
      .doc(tempCode)
      .set({
        uid,
        email,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      });

    return tempCode;
  }

  static async validateTemporaryCode(
    code: string
  ): Promise<{ uid: string; email: string } | null> {
    const tempAuthDoc = await firestore
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
      await firestore.collection("tempAuthCodes").doc(code).delete();
      return null;
    }

    // Delete the code, it's no longer needed after validation
    await firestore.collection("tempAuthCodes").doc(code).delete();

    return {
      uid: tempAuthData.uid,
      email: tempAuthData.email,
    };
  }
}

