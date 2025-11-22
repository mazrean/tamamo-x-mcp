/**
 * Tests for agent-writer.ts
 */

import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { join } from "jsr:@std/path@^1.0.0";
import { addTamamoXToAgent } from "../../../src/config/agent-writer.ts";

// Create test directory
const testDir = await Deno.makeTempDir({ prefix: "tamamo-x-writer-test-" });

Deno.test({
  name: "addTamamoXToAgent - replaces servers by default (Claude Code)",
  async fn() {
    const configPath = join(testDir, "claude-code-replace.json");

    // Start with existing config
    const initialConfig = {
      mcpServers: {
        "existing-server": {
          command: "node",
          args: ["server.js"],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(initialConfig));

    // Add tamamo-x-mcp (default behavior: replace)
    await addTamamoXToAgent("claude-code", configPath);

    // Read and verify - existing-server should be gone
    const content = await Deno.readTextFile(configPath);
    const config = JSON.parse(content);

    assertEquals(Object.keys(config.mcpServers).length, 1);
    assertEquals(config.mcpServers["existing-server"], undefined);
    assertEquals(config.mcpServers["tamamo-x-mcp"].command, "tamamo-x-mcp");
    assertEquals(config.mcpServers["tamamo-x-mcp"].args, ["mcp"]);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "addTamamoXToAgent - preserves servers when preserveServers=true (Claude Code)",
  async fn() {
    const configPath = join(testDir, "claude-code-preserve.json");

    // Start with existing config
    const initialConfig = {
      mcpServers: {
        "existing-server": {
          command: "node",
          args: ["server.js"],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(initialConfig));

    // Add tamamo-x-mcp with preserveServers=true
    await addTamamoXToAgent("claude-code", configPath, true);

    // Read and verify - existing-server should still exist
    const content = await Deno.readTextFile(configPath);
    const config = JSON.parse(content);

    assertEquals(Object.keys(config.mcpServers).length, 2);
    assertEquals(config.mcpServers["existing-server"].command, "node");
    assertEquals(config.mcpServers["tamamo-x-mcp"].command, "tamamo-x-mcp");
    assertEquals(config.mcpServers["tamamo-x-mcp"].args, ["mcp"]);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "addTamamoXToAgent - replaces servers by default (Codex JSON)",
  async fn() {
    const configPath = join(testDir, "codex-replace.json");

    // Start with existing config
    const initialConfig = {
      mcpServers: {
        "existing-server": {
          command: "node",
          args: ["server.js"],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(initialConfig));

    // Add tamamo-x-mcp (default behavior: replace)
    await addTamamoXToAgent("codex", configPath);

    // Read and verify
    const content = await Deno.readTextFile(configPath);
    const config = JSON.parse(content);

    assertEquals(Object.keys(config.mcpServers).length, 1);
    assertEquals(config.mcpServers["existing-server"], undefined);
    assertEquals(config.mcpServers["tamamo-x-mcp"].command, "tamamo-x-mcp");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "addTamamoXToAgent - replaces servers by default (Gemini CLI)",
  async fn() {
    const configPath = join(testDir, "gemini.json");

    // Start with existing config
    const initialConfig = {
      mcpServers: {
        "existing-server": {
          command: "node",
          args: ["server.js"],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(initialConfig));

    // Add tamamo-x-mcp (default behavior: replace)
    await addTamamoXToAgent("gemini-cli", configPath);

    // Read and verify
    const content = await Deno.readTextFile(configPath);
    const config = JSON.parse(content);

    assertEquals(Object.keys(config.mcpServers).length, 1);
    assertEquals(config.mcpServers["tamamo-x-mcp"].command, "tamamo-x-mcp");
    assertEquals(config.mcpServers["tamamo-x-mcp"].args, ["mcp"]);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "addTamamoXToAgent - replaces servers by default (Cursor)",
  async fn() {
    const configPath = join(testDir, "cursor.json");

    const initialConfig = {
      mcpServers: {
        "existing-server": {
          command: "node",
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(initialConfig));

    await addTamamoXToAgent("cursor", configPath);

    const content = await Deno.readTextFile(configPath);
    const config = JSON.parse(content);

    assertEquals(Object.keys(config.mcpServers).length, 1);
    assertEquals(config.mcpServers["tamamo-x-mcp"].command, "tamamo-x-mcp");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "addTamamoXToAgent - replaces servers by default (Windsurf)",
  async fn() {
    const configPath = join(testDir, "windsurf.json");

    const initialConfig = {
      mcpServers: {
        "existing-server": {
          command: "node",
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(initialConfig));

    await addTamamoXToAgent("windsurf", configPath);

    const content = await Deno.readTextFile(configPath);
    const config = JSON.parse(content);

    assertEquals(Object.keys(config.mcpServers).length, 1);
    assertEquals(config.mcpServers["tamamo-x-mcp"].command, "tamamo-x-mcp");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "addTamamoXToAgent - replaces existing tamamo-x-mcp by default",
  async fn() {
    const configPath = join(testDir, "replace-existing.json");

    const initialConfig = {
      mcpServers: {
        "existing-server": {
          command: "node",
        },
        "tamamo-x-mcp": {
          command: "old-tamamo-x-mcp",
          args: ["old"],
        },
      },
    };

    await Deno.writeTextFile(configPath, JSON.stringify(initialConfig));

    // Add tamamo-x-mcp (should replace everything)
    await addTamamoXToAgent("claude-code", configPath);

    // Should have only tamamo-x-mcp with correct config
    const content = await Deno.readTextFile(configPath);
    const config = JSON.parse(content);

    const serverNames = Object.keys(config.mcpServers);
    assertEquals(serverNames.length, 1);
    assertEquals(serverNames[0], "tamamo-x-mcp");
    assertEquals(config.mcpServers["tamamo-x-mcp"].command, "tamamo-x-mcp");
    assertEquals(config.mcpServers["tamamo-x-mcp"].args, ["mcp"]);
  },
  sanitizeResources: false,
  sanitizeOps: false,
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
