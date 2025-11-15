/**
 * Anthropic provider implementation
 * Uses @anthropic-ai/sdk
 */

import type { LLMClient, CompletionOptions } from "../client.ts";

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

export function createAnthropicClient(
  _apiKey: string,
  model?: string,
): LLMClient {
  // TODO: Import actual Anthropic SDK when ready
  // import Anthropic from "npm:@anthropic-ai/sdk";
  // const client = new Anthropic({ apiKey });

  const selectedModel = model || DEFAULT_MODEL;

  return {
    provider: "anthropic",
    model: selectedModel,
    complete(_prompt: string, _options?: CompletionOptions): Promise<string> {
      // TODO: Replace with actual SDK call
      // const response = await client.messages.create({
      //   model: selectedModel,
      //   max_tokens: options?.maxTokens || 4096,
      //   temperature: options?.temperature,
      //   messages: [{ role: "user", content: prompt }],
      // });
      // return response.content[0].text;

      // Mock implementation for now - returns valid JSON for analyzer
      const mockResponse = {
        relationships: [
          { tool1: "tool_a", tool2: "tool_b", score: 0.8 },
        ],
        suggestions: [
          {
            name: "mock_group",
            tools: ["tool_a", "tool_b"],
            rationale: "Mock grouping suggestion from Anthropic provider",
          },
        ],
      };
      return Promise.resolve(JSON.stringify(mockResponse));
    },
  };
}
