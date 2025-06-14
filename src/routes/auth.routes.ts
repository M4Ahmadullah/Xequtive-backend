import { Router, Request, Response } from "express";
import { verifyToken } from "../middleware/authMiddleware";
import { AuthenticatedRequest, ApiResponse, UserData } from "../types";
import { AuthService } from "../services/auth.service";
import { auth, firestore } from "../config/firebase";
import { env } from "../config/env"; // Import the env configuration
import * as dotenv from "dotenv";
import path from "path";
import { z } from "zod";
import { authLimiter } from "../middleware/rateLimiter";
import {
  loginSchema,
  signupSchema,
  googleAuthSchema,
  completeProfileSchema,
  googleCallbackSchema,
  verifyEmailSchema,
  updateProfileSchema,
} from "../validation/auth.schema";
import crypto from "crypto";
import fetch from "node-fetch";
import { EmailService } from "../services/email.service";

// Force reload env variables for this file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const router = Router();

// Frontend user registration
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "All fields are required: Full Name, Email, Phone, Password, and Confirm Password",
        },
      } as ApiResponse<never>);
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Passwords do not match",
        },
      } as ApiResponse<never>);
    }

    // Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    // Set custom claims for regular user
    await auth.setCustomUserClaims(userRecord.uid, { role: "user" });

    // Create user document in Firestore with full profile data
    await firestore.collection("users").doc(userRecord.uid).set({
      email: userRecord.email,
      fullName: fullName,
      phone: phone,
      role: "user",
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        phone: phone,
        role: "user",
      },
    } as ApiResponse<UserData>);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: "Failed to create user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Frontend user login verification
router.post("/user-login", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Token is required",
        },
      } as ApiResponse<never>);
    }

    const userData = await AuthService.verifyToken(token);

    res.status(200).json({
      success: true,
      data: userData,
    } as ApiResponse<UserData>);
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: "Invalid token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Verify current session
router.get(
  "/verify-session",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.uid) {
        throw new Error("User not found in request");
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            ...req.user,
            role: "user",
          },
        },
      } as ApiResponse<{ user: UserData }>);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          message: "Session verification failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// User login
router.post("/signin", authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request
    try {
      loginSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid login data",
            code: "auth/invalid-data",
            details: error.errors.map((e) => e.message).join(", "),
          },
        } as ApiResponse<never>);
      }
      throw error;
    }

    const { email, password } = req.body;

    // Signin service
    const authResult = await AuthService.loginWithEmail(email, password);

    // Exchange custom token for ID token (same as OAuth flow)
    const idTokenResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.firebase.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: authResult.token,
          returnSecureToken: true,
        }),
      }
    );

    const tokenData = await idTokenResponse.json();

    if (!tokenData.idToken) {
      console.error("Failed to get ID token from Firebase:", tokenData);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to generate authentication token",
          code: "auth/token-generation-failed",
        },
      } as ApiResponse<never>);
    }

    // Set the ID token as HttpOnly cookie instead of returning in response
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", tokenData.idToken, {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: isProduction ? "none" as const : "lax" as const, // Allow cross-origin cookies in production
      maxAge: 432000 * 1000, // 5 days in milliseconds
      path: "/", // Ensure cookie is available for all paths
    });

    console.log('Sign-in successful', {
      uid: authResult.uid,
      email: authResult.email,
      cookieSet: true,
      environment: process.env.NODE_ENV,
      isProduction,
      cookieOptions: {
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax"
      }
    });

    // Return user data without the token
    return res.json({
      success: true,
      data: {
        uid: authResult.uid,
        email: authResult.email,
        displayName: authResult.displayName,
        phone: authResult.phone,
        role: "user",
        profileComplete: authResult.profileComplete,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    // Provide appropriate error response
    return res.status(401).json({
      success: false,
      error: {
        message: "Invalid email or password",
        code: "auth/invalid-credentials",
        details:
          error instanceof Error ? error.message : "Authentication failed",
      },
    } as ApiResponse<never>);
  }
});

