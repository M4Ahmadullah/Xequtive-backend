/**
 * Enhanced logger utility for the application with environment-based logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableTimestamp: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      enableConsole: true,
      enableTimestamp: process.env.NODE_ENV === 'production',
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = this.config.enableTimestamp 
      ? `[${new Date().toISOString()}] ` 
      : '';
    
    const levelPrefix = level.toUpperCase().padEnd(5);
    return `${timestamp}[${levelPrefix}] ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug') && this.config.enableConsole) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info') && this.config.enableConsole) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn') && this.config.enableConsole) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error') && this.config.enableConsole) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  // Auth-specific logging methods
  authSuccess(action: string, userId?: string): void {
    this.info(`Auth success: ${action}${userId ? ` (${userId})` : ''}`);
  }

  authError(action: string, error: string): void {
    this.error(`Auth error: ${action} - ${error}`);
  }

  // OAuth-specific logging (only in development)
  oauthStep(step: string, details?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.debug(`OAuth: ${step}`, details);
    }
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;

// Legacy exports for backward compatibility
export const info = logger.info.bind(logger);
export const error = logger.error.bind(logger);
export const warn = logger.warn.bind(logger);
export const debug = logger.debug.bind(logger);
