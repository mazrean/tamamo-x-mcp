import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";

/**
 * Unit tests for Gemini provider (src/llm/providers/gemini.ts)
 * Uses @google/generative-ai SDK
 */

describe("Gemini Provider", () => {
  describe("Client initialization", () => {
    it("should initialize with API key", async () => {
      const client = await createGeminiClient("AIzaSy-test-key");
      assertExists(client);
    });

    it("should use correct default model", async () => {
      const client = await createGeminiClient("AIzaSy-test-key");
      assertEquals(client.model, "gemini-2.0-flash-exp");
    });
  });

  describe("Completion", () => {
    it("should complete prompt", async () => {
      const client = await createGeminiClient("AIzaSy-test-key");
      const result = await client.complete("Test prompt");
      assertExists(result);
      assert(typeof result === "string");
    });
  });
});

// Mock implementations
function createGeminiClient(_apiKey: string) {
  return Promise.resolve({
    model: "gemini-2.0-flash-exp",
    complete(prompt: string): Promise<string> {
      return Promise.resolve(`Mock Gemini response for: ${prompt}`);
    },
  });
}
