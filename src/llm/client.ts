/**
 * Unified LLM client interface
 * Abstracts multiple LLM providers behind a common interface
 */

import type {
  CompletionOptions,
  LLMClient,
  LLMProviderConfig,
  LLMProviderType,
} from "../types/index.ts";
import { createAnthropicClient } from "./providers/anthropic.ts";
import { createOpenAIClient } from "./providers/openai.ts";
import { createGeminiClient } from "./providers/gemini.ts";
import { createVercelClient } from "./providers/vercel.ts";
import { createBedrockClient } from "./providers/bedrock.ts";
import type { BedrockCredentials } from "./credentials.ts";

// Re-export types for convenience
export type { CompletionOptions, LLMClient };

/**
 * Type guard to check if credentials are BedrockCredentials
 */
function isBedrockCredentials(
  credentials: string | BedrockCredentials,
): credentials is BedrockCredentials {
  return (
    typeof credentials === "object" &&
    credentials !== null &&
    "accessKeyId" in credentials &&
    "secretAccessKey" in credentials &&
    "region" in credentials &&
    typeof credentials.accessKeyId === "string" &&
    typeof credentials.secretAccessKey === "string" &&
    typeof credentials.region === "string"
  );
}

/**
 * Create LLM client for specified provider
 */
export function createLLMClient(
  config: LLMProviderConfig,
  credentials: string | BedrockCredentials | null,
): LLMClient {
  if (!credentials) {
    throw new Error(`API key credentials required for ${config.type} provider`);
  }

  const validProviders: LLMProviderType[] = [
    "anthropic",
    "openai",
    "gemini",
    "vercel",
    "bedrock",
    "openrouter",
  ];

  if (!validProviders.includes(config.type)) {
    throw new Error(`Unsupported provider: ${config.type}`);
  }

  // Route to provider-specific implementation
  switch (config.type) {
    case "anthropic":
      if (typeof credentials !== "string") {
        throw new Error("Anthropic provider requires string API key");
      }
      return createAnthropicClient(credentials, config.model);

    case "openai":
      if (typeof credentials !== "string") {
        throw new Error("OpenAI provider requires string API key");
      }
      return createOpenAIClient(credentials, config.model);

    case "gemini":
      if (typeof credentials !== "string") {
        throw new Error("Gemini provider requires string API key");
      }
      return createGeminiClient(credentials, config.model);

    case "vercel":
      if (typeof credentials !== "string") {
        throw new Error("Vercel provider requires string API key");
      }
      return createVercelClient(credentials, config.model);

    case "bedrock":
      if (!isBedrockCredentials(credentials)) {
        throw new Error(
          "Bedrock provider requires credentials object with accessKeyId, secretAccessKey, and region",
        );
      }
      return createBedrockClient(credentials, config.model);

    case "openrouter":
      if (typeof credentials !== "string") {
        throw new Error("OpenRouter provider requires string API key");
      }
      return createOpenAIClient(
        credentials,
        config.model,
        config.endpointOverride || "https://openrouter.ai/api/v1",
      );

    default:
      throw new Error(`Unsupported provider: ${config.type}`);
  }
}
