/**
 * Anthropic provider implementation
 * Uses @anthropic-ai/sdk (official SDK)
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.70.0";
import type { CompletionOptions, LLMClient } from "../client.ts";
import { extractJsonFromText } from "../utils.ts";

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
          // If responseSchema is provided, enhance prompt with strict JSON instructions
          let enhancedPrompt = prompt;
          if (options?.responseSchema) {
            const schemaStr = JSON.stringify(options.responseSchema, null, 2);
            enhancedPrompt += `

<json_schema>
${schemaStr}
</json_schema>

CRITICAL INSTRUCTIONS FOR JSON OUTPUT:
1. Your response MUST be valid, parseable JSON
2. Your response MUST conform EXACTLY to the schema provided above
3. Do NOT include ANY text before the opening brace {
4. Do NOT include ANY text after the closing brace }
5. Do NOT include markdown code fences, explanations, or commentary
6. Do NOT use ellipsis (...) or placeholders - provide complete data
7. Ensure all required fields are present
8. Ensure all field types match the schema (string, number, array, object)
9. Ensure array items match their schema definitions

Your ENTIRE response should be parseable by JSON.parse() without any modifications.`;
          }

          messages = [
            {
              role: "user",
              content: enhancedPrompt,
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

        const response = await client.messages.create(createParams);

        // Extract text from response
        const textContent = response.content.find(
          (block) => block.type === "text",
        );
        if (!textContent || textContent.type !== "text") {
          throw new Error("No text content in Anthropic response");
        }

        let text = textContent.text.trim();

        // If schema was provided, extract and validate JSON from response
        // Note: Anthropic Messages API doesn't support enforced structured output,
        // so we rely on prompt instructions and post-processing validation
        if (options?.responseSchema) {
          text = extractJsonFromText(text, "Anthropic");
        }

        return text;
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
