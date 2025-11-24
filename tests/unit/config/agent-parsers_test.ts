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

    const result = await parseAgentConfig("cursor", configPath);

    assertEquals(result.mcpServers.length, 1);
    assertEquals(result.mcpServers[0].name, "git");
    assertEquals(result.llmProvider?.type, "openai");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Claude Code config with HTTP transport",
  async fn() {
    const configPath = join(testDir, "claude-code-http-config.json");
    const config = {
      mcpServers: {
        "deepwiki": {
          type: "http",
          url: "https://mcp.deepwiki.com/mcp",
        },
        "local-http": {
          url: "http://localhost:3000/mcp",
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("claude-code", configPath);

    assertEquals(result.mcpServers.length, 2);
    assertEquals(result.mcpServers[0].name, "deepwiki");
    assertEquals(result.mcpServers[0].transport, "http");
    assertEquals(result.mcpServers[0].url, "https://mcp.deepwiki.com/mcp");
    assertEquals(result.mcpServers[0].command, undefined);

    assertEquals(result.mcpServers[1].name, "local-http");
    assertEquals(result.mcpServers[1].transport, "http");
    assertEquals(result.mcpServers[1].url, "http://localhost:3000/mcp");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Claude Code config with WebSocket transport",
  async fn() {
    const configPath = join(testDir, "claude-code-ws-config.json");
    const config = {
      mcpServers: {
        "ws-server": {
          url: "ws://localhost:8080",
        },
        "wss-server": {
          url: "wss://secure.example.com/mcp",
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("claude-code", configPath);

    assertEquals(result.mcpServers.length, 2);
    assertEquals(result.mcpServers[0].name, "ws-server");
    assertEquals(result.mcpServers[0].transport, "websocket");
    assertEquals(result.mcpServers[0].url, "ws://localhost:8080");

    assertEquals(result.mcpServers[1].name, "wss-server");
    assertEquals(result.mcpServers[1].transport, "websocket");
    assertEquals(result.mcpServers[1].url, "wss://secure.example.com/mcp");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Claude Code config with mixed transports",
  async fn() {
    const configPath = join(testDir, "claude-code-mixed-config.json");
    const config = {
      mcpServers: {
        "stdio-server": {
          command: "node",
          args: ["server.js"],
        },
        "http-server": {
          url: "https://api.example.com/mcp",
        },
        "ws-server": {
          url: "ws://localhost:9000",
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("claude-code", configPath);

    assertEquals(result.mcpServers.length, 3);

    assertEquals(result.mcpServers[0].name, "stdio-server");
    assertEquals(result.mcpServers[0].transport, "stdio");
    assertEquals(result.mcpServers[0].command, "node");

    assertEquals(result.mcpServers[1].name, "http-server");
    assertEquals(result.mcpServers[1].transport, "http");
    assertEquals(result.mcpServers[1].url, "https://api.example.com/mcp");

    assertEquals(result.mcpServers[2].name, "ws-server");
    assertEquals(result.mcpServers[2].transport, "websocket");
    assertEquals(result.mcpServers[2].url, "ws://localhost:9000");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Gemini CLI config with HTTP transport (object format)",
  async fn() {
    const configPath = join(testDir, "gemini-http-config.json");
    const config = {
      mcpServers: {
        "api-server": {
          url: "https://api.example.com/mcp",
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("gemini-cli", configPath);

    assertEquals(result.mcpServers.length, 1);
    assertEquals(result.mcpServers[0].name, "api-server");
    assertEquals(result.mcpServers[0].transport, "http");
    assertEquals(result.mcpServers[0].url, "https://api.example.com/mcp");
    assertEquals(result.llmProvider?.type, "gemini");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Gemini CLI config with WebSocket transport (array format)",
  async fn() {
    const configPath = join(testDir, "gemini-ws-array-config.json");
    const config = {
      mcpServers: [
        {
          name: "ws-server",
          url: "ws://localhost:8080",
        },
        {
          name: "wss-server",
          url: "wss://secure.example.com",
        },
      ],
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("gemini-cli", configPath);

    assertEquals(result.mcpServers.length, 2);
    assertEquals(result.mcpServers[0].name, "ws-server");
    assertEquals(result.mcpServers[0].transport, "websocket");
    assertEquals(result.mcpServers[0].url, "ws://localhost:8080");

    assertEquals(result.mcpServers[1].name, "wss-server");
    assertEquals(result.mcpServers[1].transport, "websocket");
    assertEquals(result.mcpServers[1].url, "wss://secure.example.com");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - parses Cursor config with HTTP transport",
  async fn() {
    const configPath = join(testDir, "cursor-http-config.json");
    const config = {
      mcpServers: {
        "http-api": {
          url: "http://localhost:5000/mcp",
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("cursor", configPath);

    assertEquals(result.mcpServers.length, 1);
    assertEquals(result.mcpServers[0].name, "http-api");
    assertEquals(result.mcpServers[0].transport, "http");
    assertEquals(result.mcpServers[0].url, "http://localhost:5000/mcp");
    assertEquals(result.llmProvider?.type, "openai");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "parseAgentConfig - skips servers without command or url",
  async fn() {
    const configPath = join(testDir, "invalid-config.json");
    const config = {
      mcpServers: {
        "valid-server": {
          command: "node",
          args: ["server.js"],
        },
        "invalid-server": {
          args: ["server.js"],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(config));

    const result = await parseAgentConfig("claude-code", configPath);

    assertEquals(result.mcpServers.length, 1);
    assertEquals(result.mcpServers[0].name, "valid-server");
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
