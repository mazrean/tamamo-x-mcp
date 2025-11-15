import {
  assertEquals,
  assertExists,
  assert,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  describe,
  it,
  beforeEach,
  afterEach,
} from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import type {
  ToolGroup,
  AgentRequest,
  AgentResponse,
} from "../../src/types/index.ts";
import { MOCK_TOOLS } from "../fixtures/mock_tools.ts";

/**
 * Integration tests for MCP server workflow (User Story 4)
 * Tests the complete flow of running `tamamo-x-mcp mcp`
 *
 * Acceptance Scenarios:
 * 1. Start MCP server with grouped tools
 * 2. Client connects and discovers sub-agents
 * 3. Client invokes sub-agent with request
 * 4. Sub-agent routes request to appropriate tools
 * 5. Sub-agent returns response with tool results
 * 6. Server handles protocol-compliant communication
 */

describe("MCP Server Workflow Integration", () => {
  let tempDir: string;
  let groupsPath: string;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await Deno.makeTempDir({ prefix: "tamamo_x_mcp_test_" });
    groupsPath = join(tempDir, ".tamamo-x", "groups.json");

    // Create .tamamo-x directory
    await Deno.mkdir(join(tempDir, ".tamamo-x"), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Server startup and initialization", () => {
    it("should load groups from .tamamo-x/groups.json", async () => {
      // Arrange: Create mock groups file
      const mockGroups: ToolGroup[] = [
        {
          id: "group-1",
          name: "File Operations",
          description: "Tools for file system operations",
          tools: MOCK_TOOLS.slice(0, 10),
        },
        {
          id: "group-2",
          name: "Network Operations",
          description: "Tools for network operations",
          tools: MOCK_TOOLS.slice(10, 20),
        },
      ];

      await Deno.writeTextFile(groupsPath, JSON.stringify(mockGroups, null, 2));

      // Act: Simulate loading groups
      const loadedGroups = await loadGroups(groupsPath);

      // Assert
      assertEquals(loadedGroups.length, 2, "Should load 2 groups");
      assertEquals(loadedGroups[0].id, "group-1");
      assertEquals(loadedGroups[1].id, "group-2");
      assertEquals(
        loadedGroups[0].tools.length,
        10,
        "Group 1 should have 10 tools",
      );
    });

    it("should fail if groups.json does not exist", async () => {
      // Arrange: No groups file created
      const nonExistentPath = join(tempDir, ".tamamo-x", "groups.json");

      // Act & Assert
      await assertRejects(
        async () => await loadGroups(nonExistentPath),
        Error,
        "groups.json not found",
      );
    });

    it("should fail if groups.json is malformed", async () => {
      // Arrange: Create malformed groups file
      await Deno.writeTextFile(groupsPath, "{ invalid json");

      // Act & Assert
      await assertRejects(
        async () => await loadGroups(groupsPath),
        Error,
        "Failed to parse groups.json",
      );
    });
  });

  describe("Sub-agent exposure as MCP tools", () => {
    it("should expose each group as a separate sub-agent tool", () => {
      // Arrange
      const mockGroups: ToolGroup[] = [
        {
          id: "group-1",
          name: "File Operations",
          description: "Tools for file system operations",
          tools: MOCK_TOOLS.slice(0, 5),
        },
        {
          id: "group-2",
          name: "Network Operations",
          description: "Tools for network operations",
          tools: MOCK_TOOLS.slice(5, 10),
        },
        {
          id: "group-3",
          name: "Database Operations",
          description: "Tools for database operations",
          tools: MOCK_TOOLS.slice(10, 15),
        },
      ];

      // Act: Simulate exposing groups as tools
      const exposedTools = exposeGroupsAsTools(mockGroups);

      // Assert
      assertEquals(
        exposedTools.length,
        3,
        "Should expose 3 sub-agent tools",
      );
      assertEquals(exposedTools[0].name, "agent_group-1");
      assertEquals(exposedTools[1].name, "agent_group-2");
      assertEquals(exposedTools[2].name, "agent_group-3");

      // Verify tool descriptions
      assertEquals(
        exposedTools[0].description,
        "Sub-agent for File Operations: Tools for file system operations",
      );
    });

    it("should include agentId and prompt in tool schema", () => {
      // Arrange
      const mockGroup: ToolGroup = {
        id: "group-1",
        name: "File Operations",
        description: "Tools for file system operations",
        tools: MOCK_TOOLS.slice(0, 5),
      };

      // Act
      const tool = createAgentTool(mockGroup);

      // Assert
      assertExists(tool.inputSchema);
      assertEquals(tool.inputSchema.type, "object");
      assertExists(tool.inputSchema.properties);
      assertExists(tool.inputSchema.properties.agentId);
      assertExists(tool.inputSchema.properties.prompt);
      assertEquals(tool.inputSchema.required, ["agentId", "prompt"]);
    });
  });

  describe("Agent request routing", () => {
    it("should route request to correct sub-agent by ID", () => {
      // Arrange
      const mockGroups: ToolGroup[] = [
        {
          id: "group-1",
          name: "File Operations",
          description: "Tools for file system operations",
          tools: MOCK_TOOLS.slice(0, 5),
        },
        {
          id: "group-2",
          name: "Network Operations",
          description: "Tools for network operations",
          tools: MOCK_TOOLS.slice(5, 10),
        },
      ];

      const request: AgentRequest = {
        requestId: "req-1",
        agentId: "group-2",
        prompt: "List all network connections",
        timestamp: new Date(),
      };

      // Act
      const selectedAgent = routeRequest(request, mockGroups);

      // Assert
      assertExists(selectedAgent);
      assertEquals(selectedAgent.id, "group-2");
      assertEquals(selectedAgent.name, "Network Operations");
    });

    it("should return error for unknown agent ID", () => {
      // Arrange
      const mockGroups: ToolGroup[] = [
        {
          id: "group-1",
          name: "File Operations",
          description: "Tools for file system operations",
          tools: MOCK_TOOLS.slice(0, 5),
        },
      ];

      const request: AgentRequest = {
        requestId: "req-1",
        agentId: "unknown-group",
        prompt: "Do something",
        timestamp: new Date(),
      };

      // Act
      const result = routeRequest(request, mockGroups);

      // Assert
      assertEquals(result, null, "Should return null for unknown agent");
    });
  });

  describe("Agent execution and response", () => {
    it("should execute agent with tools and return response", async () => {
      // Arrange
      const mockGroup: ToolGroup = {
        id: "group-1",
        name: "File Operations",
        description: "Tools for file system operations",
        tools: MOCK_TOOLS.slice(0, 5),
      };

      const request: AgentRequest = {
        requestId: "req-1",
        agentId: "group-1",
        prompt: "List files in /tmp",
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(mockGroup, request);

      // Assert
      assertExists(response);
      assertEquals(response.requestId, "req-1");
      assertEquals(response.agentId, "group-1");
      assertExists(response.result);
      assertExists(response.timestamp);
    });

    it("should track which tools were used in response", async () => {
      // Arrange
      const mockGroup: ToolGroup = {
        id: "group-1",
        name: "File Operations",
        description: "Tools for file system operations",
        tools: MOCK_TOOLS.slice(0, 5),
      };

      const request: AgentRequest = {
        requestId: "req-1",
        agentId: "group-1",
        prompt: "Read file /tmp/test.txt",
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(mockGroup, request);

      // Assert
      assertExists(response.toolsUsed);
      assert(
        Array.isArray(response.toolsUsed),
        "toolsUsed should be an array",
      );
      // In real execution, this would contain the actual tools used
    });

    it("should return error in response on execution failure", async () => {
      // Arrange
      const mockGroup: ToolGroup = {
        id: "group-1",
        name: "File Operations",
        description: "Tools for file system operations",
        tools: [],
      };

      const request: AgentRequest = {
        requestId: "req-1",
        agentId: "group-1",
        prompt: "Do impossible task",
        timestamp: new Date(),
      };

      // Act
      const response = await executeAgent(mockGroup, request);

      // Assert
      assertExists(response.error);
      assertEquals(response.requestId, "req-1");
    });
  });

  describe("MCP protocol compliance", () => {
    it("should support tools/list request", () => {
      // Arrange
      const mockGroups: ToolGroup[] = [
        {
          id: "group-1",
          name: "File Operations",
          description: "Tools for file system operations",
          tools: MOCK_TOOLS.slice(0, 5),
        },
      ];

      // Act
      const toolsList = handleToolsList(mockGroups);

      // Assert
      assertExists(toolsList);
      assertExists(toolsList.tools);
      assert(Array.isArray(toolsList.tools));
      assertEquals(toolsList.tools.length, 1);
      assertEquals(toolsList.tools[0].name, "agent_group-1");
    });

    it("should support tools/call request", () => {
      // Arrange
      const mockGroups: ToolGroup[] = [
        {
          id: "group-1",
          name: "File Operations",
          description: "Tools for file system operations",
          tools: MOCK_TOOLS.slice(0, 5),
        },
      ];

      const callRequest = {
        name: "agent_group-1",
        arguments: {
          agentId: "group-1",
          prompt: "List files",
        },
      };

      // Act
      const callResponse = handleToolsCall(callRequest, mockGroups);

      // Assert
      assertExists(callResponse);
      assertExists(callResponse.content);
      assert(Array.isArray(callResponse.content));
      assertEquals(callResponse.content[0].type, "text");
    });

    it("should return error response for invalid tool call", () => {
      // Arrange
      const mockGroups: ToolGroup[] = [
        {
          id: "group-1",
          name: "File Operations",
          description: "Tools for file system operations",
          tools: MOCK_TOOLS.slice(0, 5),
        },
      ];

      const callRequest = {
        name: "unknown_agent",
        arguments: {
          agentId: "unknown",
          prompt: "Do something",
        },
      };

      // Act
      const callResponse = handleToolsCall(callRequest, mockGroups);

      // Assert
      assertEquals(callResponse.isError, true);
      assertExists(callResponse.content);
      assert(
        callResponse.content[0].text?.includes("not found"),
        "Error message should mention tool not found",
      );
    });
  });
});

// Helper functions (to be implemented in actual code)

async function loadGroups(path: string): Promise<ToolGroup[]> {
  // This will be implemented in src/cli/commands/mcp.ts
  try {
    const content = await Deno.readTextFile(path);
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error("groups.json not found");
    }
    throw new Error("Failed to parse groups.json");
  }
}

