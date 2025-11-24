/**
 * Anthropic provider implementation
 * Uses @anthropic-ai/sdk (official SDK)
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.70.0";
import type { CompletionOptions, LLMClient } from "../client.ts";

const DEFAULT_MODEL = "claude-haiku-4-5";

export function createAnthropicClient(
  apiKey: string,
  model?: string,
): LLMClient {
  const selectedModel = model || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  return {
    provider: "anthropic",
    model: selectedModel,
    async complete(
      prompt: string,
      options?: CompletionOptions,
    ): Promise<string> {
      try {
        // Prepare messages array
        let messages: Array<{ role: "user" | "assistant"; content: string }>;

        if (options?.messages && options.messages.length > 0) {
          // Use conversation history if provided
          messages = options.messages
            .filter((m) => m.role !== "system") // System messages handled separately
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }));

          // Add the current prompt as the last user message
          messages.push({
            role: "user",
            content: prompt,
          });
        } else {
          messages = [
            {
              role: "user",
              content: prompt,
            },
          ];
        }

        const createParams: Anthropic.MessageCreateParams = {
          model: selectedModel,
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature,
          messages,
        };

        // Extract system message from messages array if present, otherwise use options.system
        if (options?.messages) {
          const systemMessage = options.messages.find(
            (m) => m.role === "system",
          );
          if (systemMessage) {
            createParams.system = systemMessage.content;
          }
        } else if (options?.system) {
          createParams.system = options.system;
        }

        // If responseSchema is provided, use Tool Calling for enforced structured output
        // This guarantees schema compliance at the SDK level (Public Beta for Sonnet 4.5+)
        if (options?.responseSchema) {
          createParams.tools = [
            {
              name: "return_structured_data",
              description: "Returns structured data conforming to the specified schema",
              input_schema: options.responseSchema,
            },
          ];
          createParams.tool_choice = {
            type: "tool",
            name: "return_structured_data",
          };

          const response = await client.messages.create(createParams);

          // Extract tool use from response
          const toolUse = response.content.find(
            (block) => block.type === "tool_use",
          );
          if (!toolUse || toolUse.type !== "tool_use") {
            throw new Error(
              "Anthropic provider: No tool use in response. Expected structured output via tool calling.",
            );
          }

          // Return the tool input as JSON string (already validated by SDK)
          return JSON.stringify(toolUse.input);
        }

        // For non-structured output, use standard text completion
        const response = await client.messages.create(createParams);

        // Extract text from response
        const textContent = response.content.find(
          (block) => block.type === "text",
        );
        if (!textContent || textContent.type !== "text") {
          throw new Error("No text content in Anthropic response");
        }

        return textContent.text.trim();
      } catch (error) {
        console.error("Error in Anthropic provider:", error);
        if (error instanceof Error) {
          console.error("Error stack:", error.stack);
        }
        throw error;
      }
    },
  };
}
