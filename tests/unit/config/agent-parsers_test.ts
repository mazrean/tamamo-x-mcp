/**
 * Tests for agent-parsers.ts
 */

import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { join } from "jsr:@std/path@^1.0.0";
import { normalizeServerNames, parseAgentConfig } from "../../../src/config/agent-parsers.ts";
import type { MCPServerConfig } from "../../../src/types/index.ts";

// Create test fixtures directory if needed
const testDir = await Deno.makeTempDir({ prefix: "tamamo-x-test-" });

Deno.test({
  name: "parseAgentConfig - parses Claude Code JSON config",
  async fn() {
    const configPath = join(testDir, "claude-code-config.json");
    const config = {
      mcpServers: {
        "test-server": {
          command: "node",
          args: ["server.js"],
          env: { "TEST_VAR": "value" },
        },
        "another-server": {
          command: "python",
          args: ["-m", "server"],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("claude-code", configPath);

    assertEquals(result.mcpServers.length, 2);
    assertEquals(result.mcpServers[0].name, "test-server");
    assertEquals(result.mcpServers[0].command, "node");
    assertEquals(result.mcpServers[0].args, ["server.js"]);
    assertEquals(result.mcpServers[0].env, { "TEST_VAR": "value" });
    assertEquals(result.mcpServers[0].transport, "stdio");

    assertEquals(result.llmProvider?.type, "anthropic");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Codex JSON config",
  async fn() {
    const configPath = join(testDir, "codex-config.json");
    const config = {
      mcpServers: {
        "test-server": {
          command: "node",
          args: ["server.js"],
          env: {
            TEST_VAR: "value",
          },
        },
        "another-server": {
          command: "python",
          args: ["-m", "server"],
        },
      },
      llm: {
        provider: "openai",
        model: "gpt-4o",
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("codex", configPath);

    assertEquals(result.mcpServers.length, 2);
    assertEquals(result.mcpServers[0].name, "test-server");
    assertEquals(result.mcpServers[0].command, "node");
    assertEquals(result.mcpServers[0].args, ["server.js"]);
    assertEquals(result.mcpServers[0].transport, "stdio");

    assertEquals(result.llmProvider?.type, "openai");
    assertEquals(result.llmProvider?.model, "gpt-4o");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Codex JSON config (array format)",
  async fn() {
    const configPath = join(testDir, "codex-config-array.json");
    const config = {
      mcpServers: [
        {
          name: "test-server",
          command: "node",
          args: ["server.js"],
          env: {
            TEST_VAR: "value",
          },
        },
        {
          name: "another-server",
          command: "python",
          args: ["-m", "server"],
        },
      ],
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("codex", configPath);

    assertEquals(result.mcpServers.length, 2);
    // Verify names are preserved from array format
    assertEquals(result.mcpServers[0].name, "test-server");
    assertEquals(result.mcpServers[0].command, "node");
    assertEquals(result.mcpServers[0].args, ["server.js"]);
    assertEquals(result.mcpServers[0].transport, "stdio");
    assertEquals(result.mcpServers[1].name, "another-server");
    assertEquals(result.mcpServers[1].command, "python");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Codex TOML config (legacy format)",
  async fn() {
    const configPath = join(testDir, "codex-config.toml");
    const config = `
[[mcp.servers]]
name = "test-server"
command = "node"
args = ["server.js"]

[mcp.servers.env]
TEST_VAR = "value"

[[mcp.servers]]
name = "another-server"
command = "python"
args = ["-m", "server"]

[llm]
provider = "openai"
model = "gpt-4o"
`;

    await Deno.writeTextFile(configPath, config);

    const result = await parseAgentConfig("codex", configPath);

    assertEquals(result.mcpServers.length, 2);
    // Verify names are preserved from TOML format
    assertEquals(result.mcpServers[0].name, "test-server");
    assertEquals(result.mcpServers[0].command, "node");
    assertEquals(result.mcpServers[0].args, ["server.js"]);
    assertEquals(result.mcpServers[0].transport, "stdio");
    assertEquals(result.mcpServers[1].name, "another-server");
    assertEquals(result.mcpServers[1].command, "python");

    assertEquals(result.llmProvider?.type, "openai");
    assertEquals(result.llmProvider?.model, "gpt-4o");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - converts TOML numeric/bool env values to strings",
  async fn() {
    const configPath = join(testDir, "codex-config-env.toml");
    const config = `
[[mcp.servers]]
name = "server-with-env"
command = "node"
args = ["server.js"]

[mcp.servers.env]
PORT = 8080
ENABLED = true
TIMEOUT = 30.5
STRING_VAR = "actual_string"
`;

    await Deno.writeTextFile(configPath, config);

    const result = await parseAgentConfig("codex", configPath);

    assertEquals(result.mcpServers.length, 1);
    assertEquals(result.mcpServers[0].name, "server-with-env");

    // Verify all env values are converted to strings
    assertEquals(result.mcpServers[0].env?.PORT, "8080");
    assertEquals(result.mcpServers[0].env?.ENABLED, "true");
    assertEquals(result.mcpServers[0].env?.TIMEOUT, "30.5");
    assertEquals(result.mcpServers[0].env?.STRING_VAR, "actual_string");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Gemini CLI JSON config",
  async fn() {
    const configPath = join(testDir, "gemini-config.json");
    const config = {
      mcpServers: {
        "github-server": {
          command: "npx",
          args: ["@github/mcp-server"],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("gemini-cli", configPath);

    assertEquals(result.mcpServers.length, 1);
    assertEquals(result.mcpServers[0].name, "github-server");
    assertEquals(result.mcpServers[0].command, "npx");
    assertEquals(result.llmProvider?.type, "gemini");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Cursor JSON config",
  async fn() {
    const configPath = join(testDir, "cursor-config.json");
    const config = {
      mcpServers: {
        "filesystem": {
          command: "mcp-server-filesystem",
          args: ["/path/to/dir"],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("cursor", configPath);

    assertEquals(result.mcpServers.length, 1);
    assertEquals(result.mcpServers[0].name, "filesystem");
    assertEquals(result.llmProvider?.type, "openai");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Windsurf JSON config",
  async fn() {
    const configPath = join(testDir, "windsurf-config.json");
    const config = {
      mcpServers: {
        "git": {
          command: "git-mcp-server",
          args: [],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("windsurf", configPath);

    assertEquals(result.mcpServers.length, 1);
    assertEquals(result.mcpServers[0].name, "git");
    assertEquals(result.llmProvider?.type, "openai");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "normalizeServerNames - adds agent prefix to server names",
  fn() {
    const servers: MCPServerConfig[] = [
      {
        name: "git",
        transport: "stdio",
        command: "git-server",
      },
      {
        name: "filesystem",
        transport: "stdio",
        command: "fs-server",
      },
    ];

    const normalized = normalizeServerNames(servers, "claude-code");

    assertEquals(normalized.length, 2);
    assertEquals(normalized[0].name, "claude-code:git");
    assertEquals(normalized[1].name, "claude-code:filesystem");

    // Original properties should be preserved
    assertEquals(normalized[0].command, "git-server");
    assertEquals(normalized[1].command, "fs-server");
  },
});

// Cleanup test directory
Deno.test({
  name: "cleanup test directory",
  async fn() {
    await Deno.remove(testDir, { recursive: true });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
