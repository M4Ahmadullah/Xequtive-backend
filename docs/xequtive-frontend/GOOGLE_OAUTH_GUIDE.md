# Google OAuth Implementation Guide

This guide provides comprehensive instructions for implementing secure Google OAuth authentication in the Xequtive application.

## Overview

This implementation follows a secure server-side OAuth flow where all Firebase/Google interactions are handled by the backend. The frontend does not need to interact with Firebase directly, eliminating security concerns with exposing Firebase credentials.

## Authentication Flow

1. **Initiation**: User clicks "Sign in with Google" in frontend
2. **Redirect to Backend**: Frontend redirects to backend's OAuth endpoint
3. **Google Auth**: Backend redirects user to Google's OAuth page
4. **User Authentication**: User logs in with Google
5. **Callback to Backend**: Google redirects to backend with auth code
6. **Token Processing**: Backend exchanges code for tokens and creates/verifies user
7. **Frontend Redirect**: Backend redirects to frontend with temporary code
8. **Session Establishment**: Frontend exchanges code for session cookie
9. **Profile Completion**: User completes profile if phone number is missing

## Backend Implementation

### 1. Environment Setup

Add to your `.env` file:

```
# Google OAuth config
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BACKEND_GOOGLE_CALLBACK_URL=http://localhost:5555/api/auth/google/callback
```

