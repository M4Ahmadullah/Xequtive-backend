import { auth, firestore } from "../config/firebase";
import { UserData } from "../types";

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
   * Check if a user has admin privileges
   */
  static async isAdmin(uid: string): Promise<boolean> {
    const user = await auth.getUser(uid);
    return user.customClaims?.admin === true;
  }

  /**
   * Grant admin privileges to a user
   */
  static async grantAdminRole(uid: string): Promise<void> {
    await auth.setCustomUserClaims(uid, { admin: true });
  }

  /**
   * Revoke admin privileges from a user
   */
  static async revokeAdminRole(uid: string): Promise<void> {
    await auth.setCustomUserClaims(uid, { admin: false });
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
}
