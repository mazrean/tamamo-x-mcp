/**
 * MCP server module
 * Exposes sub-agents as MCP tools
 */

import type {
  SubAgent,
  MCPToolsListResponse,
  MCPToolCallRequest,
  MCPToolCallResponse,
} from "../types/index.ts";

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
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

/**
 * Create an MCP server with sub-agents
 */
export function createMCPServer(_subAgents: SubAgent[]): MCPServer {
  throw new Error("Not implemented: createMCPServer");
}

/**
 * Create an MCP tool from a sub-agent
 */
export function createAgentTool(_subAgent: SubAgent): MCPAgentTool {
  throw new Error("Not implemented: createAgentTool");
}

/**
 * Handle tools/list request
 */
export function handleToolsList(_server: MCPServer): MCPToolsListResponse {
  throw new Error("Not implemented: handleToolsList");
}

/**
 * Handle tools/call request
 */
// deno-lint-ignore require-await
export async function handleToolsCall(
  _server: MCPServer,
  _request: MCPToolCallRequest,
): Promise<MCPToolCallResponse> {
  throw new Error("Not implemented: handleToolsCall");
}

/**
 * Start the MCP server
 */
// deno-lint-ignore require-await
export async function startServer(_server: MCPServer): Promise<boolean> {
  throw new Error("Not implemented: startServer");
}

/**
 * Stop the MCP server
 */
// deno-lint-ignore require-await
export async function stopServer(_server: MCPServer): Promise<boolean> {
  throw new Error("Not implemented: stopServer");
}
