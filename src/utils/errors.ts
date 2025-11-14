/**
 * Error handling utilities
 */

export class TamamoError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'TamamoError';
  }
}

export class ConfigError extends TamamoError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ConfigError';
  }
}

export class McpServerError extends TamamoError {
  constructor(
    message: string,
    public readonly serverName: string,
    cause?: Error,
  ) {
    super(message, cause);
    this.name = 'McpServerError';
  }
}

export class AgentError extends TamamoError {
  constructor(
    message: string,
    public readonly agentName: string,
    cause?: Error,
  ) {
    super(message, cause);
    this.name = 'AgentError';
  }
}

/**
 * Safely handle errors and convert to appropriate error types
 */
export function handleError(error: unknown, context?: string): Error {
  if (error instanceof Error) {
    return error;
  }
  
  const message = context
    ? `${context}: ${String(error)}`
    : String(error);
  
  return new TamamoError(message);
}
