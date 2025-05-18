"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Simple logger utility for the application
 */
const logger = {
    info: (message) => {
        console.log(`[INFO] ${message}`);
    },
    error: (message) => {
        console.error(`[ERROR] ${message}`);
    },
    warn: (message) => {
        console.warn(`[WARN] ${message}`);
    },
    debug: (message) => {
        console.debug(`[DEBUG] ${message}`);
    },
};
exports.default = logger;
