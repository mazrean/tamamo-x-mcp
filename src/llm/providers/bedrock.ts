/**
 * AWS Bedrock provider implementation
 * Uses @aws-sdk/client-bedrock-runtime
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "npm:@aws-sdk/client-bedrock-runtime@3.933.0";
import type { CompletionOptions, LLMClient } from "../client.ts";
import type { BedrockCredentials } from "../credentials.ts";

export function createBedrockClient(
  credentials: BedrockCredentials,
  model?: string,
): LLMClient {
  const client = new BedrockRuntimeClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });

  const selectedModel = model || "anthropic.claude-haiku-4-5-20251001-v1:0";

  return {
    provider: "bedrock",
    model: selectedModel,
    async complete(
      prompt: string,
      options?: CompletionOptions,
    ): Promise<string> {
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

      const command = new InvokeModelCommand({
        modelId: selectedModel,
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature,
          messages: [{ role: "user", content: enhancedPrompt }],
        }),
      });

      const response = await client.send(command);

      if (!response.body) {
        throw new Error("No body in AWS Bedrock response");
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      let text = responseBody.content?.[0]?.text;

      if (!text) {
        throw new Error("No text content in AWS Bedrock response");
      }

      // If schema was provided, extract and validate JSON from response
      // Note: AWS Bedrock Runtime doesn't support enforced structured output,
      // so we rely on prompt instructions and post-processing validation
      if (options?.responseSchema) {
        text = text.trim();
        // Remove markdown code fences if present
        text = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");

        // Try to find JSON object boundaries
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          text = text.substring(firstBrace, lastBrace + 1);
        }

        // Validate that the extracted text is valid JSON
        try {
          JSON.parse(text);
        } catch (_parseError) {
          throw new Error(
            `Bedrock provider: Failed to generate valid JSON. Response was: ${
              text.substring(0, 200)
            }...`,
          );
        }
      }

      return text;
    },
  };
}
