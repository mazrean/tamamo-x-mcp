/**
 * Vercel AI provider implementation
 * Uses ai SDK
 */

import type { LLMClient, CompletionOptions } from "../client.ts";

export function createVercelClient(
  _apiKey: string,
  model?: string,
): LLMClient {
  // TODO: Import actual Vercel AI SDK when ready
  // import { createOpenAI } from "npm:ai";
  // const openai = createOpenAI({ apiKey });

  const selectedModel = model || "gpt-4o";

  return {
    provider: "vercel",
    model: selectedModel,
    complete(_prompt: string, _options?: CompletionOptions): Promise<string> {
      // TODO: Replace with actual SDK call
      // import { generateText } from "npm:ai";
      // const { text } = await generateText({
      //   model: openai(selectedModel),
      //   prompt,
      // });
      // return text;

      // Mock implementation for now - returns valid JSON for analyzer
      const mockResponse = {
        relationships: [
          { tool1: "tool_a", tool2: "tool_b", score: 0.8 },
        ],
        suggestions: [
          {
            name: "mock_group",
            tools: ["tool_a", "tool_b"],
            rationale: "Mock grouping suggestion from Vercel AI provider",
          },
        ],
      };
      return Promise.resolve(JSON.stringify(mockResponse));
    },
  };
}
