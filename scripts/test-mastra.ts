#!/usr/bin/env -S deno run --allow-all
/**
 * Simple Mastra test script to verify it works with Deno
 */

import { Agent } from "npm:@mastra/core@0.22.0/agent";
import { join } from "jsr:@std/path@^1.0.0";

async function testMastra() {
  // Try to get API key from Codex auth file
  const home = Deno.env.get("HOME");
  let apiKey: string | null = null;

  if (home) {
    try {
      const authPath = join(home, ".codex", "auth.json");
      const content = await Deno.readTextFile(authPath);
      const auth = JSON.parse(content);
      if (auth.OPENAI_API_KEY) {
        apiKey = auth.OPENAI_API_KEY;
        console.log("Loaded API key from ~/.codex/auth.json");
      }
    } catch {
      console.log("Could not load ~/.codex/auth.json");
    }
  }

  if (!apiKey) {
    apiKey = Deno.env.get("OPENAI_API_KEY") || null;
  }

  console.log("API Key present:", !!apiKey);
  console.log("API Key prefix:", apiKey?.substring(0, 15));

  // Set in process.env for Node.js compatibility
  if (apiKey && typeof globalThis.process !== "undefined" && globalThis.process.env) {
    globalThis.process.env.OPENAI_API_KEY = apiKey;
  }

  console.log(
    "process.env available:",
    typeof globalThis.process !== "undefined" && !!globalThis.process.env,
  );
  if (typeof globalThis.process !== "undefined" && globalThis.process.env) {
    console.log("process.env.OPENAI_API_KEY present:", !!globalThis.process.env.OPENAI_API_KEY);
    console.log(
      "process.env.OPENAI_API_KEY prefix:",
      globalThis.process.env.OPENAI_API_KEY?.substring(0, 10),
    );
  }

  // Create simple agent
  console.log("\nCreating agent...");
  const agent = new Agent({
    name: "test-agent",
    instructions: "You are a helpful assistant. Always respond with 'Hello!'",
    model: "openai/gpt-4o",
  });

  console.log("Agent created successfully");

  // Test generation
  console.log("\nGenerating response...");
  try {
    const response = await agent.generate("Say hello");

    console.log("\n=== Response ===");
    console.log("text:", response.text);
    console.log("finishReason:", response.finishReason);
    console.log("usage:", JSON.stringify(response.usage));
    console.log("error:", response.error);
    console.log("warnings:", JSON.stringify(response.warnings));

    if (response.steps && response.steps.length > 0) {
      console.log("\n=== First Step ===");
      const step = response.steps[0];
      console.log("step.text:", step.text);
      console.log("step.finishReason:", step.finishReason);
      console.log("step.content:", JSON.stringify(step.content));
      console.log("step.warnings:", JSON.stringify(step.warnings));

      if (step.response) {
        console.log("\n=== Step Response Details ===");
        console.log("statusCode:", step.response.statusCode);
        console.log("headers:", JSON.stringify(step.response.headers));

        if (step.response.body) {
          console.log("body type:", typeof step.response.body);
          try {
            console.log("body:", JSON.stringify(step.response.body, null, 2));
          } catch {
            console.log("body (not JSON):", step.response.body);
          }
        }
      }
    }

    // Check if there are any tripwire errors
    if (response.tripwire) {
      console.log("\n=== Tripwire ===");
      console.log("tripwire:", response.tripwire);
      console.log("tripwireReason:", response.tripwireReason);
    }
  } catch (error) {
    console.error("Error during generation:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
  }
}

if (import.meta.main) {
  await testMastra();
}
