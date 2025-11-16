/**
 * OpenAI provider implementation
 * Uses openai SDK (also compatible with OpenRouter)
 */

import OpenAI from "npm:openai@4.77.3";
import type { CompletionOptions, LLMClient } from "../client.ts";

const DEFAULT_MODEL = "gpt-4o";

export function createOpenAIClient(
  apiKey: string,
  model?: string,
  baseURL?: string,
): LLMClient {
  const client = new OpenAI({ apiKey, baseURL });
  const selectedModel = model || DEFAULT_MODEL;

  return {
    provider: baseURL?.includes("openrouter") ? "openrouter" : "openai",
    model: selectedModel,
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      const response = await client.chat.completions.create({
        model: selectedModel,
        messages: [{ role: "user", content: prompt }],
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenAI API response");
      }

      return content;
    },
  };
}
