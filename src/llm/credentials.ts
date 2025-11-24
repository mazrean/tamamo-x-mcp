/**
 * Credential discovery for LLM providers
 * Discovers credentials from CLI tools and environment variables
 *
 * Discovery locations:
 * - Claude Code: ~/.config/claude/credentials.json
 * - OpenAI/Codex: ~/.config/openai/config.json or OPENAI_API_KEY
 * - Gemini: ~/.config/gcloud/application_default_credentials.json or GOOGLE_API_KEY
 * - AWS Bedrock: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION env vars
 *
 * Security: Credentials are NEVER stored in tamamo-x.config.json
 */

import { join } from "jsr:@std/path@^1.0.0";
import type { LLMProviderType } from "../types/index.ts";

export interface BedrockCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

/**
 * Get environment variable with TAMAMO_X_ prefix support
 * Prioritizes TAMAMO_X_{name} over {name}
 * This allows using different credentials for tamamo-x-mcp vs coding agents
 *
 * Ignores empty or whitespace-only values to prevent overriding valid fallback values
 *
 * @param name Environment variable name (without TAMAMO_X_ prefix)
 * @returns Value from prefixed env var, or fallback to standard name, or undefined
 *
 * @example
 * // If TAMAMO_X_ANTHROPIC_API_KEY is set and non-empty, returns that value
 * // Otherwise, returns ANTHROPIC_API_KEY value
 * const key = getEnvWithPrefix("ANTHROPIC_API_KEY");
 */
function getEnvWithPrefix(name: string): string | undefined {
  const prefixed = Deno.env.get(`TAMAMO_X_${name}`);
  if (prefixed && prefixed.trim() !== "") {
    return prefixed;
  }
  return Deno.env.get(name);
}

/**
 * Discover credentials for a given LLM provider
 * @param provider LLM provider type
 * @param homeDir Optional home directory override (for testing)
 * @returns API key or null if not found
 */
