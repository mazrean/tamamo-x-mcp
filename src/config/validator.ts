/**
 * Configuration validator for tamamo-x-mcp
 * Validates configuration against data model rules
 */

import type { Configuration, ValidationError, ValidationResult } from "../types/index.ts";

/**
 * Validate a configuration object against data model rules
 * @param config - Configuration object to validate
 * @returns Validation result with errors if any
 */
export function validateConfig(config: Configuration): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate version
  if (!config.version || typeof config.version !== "string") {
    errors.push({
      field: "version",
      message: "Version is required and must be a string",
      code: "MISSING_VERSION",
    });
  } else {
    const supportedVersions = ["1.0.0"];
    if (!supportedVersions.includes(config.version)) {
      errors.push({
        field: "version",
        message: `Unsupported version: ${config.version}. Supported versions: ${supportedVersions.join(", ")}`,
        code: "UNSUPPORTED_VERSION",
      });
    }
  }

  // Validate mcpServers
  if (!config.mcpServers || !Array.isArray(config.mcpServers)) {
    errors.push({
      field: "mcpServers",
      message: "mcpServers is required and must be an array",
      code: "MISSING_MCP_SERVERS",
    });
  } else if (config.mcpServers.length === 0) {
    errors.push({
      field: "mcpServers",
      message: "At least one MCP server must be configured",
      code: "EMPTY_MCP_SERVERS",
    });
  } else {
    // Validate each MCP server
    const serverNames = new Set<string>();
    config.mcpServers.forEach((server, index) => {
      // Validate name field
      if (!server.name || typeof server.name !== "string" || server.name.trim() === "") {
        errors.push({
          field: `mcpServers[${index}].name`,
          message: "Server name is required and must be a non-empty string",
          code: "MISSING_SERVER_NAME",
        });
      }

      // Validate transport field
      const validTransports = ["stdio", "http", "websocket"];
      if (!server.transport || typeof server.transport !== "string") {
        errors.push({
          field: `mcpServers[${index}].transport`,
          message: "Transport is required and must be a string",
          code: "MISSING_TRANSPORT",
        });
      } else if (!validTransports.includes(server.transport)) {
        errors.push({
          field: `mcpServers[${index}].transport`,
          message: `Invalid transport: ${server.transport}. Must be one of: ${validTransports.join(", ")}`,
          code: "INVALID_TRANSPORT",
        });
      }

      // Check for duplicate names (normalize by trimming before comparison)
      if (server.name) {
        const normalizedName = server.name.trim();
        if (serverNames.has(normalizedName)) {
          errors.push({
            field: `mcpServers[${index}].name`,
            message: `Duplicate MCP server name: ${server.name}. Server names must be unique`,
            code: "DUPLICATE_SERVER_NAME",
          });
        }
        serverNames.add(normalizedName);
      }

      // Validate transport-specific requirements
      if (server.transport === "stdio") {
        if (!server.command) {
          errors.push({
            field: `mcpServers[${index}].command`,
            message: "Command is required for stdio transport",
            code: "MISSING_COMMAND",
          });
        }
      } else if (server.transport === "http" || server.transport === "websocket") {
        if (!server.url) {
          errors.push({
            field: `mcpServers[${index}].url`,
            message: `URL is required for ${server.transport} transport`,
            code: "MISSING_URL",
          });
        } else if (!isValidUrl(server.url)) {
          errors.push({
            field: `mcpServers[${index}].url`,
            message: `Invalid URL format: ${server.url}`,
            code: "INVALID_URL",
          });
        }
      }

      // Check for forbidden password/credential fields
      const serverObj = server as unknown as Record<string, unknown>;
      if ("password" in serverObj || "apiKey" in serverObj || "secret" in serverObj) {
        errors.push({
          field: `mcpServers[${index}]`,
          message: "Password, apiKey, and secret fields are not allowed in configuration",
          code: "FORBIDDEN_CREDENTIAL_FIELD",
        });
      }
    });
  }

  // Validate llmProvider
  if (!config.llmProvider) {
    errors.push({
      field: "llmProvider",
      message: "llmProvider is required",
      code: "MISSING_LLM_PROVIDER",
    });
  } else if (typeof config.llmProvider !== "object" || config.llmProvider === null) {
    // Type guard: ensure llmProvider is an object before accessing properties
    errors.push({
      field: "llmProvider",
      message: "llmProvider must be an object",
      code: "INVALID_LLM_PROVIDER_TYPE",
    });
  } else {
    const validProviders = [
      "anthropic",
      "openai",
      "gemini",
      "vercel",
      "bedrock",
      "openrouter",
    ];
    if (!validProviders.includes(config.llmProvider.type)) {
      errors.push({
        field: "llmProvider.type",
        message:
          `Invalid LLM provider type: ${config.llmProvider.type}. Must be one of: ${validProviders.join(", ")}`,
        code: "INVALID_PROVIDER_TYPE",
      });
    }

    const validCredentialSources = ["cli-tool", "env-var", "prompt"];
    if (!validCredentialSources.includes(config.llmProvider.credentialSource)) {
      errors.push({
        field: "llmProvider.credentialSource",
        message:
          `Invalid credential source: ${config.llmProvider.credentialSource}. Must be one of: ${validCredentialSources.join(", ")}`,
        code: "INVALID_CREDENTIAL_SOURCE",
      });
    }

    // Check for forbidden credential fields (safe to use 'in' operator now)
    const providerObj = config.llmProvider as unknown as Record<string, unknown>;
    if ("apiKey" in providerObj || "password" in providerObj || "secret" in providerObj) {
      errors.push({
        field: "llmProvider",
        message: "Credentials (apiKey, password, secret) must not be stored in configuration",
        code: "FORBIDDEN_CREDENTIAL_FIELD",
      });
    }
  }

  // Validate groupingConstraints (optional)
  if (config.groupingConstraints) {
    const constraints = config.groupingConstraints;

    if (constraints.minToolsPerGroup < 1) {
      errors.push({
        field: "groupingConstraints.minToolsPerGroup",
        message: "minToolsPerGroup must be at least 1",
        code: "INVALID_MIN_TOOLS",
      });
    }

    if (constraints.maxToolsPerGroup < constraints.minToolsPerGroup) {
      errors.push({
        field: "groupingConstraints.maxToolsPerGroup",
        message: "maxToolsPerGroup must be greater than or equal to minToolsPerGroup",
        code: "INVALID_MAX_TOOLS",
      });
    }

    if (constraints.minGroups < 1) {
      errors.push({
        field: "groupingConstraints.minGroups",
        message: "minGroups must be at least 1",
        code: "INVALID_MIN_GROUPS",
      });
    }

    if (constraints.maxGroups < constraints.minGroups) {
      errors.push({
        field: "groupingConstraints.maxGroups",
        message: "maxGroups must be greater than or equal to minGroups",
        code: "INVALID_MAX_GROUPS",
      });
    }
  }

  // Validate projectContext (optional)
  // File path existence checks would require file system access
  // For now, we just validate the structure
  if (config.projectContext) {
    // Structure validation only - file existence will be checked at runtime
    if (
      config.projectContext.customHints &&
      !Array.isArray(config.projectContext.customHints)
    ) {
      errors.push({
        field: "projectContext.customHints",
        message: "customHints must be an array of strings",
        code: "INVALID_CUSTOM_HINTS",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL format
 * @param url - URL string to validate
 * @returns true if valid URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
