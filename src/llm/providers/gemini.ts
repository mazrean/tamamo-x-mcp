/**
 * Gemini provider implementation
 * Uses @google/genai SDK (GA version for Gemini 2.0+)
 */

import { GoogleGenAI } from "npm:@google/genai@1.30.0";
import type { CompletionOptions, LLMClient } from "../client.ts";
import type { JSONSchema } from "../../types/index.ts";

/**
 * Strip unsupported JSON Schema properties for Gemini API
 * Gemini only supports OpenAPI Schema subset and rejects:
 * - minimum, maximum
 * - additionalProperties
 * - Other extended JSON Schema keywords
 */
function stripUnsupportedSchemaProperties(
  schema: JSONSchema,
): Record<string, unknown> {
  const cleanSchema: Record<string, unknown> = { ...schema };

  // Remove unsupported properties at this level
  delete cleanSchema.minimum;
  delete cleanSchema.maximum;
  delete cleanSchema.additionalProperties;

  // Recursively clean nested properties
  if (cleanSchema.properties && typeof cleanSchema.properties === "object") {
    cleanSchema.properties = Object.fromEntries(
      Object.entries(cleanSchema.properties).map(([key, value]) => [
        key,
        stripUnsupportedSchemaProperties(value as JSONSchema),
      ]),
    );
  }

  // Recursively clean array items
  if (cleanSchema.items && typeof cleanSchema.items === "object") {
    cleanSchema.items = stripUnsupportedSchemaProperties(
      cleanSchema.items as JSONSchema,
    );
  }

  return cleanSchema;
}

const DEFAULT_MODEL = "gemini-2.5-pro";

export function createGeminiClient(apiKey: string, model?: string): LLMClient {
  const genAI = new GoogleGenAI({ apiKey });
  const selectedModel = model || DEFAULT_MODEL;

  return {
    provider: "gemini",
    model: selectedModel,
    async complete(
      prompt: string,
      options?: CompletionOptions,
    ): Promise<string> {
      // Build config object for new API
      const config: Record<string, unknown> = {};

      if (options?.temperature !== undefined) {
        config.temperature = options.temperature;
      }
      if (options?.maxTokens !== undefined) {
        config.maxOutputTokens = options.maxTokens;
      }
      if (options?.topP !== undefined) {
        config.topP = options.topP;
      }
      if (options?.stopSequences !== undefined) {
        config.stopSequences = options.stopSequences;
      }

      // Extract system instruction from messages if provided
      if (options?.messages) {
        const systemMessage = options.messages.find((m) => m.role === "system");
        if (systemMessage) {
          config.systemInstruction = systemMessage.content;
        }
      } else if (options?.system) {
        config.systemInstruction = options.system;
      }

      // If responseSchema is provided, enforce JSON mode
      // Note: Gemini only supports a subset of JSON Schema (OpenAPI Schema)
      // We need to strip unsupported properties like minimum, maximum, additionalProperties
      if (options?.responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = stripUnsupportedSchemaProperties(
          options.responseSchema,
        );
      }

      // Use conversation history if provided
      if (options?.messages && options.messages.length > 0) {
        // Filter out system messages (handled in config) and convert to Gemini format
        const history = options.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        // Add the current prompt as the last user message
        const contents = [
          ...history,
          { role: "user", parts: [{ text: prompt }] },
        ];

        const response = await genAI.models.generateContent({
          model: selectedModel,
          contents,
          config,
        });

        const text = response.text;
        if (!text) {
          throw new Error("No text content in Gemini API response");
        }

        return text;
      } else {
        // No conversation history, use simple generateContent
        const response = await genAI.models.generateContent({
          model: selectedModel,
          contents: prompt,
          config,
        });

        const text = response.text;
        if (!text) {
          throw new Error("No text content in Gemini API response");
        }

        return text;
      }
    },
  };
}
