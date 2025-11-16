/**
 * MCP server module
 * Exposes sub-agents as MCP tools
 */

import type {
  AgentRequest,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPToolsListResponse,
  SubAgent,
} from "../types/index.ts";
import { executeAgent } from "../agents/agent.ts";
import { routeRequest } from "../agents/router.ts";

/**
 * MCP server interface
 */
export interface MCPServer {
  subAgents: SubAgent[];
  getTools: () => MCPAgentTool[];
}

/**
 * MCP agent tool interface
 */
export interface MCPAgentTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

/**
 * Create an MCP server with sub-agents
 */
export function createMCPServer(subAgents: SubAgent[]): MCPServer {
  return {
    subAgents,
    getTools: () => subAgents.map((agent) => createAgentTool(agent)),
  };
}

/**
 * Create an MCP tool from a sub-agent
 */
export function createAgentTool(subAgent: SubAgent): MCPAgentTool {
  return {
    name: `agent_${subAgent.id}`,
    description: `Sub-agent for ${subAgent.name}: ${subAgent.description}`,
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
        context: {
          type: "object",
          description: "Optional context for the agent",
        },
      },
      required: ["agentId", "prompt"],
    },
  };
}

/**
 * Handle tools/list request
 */
export function handleToolsList(server: MCPServer): MCPToolsListResponse {
  return {
    tools: server.getTools(),
  };
}

/**
 * Handle tools/call request
 */
export async function handleToolsCall(
  server: MCPServer,
  request: MCPToolCallRequest,
): Promise<MCPToolCallResponse> {
  // Validate arguments
  if (!request.arguments.agentId || !request.arguments.prompt) {
    return {
      content: [
        {
          type: "text",
          text: "Missing required arguments: agentId and prompt are required",
        },
      ],
      isError: true,
    };
  }

  // Find sub-agent by tool name
  const agentId = (request.arguments.agentId as string).replace(/^agent_/, "");
  const agentRequest: AgentRequest = {
    requestId: crypto.randomUUID(),
    agentId,
    prompt: request.arguments.prompt as string,
    context: request.arguments.context as Record<string, unknown> | undefined,
    timestamp: new Date(),
  };

  const agent = routeRequest(agentRequest, server.subAgents);

  if (!agent) {
    return {
      content: [
        {
          type: "text",
          text: `Agent ${request.name} not found`,
        },
      ],
      isError: true,
    };
  }

  try {
    const response = await executeAgent(agent, agentRequest);

    if (response.error) {
      return {
        content: [
          {
            type: "text",
            text: response.error,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: response.result || "No result",
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: error instanceof Error ? error.message : "Unknown error",
        },
      ],
      isError: true,
    };
  }
}

/**
 * Start the MCP server
 */
// deno-lint-ignore require-await
export async function startServer(_server: MCPServer): Promise<boolean> {
  // In real implementation, this would:
  // 1. Initialize MCP server with stdio/http transport
  // 2. Register handlers for tools/list and tools/call
  // 3. Start listening for connections
  // For now, return true for testing
  return true;
}

/**
 * Stop the MCP server
 */
// deno-lint-ignore require-await
export async function stopServer(_server: MCPServer): Promise<boolean> {
  // In real implementation, this would:
  // 1. Close all active connections
  // 2. Clean up resources
  // 3. Stop listening for new connections
  // For now, return true for testing
  return true;
}