Note: Our implementation uses the `env` configuration object rather than directly accessing `process.env` values. This ensures proper validation of environment variables.

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 Client ID credentials:
   - Application type: Web application
   - Name: Xequtive Backend
   - Authorized JavaScript origins: Your backend URL (e.g., http://localhost:5555)
   - Authorized redirect URIs: Your backend callback URL (e.g., http://localhost:5555/api/auth/google/callback)

### 3. Create Temporary Code Storage

Create a Firestore collection to store temporary authentication codes:

```typescript
// src/services/auth.service.ts

// Add to imports
import crypto from 'crypto';

// Create helper methods for temporary codes
static async storeTemporaryCode(uid: string, email: string): Promise<string> {
  const tempCode = crypto.randomBytes(32).toString('hex');

  await firestore.collection('tempAuthCodes').doc(tempCode).set({
    uid,
    email,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });

  return tempCode;
}

static async validateTemporaryCode(code: string): Promise<{uid: string; email: string} | null> {
  const tempAuthDoc = await firestore.collection('tempAuthCodes').doc(code).get();

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
    await firestore.collection('tempAuthCodes').doc(code).delete();
    return null;
  }

  // Delete the code, it's no longer needed after validation
  await firestore.collection('tempAuthCodes').doc(code).delete();

  return {
    uid: tempAuthData.uid,
    email: tempAuthData.email
  };
}
```

### 4. Implement Google OAuth Routes

Add these routes to `src/routes/auth.routes.ts`:

```typescript
// OAuth Initiation Endpoint
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
      `redirect_uri=${encodeURIComponent(env.googleOAuth.callbackUrl || "")}&` +
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

    if (!code || !encodedState) {
      return res.redirect(`/?error=invalid_request`);
    }

    const state = decodeURIComponent(encodedState as string);

    // Extract redirect URL from state
    const [stateToken, redirectUrl] = state.split("|");

    // In a production app, validate the state token against stored value

    // Exchange the code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: env.googleOAuth.clientId || "",
        client_secret: env.googleOAuth.clientSecret || "",
        redirect_uri: env.googleOAuth.callbackUrl || "",
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.redirect(`${redirectUrl}?error=token_exchange_failed`);
    }

    // Get user info using the access token
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) {
      return res.redirect(`${redirectUrl}?error=invalid_user_data`);
    }

    // Create or get the user in Firebase
    let firebaseUser;
    try {
      // Check if user exists by email
      firebaseUser = await auth.getUserByEmail(googleUser.email);
    } catch (error) {
      // User doesn't exist, create a new one
      firebaseUser = await auth.createUser({
        email: googleUser.email,
        displayName: googleUser.name,
        photoURL: googleUser.picture,
      });

      // Set custom claims for regular user
      await auth.setCustomUserClaims(firebaseUser.uid, { role: "user" });
    }

    // Create or update user document in Firestore
    const userDoc = firestore.collection("users").doc(firebaseUser.uid);
    const userSnapshot = await userDoc.get();

    // Check if profile data needs to be completed (e.g., phone number)
    const profileComplete = userSnapshot.exists && userSnapshot.data()?.phone;

    if (!userSnapshot.exists) {
      // Create new user document
      await userDoc.set({
        email: firebaseUser.email,
        fullName: googleUser.name,
        phone: null,
        role: "user",
        profileComplete: false,
        authProvider: "google",
        createdAt: new Date().toISOString(),
      });
    }

    // Generate a temporary code for the frontend
    const tempCode = await AuthService.storeTemporaryCode(
      firebaseUser.uid,
      firebaseUser.email || ""
    );

    // Redirect to frontend with temp code
    res.redirect(`${redirectUrl}?code=${tempCode}`);
  } catch (error) {
    console.error("OAuth callback error:", error);

    // Extract the redirect URL from state or use default
    const redirectUrl = req.query.state
      ? decodeURIComponent(req.query.state as string).split("|")[1]
      : "/";

    // Redirect to frontend with error
    res.redirect(`${redirectUrl}?error=auth_failed`);
  }
});

// Frontend Code Exchange Endpoint
router.post("/google/callback", async (req: Request, res: Response) => {
  try {
    // Validate request
    try {
      googleCallbackSchema.parse(req.body);
    } catch (error) {
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

    // Validate the temporary code
    const userData = await AuthService.validateTemporaryCode(code);

    if (!userData) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid or expired code",
        },
      });
    }

    // Get user data
    const userRecord = await auth.getUser(userData.uid);
    const userDoc = await firestore.collection("users").doc(userData.uid).get();
    const userProfile = userDoc.data();

    // Create a custom token with extended expiration
    const customToken = await auth.createCustomToken(userRecord.uid, {
      role: userProfile?.role || "user",
      expiresIn: 432000, // 5 days in seconds
    });

    // Exchange custom token for ID token
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

    const tokenData = await idTokenResponse.json();

    if (!tokenData.idToken) {
      return res.status(500).json({
        success: false,
        error: {
          message: "Failed to generate authentication token",
        },
      });
    }

    // Set cookie with the ID token
    res.cookie("token", tokenData.idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 432000 * 1000, // 5 days in milliseconds
    });

    // Return user data
    return res.json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userProfile?.fullName || userRecord.displayName,
        phone: userProfile?.phone || null,
        role: userProfile?.role || "user",
        profileComplete: !!userProfile?.profileComplete,
        authProvider: userProfile?.authProvider || "google",
      },
    });
  } catch (error) {
    console.error("Code exchange error:", error);

    return res.status(500).json({
      success: false,
      error: {
        message: "Authentication failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});
```

### 5. Update Validation Schema

Create or update `src/validation/auth.schema.ts` to include schemas for Google OAuth:

```typescript
import { z } from "zod";

// Existing schemas
export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
});

// New schemas for Google OAuth
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export const completeProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(6, "Valid phone number required"),
});

export const googleCallbackSchema = z.object({
  code: z.string().min(1, "Code is required"),
});

// Types based on schemas
export type LoginRequest = z.infer<typeof loginSchema>;
export type SignupRequest = z.infer<typeof signupSchema>;
export type GoogleAuthRequest = z.infer<typeof googleAuthSchema>;
export type CompleteProfileRequest = z.infer<typeof completeProfileSchema>;
export type GoogleCallbackRequest = z.infer<typeof googleCallbackSchema>;
```

## Frontend Implementation

### 1. Configure Environment

Create a config file with the backend URL:

```javascript
// src/config.js
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555/api";
export const OAUTH_REDIRECT_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000/auth/callback";
```

### 2. Authentication Service

Create the authentication service functions:

```javascript
// src/services/authService.js
import { API_URL, OAUTH_REDIRECT_URL } from "../config";

// Initiate Google OAuth flow
export const initiateGoogleAuth = () => {
  window.location.href = `${API_URL}/auth/google/login?redirect_url=${encodeURIComponent(
    OAUTH_REDIRECT_URL
  )}`;
};

// Exchange temporary code for session
export const exchangeCodeForSession = async (code) => {
  try {
    const response = await fetch(`${API_URL}/auth/google/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Authentication failed");
    }

    return data.data;
  } catch (error) {
    console.error("Session exchange error:", error);
    throw error;
  }
};

