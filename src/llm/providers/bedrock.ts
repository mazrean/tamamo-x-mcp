/**
 * AWS Bedrock provider implementation
 * Uses @aws-sdk/client-bedrock-runtime
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "npm:@aws-sdk/client-bedrock-runtime@3.716.0";
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

  const selectedModel = model || "anthropic.claude-3-sonnet-20240229-v1:0";

  return {
    provider: "bedrock",
    model: selectedModel,
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
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
