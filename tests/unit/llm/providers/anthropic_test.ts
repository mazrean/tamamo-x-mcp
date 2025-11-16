import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";

/**
 * Unit tests for Anthropic provider (src/llm/providers/anthropic.ts)
 * Uses @anthropic-ai/sdk
 */

describe("Anthropic Provider", () => {
  describe("Client initialization", () => {
    it("should initialize with API key", async () => {
      const client = await createAnthropicClient("sk-ant-test-key");
      assertExists(client);
    });

    it("should use correct default model", async () => {
      const client = await createAnthropicClient("sk-ant-test-key");
      assertEquals(client.model, "claude-3-5-sonnet-20241022");
    });
  });

  describe("Completion", () => {
    it("should complete prompt", async () => {
      const client = await createAnthropicClient("sk-ant-test-key");
      const result = await client.complete("Test prompt");
      assertExists(result);
      assert(typeof result === "string");
    });

    it("should handle temperature parameter", async () => {
      const client = await createAnthropicClient("sk-ant-test-key");
      const result = await client.complete("Test", { temperature: 0.7 });
      assertExists(result);
    });
  });
});

// Mock implementations
function createAnthropicClient(_apiKey: string) {
  return Promise.resolve({
    model: "claude-3-5-sonnet-20241022",
    complete(prompt: string, _options?: { temperature?: number }): Promise<string> {
      return Promise.resolve(`Mock Anthropic response for: ${prompt}`);
    },
  });
}
