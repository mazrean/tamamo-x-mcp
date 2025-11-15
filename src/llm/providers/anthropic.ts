/**
 * Anthropic provider implementation
 * Uses @anthropic-ai/sdk
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";
import type { LLMClient, CompletionOptions } from "../client.ts";

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

export function createAnthropicClient(
  apiKey: string,
  model?: string,
): LLMClient {
  const client = new Anthropic({ apiKey });
  const selectedModel = model || DEFAULT_MODEL;

  return {
    provider: "anthropic",
    model: selectedModel,
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      const response = await client.messages.create({
        model: selectedModel,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        messages: [{ role: "user", content: prompt }],
      });

      // Extract text from response
      const firstContent = response.content[0];
      if (firstContent.type === "text") {
        return firstContent.text;
      }

      throw new Error("Unexpected response type from Anthropic API");
    },
  };
}