function exposeGroupsAsTools(groups: ToolGroup[]) {
  // This will be implemented in src/mcp/server.ts
  return groups.map((group) => createAgentTool(group));
}

function createAgentTool(group: ToolGroup) {
  // This will be implemented in src/mcp/server.ts
  return {
    name: `agent_${group.id}`,
    description: `Sub-agent for ${group.name}: ${group.description}`,
    inputSchema: {
      type: "object",
      properties: {
        agentId: {
          type: "string",
          description: "The ID of the sub-agent to invoke",
        },
        prompt: {
          type: "string",
          description: "The task prompt for the agent",
        },
      },
      required: ["agentId", "prompt"],
    },
  };
}

function routeRequest(request: AgentRequest, groups: ToolGroup[]) {
  // This will be implemented in src/agents/router.ts
  const found = groups.find((g) => g.id === request.agentId);
  return found || null;
}

function executeAgent(
  group: ToolGroup,
  request: AgentRequest,
): AgentResponse {
  // This will be implemented in src/agents/agent.ts
  if (group.tools.length === 0) {
    return {
      requestId: request.requestId,
      agentId: request.agentId,
      timestamp: new Date(),
      error: "No tools available in this group",
    };
  }

  return {
    requestId: request.requestId,
    agentId: request.agentId,
    result: "Mock execution result",
    toolsUsed: [],
    timestamp: new Date(),
  };
}

function handleToolsList(groups: ToolGroup[]) {
  // This will be implemented in src/mcp/server.ts
  return {
    tools: exposeGroupsAsTools(groups),
  };
}

function handleToolsCall(
  callRequest: { name: string; arguments: Record<string, unknown> },
  groups: ToolGroup[],
) {
  // This will be implemented in src/mcp/server.ts
  const agentId = callRequest.arguments.agentId as string;
  const group = groups.find((g) => `agent_${g.id}` === callRequest.name);

  if (!group) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Agent ${callRequest.name} not found`,
        },
      ],
      isError: true,
    };
  }

  const request: AgentRequest = {
    requestId: crypto.randomUUID(),
    agentId: agentId,
    prompt: callRequest.arguments.prompt as string,
    timestamp: new Date(),
  };

  const response = executeAgent(group, request);

  return {
    content: [
      {
        type: "text" as const,
        text: response.result || response.error || "No result",
      },
    ],
    isError: !!response.error,
  };
}
