/**
 * Tests for agent-detector.ts
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";
import { normalize } from "jsr:@std/path@^1.0.0";
import {
  type CodingAgent,
  detectAgent,
  detectCodingAgents,
  getAgentConfigPath,
} from "../../../src/config/agent-detector.ts";

Deno.test("getAgentConfigPath - returns correct path for each agent", () => {
  const projectRoot = "/test/project";

  // Test each agent
  const agents: CodingAgent[] = ["claude-code", "gemini-cli", "cursor"];

  for (const agent of agents) {
    const path = getAgentConfigPath(agent, projectRoot);
    assertExists(path, `Path for ${agent} should exist`);

    // Verify path is project-level (normalize both paths for cross-platform compatibility)
    const normalizedPath = normalize(path);
    const normalizedRoot = normalize(projectRoot);
    assertEquals(
      normalizedPath.startsWith(normalizedRoot),
      true,
      `Path should start with project root: ${normalizedPath} vs ${normalizedRoot}`,
    );

    // Verify path contains agent-specific segments
    switch (agent) {
      case "claude-code":
        // Claude Code uses .mcp.json
        assertEquals(path.includes(".mcp.json"), true, `${agent} should use .mcp.json`);
        break;
      case "gemini-cli":
        // Gemini CLI uses .gemini/settings.json
        assertEquals(path.includes(".gemini"), true, "Gemini CLI should use .gemini directory");
        assertEquals(path.includes("settings.json"), true, "Gemini CLI should use settings.json");
        break;
      case "cursor":
        // Cursor uses .cursor/mcp.json
        assertEquals(path.includes(".cursor"), true, "Cursor should use .cursor directory");
        assertEquals(path.includes("mcp.json"), true, "Cursor should use mcp.json");
        break;
    }
  }
});

Deno.test("detectAgent - detects agent existence", async () => {
  // Create a temp project directory
  const projectRoot = await Deno.makeTempDir({ prefix: "test-project-" });

  const result = await detectAgent("claude-code", projectRoot);

  assertExists(result.agent);
  assertExists(result.configPath);
  assertEquals(typeof result.exists, "boolean");
  assertEquals(result.agent, "claude-code");
  assertEquals(result.exists, false); // File doesn't exist in temp dir

  // Cleanup
  await Deno.remove(projectRoot, { recursive: true });
});

Deno.test("detectCodingAgents - returns all agents", async () => {
  // Create a temp project directory
  const projectRoot = await Deno.makeTempDir({ prefix: "test-project-" });

  const agents = await detectCodingAgents(projectRoot);

  // Should return 3 agents
  assertEquals(agents.length, 3);

  // Each agent should have proper structure
  for (const agent of agents) {
    assertExists(agent.agent);
    assertExists(agent.configPath);
    assertEquals(typeof agent.exists, "boolean");
  }

  // Should include all expected agents
  const agentNames = agents.map((a) => a.agent);
  assertEquals(agentNames.includes("claude-code"), true);
  assertEquals(agentNames.includes("gemini-cli"), true);
  assertEquals(agentNames.includes("cursor"), true);

  // Cleanup
  await Deno.remove(projectRoot, { recursive: true });
});
