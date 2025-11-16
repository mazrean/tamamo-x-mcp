/**
 * Gemini provider implementation
 * Uses @google/generative-ai SDK
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import type { CompletionOptions, LLMClient } from "../client.ts";

const DEFAULT_MODEL = "gemini-2.0-flash-exp";

export function createGeminiClient(
  apiKey: string,
  model?: string,
): LLMClient {
  const genAI = new GoogleGenerativeAI(apiKey);
  const selectedModel = model || DEFAULT_MODEL;
  const geminiModel = genAI.getGenerativeModel({ model: selectedModel });

  return {
    provider: "gemini",
    model: selectedModel,
    async complete(prompt: string, _options?: CompletionOptions): Promise<string> {
      // Note: Gemini API doesn't support temperature/maxTokens in the same way
      // These would need to be set via generationConfig if needed
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error("No text content in Gemini API response");
      }

      return text;
    },
  };
}
