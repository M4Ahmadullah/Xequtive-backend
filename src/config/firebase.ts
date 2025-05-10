import admin from "firebase-admin";
import { env } from "./env";

// Check if the app is not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: env.firebase.projectId,
    privateKey: env.firebase.privateKey,
    clientEmail: env.firebase.clientEmail,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("Firebase Admin SDK initialized");
}

export const auth = admin.auth();
export const firestore = admin.firestore();
