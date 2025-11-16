/**
 * Anthropic provider implementation
 * Uses @anthropic-ai/claude-agent-sdk
 */

import { query } from "npm:@anthropic-ai/claude-agent-sdk@0.1.0";
import type { CompletionOptions, LLMClient } from "../client.ts";

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

export function createAnthropicClient(
  apiKey: string,
  model?: string,
): LLMClient {
  const selectedModel = model || DEFAULT_MODEL;

  return {
    provider: "anthropic",
    model: selectedModel,
    async complete(prompt: string, _options?: CompletionOptions): Promise<string> {
      // Set API key in environment for Claude Agent SDK
      const originalApiKey = Deno.env.get("ANTHROPIC_API_KEY");
      Deno.env.set("ANTHROPIC_API_KEY", apiKey);

      try {
        // Note: Claude Agent SDK doesn't support maxTokens/temperature in query options
        // These parameters are ignored for now
        // Execute query with Claude Agent SDK (no tools needed for completion)
        const stream = query({
          prompt,
          options: {
            model: selectedModel,
            maxTurns: 1, // Single completion, no back-and-forth
          },
        });

        let result = "";

        // Process streaming response
        for await (const item of stream) {
          if (item.type === "assistant") {
            for (const piece of item.message.content) {
              if (piece.type === "text") {
                result += piece.text;
              }
            }
          }
        }

        if (!result) {
          throw new Error("No response from Claude Agent SDK");
        }

        return result;
      } finally {
        // Restore original API key
        if (originalApiKey) {
          Deno.env.set("ANTHROPIC_API_KEY", originalApiKey);
        } else {
          Deno.env.delete("ANTHROPIC_API_KEY");
        }
      }
    },
  };
}