// User sign up
router.post("/signup", authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request
    try {
      signupSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid signup data",
            code: "auth/invalid-data",
            details: error.errors.map((e) => e.message).join(", "),
          },
        } as ApiResponse<never>);
      }
      throw error;
    }

    const { email, password, fullName, phone } = req.body;

    try {
    // Registration service
    const userData = await AuthService.registerWithEmail(
      email,
      password,
      fullName,
      phone
    );

    // Exchange custom token for ID token (same as OAuth flow)
    const idTokenResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.firebase.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: userData.token,
          returnSecureToken: true,
        }),
      }
    );

    const tokenData = await idTokenResponse.json();

    if (!tokenData.idToken) {
      console.error("Failed to get ID token from Firebase:", tokenData);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to generate authentication token",
          code: "auth/token-generation-failed",
        },
      } as ApiResponse<never>);
    }

    // Set the ID token as HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", tokenData.idToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" as const : "lax" as const, // Allow cross-origin cookies in production
      maxAge: 432000 * 1000, // 5 days in milliseconds
      path: "/", // Ensure cookie is available for all paths
    });

      // Return user data without the token
    return res.status(201).json({
      success: true,
      data: {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        phone: userData.phone,
        role: "user",
        profileComplete: !!(userData.displayName && userData.phone),
      },
    });
    } catch (registrationError) {
      console.error("Registration error:", registrationError);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to create user",
          code: "auth/registration-failed",
          details: registrationError instanceof Error 
            ? registrationError.message 
            : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  } catch (error) {
    console.error("Unexpected signup error:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "An unexpected error occurred during signup",
        code: "auth/unexpected-error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Sign out endpoint
router.post("/signout", async (req: Request, res: Response) => {
  // Clear the auth cookie
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" as const : "lax" as const,
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Successfully logged out",
  });
});

// Get current user from cookie
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Not authenticated",
          code: "auth/not-authenticated",
        },
      } as ApiResponse<never>);
    }

    // Verify the Firebase ID token
    try {
      const decodedToken = await auth.verifyIdToken(token);
      const userRecord = await auth.getUser(decodedToken.uid);

      // Get user profile from Firestore for additional data
      const userDoc = await firestore
        .collection("users")
        .doc(userRecord.uid)
        .get();

      const userData = userDoc.data();

      return res.json({
        success: true,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userData?.fullName || userRecord.displayName,
          phone: userData?.phone || null,
          role: "user",
          profileComplete: userData?.profileComplete || false,
          createdAt: userData?.createdAt || null,
          updatedAt: userData?.updatedAt || null,
        },
      });
    } catch (error) {
      // Token is invalid - clear it and return not authenticated
      const isProduction = process.env.NODE_ENV === "production";
      res.clearCookie("token", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" as const : "lax" as const,
        path: "/",
      });

      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid or expired session",
          code: "auth/invalid-session",
        },
      } as ApiResponse<never>);
    }
  } catch (error) {
    console.error("Error verifying authentication:", error);

    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to verify authentication",
        code: "auth/server-error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Update user profile endpoint
router.put("/update-profile", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
          code: "auth/not-authenticated",
        },
      } as ApiResponse<never>);
    }

    // Validate request body
    try {
      updateProfileSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid profile data",
            code: "auth/invalid-data",
            details: error.errors.map((e) => e.message).join(", "),
          },
        } as ApiResponse<never>);
      }
      throw error;
    }

    // Update user profile
    const updatedProfile = await AuthService.updateUserProfile(
      req.user.uid,
      req.body
    );

    return res.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Profile update error:", error);

    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to update profile",
        code: "auth/profile-update-failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Google OAuth sign-in endpoint
router.post("/google", authLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request
    try {
      googleAuthSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid Google auth data",
            code: "auth/invalid-data",
            details: error.errors.map((e) => e.message).join(", "),
          },
        } as ApiResponse<never>);
      }
      throw error;
    }

    const { idToken } = req.body;

    // Process Google sign-in
    const authResult = await AuthService.processGoogleSignIn(idToken);

    // Set the token as HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", authResult.token, {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: isProduction ? "none" as const : "lax" as const,
      maxAge: 432000 * 1000, // 5 days in milliseconds
      path: "/",
    });

    // Return user data without the token
    return res.json({
      success: true,
      data: {
        uid: authResult.uid,
        email: authResult.email,
        displayName: authResult.displayName,
        phone: authResult.phone,
        role: authResult.role,
        profileComplete: authResult.profileComplete,
        authProvider: authResult.authProvider,
      },
    });
  } catch (error) {
    console.error("Google sign-in error:", error);

    // Provide appropriate error response
    return res.status(401).json({
      success: false,
      error: {
        message: "Google authentication failed",
        code: "auth/google-auth-failed",
        details:
          error instanceof Error ? error.message : "Authentication failed",
      },
    } as ApiResponse<never>);
  }
});

