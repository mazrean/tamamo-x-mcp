/**
 * AWS Bedrock provider implementation
 * Uses @aws-sdk/client-bedrock-runtime
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  InvokeModelCommand,
} from "npm:@aws-sdk/client-bedrock-runtime@3.933.0";
import type { DocumentType } from "npm:@smithy/smithy-client@4.6.2";
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
      // If responseSchema is provided, use Converse API with Tool Calling
      // for enforced structured output
      if (options?.responseSchema) {
        const command = new ConverseCommand({
          modelId: selectedModel,
          messages: [
            {
              role: "user",
              content: [{ text: prompt }],
            },
          ],
          toolConfig: {
            tools: [
              {
                toolSpec: {
                  name: "return_structured_data",
                  description: "Returns structured data conforming to the specified schema",
                  inputSchema: {
                    // Cast to DocumentType for Bedrock API compatibility
                    // JSONSchema is structurally compatible with DocumentType
                    json: options.responseSchema as DocumentType,
                  },
                },
              },
            ],
            toolChoice: {
              tool: { name: "return_structured_data" },
            },
          },
          inferenceConfig: {
            maxTokens: options?.maxTokens || 4096,
            temperature: options?.temperature,
          },
        });

        const response = await client.send(command);

        // Extract tool use from response
        const toolUse = response.output?.message?.content?.find(
          (block) => block.toolUse,
        );

        if (!toolUse?.toolUse) {
          throw new Error(
            "Bedrock provider: No tool use in response. Expected structured output via tool calling.",
          );
        }

        // Return the tool input as JSON string (already validated by SDK)
        return JSON.stringify(toolUse.toolUse.input);
      }

      // For non-structured output, use InvokeModel API
      const command = new InvokeModelCommand({
        modelId: selectedModel,
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const response = await client.send(command);

      if (!response.body) {
        throw new Error("No body in AWS Bedrock response");
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const text = responseBody.content?.[0]?.text;

      if (!text) {
        throw new Error("No text content in AWS Bedrock response");
      }

      return text;
    },
  };
}
