import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { beforeEach, describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import type {
  LLMProviderConfig,
  MCPToolCallRequest,
  SubAgent,
  ToolGroup,
} from "../../../src/types/index.ts";
import {
  createAgentTool,
  createMCPServer,
  handleToolsCall,
  handleToolsList,
  startServer,
  stopServer,
} from "../../../src/mcp/server.ts";
import { MOCK_TOOLS } from "../../fixtures/mock_tools.ts";

/**
 * Unit tests for MCP server (src/mcp/server.ts)
 *
 * Tests server initialization and sub-agent exposure as MCP tools
 */

describe(
  "MCP Server",
  {
    sanitizeResources: false,
    sanitizeOps: false,
  },
  () => {
    let mockGroups: ToolGroup[];
    let mockSubAgents: SubAgent[];
    let mockLLMConfig: LLMProviderConfig;

    beforeEach(() => {
      mockLLMConfig = {
        type: "anthropic",
        model: "claude-3-5-sonnet-20241022",
      };

      mockGroups = [
        {
          id: "group-1",
          name: "File Operations",
          description: "Tools for file system operations",
          tools: MOCK_TOOLS.slice(0, 10),
          systemPrompt: "You are a specialized agent.",
        },
        {
          id: "group-2",
          name: "Network Operations",
          description: "Tools for network operations",
          tools: MOCK_TOOLS.slice(10, 20),
          systemPrompt: "You are a specialized agent.",
        },
        {
          id: "group-3",
          name: "Database Operations",
          description: "Tools for database operations",
          tools: MOCK_TOOLS.slice(20, 30),
          systemPrompt: "You are a specialized agent.",
        },
      ];

      mockSubAgents = mockGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        toolGroup: group,
        llmProvider: mockLLMConfig,
        systemPrompt: `You are ${group.name}`,
      }));
    });

    describe("Server initialization", () => {
      it("should initialize server with sub-agents", () => {
        // Arrange & Act
        const server = createMCPServer(mockSubAgents);

        // Assert
        assertExists(server);
        assertExists(server.subAgents);
        assertEquals(server.subAgents.length, 3);
      });

      it("should register sub-agents as tools", () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);

        // Act
        const tools = server.getTools();

        // Assert
        assertEquals(tools.length, 3);
        assertEquals(tools[0].name, "agent_group-1");
        assertEquals(tools[1].name, "agent_group-2");
        assertEquals(tools[2].name, "agent_group-3");
      });

      it("should handle empty sub-agents list", () => {
        // Arrange
        const emptyAgents: SubAgent[] = [];

        // Act
        const server = createMCPServer(emptyAgents);

        // Assert
        assertExists(server);
        assertEquals(server.subAgents.length, 0);
        assertEquals(server.getTools().length, 0);
      });
    });

    describe("Sub-agent exposure as MCP tools", () => {
      it("should create tool for each sub-agent", () => {
        // Arrange
        const subAgent = mockSubAgents[0];

        // Act
        const tool = createAgentTool(subAgent);

        // Assert
        assertExists(tool);
        assertEquals(tool.name, `agent_${subAgent.id}`);
        assertEquals(
          tool.description,
          `Sub-agent for ${subAgent.name}: ${subAgent.description}`,
        );
      });

      it("should include prompt in tool schema", () => {
        // Arrange
        const subAgent = mockSubAgents[0];

        // Act
        const tool = createAgentTool(subAgent);

        // Assert
        assertExists(tool.inputSchema);
        assertEquals(tool.inputSchema.type, "object");
        assertExists(tool.inputSchema.properties);
        assertExists(tool.inputSchema.properties.prompt);
        assertEquals(tool.inputSchema.properties.prompt.type, "string");
      });

      it("should mark prompt as required", () => {
        // Arrange
        const subAgent = mockSubAgents[0];

        // Act
        const tool = createAgentTool(subAgent);

        // Assert
        assertExists(tool.inputSchema.required);
        assert(tool.inputSchema.required.includes("prompt"));
        assertEquals(tool.inputSchema.required.length, 1);
      });

      it("should include context as optional parameter", () => {
        // Arrange
        const subAgent = mockSubAgents[0];

        // Act
        const tool = createAgentTool(subAgent);

        // Assert
        assertExists(tool.inputSchema.properties);
        assertExists(tool.inputSchema.properties.context);
        assertEquals(tool.inputSchema.properties.context.type, "object");
        assert(
          !tool.inputSchema.required?.includes("context"),
          "context should be optional",
        );
      });
    });

    describe("tools/list handler", () => {
      it("should return list of all sub-agent tools", () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);

        // Act
        const response = handleToolsList(server);

        // Assert
        assertExists(response);
        assertExists(response.tools);
        assertEquals(response.tools.length, 3);
      });

      it("should include tool metadata in response", () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);

        // Act
        const response = handleToolsList(server);

        // Assert
        response.tools.forEach((tool) => {
          assertExists(tool.name);
          assertExists(tool.description);
          assertExists(tool.inputSchema);
        });
      });

      it("should return empty list when no sub-agents", () => {
        // Arrange
        const server = createMCPServer([]);

        // Act
        const response = handleToolsList(server);

        // Assert
        assertEquals(response.tools.length, 0);
      });
    });

    describe("tools/call handler", () => {
      it("should invoke sub-agent and return response", async () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);
        const request: MCPToolCallRequest = {
          name: "agent_group-1",
          arguments: {
            agentId: "group-1",
            prompt: "Execute file operations",
          },
        };

        // Act
        const response = await handleToolsCall(server, request);

        // Assert
        assertExists(response);
        assertExists(response.content);
        assert(Array.isArray(response.content));
        assertEquals(response.content[0].type, "text");
      });

      it("should return error for unknown tool", async () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);
        const request: MCPToolCallRequest = {
          name: "agent_unknown",
          arguments: {
            agentId: "unknown",
            prompt: "Do something",
          },
        };

        // Act
        const response = await handleToolsCall(server, request);

        // Assert
        assertEquals(response.isError, true);
        assertExists(response.content);
        assert(response.content[0].text?.includes("not found"));
      });

      it("should validate required arguments", async () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);
        const request: MCPToolCallRequest = {
          name: "agent_group-1",
          arguments: {
            // Missing agentId and prompt
          },
        };

        // Act
        const response = await handleToolsCall(server, request);

        // Assert
        assertEquals(response.isError, true);
        assertExists(response.content);
        assert(
          response.content[0].text?.includes("required") ||
            response.content[0].text?.includes("missing"),
        );
      });

      it("should pass context to agent execution", async () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);
        const request: MCPToolCallRequest = {
          name: "agent_group-1",
          arguments: {
            agentId: "group-1",
            prompt: "Execute with context",
            context: {
              userId: "user-123",
            },
          },
        };

        // Act
        const response = await handleToolsCall(server, request);

        // Assert
        assertExists(response);
        // Context should be passed to agent (verified in integration tests)
      });
    });

    describe("Protocol compliance", () => {
      it("should return MCP-compliant tools/list response", () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);

        // Act
        const response = handleToolsList(server);

        // Assert
        assertExists(response.tools);
        assert(Array.isArray(response.tools));
        response.tools.forEach((tool) => {
          assertExists(tool.name);
          assertExists(tool.description);
          assertExists(tool.inputSchema);
        });
      });

      it("should return MCP-compliant tools/call response", async () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);
        const request: MCPToolCallRequest = {
          name: "agent_group-1",
          arguments: {
            agentId: "group-1",
            prompt: "Test",
          },
        };

        // Act
        const response = await handleToolsCall(server, request);

        // Assert
        assertExists(response.content);
        assert(Array.isArray(response.content));
        response.content.forEach((content) => {
          assertExists(content.type);
          assert(["text", "image", "resource"].includes(content.type));
        });
      });

      it("should include isError flag in error responses", async () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);
        const request: MCPToolCallRequest = {
          name: "agent_unknown",
          arguments: {
            agentId: "unknown",
            prompt: "Test",
          },
        };

        // Act
        const response = await handleToolsCall(server, request);

        // Assert
        assertEquals(response.isError, true);
      });
    });

    describe("Server lifecycle", () => {
      it("should start server successfully", async () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);

        // Act
        const started = await startServer(server);

        // Assert
        assertEquals(started, true);
      });

      it("should stop server gracefully", async () => {
        // Arrange
        const server = createMCPServer(mockSubAgents);
        await startServer(server);

        // Act
        const stopped = await stopServer(server);

        // Assert
        assertEquals(stopped, true);
      });
    });
  },
);