// Complete user profile after OAuth sign-in
router.post(
  "/complete-profile",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({
          success: false,
          error: {
            message: "Authentication required",
          },
        } as ApiResponse<never>);
      }

      // Validate request
      try {
        completeProfileSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: {
              message: "Invalid profile data",
              code: "auth/invalid-profile-data",
              details: error.errors.map((e) => e.message).join(", "),
            },
          } as ApiResponse<never>);
        }
        throw error;
      }

      const { fullName, phone } = req.body;

      // Complete user profile
      const updatedProfile = await AuthService.completeUserProfile(
        req.user.uid,
        fullName,
        phone
      );

      return res.json({
        success: true,
        data: updatedProfile,
      });
    } catch (error) {
      console.error("Profile completion error:", error);

      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to update profile",
          code: "auth/profile-update-failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Google OAuth Initiation
router.get("/google/login", async (req: Request, res: Response) => {
  try {
    const redirectUrl = req.query.redirect_url as string;

    if (!redirectUrl) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Missing redirect_url parameter",
        },
      });
    }

    // Generate a state token to prevent CSRF
    const state = crypto.randomBytes(20).toString("hex");

    // Store state in session (in a production app, you'd use Redis or similar)
    // For simplicity, we encode the redirect URL in the state
    const stateWithRedirect = `${state}|${redirectUrl}`;

    // Construct Google OAuth URL
    const googleOAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${env.googleOAuth.clientId || ""}&` +
      `redirect_uri=${encodeURIComponent(env.googleOAuth.callbackUrl)}&` +
      `response_type=code&` +
      `scope=email%20profile&` +
      `state=${encodeURIComponent(stateWithRedirect)}`;

    // Redirect to Google OAuth page
    res.redirect(googleOAuthUrl);
  } catch (error) {
    console.error("OAuth initiation error:", error);

    res.status(500).json({
      success: false,
      error: {
        message: "Failed to initiate OAuth flow",
      },
    });
  }
});

// Google OAuth Callback (from Google)
router.get("/google/callback", async (req: Request, res: Response) => {
  
  try {
    const { code, state: encodedState } = req.query;
    console.log("🔑 Authorization code:", code ? "Present" : "Missing");
    console.log("🏷️ State parameter:", encodedState ? "Present" : "Missing");

    if (!code || !encodedState) {
      console.error("❌ Missing required parameters (code or state)");
      return res.redirect(`/?error=invalid_request`);
    }

    const state = decodeURIComponent(encodedState as string);
    console.log("🔓 Decoded state:", state);

    // Extract redirect URL from state
    const [stateToken, redirectUrl] = state.split("|");
    console.log("🎯 Redirect URL:", redirectUrl);
    console.log("🎲 State token:", stateToken);

    // In a production app, validate the state token against stored value

    // Exchange the code for tokens
    console.log("✅ Step 1: Exchanging authorization code for access token");
    console.log("🔗 Google OAuth client ID:", env.googleOAuth.clientId ? "Present" : "Missing");
    console.log("🔗 Google OAuth client secret:", env.googleOAuth.clientSecret ? "Present" : "Missing");
    console.log("🔗 Callback URL:", env.googleOAuth.callbackUrl);
    
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: env.googleOAuth.clientId || "",
        client_secret: env.googleOAuth.clientSecret || "",
        redirect_uri: env.googleOAuth.callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    console.log("📡 Token response status:", tokenResponse.status);
    const tokenData = await tokenResponse.json();
    console.log("📡 Token response data:", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      error: tokenData.error,
      errorDescription: tokenData.error_description
    });

    if (!tokenData.access_token) {
      console.error("❌ Failed to get access token from Google");
      console.error("❌ Token response:", tokenData);
      return res.redirect(`${redirectUrl}?error=token_exchange_failed`);
    }

    // Get user info using the access token
    console.log("✅ Step 2: Getting user info from Google");
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    console.log("📡 User info response status:", userInfoResponse.status);
    const googleUser = await userInfoResponse.json();
    console.log("👤 Google user data:", {
      email: googleUser.email,
      name: googleUser.name,
      picture: !!googleUser.picture,
      verified_email: googleUser.verified_email
    });

    if (!googleUser.email) {
      console.error("❌ No email received from Google user info");
      return res.redirect(`${redirectUrl}?error=invalid_user_data`);
    }

    // Create or get the user in Firebase
    console.log("✅ Step 3: Creating or getting Firebase user");
    let firebaseUser;
    try {
      // Check if user exists by email
      console.log("🔍 Checking if user exists in Firebase:", googleUser.email);
      firebaseUser = await auth.getUserByEmail(googleUser.email);
      console.log("👤 Existing Firebase user found:", firebaseUser.uid);
    } catch (error) {
      // User doesn't exist, create a new one
      console.log("➕ Creating new Firebase user");
      firebaseUser = await auth.createUser({
        email: googleUser.email,
        displayName: googleUser.name,
        photoURL: googleUser.picture,
      });
      console.log("👤 New Firebase user created:", firebaseUser.uid);

      // Set custom claims for regular user
      console.log("🏷️ Setting custom claims for new user");
      await auth.setCustomUserClaims(firebaseUser.uid, { role: "user" });
    }

    // Create or update user document in Firestore
    console.log("✅ Step 4: Managing Firestore user document");
    const userDoc = firestore.collection("users").doc(firebaseUser.uid);
    const userSnapshot = await userDoc.get();
    console.log("📄 User document exists:", userSnapshot.exists);

    // Check if profile data needs to be completed (e.g., phone number)
    const profileComplete = userSnapshot.exists && userSnapshot.data()?.phone;
    console.log("✅ Profile complete:", profileComplete);

    if (!userSnapshot.exists) {
      // Create new user document
      console.log("➕ Creating new Firestore user document");
      await userDoc.set({
        email: firebaseUser.email,
        fullName: googleUser.name,
        phone: null,
        role: "user",
        profileComplete: false,
        authProvider: "google",
        createdAt: new Date().toISOString(),
      });
      console.log("📄 User document created successfully");
    }

    // Generate a temporary code for the frontend
    console.log("✅ Step 5: Generating temporary code for frontend");
    const tempCode = await AuthService.storeTemporaryCode(
      firebaseUser.uid,
      firebaseUser.email || ""
    );
    console.log("🎫 Temporary code generated:", tempCode);

    // Redirect to frontend with temp code
    const finalRedirectUrl = `${redirectUrl}?code=${tempCode}`;
    console.log("🎯 Final redirect URL:", finalRedirectUrl);
    console.log("🎉 OAuth callback successful, redirecting to frontend");
    res.redirect(finalRedirectUrl);
  } catch (error) {
    console.error("💥 OAuth callback error - Full details:");
    console.error("Error name:", error instanceof Error ? error.name : "Unknown");
    console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("Error object:", error);

    // Extract the redirect URL from state or use default
    const redirectUrl = req.query.state
      ? decodeURIComponent(req.query.state as string).split("|")[1]
      : "/";

    // Redirect to frontend with error
    console.log("❌ Redirecting to frontend with error");
    res.redirect(`${redirectUrl}?error=auth_failed`);
  }
});

// Frontend Code Exchange Endpoint
router.post("/google/callback", async (req: Request, res: Response) => {
  console.log("🔍 POST /api/auth/google/callback - Starting request processing");
  console.log("📥 Request body:", JSON.stringify(req.body, null, 2));
  
  try {
    // Validate request
    console.log("✅ Step 1: Validating request schema");
    try {
      googleCallbackSchema.parse(req.body);
      console.log("✅ Schema validation passed");
    } catch (error) {
      console.error("❌ Schema validation failed:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid callback data",
            code: "auth/invalid-data",
            details: error.errors.map((e) => e.message).join(", "),
          },
        });
      }
      throw error;
    }

    const { code } = req.body;
    console.log("🔑 Temporary code received:", code);

    // Validate the temporary code
    console.log("✅ Step 2: Validating temporary code");
    const userData = await AuthService.validateTemporaryCode(code);
    console.log("👤 User data from temp code:", userData);

    if (!userData) {
      console.error("❌ Invalid or expired temporary code");
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid or expired code",
        },
      });
    }

    // Get user data
    console.log("✅ Step 3: Getting user record from Firebase");
    const userRecord = await auth.getUser(userData.uid);
    console.log("👤 Firebase user record:", {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName
    });

    console.log("✅ Step 4: Getting user profile from Firestore");
    const userDoc = await firestore.collection("users").doc(userData.uid).get();
    const userProfile = userDoc.data();
    console.log("📄 User profile data:", userProfile);

    // Create a custom token with extended expiration
    console.log("✅ Step 5: Creating custom token");
    const customToken = await auth.createCustomToken(userRecord.uid, {
      role: userProfile?.role || "user",
      expiresIn: 432000, // 5 days in seconds
    });
    console.log("🎫 Custom token created successfully (length:", customToken.length, ")");

    // Exchange custom token for ID token
    console.log("✅ Step 6: Exchanging custom token for ID token");
    console.log("🔗 Firebase API Key available:", !!env.firebase.apiKey);
    console.log("🔗 API URL:", `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.firebase.apiKey?.substring(0, 10)}...`);
    
    const idTokenResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.firebase.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true,
        }),
      }
    );

    console.log("📡 ID token response status:", idTokenResponse.status);
    const tokenData = await idTokenResponse.json();
    console.log("📡 ID token response data:", {
      hasIdToken: !!tokenData.idToken,
      hasRefreshToken: !!tokenData.refreshToken,
      error: tokenData.error
    });

    if (!tokenData.idToken) {
      console.error("❌ Failed to get ID token from Firebase");
      console.error("❌ Token response:", tokenData);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to generate authentication token",
          details: tokenData.error?.message || "No ID token received"
        },
      });
    }

    // Set cookie with the ID token
    console.log("✅ Step 7: Setting authentication cookie");
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Use HTTPS in production
      sameSite: isProduction ? "none" as const : "lax" as const, // Allow cross-origin in production
      maxAge: 432000 * 1000, // 5 days in milliseconds
      path: "/", // Ensure cookie is available for all paths
    };
    
    console.log("🍪 Cookie options:", cookieOptions);
    console.log("🌍 Environment:", process.env.NODE_ENV);
    console.log("🔗 Request origin:", req.get('origin'));
    console.log("🔗 Request host:", req.get('host'));
    res.cookie("token", tokenData.idToken, cookieOptions);

    console.log("✅ Step 8: Preparing response data");
    const responseData = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userProfile?.fullName || userRecord.displayName,
      phone: userProfile?.phone || null,
      role: userProfile?.role || "user",
      profileComplete: !!userProfile?.profileComplete,
      authProvider: userProfile?.authProvider || "google",
    };
    console.log("📤 Response data:", responseData);

    // Return user data
    console.log("🎉 Authentication successful!");
    return res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("💥 Code exchange error - Full details:");
    console.error("Error name:", error instanceof Error ? error.name : "Unknown");
    console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("Error object:", error);

    return res.status(500).json({
      success: false,
      error: {
        message: "Authentication failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

// Email verification request
router.post(
  "/verify-email",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      // Validate request body
      try {
        verifyEmailSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: {
              message: "Invalid email verification data",
              code: "auth/invalid-data",
              details: error.errors.map((e) => e.message).join(", "),
            },
          } as ApiResponse<never>);
        }
        throw error;
      }

      const { email, fullName } = req.body;

      // Check if the email is already registered
      try {
        await auth.getUserByEmail(email);

        // If no error, the email already exists
        return res.status(400).json({
          success: false,
          error: {
            message: "Email is already registered",
            code: "auth/email-already-in-use",
          },
        } as ApiResponse<never>);
      } catch (error: any) {
        // If error code is auth/user-not-found, the email is not registered
        // which is what we want
        if (error.code !== "auth/user-not-found") {
          throw error;
        }
      }

      // Send verification email
      const success = await AuthService.sendVerificationEmail(email, fullName);

      if (!success) {
        return res.status(500).json({
          success: false,
          error: {
            message: "Failed to send verification email",
            code: "auth/email-send-failed",
          },
        } as ApiResponse<never>);
      }

      // Return success response
      return res.status(200).json({
        success: true,
        data: {
          message: "Verification email sent successfully",
          email,
        },
      });
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to process email verification",
          code: "auth/server-error",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Verify email token
router.get("/verify-token", async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          message: "Token is required",
          code: "auth/missing-token",
        },
      } as ApiResponse<never>);
    }

    // Validate the token
    const verificationData =
      await AuthService.validateEmailVerificationToken(token);

    if (!verificationData) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid or expired token",
          code: "auth/invalid-token",
        },
      } as ApiResponse<never>);
    }

    // Return the verification data
    return res.status(200).json({
      success: true,
      data: {
        email: verificationData.email,
        fullName: verificationData.fullName,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to verify token",
        code: "auth/server-error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    } as ApiResponse<never>);
  }
});

// Forgot password endpoint - sends password reset link
router.post(
  "/forgot-password",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // Basic validation
      if (!email || typeof email !== "string") {
        return res.status(400).json({
          success: false,
          error: {
            message: "Email is required",
            code: "auth/missing-email",
          },
        } as ApiResponse<never>);
      }

      // Check if the email is registered
      try {
        await auth.getUserByEmail(email);
      } catch (error: any) {
        // Don't reveal if email exists or not for security
        // Just return success regardless
        return res.status(200).json({
          success: true,
          data: {
            message: "If the email exists, a password reset link has been sent",
          },
        });
      }

      // Generate a password reset token that expires in 1 hour
      const resetToken = crypto.randomBytes(32).toString("hex");

      // Store the token in Firestore with expiration
      await firestore
        .collection("passwordResetTokens")
        .doc(resetToken)
        .set({
          email,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        });

      // Create the reset URL with the token
      const resetUrl = `${env.email.frontendUrl}/reset-password?token=${resetToken}`;

      // Send the password reset email
      const success = await EmailService.sendForgotPasswordEmail(
        email,
        resetUrl
      );

      if (!success) {
        // If email fails to send, delete the token
        await firestore
          .collection("passwordResetTokens")
          .doc(resetToken)
          .delete();

        return res.status(500).json({
          success: false,
          error: {
            message: "Failed to send password reset email",
            code: "auth/email-send-failed",
          },
        } as ApiResponse<never>);
      }

      // Return success regardless of outcome for security
      return res.status(200).json({
        success: true,
        data: {
          message: "If the email exists, a password reset link has been sent",
        },
      });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to process password reset request",
          code: "auth/server-error",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

// Reset password endpoint - verifies token and sets new password
router.post(
  "/reset-password",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      // Basic validation
      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          error: {
            message: "Reset token is required",
            code: "auth/missing-token",
          },
        } as ApiResponse<never>);
      }

      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Password must be at least 6 characters",
            code: "auth/invalid-password",
          },
        } as ApiResponse<never>);
      }

      // Get token document from Firestore
      const tokenDoc = await firestore
        .collection("passwordResetTokens")
        .doc(token)
        .get();

      if (!tokenDoc.exists) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid or expired token",
            code: "auth/invalid-token",
          },
        } as ApiResponse<never>);
      }

      const tokenData = tokenDoc.data();
      if (!tokenData) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid token data",
            code: "auth/invalid-token-data",
          },
        } as ApiResponse<never>);
      }

      // Check if token has expired
      const expiresAt = new Date(tokenData.expiresAt);
      if (expiresAt < new Date()) {
        // Token expired, delete it
        await firestore.collection("passwordResetTokens").doc(token).delete();
        return res.status(400).json({
          success: false,
          error: {
            message: "Password reset token has expired",
            code: "auth/token-expired",
          },
        } as ApiResponse<never>);
      }

      // Get the user by email
      try {
        const userRecord = await auth.getUserByEmail(tokenData.email);

        // Update the user's password
        await auth.updateUser(userRecord.uid, {
          password,
        });

        // Get user profile for name
        const userDoc = await firestore
          .collection("users")
          .doc(userRecord.uid)
          .get();
        const userData = userDoc.data();
        const name = userData?.fullName || userRecord.displayName || "User";

        // Delete the token as it's now been used
        await firestore.collection("passwordResetTokens").doc(token).delete();

        // Send password reset confirmation email (non-blocking)
        EmailService.sendPasswordResetConfirmationEmail(
          tokenData.email,
          name
        ).catch((error) => {
          console.error(
            "Failed to send password reset confirmation email:",
            error
          );
        });

        return res.status(200).json({
          success: true,
          data: {
            message: "Password has been reset successfully",
          },
        });
      } catch (error) {
        console.error("Error resetting password:", error);
        return res.status(400).json({
          success: false,
          error: {
            message: "Failed to reset password",
            code: "auth/reset-failed",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        } as ApiResponse<never>);
      }
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to process password reset",
          code: "auth/server-error",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      } as ApiResponse<never>);
    }
  }
);

export default router;
