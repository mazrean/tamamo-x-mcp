/**
 * Vercel AI provider implementation
 * Uses ai SDK and @ai-sdk/openai
 */

import { generateObject, generateText, jsonSchema } from "npm:ai@5.0.97";
import { createOpenAI } from "npm:@ai-sdk/openai@2.0.68";
import type { CompletionOptions, LLMClient } from "../client.ts";

export function createVercelClient(apiKey: string, model?: string): LLMClient {
  const openai = createOpenAI({ apiKey });
  const selectedModel = model || "gpt-5.1-codex";

  return {
    provider: "vercel",
    model: selectedModel,
    async complete(
      prompt: string,
      options?: CompletionOptions,
    ): Promise<string> {
      // If responseSchema is provided, use generateObject for enforced structured output
      if (options?.responseSchema) {
        const result = await generateObject({
          model: openai(selectedModel),
          schema: jsonSchema(options.responseSchema as never),
          prompt,
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          experimental_telemetry: { isEnabled: false },
        });

        // Return the generated object as JSON string
        return JSON.stringify(result.object);
      }

      // For non-structured output, use generateText
      const { text } = await generateText({
        model: openai(selectedModel),
        prompt,
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
        experimental_telemetry: { isEnabled: false },
      });

      if (!text) {
        throw new Error("No text content in Vercel AI response");
      }

      return text;
    },
  };
}
