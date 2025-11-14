/**
 * Logger utility for consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private prefix: string;

  constructor(prefix: string = 'tamamo-x-mcp') {
    this.prefix = prefix;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.prefix}] ${message}`;
  }

  debug(message: string): void {
    console.error(this.formatMessage(LogLevel.DEBUG, message));
  }

  info(message: string): void {
    console.error(this.formatMessage(LogLevel.INFO, message));
  }

  warn(message: string): void {
    console.error(this.formatMessage(LogLevel.WARN, message));
  }

  error(message: string, error?: Error): void {
    const msg = error ? `${message}: ${error.message}` : message;
    console.error(this.formatMessage(LogLevel.ERROR, msg));
    if (error?.stack) {
      console.error(error.stack);
    }
  }

  child(prefix: string): Logger {
    return new Logger(`${this.prefix}:${prefix}`);
  }
}

export const logger = new Logger();
