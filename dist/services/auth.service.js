"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const firebase_1 = require("../config/firebase");
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
     * Check if a user has admin privileges
     */
    static async isAdmin(uid) {
        const user = await firebase_1.auth.getUser(uid);
        return user.customClaims?.admin === true;
    }
    /**
     * Grant admin privileges to a user
     */
    static async grantAdminRole(uid) {
        await firebase_1.auth.setCustomUserClaims(uid, { admin: true });
    }
    /**
     * Revoke admin privileges from a user
     */
    static async revokeAdminRole(uid) {
        await firebase_1.auth.setCustomUserClaims(uid, { admin: false });
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
}
exports.AuthService = AuthService;
