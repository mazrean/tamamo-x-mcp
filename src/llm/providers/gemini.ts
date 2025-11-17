/**
 * Gemini provider implementation
 * Uses @google/generative-ai SDK
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
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

const DEFAULT_MODEL = "gemini-2.5-pro-latest";

export function createGeminiClient(
  apiKey: string,
  model?: string,
): LLMClient {
  const genAI = new GoogleGenerativeAI(apiKey);
  const selectedModel = model || DEFAULT_MODEL;

  return {
    provider: "gemini",
    model: selectedModel,
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      // Configure generation with options
      const generationConfig: Record<string, unknown> = {};
      if (options?.temperature !== undefined) {
        generationConfig.temperature = options.temperature;
      }
      if (options?.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }
      if (options?.topP !== undefined) {
        generationConfig.topP = options.topP;
      }
      if (options?.stopSequences !== undefined) {
        generationConfig.stopSequences = options.stopSequences;
      }

      // If responseSchema is provided, enforce JSON mode
      // Note: Gemini only supports a subset of JSON Schema (OpenAPI Schema)
      // We need to strip unsupported properties like minimum, maximum, additionalProperties
      if (options?.responseSchema) {
        generationConfig.responseMimeType = "application/json";
        generationConfig.responseSchema = stripUnsupportedSchemaProperties(
          options.responseSchema,
        );
      }

      const geminiModel = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig,
      });

      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error("No text content in Gemini API response");
      }

      return text;
    },
  };
}
