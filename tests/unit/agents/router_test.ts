import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { beforeEach, describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import type {
  AgentRequest,
  LLMProviderConfig,
  SubAgent,
  ToolGroup,
} from "../../../src/types/index.ts";
import {
  createErrorResponse,
  createSuccessResponse,
  findAgentById,
  routeRequest,
  validateRequest,
} from "../../../src/agents/router.ts";
import { MOCK_TOOLS } from "../../fixtures/mock_tools.ts";

/**
 * Unit tests for request routing (src/agents/router.ts)
 *
 * Tests routing logic and agent selection by ID
 */

describe("Request Routing", () => {
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
        tools: MOCK_TOOLS.slice(0, 5),
        systemPrompt: "You are a specialized agent.",
      },
      {
        id: "group-2",
        name: "Network Operations",
        description: "Tools for network operations",
        tools: MOCK_TOOLS.slice(5, 10),
        systemPrompt: "You are a specialized agent.",
      },
      {
        id: "group-3",
        name: "Database Operations",
        description: "Tools for database operations",
        tools: MOCK_TOOLS.slice(10, 15),
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

  describe("Agent selection by ID", () => {
    it("should find agent by exact ID match", () => {
      // Arrange
      const targetId = "group-2";

      // Act
      const agent = findAgentById(mockSubAgents, targetId);

      // Assert
      assertExists(agent);
      assertEquals(agent.id, targetId);
      assertEquals(agent.name, "Network Operations");
    });

    it("should return null for non-existent agent ID", () => {
      // Arrange
      const targetId = "non-existent-group";

      // Act
      const agent = findAgentById(mockSubAgents, targetId);

      // Assert
      assertEquals(agent, null);
    });

    it("should handle empty agent list", () => {
      // Arrange
      const emptyAgents: SubAgent[] = [];
      const targetId = "group-1";

      // Act
      const agent = findAgentById(emptyAgents, targetId);

      // Assert
      assertEquals(agent, null);
    });

    it("should match first agent when multiple agents exist", () => {
      // Arrange
      const targetId = "group-1";

      // Act
      const agent = findAgentById(mockSubAgents, targetId);

      // Assert
      assertExists(agent);
      assertEquals(agent.id, "group-1");
      assertEquals(agent.name, "File Operations");
    });
  });

  describe("Request routing", () => {
    it("should route request to correct agent", () => {
      // Arrange
      const request: AgentRequest = {
        requestId: "req-1",
        agentId: "group-2",
        prompt: "List all network connections",
        timestamp: new Date(),
      };

      // Act
      const agent = routeRequest(request, mockSubAgents);

      // Assert
      assertExists(agent);
      assertEquals(agent.id, "group-2");
      assertEquals(agent.name, "Network Operations");
    });

    it("should return null for request with unknown agent ID", () => {
      // Arrange
      const request: AgentRequest = {
        requestId: "req-2",
        agentId: "unknown-agent",
        prompt: "Do something",
        timestamp: new Date(),
      };

      // Act
      const agent = routeRequest(request, mockSubAgents);

      // Assert
      assertEquals(agent, null);
    });

    it("should handle requests with context", () => {
      // Arrange
      const request: AgentRequest = {
        requestId: "req-3",
        agentId: "group-1",
        prompt: "Read file with context",
        context: {
          userId: "user-123",
          sessionId: "session-456",
        },
        timestamp: new Date(),
      };

      // Act
      const agent = routeRequest(request, mockSubAgents);

      // Assert
      assertExists(agent);
      assertEquals(agent.id, "group-1");
      // Context should be preserved in the request
      assertExists(request.context);
      assertEquals(request.context.userId, "user-123");
    });
  });

  describe("Request validation", () => {
    it("should validate request has required fields", () => {
      // Arrange
      const validRequest: AgentRequest = {
        requestId: "req-1",
        agentId: "group-1",
        prompt: "Do something",
        timestamp: new Date(),
      };

      // Act
      const isValid = validateRequest(validRequest);

      // Assert
      assertEquals(isValid, true);
    });

    it("should reject request with missing requestId", () => {
      // Arrange
      const invalidRequest = {
        agentId: "group-1",
        prompt: "Do something",
        timestamp: new Date(),
      } as AgentRequest;

      // Act
      const isValid = validateRequest(invalidRequest);

      // Assert
      assertEquals(isValid, false);
    });

    it("should reject request with missing agentId", () => {
      // Arrange
      const invalidRequest = {
        requestId: "req-1",
        prompt: "Do something",
        timestamp: new Date(),
      } as AgentRequest;

      // Act
      const isValid = validateRequest(invalidRequest);

      // Assert
      assertEquals(isValid, false);
    });

    it("should reject request with empty prompt", () => {
      // Arrange
      const invalidRequest: AgentRequest = {
        requestId: "req-1",
        agentId: "group-1",
        prompt: "",
        timestamp: new Date(),
      };

      // Act
      const isValid = validateRequest(invalidRequest);

      // Assert
      assertEquals(isValid, false);
    });

    it("should allow request with optional context", () => {
      // Arrange
      const validRequest: AgentRequest = {
        requestId: "req-1",
        agentId: "group-1",
        prompt: "Do something",
        context: { key: "value" },
        timestamp: new Date(),
      };

      // Act
      const isValid = validateRequest(validRequest);

      // Assert
      assertEquals(isValid, true);
    });
  });

  describe("Response generation", () => {
    it("should generate response for successful routing", () => {
      // Arrange
      const request: AgentRequest = {
        requestId: "req-1",
        agentId: "group-1",
        prompt: "Execute task",
        timestamp: new Date(),
      };

      const agent = routeRequest(request, mockSubAgents);

      // Act
      const response = createSuccessResponse(request, agent!, "Task completed");

      // Assert
      assertExists(response);
      assertEquals(response.requestId, request.requestId);
      assertEquals(response.agentId, request.agentId);
      assertEquals(response.result, "Task completed");
      assertExists(response.timestamp);
      assert(!response.error);
    });

    it("should generate error response for failed routing", () => {
      // Arrange
      const request: AgentRequest = {
        requestId: "req-2",
        agentId: "unknown-agent",
        prompt: "Execute task",
        timestamp: new Date(),
      };

      // Act
      const response = createErrorResponse(
        request,
        "Agent unknown-agent not found",
      );

      // Assert
      assertExists(response);
      assertEquals(response.requestId, request.requestId);
      assertEquals(response.agentId, request.agentId);
      assertEquals(response.error, "Agent unknown-agent not found");
      assertExists(response.timestamp);
      assert(!response.result);
    });

    it("should generate response with tools used", () => {
      // Arrange
      const request: AgentRequest = {
        requestId: "req-3",
        agentId: "group-1",
        prompt: "Execute task",
        timestamp: new Date(),
      };

      const agent = routeRequest(request, mockSubAgents);
      const toolsUsed = ["tool1", "tool2"];

      // Act
      const response = createSuccessResponse(
        request,
        agent!,
        "Task completed",
        toolsUsed,
      );

      // Assert
      assertExists(response.toolsUsed);
      assertEquals(response.toolsUsed, toolsUsed);
      assertEquals(response.toolsUsed.length, 2);
    });
  });

  describe("Multi-agent routing scenarios", () => {
    it("should route different requests to different agents", () => {
      // Arrange
      const requests: AgentRequest[] = [
        {
          requestId: "req-1",
          agentId: "group-1",
          prompt: "File task",
          timestamp: new Date(),
        },
        {
          requestId: "req-2",
          agentId: "group-2",
          prompt: "Network task",
          timestamp: new Date(),
        },
        {
          requestId: "req-3",
          agentId: "group-3",
          prompt: "Database task",
          timestamp: new Date(),
        },
      ];

      // Act
      const agents = requests.map((req) => routeRequest(req, mockSubAgents));

      // Assert
      assertEquals(agents.length, 3);
      assertEquals(agents[0]?.id, "group-1");
      assertEquals(agents[1]?.id, "group-2");
      assertEquals(agents[2]?.id, "group-3");
    });

    it("should handle concurrent routing requests", () => {
      // Arrange
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        requestId: `req-${i}`,
        agentId: `group-${(i % 3) + 1}`,
        prompt: `Task ${i}`,
        timestamp: new Date(),
      }));

      // Act
      const agents = concurrentRequests.map((req) => routeRequest(req, mockSubAgents));

      // Assert
      assertEquals(agents.length, 10);
      agents.forEach((agent) => {
        assertExists(agent);
      });
    });
  });
});
