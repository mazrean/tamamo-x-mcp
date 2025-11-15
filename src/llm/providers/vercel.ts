/**
 * Vercel AI provider implementation
 * Uses ai SDK
 */

import { createOpenAI } from "npm:ai@4.1.12";
import { generateText } from "npm:ai@4.1.12";
import type { LLMClient, CompletionOptions } from "../client.ts";

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
      const { text } = await generateText({
        model: openai(selectedModel),
        prompt,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });

      if (!text) {
        throw new Error("No text content in Vercel AI response");
      }

      return text;
    },
  };
}
