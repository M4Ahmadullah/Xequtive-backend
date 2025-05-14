"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firestore = exports.auth = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const env_1 = require("./env");
// Check if the app is not already initialized
if (!firebase_admin_1.default.apps.length) {
    const serviceAccount = {
        projectId: env_1.env.firebase.projectId,
        privateKey: env_1.env.firebase.privateKey,
        clientEmail: env_1.env.firebase.clientEmail,
    };
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized");
}
exports.auth = firebase_admin_1.default.auth();
exports.firestore = firebase_admin_1.default.firestore();
