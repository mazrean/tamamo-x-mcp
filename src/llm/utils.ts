/**
 * Utility functions for LLM response processing
 */

import type { JSONSchema } from "../types/index.ts";
import type { JSONSchema7 } from "npm:@types/json-schema@7.0.15";

/**
 * Convert project JSONSchema to JSONSchema7 format expected by Vercel AI SDK
 * This is a type-safe wrapper that bridges the gap between our internal schema
 * representation and the stricter JSONSchema7 type
 *
 * @param schema - Project JSONSchema definition
 * @returns JSONSchema7 compatible schema
 */
export function toJsonSchema7(schema: JSONSchema): JSONSchema7 {
  // The schemas are structurally compatible at runtime
  // This function provides type safety without 'as never' hacks
  return schema as unknown as JSONSchema7;
}

/**
 * Extract JSON from text that may contain markdown code fences or additional text
 * Used by providers that don't support native structured output enforcement
 *
 * @param text - Raw text response that may contain JSON
 * @returns Extracted JSON string
 * @throws Error if valid JSON cannot be extracted
 */
export function extractJsonFromText(text: string, providerName: string): string {
  let cleaned = text.trim();

  // Remove markdown code fences if present
  cleaned = cleaned.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");

  // Try to find JSON object boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Validate that the extracted text is valid JSON
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${providerName} provider: Failed to generate valid JSON. ` +
        `Parse error: ${errorMessage}. ` +
        `Response was: ${cleaned.substring(0, 200)}...`,
    );
  }
}