export async function discoverCredentials(
  provider: LLMProviderType,
  homeDir?: string,
): Promise<string | null> {
  const home = homeDir || Deno.env.get("HOME") || Deno.env.get("USERPROFILE");

  // Abort if HOME directory is not available or is a suspicious path
  // (prevents exploring current directory, root, or temp directories)
  // Exception: Allow /tmp/tamamo_x_home_ prefix for testing
  if (
    !home ||
    home === "." ||
    home === "./" ||
    home === "/" ||
    (home.startsWith("/tmp") && !home.startsWith("/tmp/tamamo_x_home_"))
  ) {
    return null;
  }

  try {
    switch (provider) {
      case "anthropic":
        return await discoverAnthropicCredentials(home);
      case "openai":
      case "openrouter":
        return await discoverOpenAICredentials(home);
      case "gemini":
        return await discoverGeminiCredentials(home);
      case "vercel":
        // Vercel AI doesn't have standard credential locations
        return null;
      case "bedrock":
        // Bedrock uses separate credential structure
        return null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Discover AWS Bedrock credentials
 * Priority: TAMAMO_X_AWS_* > AWS_*
 * @returns Bedrock credentials or null if not found
 */
export function discoverBedrockCredentials(): Promise<BedrockCredentials | null> {
  const accessKeyId = getEnvWithPrefix("AWS_ACCESS_KEY_ID");
  const secretAccessKey = getEnvWithPrefix("AWS_SECRET_ACCESS_KEY");

  // Validate credentials are non-empty strings
  if (
    !accessKeyId ||
    !secretAccessKey ||
    accessKeyId.trim() === "" ||
    secretAccessKey.trim() === ""
  ) {
    return Promise.resolve(null);
  }

  const region = getEnvWithPrefix("AWS_REGION") || "us-east-1";

  return Promise.resolve({ accessKeyId, secretAccessKey, region });
}

/**
 * Discover Anthropic (Claude Code) credentials
 * Priority: TAMAMO_X_ANTHROPIC_API_KEY > ANTHROPIC_API_KEY > CLI tool
 */
async function discoverAnthropicCredentials(
  home: string,
): Promise<string | null> {
  // Try environment variable first (with prefix support)
  const envKey = getEnvWithPrefix("ANTHROPIC_API_KEY");
  if (envKey) {
    return envKey;
  }

  // Fallback to Claude Code credentials
  const claudeCredsPath = join(home, ".config", "claude", "credentials.json");
  try {
    const content = await Deno.readTextFile(claudeCredsPath);
    const creds = JSON.parse(content);
    if (creds.apiKey && typeof creds.apiKey === "string") {
      return creds.apiKey;
    }
  } catch {
    // Ignore errors, return null
  }

  return null;
}

/**
 * Discover OpenAI/Codex credentials
 * Priority: TAMAMO_X_OPENAI_API_KEY > OPENAI_API_KEY > CLI tool
 */
async function discoverOpenAICredentials(home: string): Promise<string | null> {
  // Try environment variable first (with prefix support)
  const envKey = getEnvWithPrefix("OPENAI_API_KEY");
  if (envKey) {
    return envKey;
  }

  // Fallback to OpenAI config
  const openaiConfigPath = join(home, ".codex", "auth.json");
  try {
    const content = await Deno.readTextFile(openaiConfigPath);
    const config = JSON.parse(content);
    if (config.OPENAI_API_KEY && typeof config.OPENAI_API_KEY === "string") {
      return config.OPENAI_API_KEY;
    }
  } catch {
    // Ignore errors, return null
  }

  return null;
}

/**
 * Discover Gemini credentials
 * Priority: TAMAMO_X_GOOGLE_API_KEY > GOOGLE_API_KEY > gcloud CLI
 *
 * IMPORTANT: OAuth client_secret from gcloud ADC should NOT be used as an API key
 * as it represents an OAuth flow secret, not a static API token.
 */
async function discoverGeminiCredentials(home: string): Promise<string | null> {
  // Prioritize environment variable (with prefix support)
  const envKey = getEnvWithPrefix("GOOGLE_API_KEY");
  if (envKey) {
    return envKey;
  }

  // Try gcloud credentials (but ONLY explicit API keys, not OAuth secrets)
  const gcloudCredsPath = join(
    home,
    ".config",
    "gcloud",
    "application_default_credentials.json",
  );
  try {
    const content = await Deno.readTextFile(gcloudCredsPath);
    const creds = JSON.parse(content);
    // Only accept explicit api_key field, NOT client_secret (OAuth secret)
    if (creds.api_key && typeof creds.api_key === "string") {
      return creds.api_key;
    }
  } catch {
    // Ignore errors, return null
  }

  return null;
}

/**
 * Validate that config does not contain credentials
 * This function should be called by config validator to ensure security
 * Performs deep scanning of all nested objects and values
 */
export function validateConfigSecurity(
  config: Record<string, unknown>,
): boolean {
  // These fields should NEVER be in config (case-insensitive)
  const forbiddenFields = [
    "apikey",
    "api_key",
    "accesskeyid",
    "secretaccesskey",
    "password",
    "token",
    "secret",
    "credential",
    "credentials",
    "client_secret",
  ];

  // Patterns that indicate credential values
  const secretPatterns = [
    /^sk-[a-zA-Z0-9]{20,}$/, // OpenAI API keys
    /^Bearer\s+[a-zA-Z0-9\-._~+/]+=*$/i, // Bearer tokens
    /^AKIA[0-9A-Z]{16}$/, // AWS Access Key ID
    /^[A-Za-z0-9/+=]{40}$/, // AWS Secret Access Key
    /^AIza[0-9A-Za-z_-]{35}$/, // Google API Key
    /^claude-[a-zA-Z0-9_-]{20,}$/i, // Anthropic API keys
  ];

  /**
   * Check if a string value looks like a credential
   */
  function looksLikeSecret(value: string): boolean {
    // Skip short strings (likely not credentials)
    if (value.length < 20) {
      return false;
    }

    // Check against known secret patterns
    return secretPatterns.some((pattern) => pattern.test(value));
  }

  /**
   * Recursively scan object for forbidden fields and secret values
   */
  function deepScan(obj: unknown, path = ""): boolean {
    if (!obj || typeof obj !== "object") {
      // Scan string values for secret patterns
      if (typeof obj === "string" && looksLikeSecret(obj)) {
        return false;
      }
      return true;
    }

    if (Array.isArray(obj)) {
      return obj.every((item, idx) => deepScan(item, `${path}[${idx}]`));
    }

    const record = obj as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const currentPath = path ? `${path}.${key}` : key;
      const keyLower = key.toLowerCase();

      // Check if key itself is forbidden
      if (forbiddenFields.includes(keyLower)) {
        return false;
      }

      // Recursively scan nested objects and values
      if (!deepScan(value, currentPath)) {
        return false;
      }
    }

    return true;
  }

  return deepScan(config);
}
