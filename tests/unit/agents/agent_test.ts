import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { beforeEach, describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import type { AgentRequest, LLMProviderConfig, Tool, ToolGroup } from "../../../src/types/index.ts";
import {
  createSubAgent,
  executeAgent,
  wrapToolForVercelAI,
  wrapToolsForVercelAI,
} from "../../../src/agents/agent.ts";
import { MOCK_TOOLS } from "../../fixtures/mock_tools.ts";

/**
 * Unit tests for agent execution (src/agents/agent.ts)
 *
 * Tests Mastra integration, tool wrapping, and agent execution
 */

describe(
  "Agent Execution",
  { sanitizeOps: false, sanitizeResources: false },
  () => {
    let mockToolGroup: ToolGroup;
    let mockLLMConfig: LLMProviderConfig;
    let anthropicLLMConfig: LLMProviderConfig;

    beforeEach(() => {
      const tools = MOCK_TOOLS.slice(0, 5);
      mockToolGroup = {
        id: "test-group",
        name: "Test Group",
        description: "A test tool group",
        tools,
        systemPrompt: `You are Test Group.

Description: A test tool group

Available tools:
${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

Your role is to help users by using these tools effectively. When given a task:
1. Analyze which tools are needed to answer the user's question
2. Execute those tools to gather the necessary information
3. After gathering all needed information, provide a clear and concise response to the user

Important: Always provide a final text response after using tools. Summarize the findings and directly answer the user's question.`,
      };

      // Use OpenAI for general tests (Mastra path)
      mockLLMConfig = {
        type: "openai",
        model: "gpt-5.1",
        credentialSource: "env-var",
      };

      // Anthropic config for Claude Agent SDK tests
      anthropicLLMConfig = {
        type: "anthropic",
        model: "claude-4-5-haiku",
        credentialSource: "env-var",
      };
    });

    describe("Tool wrapping for Vercel AI SDK", () => {
      it("should convert MCP tool to Vercel AI SDK tool format", () => {
        // Arrange
        const mcpTool: Tool = MOCK_TOOLS[0];

        // Act
        const vercelTool = wrapToolForVercelAI(mcpTool);

        // Assert
        assertExists(vercelTool);
        // Vercel AI SDK's tool() helper returns a CoreTool object
        assertExists(vercelTool.description);
        assertEquals(vercelTool.description, mcpTool.description);
        assertExists(vercelTool.inputSchema);
        assertExists(vercelTool.execute);
        assertEquals(typeof vercelTool.execute, "function");
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
        const vercelTool = wrapToolForVercelAI(mcpTool);

        // Assert
        assertExists(vercelTool.inputSchema);
        // The inputSchema is wrapped by jsonSchema() helper, check the nested jsonSchema property
        assertExists(vercelTool.inputSchema.jsonSchema);
        assertEquals(vercelTool.inputSchema.jsonSchema.type, "object");
        assertExists(vercelTool.inputSchema.jsonSchema.properties);
        assertEquals(vercelTool.inputSchema.jsonSchema.required, ["path"]);
      });

      it("should wrap all tools in a group", () => {
        // Arrange
        const group = mockToolGroup;

        // Act
        const vercelTools = wrapToolsForVercelAI(group.tools);

        // Assert
        const toolNames = Object.keys(vercelTools);
        assertEquals(toolNames.length, 5);
        toolNames.forEach((name: string) => {
          assertExists(vercelTools[name].execute);
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
        // Must have either result or error, but not both
        assert(
          (response.result !== undefined) !== (response.error !== undefined),
          "Response must have exactly one of result or error",
        );
      });

      it("should return error when API key is missing", async () => {
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
        // Without OPENAI_API_KEY env var, execution should fail with error
        assertExists(response);
        assertEquals(response.requestId, request.requestId);
        assertEquals(response.agentId, request.agentId);
        assertExists(response.timestamp);
        // Should have error (don't check message content to avoid coupling to upstream error text)
        assertExists(
          response.error,
          "Should return error when API key is missing",
        );
        assertEquals(
          response.result,
          undefined,
          "Should not have result when error occurs",
        );
      });

      it("should return error with proper structure when API key missing", async () => {
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
        // Should return proper error structure when API key is missing
        assertExists(response);
        assertEquals(response.requestId, request.requestId);
        assertEquals(response.agentId, request.agentId);
        assertExists(response.error, "Should have error when API key missing");
        assertEquals(
          response.result,
          undefined,
          "Should not have result when error occurs",
        );
        // toolsUsed should be undefined or empty when execution fails
        assert(
          response.toolsUsed === undefined ||
            (Array.isArray(response.toolsUsed) &&
              response.toolsUsed.length === 0),
          "toolsUsed should be undefined or empty on error",
        );
      });

      it("should return error on execution failure", async () => {
        // Arrange
        const emptyGroup: ToolGroup = {
          id: "empty-group",
          name: "Empty Group",
          description: "Group with no tools",
          tools: [],
          systemPrompt: "You are a specialized agent.",
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
        assertEquals(
          response.result,
          undefined,
          "Should not have result when error occurs",
        );
      });

      it("should accept request with context field", async () => {
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
        // Verify basic response structure (cannot verify context propagation without mocking)
        assert(
          (response.result !== undefined) !== (response.error !== undefined),
          "Response must have exactly one of result or error",
        );
      });
    });

    describe("Tool execution within agent", () => {
      it("should execute MCP tool call through wrapped Vercel AI SDK tool", async () => {
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

        const vercelTool = wrapToolForVercelAI(mcpTool);
        const toolInput = { input: "test value" };

        // Act
        const execute = vercelTool.execute;
        assertExists(execute);
        const result = await execute(toolInput);

        // Assert
        assertExists(result);
        // Verify the result is returned (string format for Vercel AI SDK)
        assertEquals(typeof result, "string");
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

        const vercelTool = wrapToolForVercelAI(mcpTool);

        // Act & Assert
        const execute = vercelTool.execute;
        assertExists(execute);
        // The implementation throws for tools named "failing_tool"
        let threwError = false;
        try {
          await execute({ invalid: "input" });
        } catch (_error) {
          threwError = true;
        }
        assert(threwError, "Should throw error for failing_tool");
      });
    });

    describe("Agent state management", () => {
      it("should maintain tool group reference", () => {
        // Arrange
        const subAgent = createSubAgent(mockToolGroup, mockLLMConfig);

        // Act & Assert
        assertEquals(subAgent.toolGroup.id, mockToolGroup.id);
        assertEquals(
          subAgent.toolGroup.tools.length,
          mockToolGroup.tools.length,
        );
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
  },
);
