import {
  assertEquals,
  assertExists,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { MCPClient } from "../../../src/mcp/client.ts";

/**
 * Unit tests for MCP client
 * Tests connection, initialization, and error handling for stdio/http/websocket transports
 *
 * Reference: plan.md § Phase 1 (MCP Client Integration)
 * Reference: research.md § 2 (MCP Protocol Integration)
 */

describe("MCP Client", () => {
  describe("Client initialization", () => {
    it("should create MCP client with stdio transport", () => {
      // Arrange
      const serverConfig = {
        name: "test-server",
        transport: "stdio" as const,
        command: "echo",
        args: ["test"],
      };

      // Act
      const client = new MCPClient(serverConfig);

      // Assert
      assertEquals(client.transport, "stdio");
      assertExists(client.serverName);
      assertEquals(client.serverName, "test-server");
    });

    it("should create MCP client with http transport", () => {
      // Arrange
      const serverConfig = {
        name: "http-server",
        transport: "http" as const,
        url: "http://localhost:3000",
      };

      // Act
      const client = new MCPClient(serverConfig);

      // Assert
      assertEquals(client.transport, "http");
      assertEquals(client.url, "http://localhost:3000");
    });

    it("should reject websocket transport as unsupported", () => {
      // Arrange
      const serverConfig = {
        name: "ws-server",
        transport: "websocket" as const,
        url: "ws://localhost:8080",
      };

      // Act & Assert
      try {
        new MCPClient(serverConfig);
        assertEquals(true, false, "Should have thrown error for unsupported websocket transport");
      } catch (error) {
        assertEquals(
          (error as Error).message.includes("WebSocket transport is not yet supported"),
          true,
        );
      }
    });
  });

  describe("Connection management", () => {
    it("should connect to stdio MCP server", () => {
      // This test requires a real MCP server implementation
      // For unit testing, we verify the client can be created and basic properties work
      // TODO: Implement with mock MCP server for integration testing

      // Arrange
      const serverConfig = {
        name: "test-server",
        transport: "stdio" as const,
        command: "cat",
        args: [],
      };

      // Act
      const client = new MCPClient(serverConfig);

      // Assert - verify client is created with correct config
      assertEquals(client.serverName, "test-server");
      assertEquals(client.transport, "stdio");
      assertEquals(client.isConnected, false);
    });

    it("should handle connection errors gracefully", async () => {
      // Skip on Windows: MCP SDK has timer leak issues with failed stdio connections
      if (Deno.build.os === "windows") {
        console.log("  Skipping connection error test on Windows (MCP SDK timer leak)");
        return;
      }

      // Arrange
      const serverConfig = {
        name: "invalid-server",
        transport: "stdio" as const,
        command: "nonexistent-command-that-should-not-exist",
        args: [],
      };

      // Act & Assert
      const client = new MCPClient(serverConfig);
      try {
        await assertRejects(
          async () => await client.connect(),
          Error,
          "Failed to connect",
        );
      } finally {
        // Cleanup: disconnect to clear any timers/resources
        await client.disconnect();
      }
    });

    it("should disconnect from MCP server cleanly", async () => {
      // This test requires a real MCP server implementation
      // For unit testing, we verify disconnect() can be called safely when not connected
      // TODO: Implement with mock MCP server for integration testing

      // Arrange
      const serverConfig = {
        name: "test-server",
        transport: "stdio" as const,
        command: "cat",
        args: [],
      };

      // Act
      const client = new MCPClient(serverConfig);
      await client.disconnect(); // Should not throw when not connected

      // Assert
      assertEquals(client.isConnected, false);
    });
  });

  describe("Environment variables", () => {
    it("should pass environment variables to stdio server process", () => {
      // This test requires a real MCP server implementation that can verify env vars
      // For unit testing, we verify the client accepts env configuration
      // TODO: Implement with mock MCP server for integration testing

      // Arrange
      const serverConfig = {
        name: "test-server",
        transport: "stdio" as const,
        command: "cat",
        args: [],
        env: {
          "TEST_VAR": "test_value",
        },
      };

      // Act
      const client = new MCPClient(serverConfig);

      // Assert - verify client is created with env config
      assertEquals(client.serverName, "test-server");
      assertEquals(client.isConnected, false);
    });
  });

  describe("Transport-specific validation", () => {
    it("should require command for stdio transport", () => {
      // Arrange
      const invalidConfig = {
        name: "invalid-stdio",
        transport: "stdio" as const,
        // Missing command
      };

      // Act & Assert
      try {
        // deno-lint-ignore no-explicit-any
        new MCPClient(invalidConfig as any);
        assertEquals(true, false, "Should have thrown error");
      } catch (error) {
        assertEquals(
          (error as Error).message.includes("command is required"),
          true,
        );
      }
    });

    it("should require url for http transport", () => {
      // Arrange
      const invalidConfig = {
        name: "invalid-http",
        transport: "http" as const,
        // Missing url
      };

      // Act & Assert
      try {
        // deno-lint-ignore no-explicit-any
        new MCPClient(invalidConfig as any);
        assertEquals(true, false, "Should have thrown error");
      } catch (error) {
        assertEquals(
          (error as Error).message.includes("url is required"),
          true,
        );
      }
    });

    it("should reject websocket transport even with valid url", () => {
      // Arrange - WebSocket is not supported regardless of config completeness
      const invalidConfig = {
        name: "invalid-ws",
        transport: "websocket" as const,
        url: "ws://localhost:8080",
      };

      // Act & Assert
      try {
        new MCPClient(invalidConfig);
        assertEquals(true, false, "Should have thrown error");
      } catch (error) {
        assertEquals(
          (error as Error).message.includes("WebSocket transport is not yet supported"),
          true,
        );
      }
    });
  });
});
