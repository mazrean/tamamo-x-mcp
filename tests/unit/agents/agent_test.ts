import {
  assert,
  assertEquals,
  assertExists,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { beforeEach, describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import type { AgentRequest, LLMProviderConfig, Tool, ToolGroup } from "../../../src/types/index.ts";
import {
  createSubAgent,
  executeAgent,
  wrapToolForMastra,
  wrapToolsForMastra,
} from "../../../src/agents/agent.ts";
import { MOCK_TOOLS } from "../../fixtures/mock_tools.ts";

/**
 * Unit tests for agent execution (src/agents/agent.ts)
 *
 * Tests Mastra integration, tool wrapping, and agent execution
 */

describe("Agent Execution", () => {
  let mockToolGroup: ToolGroup;
  let mockLLMConfig: LLMProviderConfig;
  let anthropicLLMConfig: LLMProviderConfig;

  beforeEach(() => {
    mockToolGroup = {
      id: "test-group",
      name: "Test Group",
      description: "A test tool group",
      tools: MOCK_TOOLS.slice(0, 5),
      systemPrompt: "You are a helpful assistant for test tools.",
    };

    // Use OpenAI for general tests (Mastra path)
    mockLLMConfig = {
      type: "openai",
      model: "gpt-4",
      credentialSource: "env-var",
    };

    // Anthropic config for Claude Agent SDK tests
    anthropicLLMConfig = {
      type: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      credentialSource: "env-var",
    };
  });

  describe("Tool wrapping for Mastra", () => {
    it("should convert MCP tool to Mastra tool format", () => {
      // Arrange
      const mcpTool: Tool = MOCK_TOOLS[0];

      // Act
      const mastraTool = wrapToolForMastra(mcpTool);

      // Assert
      assertExists(mastraTool);
      assertEquals(mastraTool.name, mcpTool.name);
      assertEquals(mastraTool.description, mcpTool.description);
      assertExists(mastraTool.inputSchema);
      assertExists(mastraTool.execute);
      assertEquals(typeof mastraTool.execute, "function");
    });

    it("should preserve tool input schema", () => {
      // Arrange
      const mcpTool: Tool = {
        name: "test_tool",
        description: "A test tool",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path" },
            recursive: { type: "boolean", description: "Recursive flag" },
          },
          required: ["path"],
        },
        serverName: "test-server",
      };

      // Act
      const mastraTool = wrapToolForMastra(mcpTool);

      // Assert
      // Type assertion needed because JSONSchema allows boolean in properties
      // deno-lint-ignore no-explicit-any
      assertEquals(mastraTool.inputSchema, mcpTool.inputSchema as any);
      assertEquals(mastraTool.inputSchema.properties?.path.type, "string");
      assertEquals(mastraTool.inputSchema.required, ["path"]);
    });

    it("should wrap all tools in a group", () => {
      // Arrange
      const group = mockToolGroup;

      // Act
      const mastraTools = wrapToolsForMastra(group.tools);

      // Assert
      assertEquals(mastraTools.length, 5);
      mastraTools.forEach((tool, idx) => {
        assertEquals(tool.name, group.tools[idx].name);
        assertExists(tool.execute);
      });
    });
  });

  describe("Sub-agent creation", () => {
    it("should create sub-agent with tools and LLM", () => {
      // Arrange
      const group = mockToolGroup;
      const llmConfig = mockLLMConfig;

      // Act
      const subAgent = createSubAgent(group, llmConfig);

      // Assert
      assertExists(subAgent);
      assertEquals(subAgent.id, group.id);
      assertEquals(subAgent.name, group.name);
      assertEquals(subAgent.description, group.description);
      assertEquals(subAgent.toolGroup, group);
      assertEquals(subAgent.llmProvider, llmConfig);
      assertExists(subAgent.systemPrompt);
    });

    it("should generate appropriate system prompt", () => {
      // Arrange
      const group = mockToolGroup;
      const llmConfig = mockLLMConfig;

      // Act
      const subAgent = createSubAgent(group, llmConfig);

      // Assert
      assert(
        subAgent.systemPrompt.includes(group.name),
        "System prompt should mention group name",
      );
      assert(
        subAgent.systemPrompt.includes(group.description),
        "System prompt should mention group description",
      );
      assert(
        subAgent.systemPrompt.length > 0,
        "System prompt should not be empty",
      );
    });

    it("should list available tools in system prompt", () => {
      // Arrange
      const group = mockToolGroup;
      const llmConfig = mockLLMConfig;

      // Act
      const subAgent = createSubAgent(group, llmConfig);

      // Assert
      group.tools.forEach((tool) => {
        assert(
          subAgent.systemPrompt.includes(tool.name),
          `System prompt should mention tool ${tool.name}`,
        );
      });
    });
  });

  describe("Agent execution", () => {
    it("should execute agent with request and return response", async () => {
      // Arrange
      const subAgent = createSubAgent(mockToolGroup, mockLLMConfig);
      const request: AgentRequest = {
        requestId: "req-1",
        agentId: subAgent.id,
        prompt: "List all available tools",
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(subAgent, request);

      // Assert
      assertExists(response);
      assertEquals(response.requestId, request.requestId);
      assertEquals(response.agentId, request.agentId);
      assertExists(response.timestamp);
    });

    it("should return result on successful execution", async () => {
      // Arrange
      const subAgent = createSubAgent(mockToolGroup, mockLLMConfig);
      const request: AgentRequest = {
        requestId: "req-2",
        agentId: subAgent.id,
        prompt: "Execute a simple task",
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(subAgent, request);

      // Assert
      assertExists(response.result);
      assertEquals(typeof response.result, "string");
      assert(response.result.length > 0);
    });

    it("should track tools used during execution", async () => {
      // Arrange
      const subAgent = createSubAgent(mockToolGroup, mockLLMConfig);
      const request: AgentRequest = {
        requestId: "req-3",
        agentId: subAgent.id,
        prompt: "Use tools to complete task",
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(subAgent, request);

      // Assert
      assertExists(response.toolsUsed);
      assert(Array.isArray(response.toolsUsed));
      // In real execution, this would contain the actual tools used
    });

    it("should return error on execution failure", async () => {
      // Arrange
      const emptyGroup: ToolGroup = {
        id: "empty-group",
        name: "Empty Group",
        description: "Group with no tools",
        tools: [],
        systemPrompt: "You are a helpful assistant.",
      };
      const subAgent = createSubAgent(emptyGroup, mockLLMConfig);
      const request: AgentRequest = {
        requestId: "req-4",
        agentId: subAgent.id,
        prompt: "Do something impossible",
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(subAgent, request);

      // Assert
      assertExists(response.error);
      assertEquals(typeof response.error, "string");
      assert(!response.result, "Should not have result when error occurs");
    });

    it("should handle context in request", async () => {
      // Arrange
      const subAgent = createSubAgent(mockToolGroup, mockLLMConfig);
      const request: AgentRequest = {
        requestId: "req-5",
        agentId: subAgent.id,
        prompt: "Use this context to complete task",
        context: {
          userId: "user-123",
          sessionId: "session-456",
        },
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(subAgent, request);

      // Assert
      assertExists(response);
      assertEquals(response.requestId, request.requestId);
      // Context should be passed to agent execution
    });
  });

  describe("Tool execution within agent", () => {
    it("should execute MCP tool call through wrapped Mastra tool", async () => {
      // Arrange
      const mcpTool: Tool = {
        name: "test_tool",
        description: "Test tool",
        inputSchema: {
          type: "object",
          properties: {
            input: { type: "string" },
          },
          required: ["input"],
        },
        serverName: "test-server",
      };

      const mastraTool = wrapToolForMastra(mcpTool);
      const toolInput = { input: "test value" };

      // Act
      const result = await mastraTool.execute(toolInput);

      // Assert
      assertExists(result);
      // In real implementation, this would call the actual MCP server
    });

    it("should handle tool execution errors gracefully", async () => {
      // Arrange
      const mcpTool: Tool = {
        name: "failing_tool",
        description: "Tool that fails",
        inputSchema: {
          type: "object",
          properties: {},
        },
        serverName: "test-server",
      };

      const mastraTool = wrapToolForMastra(mcpTool);

      // Act & Assert
      // In real implementation, this should catch and handle MCP errors
      await assertRejects(
        async () => await mastraTool.execute({ invalid: "input" }),
        Error,
      );
    });
  });

  describe("Agent state management", () => {
    it("should maintain tool group reference", () => {
      // Arrange
      const subAgent = createSubAgent(mockToolGroup, mockLLMConfig);

      // Act & Assert
      assertEquals(subAgent.toolGroup.id, mockToolGroup.id);
      assertEquals(subAgent.toolGroup.tools.length, mockToolGroup.tools.length);
    });

    it("should maintain LLM provider config", () => {
      // Arrange
      const subAgent = createSubAgent(mockToolGroup, mockLLMConfig);

      // Act & Assert
      assertEquals(subAgent.llmProvider.type, mockLLMConfig.type);
      assertEquals(subAgent.llmProvider.model, mockLLMConfig.model);
    });
  });

  describe("Anthropic-specific execution with Claude Agent SDK", () => {
    it("should require API key for Anthropic provider", async () => {
      // Arrange
      const subAgent = createSubAgent(mockToolGroup, anthropicLLMConfig);
      const request: AgentRequest = {
        requestId: "req-anthropic-1",
        agentId: subAgent.id,
        prompt: "Test with Anthropic",
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(subAgent, request);

      // Assert - should error without API key
      assertExists(response.error);
      assert(
        response.error.includes("API key required"),
        "Should require API key for Anthropic provider",
      );
    });

    it("should execute with Claude Agent SDK when API key provided", async () => {
      // Arrange
      const subAgent = createSubAgent(mockToolGroup, anthropicLLMConfig);
      const request: AgentRequest = {
        requestId: "req-anthropic-2",
        agentId: subAgent.id,
        prompt: "Test with Anthropic and API key",
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(subAgent, request, {
        apiKey: "test-api-key",
      });

      // Assert
      assertExists(response);
      assertEquals(response.requestId, request.requestId);
      assertEquals(response.agentId, request.agentId);
      // Note: In real execution with valid API key, would get actual response
      // For now, mock implementation returns error due to invalid key
    });
  });
});
