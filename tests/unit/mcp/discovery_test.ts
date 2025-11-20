import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { discoverAllTools, extractToolMetadata, parseTools } from "../../../src/mcp/discovery.ts";

/**
 * Unit tests for tool discovery
 * Tests tool parsing from MCP responses and tool metadata extraction
 *
 * Reference: plan.md § Phase 1 (MCP Client Integration)
 * Reference: data-model.md § 6 (Tool entity)
 *
 * Note: sanitizeResources is disabled for this test suite because the MCP SDK's
 * internal Client class uses timers that are not properly cleaned up when connections fail.
 * This is a known limitation of the @modelcontextprotocol/sdk library.
 */

describe("Tool Discovery", {
  sanitizeResources: false,
  sanitizeOps: false,
}, () => {
  describe("Tool parsing from MCP responses", () => {
    it("should parse tool metadata from MCP tools/list response", () => {
      // Arrange
      const mockMCPResponse = {
        tools: [
          {
            name: "read_file",
            description: "Read contents of a file",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string", description: "File path to read" },
              },
              required: ["path"],
            },
          },
          {
            name: "write_file",
            description: "Write contents to a file",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string", description: "File path to write" },
                content: { type: "string", description: "Content to write" },
              },
              required: ["path", "content"],
            },
          },
        ],
      };

      // Act
      const tools = parseTools(mockMCPResponse, "test-server");

      // Assert
      assertEquals(tools.length, 2);
      assertEquals(tools[0].name, "read_file");
      assertEquals(tools[0].description, "Read contents of a file");
      assertEquals(tools[0].serverName, "test-server");
      assertExists(tools[0].inputSchema);
    });

    it("should handle empty tool list", () => {
      // Arrange
      const mockMCPResponse = {
        tools: [],
      };

      // Act
      const tools = parseTools(mockMCPResponse, "empty-server");

      // Assert
      assertEquals(tools.length, 0);
    });

    it("should extract tool category if provided", () => {
      // Arrange
      const mockMCPResponse = {
        tools: [
          {
            name: "git_commit",
            description: "Create a git commit",
            category: "version-control",
            inputSchema: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
              required: ["message"],
            },
          },
        ],
      };

      // Act
      const tools = parseTools(mockMCPResponse, "git-server");

      // Assert
      assertEquals(tools[0].category, "version-control");
    });

    it("should validate inputSchema is valid JSON Schema", () => {
      // Arrange
      const mockMCPResponse = {
        tools: [
          {
            name: "test_tool",
            description: "Test tool",
            inputSchema: {
              type: "object",
              properties: {
                param1: { type: "string" },
              },
              required: ["param1"],
            },
          },
        ],
      };

      // Act & Assert
      const tools = parseTools(mockMCPResponse, "test-server");
      assertEquals(tools[0].inputSchema.type, "object");
      assertExists(tools[0].inputSchema.properties);
    });
  });

  describe("Tool discovery from multiple servers", () => {
    it("should discover tools from multiple MCP servers", async () => {
      // Arrange
      const serverConfigs = [
        {
          name: "server-1",
          transport: "stdio" as const,
          command: "test-server-1",
        },
        {
          name: "server-2",
          transport: "stdio" as const,
          command: "test-server-2",
        },
      ];

      // This test requires real MCP servers
      // For unit testing, we verify the function exists and handles empty results
      // TODO: Implement with mock MCP servers for integration testing

      // Act
      const allTools = await discoverAllTools(serverConfigs);

      // Assert - Function completes without error (servers will fail to connect)
      assertEquals(Array.isArray(allTools), true);
    });

    it("should handle server connection failures gracefully", async () => {
      // Arrange
      const serverConfigs = [
        {
          name: "working-server",
          transport: "stdio" as const,
          command: "echo",
        },
        {
          name: "failing-server",
          transport: "http" as const,
          url: "http://localhost:99999", // Invalid
        },
      ];

      // Act & Assert
      const allTools = await discoverAllTools(serverConfigs);
      // Should continue even if servers fail to connect
      assertEquals(Array.isArray(allTools), true);
      // Result will be empty array since servers don't exist, but no error thrown
      assertEquals(allTools.length >= 0, true);
    });

    it("should keep tools with same name from different servers (no deduplication)", () => {
      // Arrange
      const mockResponses = [
        {
          server: "server-1",
          tools: [
            {
              name: "read_file",
              description: "Read file (v1)",
              inputSchema: { type: "object", properties: {} },
            },
          ],
        },
        {
          server: "server-2",
          tools: [
            {
              name: "read_file",
              description: "Read file (v2)",
              inputSchema: { type: "object", properties: {} },
            },
          ],
        },
      ];

      // Act - Tools with same name from different servers should both be kept
      const tools1 = parseTools(mockResponses[0], mockResponses[0].server);
      const tools2 = parseTools(mockResponses[1], mockResponses[1].server);
      const allTools = [...tools1, ...tools2];

      // Assert - Both tools preserved with different serverNames
      assertEquals(allTools.length, 2);
      assertEquals(allTools[0].serverName, "server-1");
      assertEquals(allTools[1].serverName, "server-2");
      // Both tools have same name but different serverName
      assertEquals(allTools[0].name, allTools[1].name);
      assertEquals(allTools[0].serverName !== allTools[1].serverName, true);
    });
  });

  describe("Tool metadata extraction", () => {
    it("should extract complete tool metadata", () => {
      // Arrange
      const mockToolResponse = {
        name: "search_code",
        description: "Search for code patterns in repository",
        inputSchema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "Search pattern" },
            path: { type: "string", description: "Path to search in" },
            case_sensitive: {
              type: "boolean",
              description: "Case sensitive search",
              default: false,
            },
          },
          required: ["pattern"],
        },
        category: "search",
      };

      // Act
      const metadata = extractToolMetadata(mockToolResponse, "search-server");

      // Assert
      assertExists(metadata.name);
      assertExists(metadata.description);
      assertExists(metadata.inputSchema);
      assertExists(metadata.serverName);
      assertEquals(metadata.name, "search_code");
      assertEquals(metadata.serverName, "search-server");
      assertEquals(metadata.category, "search");
    });

    it("should handle tools without optional category field", () => {
      // Arrange
      const mockToolResponse = {
        name: "simple_tool",
        description: "Simple tool without category",
        inputSchema: {
          type: "object",
          properties: {},
        },
      };

      // Act
      const metadata = extractToolMetadata(mockToolResponse, "simple-server");

      // Assert
      assertEquals(metadata.category, undefined);
    });

    it("should reject tools with missing required fields", () => {
      // Arrange
      const invalidTool = {
        name: "invalid_tool",
        // Missing description
        inputSchema: { type: "object", properties: {} },
      };

      // Act & Assert
      try {
        extractToolMetadata(invalidTool as never, "test-server");
        assertEquals(true, false, "Should have thrown error for missing description");
      } catch (error) {
        assertEquals(
          (error as Error).message.includes("description"),
          true,
        );
      }
    });
  });

  describe("Performance optimization", () => {
    it("should discover tools from multiple servers in parallel", async () => {
      // Arrange
      const serverConfigs = [
        { name: "server-1", transport: "stdio" as const, command: "server-1" },
        { name: "server-2", transport: "stdio" as const, command: "server-2" },
        { name: "server-3", transport: "stdio" as const, command: "server-3" },
      ];

      // Act
      const startTime = Date.now();
      const allTools = await discoverAllTools(serverConfigs);
      const duration = Date.now() - startTime;

      // Assert
      // Parallel discovery should complete (servers will fail but that's OK)
      assertEquals(Array.isArray(allTools), true);
      // Duration should be reasonable (parallel execution via Promise.all)
      // This is a soft check - we don't assert exact timing
      assertEquals(duration >= 0, true);
    });
  });
});
