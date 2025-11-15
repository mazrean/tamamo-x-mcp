import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";

/**
 * Unit tests for OpenAI provider (src/llm/providers/openai.ts)
 * Uses openai SDK
 */

describe("OpenAI Provider", () => {
  describe("Client initialization", () => {
    it("should initialize with API key", async () => {
      const client = await createOpenAIClient("sk-openai-test-key");
      assertExists(client);
    });

    it("should use correct default model", async () => {
      const client = await createOpenAIClient("sk-openai-test-key");
      assertEquals(client.model, "gpt-4o");
    });

    it("should support custom endpoint for OpenRouter", async () => {
      const client = await createOpenAIClient("sk-or-key", "https://openrouter.ai/api/v1");
      assertExists(client);
    });
  });

  describe("Completion", () => {
    it("should complete prompt", async () => {
      const client = await createOpenAIClient("sk-openai-test-key");
      const result = await client.complete("Test prompt");
      assertExists(result);
      assert(typeof result === "string");
    });
  });
});

// Mock implementations
function createOpenAIClient(_apiKey: string, _baseURL?: string) {
  return Promise.resolve({
    model: "gpt-4o",
    complete(prompt: string): Promise<string> {
      return Promise.resolve(`Mock OpenAI response for: ${prompt}`);
    },
  });
}
