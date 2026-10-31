/**
 * MOMENTIQ — Enterprise Structured Logger
 * Provides ISO-timestamped, structured JSON logging with automatic PII and credential scrubbing.
 * Complies with OWASP ASVS Level 2 Logging and Data Protection standards.
 */

import { maskSensitiveData } from '@/lib/security/error-sanitizer';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  eventId?: string;
  action?: string;
  durationMs?: number;
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const cleanContext = context ? maskSensitiveData(context) : undefined;
    const sanitizedMsg = maskSensitiveData(message);

    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify({
        timestamp,
        level: level.toUpperCase(),
        message: sanitizedMsg,
        ...(cleanContext ? { context: cleanContext } : {}),
      });
    }

    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const ctxString = cleanContext ? ` | ${JSON.stringify(cleanContext)}` : '';
    return `${prefix} ${sanitizedMsg}${ctxString}`;
  }

  /**
   * Log informational application events.
   */
  info(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('info', message, context);
    console.info(formatted);
  }

  /**
   * Log warnings that do not halt execution.
   */
  warn(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);
  }

  /**
   * Log system or operational errors.
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;

    const formatted = this.formatMessage('error', message, {
      ...context,
      ...(errorDetails ? { error: errorDetails } : {}),
    });
    console.error(formatted);
  }

  /**
   * Log detailed debugging data (disabled in production).
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      const formatted = this.formatMessage('debug', message, context);
      console.debug(formatted);
    }
  }
}

export const logger = new Logger();
export default logger;

