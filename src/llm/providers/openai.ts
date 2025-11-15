/**
 * OpenAI provider implementation
 * Uses openai SDK (also compatible with OpenRouter)
 */

import type { LLMClient, CompletionOptions } from "../client.ts";

const DEFAULT_MODEL = "gpt-4o";

export function createOpenAIClient(
  _apiKey: string,
  model?: string,
  baseURL?: string,
): LLMClient {
  // TODO: Import actual OpenAI SDK when ready
  // import OpenAI from "npm:openai";
  // const client = new OpenAI({ apiKey, baseURL });

  const selectedModel = model || DEFAULT_MODEL;

  return {
    provider: baseURL?.includes("openrouter") ? "openrouter" : "openai",
    model: selectedModel,
    complete(_prompt: string, _options?: CompletionOptions): Promise<string> {
      // TODO: Replace with actual SDK call
      // const response = await client.chat.completions.create({
      //   model: selectedModel,
      //   messages: [{ role: "user", content: prompt }],
      //   temperature: options?.temperature,
      //   max_tokens: options?.maxTokens,
      // });
      // return response.choices[0].message.content || "";

      // Mock implementation for now - returns valid JSON for analyzer
      const mockResponse = {
        relationships: [
          { tool1: "tool_a", tool2: "tool_b", score: 0.8 },
        ],
        suggestions: [
          {
            name: "mock_group",
            tools: ["tool_a", "tool_b"],
            rationale: "Mock grouping suggestion from OpenAI provider",
          },
        ],
      };
      return Promise.resolve(JSON.stringify(mockResponse));
    },
  };
}