// Complete user profile with phone number
export const completeUserProfile = async (fullName, phone) => {
  try {
    const response = await fetch(`${API_URL}/auth/complete-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ fullName, phone }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Failed to complete profile");
    }

    return data.data;
  } catch (error) {
    console.error("Profile completion error:", error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: "include", // Important for cookies
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Failed to fetch user profile");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};
```

### 3. Google Sign-In Button Component

```jsx
// src/components/GoogleSignInButton.jsx
import { initiateGoogleAuth } from "../services/authService";

const GoogleSignInButton = () => {
  return (
    <button onClick={initiateGoogleAuth} className="google-sign-in-btn">
      <img src="/google-icon.svg" alt="Google" />
      Sign in with Google
    </button>
  );
};

export default GoogleSignInButton;
```

### 4. OAuth Callback Handler Component

```jsx
// src/components/GoogleAuthCallback.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { exchangeCodeForSession } from "../services/authService";

const GoogleAuthCallback = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run once the router is ready and we have query params
    if (!router.isReady) return;

    const { code, error } = router.query;

    if (error) {
      setError(decodeURIComponent(error));
      setLoading(false);
      return;
    }

    if (code) {
      handleAuthCode(code);
    } else {
      setError("No authentication code provided");
      setLoading(false);
    }
  }, [router.isReady, router.query]);

  const handleAuthCode = async (code) => {
    try {
      const userData = await exchangeCodeForSession(code);

      if (!userData.profileComplete) {
        // Redirect to profile completion page
        router.push({
          pathname: "/complete-profile",
          query: { uid: userData.uid },
        });
      } else {
        // Redirect to dashboard or home page
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error exchanging code for session:", error);
      setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Completing authentication...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Authentication Error</h2>
        <div className="error-message">{error}</div>
        <button onClick={() => router.push("/login")} className="try-again-btn">
          Try Again
        </button>
      </div>
    );
  }

  return null;
};

export default GoogleAuthCallback;
```

### 5. Profile Completion Form Component

```jsx
// src/components/ProfileCompletionForm.jsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { completeUserProfile, getUserProfile } from "../services/authService";

const ProfileCompletionForm = () => {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;

    // Fetch user profile to pre-fill the form
    getUserProfile()
      .then((userData) => {
        if (userData.profileComplete) {
          // User already completed their profile, redirect to dashboard
          router.push("/dashboard");
          return;
        }

        setFullName(userData.displayName || "");
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching user profile:", error);
        setError("Failed to load user data. Please try again.");
        setLoading(false);
      });
  }, [router.isReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await completeUserProfile(fullName, phone);
      router.push("/dashboard");
    } catch (error) {
      setError(error.message || "Failed to complete profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading user profile...</div>;
  }

  return (
    <div className="profile-completion-form">
      <h2>Complete Your Profile</h2>
      <p>Please provide your phone number to complete your profile.</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+447123456789"
            required
          />
          <small>
            Please enter your phone number in international format (e.g.,
            +447123456789)
          </small>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="primary-button"
        >
          {isSubmitting ? "Saving..." : "Complete Profile"}
        </button>
      </form>
    </div>
  );
};

export default ProfileCompletionForm;
```

### 6. Create Required Routes

#### Callback page:

```jsx
// pages/auth/callback.jsx
import GoogleAuthCallback from "../../components/GoogleAuthCallback";

export default function CallbackPage() {
  return <GoogleAuthCallback />;
}
```

#### Profile completion page:

```jsx
// pages/complete-profile.jsx
import ProfileCompletionForm from "../components/ProfileCompletionForm";

export default function CompleteProfilePage() {
  return (
    <div className="container">
      <h1>Complete Your Profile</h1>
      <ProfileCompletionForm />
    </div>
  );
}
```

## Testing Checklist

Before testing, ensure the backend server is running and the Google OAuth credentials are properly configured in your `.env` file.

To test the full authentication flow:

1. ✅ First, ensure both your backend server (http://localhost:5555) and frontend (http://localhost:3000) are running
2. ✅ Navigate to your login page and click the "Sign in with Google" button
3. ✅ You should be redirected to Google's authentication page
4. ✅ After authenticating with Google, you should be redirected back to your frontend callback URL
5. ✅ If your Google account doesn't have a phone number in your Firebase profile, you should be redirected to the profile completion page
6. ✅ Complete your profile by providing your phone number
7. ✅ You should be redirected to the dashboard page
8. ✅ Verify that you remain authenticated after refreshing the page

## Troubleshooting

### Common Issues

1. **Redirect URL Errors**:

   - Make sure the redirect URL matches exactly what's configured in Google Cloud Console
   - URL-encode the redirect URL properly in the frontend request
   - Ensure the `BACKEND_GOOGLE_CALLBACK_URL` in your `.env` file matches the one in Google Cloud Console

2. **CORS Issues**:

   - Ensure the backend's ALLOWED_ORIGINS includes your frontend domain
   - Use credentials: "include" in all fetch requests
   - Check for any CORS errors in your browser's developer console

3. **Authentication Errors**:

   - Check backend logs for detailed error information
   - Verify environment variables are set correctly
   - Ensure Google API is enabled in Google Cloud Console
   - Make sure your Google Cloud Project has the necessary APIs enabled (OAuth, People API)

4. **Profile Completion Issues**:

   - Check that the user is authenticated before attempting profile completion
   - Verify correct format for phone numbers (international format recommended)
   - Inspect network requests for any API errors

5. **404 Not Found Errors**:
   - If you get a 404 error on the OAuth endpoints, ensure you've rebuilt the backend after making changes
   - Run `npm run build` on the backend before starting the server

## Security Best Practices

1. **Never use localStorage/sessionStorage** for tokens
2. **Always use HttpOnly cookies** for authentication
3. **Set Secure flag** on cookies in production
4. **Validate the state parameter** to prevent CSRF attacks
5. **Set short expirations** for temporary codes
6. **Use HTTPS** in production environments
7. **Apply rate limiting** to authentication endpoints

## Further Reading

- [Google Identity OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
