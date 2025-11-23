/**
 * Write tamamo-x-mcp configuration to coding agent config files
 */

import { dirname } from "jsr:@std/path@^1.0.0";
import type { CodingAgent } from "./agent-detector.ts";

/**
 * tamamo-x-mcp MCP server configuration template
 */
function getTamamoXMCPServerConfig() {
  return {
    command: "tamamo-x-mcp",
    args: ["mcp"],
    env: {},
  };
}

/**
 * Configuration handler for different agent types
 */
interface AgentConfigHandler {
  supportArrayFormat?: boolean;
}

/**
 * Agent-specific configuration handlers
 */
const agentHandlers: Record<CodingAgent, AgentConfigHandler> = {
  "claude-code": { supportArrayFormat: true },
  "gemini-cli": {},
  "cursor": {},
};

/**
 * Generic function to add tamamo-x-mcp to any agent configuration
 * @param agent - The coding agent type
 * @param configPath - Path to the configuration file
 * @param preserveServers - If true, preserve existing servers. If false (default), replace all servers with tamamo-x-mcp only
 */
async function addToAgentConfig(
  agent: CodingAgent,
  configPath: string,
  preserveServers = false,
): Promise<void> {
  const handler = agentHandlers[agent];
  if (!handler) {
    throw new Error(`Unknown coding agent: ${agent}`);
  }
  let config: Record<string, unknown>;

  // Read and parse configuration
  try {
    const content = await Deno.readTextFile(configPath);
    config = JSON.parse(content);
  } catch {
    // Start fresh if file doesn't exist or parsing fails
    config = {};
  }

  // Process servers based on preserveServers flag
  if (preserveServers) {
    // Handle array format by converting to object format
    if (handler.supportArrayFormat && Array.isArray(config.mcpServers)) {
      const serversArray = config.mcpServers as Array<Record<string, unknown>>;
      const serversObject: Record<string, unknown> = {};

      // Convert array to object using 'name' field as key
      for (const server of serversArray) {
        if (server.name && typeof server.name === "string") {
          serversObject[server.name] = server;
        }
      }

      config.mcpServers = serversObject;
    }

    // Ensure mcpServers object exists
    if (
      !config.mcpServers || typeof config.mcpServers !== "object" ||
      Array.isArray(config.mcpServers)
    ) {
      config.mcpServers = {};
    }

    const mcpServers = config.mcpServers as Record<string, unknown>;

    // Add tamamo-x-mcp if not already present
    if (!mcpServers["tamamo-x-mcp"]) {
      mcpServers["tamamo-x-mcp"] = getTamamoXMCPServerConfig();
    }
  } else {
    // Replace all servers with only tamamo-x-mcp
    config.mcpServers = {
      "tamamo-x-mcp": getTamamoXMCPServerConfig(),
    };
  }

  // Write back (always write as JSON)
  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Add tamamo-x-mcp MCP server to a coding agent's configuration file
 * @param preserveServers - If true, preserve existing servers. If false (default), replace all servers with tamamo-x-mcp only
 */
export async function addTamamoXToAgent(
  agent: CodingAgent,
  configPath: string,
  preserveServers = false,
): Promise<void> {
  // Ensure parent directory exists
  const parentDir = dirname(configPath);
  try {
    await Deno.mkdir(parentDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  // Use the generic configuration handler
  await addToAgentConfig(agent, configPath, preserveServers);
}
