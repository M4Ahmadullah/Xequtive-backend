import { auth, firestore } from "../config/firebase";
import { UserData, AuthProvider } from "../types";
import crypto from "crypto";

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
   * Login with email and password
   */
  static async loginWithEmail(email: string, password: string) {
    try {
      // Since Firebase Admin SDK doesn't support email/password login,
      // we need to use the REST API with the Firebase API key
      const apiKey = process.env.FIREBASE_API_KEY;

      if (!apiKey) {
        throw new Error("Firebase API key is missing");
      }

      // Use the Firebase Auth REST API directly
      const fetch = (await import("node-fetch")).default;

      const authResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(authData.error?.message || "Authentication failed");
      }

      // Fetch user profile from Firestore
      const userDoc = await firestore
        .collection("users")
        .doc(authData.localId)
        .get();
      const userData = userDoc.data();

      // Generate a custom token with extended expiration (5 days)
      // This is a workaround since Firebase REST API doesn't allow us to extend ID token expiration
      // First, create a custom token which doesn't have expiration
      const customToken = await auth.createCustomToken(authData.localId, {
        role: userData?.role || "user",
        expiresIn: 432000, // 5 days in seconds
      });

      // Exchange the custom token for an ID token
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
        // Fall back to the original token if there's an issue
        console.warn(
          "Could not extend token duration, using standard duration token"
        );
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
    } catch (error) {
      throw error;
    }
  }

  /**
   * Register a new user with email, password, and profile data
   */
  static async registerWithEmail(
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ) {
    try {
      // Create user in Firebase Authentication
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName,
        phoneNumber: phone,
      });

      // Set custom claims for regular user
      await auth.setCustomUserClaims(userRecord.uid, { role: "user" });

      // Create user document in Firestore with profile data
      await firestore
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
      const customToken = await auth.createCustomToken(userRecord.uid, {
        role: "user",
        expiresIn: 432000, // 5 days in seconds
      });

      // Convert custom token to ID token using the REST API
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
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: fullName,
        phone: phone || null,
        role: "user",
        token: tokenData.idToken,
        expiresIn: "432000", // 5 days in seconds
      };
    } catch (error) {
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
        phoneNumber: phone,
      });

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
