/**
 * Configuration validator for tamamo-x-mcp
 * Validates configuration against data model rules using Zod
 */

import { ConfigurationSchema } from "../schemas/index.ts";
import type { ValidationError, ValidationResult } from "../types/index.ts";
import { ZodError } from "npm:zod@3.24.1";

/**
 * Validate a configuration object against data model rules
 * @param config - Configuration object to validate
 * @returns Validation result with errors if any
 */
export function validateConfig(config: unknown): ValidationResult {
  const result = ConfigurationSchema.safeParse(config);

  if (result.success) {
    return {
      valid: true,
      errors: [],
    };
  }

  // Convert Zod errors to our ValidationError format
  const errors: ValidationError[] = zodErrorToValidationErrors(result.error);

  return {
    valid: false,
    errors,
  };
}

/**
 * Convert ZodError to ValidationError array
 * Maps Zod's error format to our custom ValidationError format
 */
function zodErrorToValidationErrors(zodError: ZodError): ValidationError[] {
  return zodError.issues.map((err) => {
    // Convert path to field string with array bracket notation
    // In Zod v4, path is PropertyKey[] (string | number | symbol)
    const field: string = err.path.reduce<string>(
      (acc: string, part: PropertyKey, index: number) => {
        if (typeof part === "number") {
          return `${acc}[${part}]`;
        }
        return index === 0 ? String(part) : `${acc}.${String(part)}`;
      },
      "",
    );
    const message = err.message;

    // Map Zod error codes to our custom error codes
    let code = "VALIDATION_ERROR";

    // Determine error code based on field and message
    if (field.includes("version")) {
      code = message.includes("Unsupported") ? "UNSUPPORTED_VERSION" : "MISSING_VERSION";
    } else if (field.includes("mcpServers") && message.includes("unique")) {
      code = "DUPLICATE_SERVER_NAME";
    } else if (field.includes("mcpServers") && message.toLowerCase().includes("at least one")) {
      code = "EMPTY_MCP_SERVERS";
    } else if (field.includes("transport") && message.includes("Invalid")) {
      code = "INVALID_TRANSPORT";
    } else if (field.includes("command")) {
      code = "MISSING_COMMAND";
    } else if (field.includes("url")) {
      code = message.includes("required") ? "MISSING_URL" : "INVALID_URL";
    } else if (field.includes("name") && message.includes("required")) {
      code = "MISSING_SERVER_NAME";
    } else if (field.includes("llmProvider.type")) {
      code = "INVALID_PROVIDER_TYPE";
    } else if (field.includes("llmProvider.credentialSource")) {
      code = "INVALID_CREDENTIAL_SOURCE";
    } else if (field.includes("llmProvider") && message.includes("Credentials")) {
      code = "FORBIDDEN_CREDENTIAL_FIELD";
    } else if (message.includes("Password, apiKey, and secret")) {
      code = "FORBIDDEN_CREDENTIAL_FIELD";
    } else if (field.includes("minToolsPerGroup")) {
      code = "INVALID_MIN_TOOLS";
    } else if (field.includes("maxToolsPerGroup")) {
      code = "INVALID_MAX_TOOLS";
    } else if (field.includes("minGroups")) {
      code = "INVALID_MIN_GROUPS";
    } else if (field.includes("maxGroups")) {
      code = "INVALID_MAX_GROUPS";
    } else if (field.includes("customHints")) {
      code = "INVALID_CUSTOM_HINTS";
    }

    return {
      field: field || "root",
      message,
      code,
    };
  });
}
