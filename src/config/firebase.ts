import admin from "firebase-admin";
import { env } from "./env";

// Check if the app is not already initialized
if (!admin.apps.length) {
  try {
    // Check if Firebase credentials are available
    if (
      env.firebase.projectId && env.firebase.projectId !== "missing" &&
      env.firebase.privateKey && env.firebase.privateKey !== "missing" &&
      env.firebase.clientEmail && env.firebase.clientEmail !== "missing"
    ) {
      const serviceAccount = {
        projectId: env.firebase.projectId,
        privateKey: env.firebase.privateKey,
        clientEmail: env.firebase.clientEmail,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("Firebase Admin SDK initialized");
    } else {
      console.warn("⚠️  Firebase credentials missing. Firebase features will be disabled.");
      // Initialize with minimal configuration for basic functionality
      admin.initializeApp();
    }
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    console.warn("⚠️  Firebase initialization failed. Firebase features will be disabled.");
    // Initialize with minimal configuration as fallback
    admin.initializeApp();
  }
}

export const auth = admin.auth();
export const firestore = admin.firestore();
