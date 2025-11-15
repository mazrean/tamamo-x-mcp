import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it, beforeEach, afterEach } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { init } from "../../src/cli/commands/init.ts";
import { discoverAllTools } from "../../src/mcp/discovery.ts";
import { loadConfig } from "../../src/config/loader.ts";

/**
 * Integration tests for init workflow (User Story 1)
 * Tests the complete flow of running `tamamo-x-mcp init`
 *
 * Acceptance Scenarios:
 * 1. Create tamamo-x.config.json with interactive prompts
 * 2. Import MCP server configurations from .mcp.json if present
 * 3. Discover tools from configured MCP servers
 * 4. Reference project-specific files (Agent.md, CLAUDE.md) if present
 */

describe("Init Workflow Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await Deno.makeTempDir({ prefix: "tamamo_x_test_" });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Configuration creation", () => {
    it("should create tamamo-x.config.json when no configuration exists", async () => {
      // Arrange
      const configPath = join(tempDir, "tamamo-x.config.json");

      // Act
      await init({ projectRoot: tempDir });

      // Assert
      const exists = await Deno.stat(configPath).then(() => true).catch(() => false);
      assertEquals(exists, true, "tamamo-x.config.json should be created");
    });

    it("should import MCP server configurations from .mcp.json if present", async () => {
      // Arrange
      const mcpJsonPath = join(tempDir, ".mcp.json");
      const mcpConfig = {
        mcpServers: {
          "test-server": {
            command: "test-mcp-server",
            args: ["--port", "3000"],
          },
        },
      };
      await Deno.writeTextFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2));

      // Act
      await init({ projectRoot: tempDir });

      // Assert
      const configPath = join(tempDir, "tamamo-x.config.json");
      const exists = await Deno.stat(configPath).then(() => true).catch(() => false);
      assertEquals(exists, true, "Configuration should be created");

      if (exists) {
        const configContent = await Deno.readTextFile(configPath);
        const config = JSON.parse(configContent);
        assertExists(config.mcpServers, "mcpServers should exist in config");
        assertEquals(
          config.mcpServers.some((s: { name: string }) => s.name === "test-server"),
          true,
          "test-server should be imported from .mcp.json",
        );
      }
    });

    it("should reference Agent.md and CLAUDE.md if present in project", async () => {
      // Arrange
      const agentMdPath = join(tempDir, "Agent.md");
      const claudeMdPath = join(tempDir, "CLAUDE.md");
      await Deno.writeTextFile(agentMdPath, "# Test Agent");
      await Deno.writeTextFile(claudeMdPath, "# Test Claude Instructions");

      // Act
      await init({ projectRoot: tempDir });

      // Assert
      const configPath = join(tempDir, "tamamo-x.config.json");
      const exists = await Deno.stat(configPath).then(() => true).catch(() => false);

      if (exists) {
        const configContent = await Deno.readTextFile(configPath);
        const config = JSON.parse(configContent);
        assertExists(config.projectContext, "projectContext should exist");
        assertExists(config.projectContext.agentFilePath, "agentFilePath should be referenced");
        assertExists(config.projectContext.claudeFilePath, "claudeFilePath should be referenced");
      }
    });
  });

  describe("Tool discovery", () => {
    it("should discover tools from configured MCP servers", async () => {
      // Arrange
      // TODO: Set up mock MCP server or use test fixture
      const configPath = join(tempDir, "tamamo-x.config.json");
      const testConfig = {
        version: "1.0.0",
        mcpServers: [
          {
            name: "test-server",
            transport: "stdio",
            command: "echo",
            args: ["test"],
          },
        ],
        llmProvider: {
          type: "anthropic",
          credentialSource: "env-var",
        },
      };
      await Deno.writeTextFile(configPath, JSON.stringify(testConfig, null, 2));

      // Act
      const config = await loadConfig(configPath);
      const tools = await discoverAllTools(config.mcpServers);

      // Assert
      // Should be able to list discovered tools
      assertEquals(Array.isArray(tools), true, "Should return array of tools");
    });

    it("should handle unreachable MCP servers gracefully", async () => {
      // Arrange
      const configPath = join(tempDir, "tamamo-x.config.json");
      const testConfig = {
        version: "1.0.0",
        mcpServers: [
          {
            name: "unreachable-server",
            transport: "http",
            url: "http://localhost:99999", // Invalid port
          },
        ],
        llmProvider: {
          type: "anthropic",
          credentialSource: "env-var",
        },
      };
      await Deno.writeTextFile(configPath, JSON.stringify(testConfig, null, 2));

      // Act & Assert
      // Should handle error gracefully and return empty array or skip server
      try {
        const config = await loadConfig(configPath);
        const tools = await discoverAllTools(config.mcpServers);
        assertEquals(Array.isArray(tools), true, "Should return array even if server is unreachable");
      } catch (error) {
        // Should not throw - graceful degradation
        throw new Error(`Tool discovery should handle unreachable servers gracefully: ${error}`);
      }
    });
  });

  describe("Configuration validation", () => {
    it("should skip servers with invalid command type", async () => {
      // Arrange
      const mcpJsonPath = join(tempDir, ".mcp.json");
      // Create .mcp.json with invalid server config (command is not a string)
      const invalidMcpConfig = {
        mcpServers: {
          "valid-server": {
            command: "test-command",
            args: ["--test"],
          },
          "invalid-server": {
            command: ["not", "a", "string"], // Invalid: array instead of string
          },
        },
      };
      await Deno.writeTextFile(mcpJsonPath, JSON.stringify(invalidMcpConfig, null, 2));

      // Act
      await init({ projectRoot: tempDir });

      // Assert
      const configPath = join(tempDir, "tamamo-x.config.json");
      const config = await loadConfig(configPath);

      // Invalid server should be skipped, valid server should be imported
      assertEquals(config.mcpServers.length, 1, "Only valid server should be imported");
      assertEquals(config.mcpServers[0].name, "valid-server", "Valid server should be imported");
    });

    it("should skip servers with non-string url", async () => {
      // Arrange
      const mcpJsonPath = join(tempDir, ".mcp.json");
      // Create .mcp.json with numeric URL (invalid type)
      const invalidMcpConfig = {
        mcpServers: {
          "valid-server": {
            url: "http://localhost:3000",
          },
          "invalid-numeric-url": {
            url: 12345, // Invalid: number instead of string
          },
          "invalid-object-url": {
            url: { host: "localhost" }, // Invalid: object instead of string
          },
        },
      };
      await Deno.writeTextFile(mcpJsonPath, JSON.stringify(invalidMcpConfig, null, 2));

      // Act
      await init({ projectRoot: tempDir });

      // Assert
      const configPath = join(tempDir, "tamamo-x.config.json");
      const config = await loadConfig(configPath);

      // Only valid server should be imported
      assertEquals(config.mcpServers.length, 1, "Only valid server should be imported");
      assertEquals(config.mcpServers[0].name, "valid-server", "Valid server should be imported");
      assertEquals(config.mcpServers[0].url, "http://localhost:3000", "Valid URL should be preserved");
    });
  });
});
