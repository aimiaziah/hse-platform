// Structured Logging System with Security Features
// Replaces console.log with proper logging that redacts sensitive data

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

export interface LogContext {
  [key: string]: any;
}

/**
 * Sensitive field patterns to redact from logs
 */
const SENSITIVE_PATTERNS = [
  /pin/i,
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credential/i,
];

/**
 * Check if a key contains sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Redact sensitive values from log data
 */
function redactSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Format log message with timestamp and level
 */
function formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(8);

  let logLine = `[${timestamp}] ${levelUpper} ${message}`;

  if (context && Object.keys(context).length > 0) {
    const safeContext = redactSensitiveData(context);
    logLine += ` ${JSON.stringify(safeContext)}`;
  }

  return logLine;
}

/**
 * Get minimum log level from environment
 */
function getMinLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase() || 'info';
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'security'];

  return validLevels.includes(level as LogLevel) ? (level as LogLevel) : 'info';
}

/**
 * Check if log level should be displayed
 */
function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'security'];
  const minLevel = getMinLogLevel();

  // Security logs are always shown
  if (level === 'security') return true;

  const currentIndex = levels.indexOf(level);
  const minIndex = levels.indexOf(minLevel);

  return currentIndex >= minIndex;
}

/**
 * Logger class with structured logging
 */
class Logger {
  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      console.debug(formatLogMessage('debug', message, context));
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      console.info(formatLogMessage('info', message, context));
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      console.warn(formatLogMessage('warn', message, context));
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (shouldLog('error')) {
      const errorContext = {
        ...context,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      };
      console.error(formatLogMessage('error', message, errorContext));
    }
  }

  /**
   * Security event logging (always logged)
   * Use for authentication, authorization, and security-related events
   */
  security(message: string, context?: LogContext): void {
    const securityContext = {
      ...context,
      timestamp: new Date().toISOString(),
      severity: 'SECURITY',
    };
    console.warn(formatLogMessage('security', message, securityContext));

    // TODO: In production, send to SIEM or security monitoring service
    // Example: await sendToSIEM(message, securityContext);
  }

  /**
   * Log HTTP request (with automatic redaction)
   */
  logRequest(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, redactSensitiveData(context));
  }

  /**
   * Log authentication events
   */
  logAuth(
    event: 'login' | 'logout' | 'login_failed' | 'token_expired',
    userId: string,
    context?: LogContext,
  ): void {
    this.security(`AUTH_${event.toUpperCase()}`, {
      userId,
      ...context,
    });
  }

  /**
   * Log database operations
   */
  logDatabase(operation: string, table: string, context?: LogContext): void {
    this.debug(`DB_${operation.toUpperCase()}`, {
      table,
      ...context,
    });
  }

  /**
   * Log API errors with sanitized details
   */
  logApiError(
    endpoint: string,
    statusCode: number,
    error: Error | unknown,
    context?: LogContext,
  ): void {
    this.error(`API_ERROR ${endpoint} [${statusCode}]`, error, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { redactSensitiveData, isSensitiveKey };
