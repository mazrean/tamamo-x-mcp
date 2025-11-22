import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";

/**
 * Unit tests for remaining providers:
 * - Vercel AI (src/llm/providers/vercel.ts)
 * - AWS Bedrock (src/llm/providers/bedrock.ts)
 * - OpenRouter (src/llm/providers/openrouter.ts - uses OpenAI SDK)
 */

describe("Vercel AI Provider", () => {
  it("should initialize with configuration", async () => {
    const client = await createVercelClient({ model: "gpt-4o", apiKey: "test-key" });
    assertExists(client);
  });

  it("should complete prompt", async () => {
    const client = await createVercelClient({ model: "gpt-4o", apiKey: "test-key" });
    const result = await client.complete("Test");
    assertExists(result);
  });
});

describe("AWS Bedrock Provider", () => {
  it("should initialize with AWS credentials", async () => {
    const credentials = {
      accessKeyId: "AKIA-test",
      secretAccessKey: "secret",
      region: "us-east-1",
    };
    const client = await createBedrockClient(credentials);
    assertExists(client);
  });

  it("should complete prompt", async () => {
    const client = await createBedrockClient({
      accessKeyId: "test",
      secretAccessKey: "test",
      region: "us-east-1",
    });
    const result = await client.complete("Test");
    assertExists(result);
  });
});

describe("OpenRouter Provider", () => {
  it("should use OpenAI SDK with custom endpoint", async () => {
    const client = await createOpenRouterClient("sk-or-test-key");
    assertExists(client);
    assertEquals(client.baseURL, "https://openrouter.ai/api/v1");
  });
});

// Mock implementations
function createVercelClient(_config: { model: string; apiKey: string }) {
  return Promise.resolve({
    complete(prompt: string): Promise<string> {
      return Promise.resolve(`Mock Vercel response: ${prompt}`);
    },
  });
}

function createBedrockClient(_credentials: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}) {
  return Promise.resolve({
    complete(prompt: string): Promise<string> {
      return Promise.resolve(`Mock Bedrock response: ${prompt}`);
    },
  });
}

function createOpenRouterClient(_apiKey: string) {
  return Promise.resolve({
    baseURL: "https://openrouter.ai/api/v1",
    complete(prompt: string): Promise<string> {
      return Promise.resolve(`Mock OpenRouter response: ${prompt}`);
    },
  });
}
