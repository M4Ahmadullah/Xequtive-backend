"use strict";
/**
 * Enhanced logger utility for the application with environment-based logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = exports.warn = exports.error = exports.info = void 0;
class Logger {
    constructor() {
        this.config = {
            level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
            enableConsole: true,
            enableTimestamp: process.env.NODE_ENV === 'production',
        };
    }
    shouldLog(level) {
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
        };
        return levels[level] >= levels[this.config.level];
    }
    formatMessage(level, message) {
        const timestamp = this.config.enableTimestamp
            ? `[${new Date().toISOString()}] `
            : '';
        const levelPrefix = level.toUpperCase().padEnd(5);
        return `${timestamp}[${levelPrefix}] ${message}`;
    }
    debug(message, ...args) {
        if (this.shouldLog('debug') && this.config.enableConsole) {
            console.debug(this.formatMessage('debug', message), ...args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info') && this.config.enableConsole) {
            console.log(this.formatMessage('info', message), ...args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn') && this.config.enableConsole) {
            console.warn(this.formatMessage('warn', message), ...args);
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error') && this.config.enableConsole) {
            console.error(this.formatMessage('error', message), ...args);
        }
    }
    // Auth-specific logging methods
    authSuccess(action, userId) {
        this.info(`Auth success: ${action}${userId ? ` (${userId})` : ''}`);
    }
    authError(action, error) {
        this.error(`Auth error: ${action} - ${error}`);
    }
    // OAuth-specific logging (only in development)
    oauthStep(step, details) {
        if (process.env.NODE_ENV === 'development') {
            this.debug(`OAuth: ${step}`, details);
        }
    }
}
// Export singleton instance
const logger = new Logger();
exports.default = logger;
// Legacy exports for backward compatibility
exports.info = logger.info.bind(logger);
exports.error = logger.error.bind(logger);
exports.warn = logger.warn.bind(logger);
exports.debug = logger.debug.bind(logger);
