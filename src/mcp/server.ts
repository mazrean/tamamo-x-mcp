/**
 * MCP server module
 * Exposes sub-agents as MCP tools
 */

import { Server } from "npm:@modelcontextprotocol/sdk@1.22.0/server/index.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.22.0/server/stdio.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "npm:@modelcontextprotocol/sdk@1.22.0/types.js";
import type {
  AgentRequest,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPToolsListResponse,
  SubAgent,
} from "../types/index.ts";
import { executeAgent } from "../agents/agent.ts";
import { routeRequest } from "../agents/router.ts";
import { discoverBedrockCredentials, discoverCredentials } from "../llm/credentials.ts";
import type { MCPClientRegistry } from "./registry.ts";

/**
 * MCP server interface
 */
export interface MCPServer {
  subAgents: SubAgent[];
  instructions?: string;
  registry?: MCPClientRegistry;
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
export function createMCPServer(
  subAgents: SubAgent[],
  instructions?: string,
  registry?: MCPClientRegistry,
): MCPServer {
  return {
    subAgents,
    instructions,
    registry,
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
        prompt: {
          type: "string",
          description: "The task prompt for the agent",
        },
        context: {
          type: "object",
          description: "Optional context for the agent",
        },
      },
      required: ["prompt"],
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
  if (!request.arguments.prompt) {
    return {
      content: [
        {
          type: "text",
          text: "Missing required argument: prompt is required",
        },
      ],
      isError: true,
    };
  }

  // Extract agent ID from tool name (format: agent_${agentId})
  const agentId = request.name.replace(/^agent_/, "");
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
    // Discover API key for the agent's LLM provider
    let apiKey: string | undefined;
    if (agent.llmProvider.type === "bedrock") {
      const bedrockCreds = await discoverBedrockCredentials();
      if (bedrockCreds) {
        apiKey = bedrockCreds.accessKeyId;
      }
    } else {
      apiKey = await discoverCredentials(agent.llmProvider.type) || undefined;
    }

    const response = await executeAgent(agent, agentRequest, { apiKey }, server.registry);

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
export async function startServer(mcpServer: MCPServer): Promise<boolean> {
  try {
    // Create MCP SDK Server instance
    const server = new Server(
      {
        name: "tamamo-x-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Register tools/list handler
    // deno-lint-ignore require-await
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: mcpServer.getTools(),
      };
    });

    // Register tools/call handler
    server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const params = request.params;

      // Validate arguments
      if (!params.arguments?.prompt) {
        return {
          content: [
            {
              type: "text",
              text: "Missing required argument: prompt is required",
            },
          ],
          isError: true,
        };
      }

      // Extract agent ID from tool name (format: agent_${agentId})
      const agentId = params.name.replace(/^agent_/, "");
      const agentRequest: AgentRequest = {
        requestId: crypto.randomUUID(),
        agentId,
        prompt: params.arguments.prompt as string,
        context: params.arguments.context as Record<string, unknown> | undefined,
        timestamp: new Date(),
      };

      const agent = routeRequest(agentRequest, mcpServer.subAgents);

      if (!agent) {
        return {
          content: [
            {
              type: "text",
              text: `Agent ${params.name} not found`,
            },
          ],
          isError: true,
        };
      }

      try {
        // Discover API key for the agent's LLM provider
        let apiKey: string | undefined;
        if (agent.llmProvider.type === "bedrock") {
          const bedrockCreds = await discoverBedrockCredentials();
          if (bedrockCreds) {
            apiKey = bedrockCreds.accessKeyId;
          }
        } else {
          apiKey = await discoverCredentials(agent.llmProvider.type) || undefined;
        }

        const response = await executeAgent(agent, agentRequest, { apiKey }, mcpServer.registry);

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
    });

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    // Server is now running and will handle requests via stdio
    // The transport will keep the process alive
    return true;
  } catch (error) {
    console.error(
      `Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
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
