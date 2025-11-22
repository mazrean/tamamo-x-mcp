/**
 * MCP Tool Discovery
 * Discovers and parses tools from MCP servers
 *
 * Reference: plan.md § Phase 3 (User Story 1 - Tool Discovery)
 * Reference: data-model.md § 6 (Tool entity)
 */

import { MCPClient } from "./client.ts";
import type { MCPServerConfig, Tool } from "../types/index.ts";

/**
 * Extract and validate tool metadata from MCP tool response
 * @param tool Raw MCP tool response
 * @param serverName Source MCP server name
 * @returns Validated Tool entity
 * @throws Error if required fields are missing or invalid
 */
export function extractToolMetadata(
  tool: {
    name: string;
    description?: string;
    inputSchema: unknown;
    category?: string;
  },
  serverName: string,
): Tool {
  // Validate required fields
  if (!tool.name || typeof tool.name !== "string") {
    throw new Error("Tool name is required and must be a string");
  }

  if (!tool.description || typeof tool.description !== "string") {
    throw new Error("Tool description is required and must be a string");
  }

  if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
    throw new Error("Tool inputSchema is required and must be an object");
  }

  // Basic JSON Schema validation
  const schema = tool.inputSchema as Record<string, unknown>;
  if (!schema.type || typeof schema.type !== "string") {
    throw new Error("inputSchema must have a valid 'type' field");
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema as Tool["inputSchema"],
    serverName,
    category: tool.category,
  };
}

/**
 * Parse tools from MCP tools/list response
 * @param response MCP tools/list response containing tools array
 * @param serverName Source MCP server name
 * @returns Array of validated Tool entities
 */
export function parseTools(
  response: { tools: unknown[] },
  serverName: string,
): Tool[] {
  if (!Array.isArray(response.tools)) {
    throw new Error("Response must contain a 'tools' array");
  }

  return response.tools.map((tool) => extractToolMetadata(tool as never, serverName));
}

/**
 * Discover tools from a single MCP server
 * @param serverConfig MCP server configuration
 * @returns Array of discovered tools, or empty array on failure
 */
async function discoverToolsFromServer(
  serverConfig: MCPServerConfig,
): Promise<Tool[]> {
  const client = new MCPClient(serverConfig);

  try {
    await client.connect();
    const toolsResponse = await client.listTools();

    // Parse the tools response
    const tools = parseTools({ tools: toolsResponse }, serverConfig.name);

    return tools;
  } catch (error) {
    // Log error but don't throw - graceful degradation
    console.error(
      `Failed to discover tools from ${serverConfig.name}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    return [];
  } finally {
    // Always attempt cleanup, never let disconnect errors propagate
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors - graceful degradation
    }
  }
}

/**
 * Discover tools from multiple MCP servers in parallel
 * Handles server connection failures gracefully by continuing with available servers
 * @param serverConfigs Array of MCP server configurations
 * @returns Combined array of all discovered tools from all servers
 */
export async function discoverAllTools(
  serverConfigs: MCPServerConfig[],
): Promise<Tool[]> {
  if (!Array.isArray(serverConfigs) || serverConfigs.length === 0) {
    return [];
  }

  // Discover tools from all servers in parallel using Promise.all
  const toolsArrays = await Promise.all(
    serverConfigs.map((config) => discoverToolsFromServer(config)),
  );

  // Flatten arrays and return all tools
  // Note: We do NOT deduplicate tools with the same name from different servers
  // Each tool keeps its serverName to distinguish them
  return toolsArrays.flat();
}
