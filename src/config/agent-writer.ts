/**
 * Write tamamo-x-mcp configuration to coding agent config files
 */

import { dirname } from "jsr:@std/path@^1.0.0";
import { parse as parseToml } from "jsr:@std/toml@^1.0.0";
import type { CodingAgent } from "./agent-detector.ts";
import { normalizeEnv } from "./agent-parsers.ts";

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
  supportToml?: boolean;
  supportArrayFormat?: boolean;
}

/**
 * Agent-specific configuration handlers
 */
const agentHandlers: Record<CodingAgent, AgentConfigHandler> = {
  "claude-code": { supportArrayFormat: true },
  "codex": { supportToml: true },
  "gemini-cli": {},
  "cursor": {},
  "windsurf": {},
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
  let config: Record<string, unknown>;

  // Read and parse configuration
  try {
    const content = await Deno.readTextFile(configPath);

    // For agents that support TOML: try JSON first (newer format), fall back to TOML (legacy)
    // For agents that don't support TOML: only try JSON
    if (handler.supportToml) {
      try {
        config = JSON.parse(content);
      } catch {
        config = parseToml(content) as Record<string, unknown>;
      }
    } else {
      config = JSON.parse(content);
    }
  } catch {
    // Start fresh if file doesn't exist or parsing fails
    config = {};
  }

  // Process servers based on preserveServers flag
  if (preserveServers) {
    // Convert TOML format to JSON format if needed
    if (handler.supportToml && config.mcp && typeof config.mcp === "object") {
      const mcpSection = config.mcp as Record<string, unknown>;
      if (Array.isArray(mcpSection.servers)) {
        // Convert TOML [[mcp.servers]] to JSON object format
        const serversObject: Record<string, unknown> = {};
        for (const server of mcpSection.servers) {
          const s = server as Record<string, unknown>;
          if (s.name && typeof s.name === "string") {
            // Normalize env values to strings (TOML may have numbers/bools)
            if (s.env && typeof s.env === "object") {
              s.env = normalizeEnv(s.env as Record<string, unknown>);
            }
            serversObject[s.name] = s;
          }
        }
        config.mcpServers = serversObject;
        // Remove only the servers field, preserve other mcp.* settings
        delete mcpSection.servers;
      }
    }

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
    // Remove only the servers field from TOML structure, preserve other mcp.* settings
    if (handler.supportToml && config.mcp && typeof config.mcp === "object") {
      const mcpSection = config.mcp as Record<string, unknown>;
      delete mcpSection.servers;
    }
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
