/**
 * Vercel AI provider implementation
 * Uses ai SDK and @ai-sdk/openai
 */

import { generateText } from "npm:ai@4.1.12";
import { createOpenAI } from "npm:@ai-sdk/openai@1.0.11";
import type { CompletionOptions, LLMClient } from "../client.ts";

export function createVercelClient(
  apiKey: string,
  model?: string,
): LLMClient {
  const openai = createOpenAI({ apiKey });
  const selectedModel = model || "gpt-4o";

  return {
    provider: "vercel",
    model: selectedModel,
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      // Build generation parameters
      const params: {
        model: ReturnType<typeof openai>;
        prompt: string;
        temperature?: number;
        maxTokens?: number;
        experimental_telemetry?: { isEnabled: boolean };
      } = {
        model: openai(selectedModel),
        prompt,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        experimental_telemetry: { isEnabled: false },
      };

      // Note: Vercel AI SDK's generateText doesn't directly support response_format
      // But we rely on the enhanced prompt instructions for JSON enforcement
      // The underlying OpenAI SDK in Vercel AI should respect the prompt

      const { text } = await generateText(params);

      if (!text) {
        throw new Error("No text content in Vercel AI response");
      }

      // If schema was provided, attempt to extract JSON
      if (options?.responseSchema) {
        let cleaned = text.trim();
        // Remove markdown code fences if present
        cleaned = cleaned.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
        // Try to find JSON object boundaries
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          return cleaned.substring(firstBrace, lastBrace + 1);
        }
        return cleaned;
      }

      return text;
    },
  };
}
