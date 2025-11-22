/**
 * OpenAI provider implementation
 * Uses openai SDK (also compatible with OpenRouter)
 */

import OpenAI from "npm:openai@6.9.1";
import type { CompletionOptions, LLMClient } from "../client.ts";

const DEFAULT_MODEL = "gpt-5.1";

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
    async complete(
      prompt: string,
      options?: CompletionOptions,
    ): Promise<string> {
      // Build request parameters
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      // Use conversation history if provided
      if (options?.messages && options.messages.length > 0) {
        for (const msg of options.messages) {
          messages.push({ role: msg.role, content: msg.content });
        }
      } else {
        // Add system message if provided
        if (options?.system) {
          messages.push({ role: "system", content: options.system });
        }
      }

      // Add current prompt as user message
      messages.push({ role: "user", content: prompt });

      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: selectedModel,
        messages,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
      };

      // Enable JSON mode if schema is provided
      if (options?.responseSchema) {
        // Use structured outputs for better schema enforcement
        // For models that support it (gpt-4o, gpt-4o-mini, gpt-5.1, etc.)
        try {
          params.response_format = {
            type: "json_schema",
            json_schema: {
              name: "tool_grouping_response",
              strict: true,
              schema: options.responseSchema,
            },
          };
        } catch {
          // Fallback to basic JSON mode if structured outputs not supported
          params.response_format = { type: "json_object" };
        }
      }

      const response = await client.chat.completions.create(params);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenAI API response");
      }

      return content;
    },
  };
}
