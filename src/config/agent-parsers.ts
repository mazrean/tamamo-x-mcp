/**
 * Configuration parsers for various coding agents
 */

import type { CodingAgent } from "./agent-detector.ts";
import type { LLMProviderConfig, LLMProviderType, MCPServerConfig } from "../types/index.ts";

/**
 * Convert env object values to strings (TOML may parse numbers/bools)
 */
export function normalizeEnv(env: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    normalized[key] = String(value);
  }
  return normalized;
}

/**
 * Extracted MCP configuration from a coding agent
 */
export interface AgentMCPConfig {
  mcpServers: MCPServerConfig[];
  llmProvider?: Partial<LLMProviderConfig>;
}

/**
 * Parse Claude Code configuration
 * Format: JSON with mcpServers object
 */
function parseClaudeCodeConfig(content: string): AgentMCPConfig {
  const config = JSON.parse(content);
  const mcpServers: MCPServerConfig[] = [];

  // Claude Code format: { "mcpServers": { "server-name": { "command": "...", "args": [...] } } }
  if (config.mcpServers && typeof config.mcpServers === "object") {
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      const server = serverConfig as Record<string, unknown>;

      // Skip if command is missing (required for stdio transport)
      if (typeof server.command !== "string") {
        console.warn(`Skipping ${name}: command is required for stdio transport`);
        continue;
      }

      const mcpServer: MCPServerConfig = {
        name,
        transport: "stdio", // Claude Code uses stdio by default
        command: server.command,
      };

      if (Array.isArray(server.args)) {
        mcpServer.args = server.args as string[];
      }

      if (server.env && typeof server.env === "object") {
        mcpServer.env = server.env as Record<string, string>;
      }

      mcpServers.push(mcpServer);
    }
  }

  // Claude Code typically uses Anthropic
  const llmProvider: Partial<LLMProviderConfig> = {
    type: "anthropic" as LLMProviderType,
  };

  return { mcpServers, llmProvider };
}

/**
 * Parse Gemini CLI configuration
 * Format: JSON with mcpServers array or object
 */
function parseGeminiConfig(content: string): AgentMCPConfig {
  const config = JSON.parse(content);
  const mcpServers: MCPServerConfig[] = [];

  // Gemini CLI format: similar to Claude Code
  if (config.mcpServers) {
    if (typeof config.mcpServers === "object" && !Array.isArray(config.mcpServers)) {
      // Object format: { "server-name": { ... } }
      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        const server = serverConfig as Record<string, unknown>;

        // Skip if command is missing
        if (typeof server.command !== "string") {
          console.warn(`Skipping ${name}: command is required for stdio transport`);
          continue;
        }

        const mcpServer: MCPServerConfig = {
          name,
          transport: "stdio",
          command: server.command,
        };

        if (Array.isArray(server.args)) {
          mcpServer.args = server.args as string[];
        }

        if (server.env && typeof server.env === "object") {
          mcpServer.env = server.env as Record<string, string>;
        }

        mcpServers.push(mcpServer);
      }
    } else if (Array.isArray(config.mcpServers)) {
      // Array format: [{ "name": "...", ... }]
      for (const server of config.mcpServers) {
        if (typeof server.name !== "string") continue;

        // Skip if command is missing
        if (typeof server.command !== "string") {
          console.warn(`Skipping ${server.name}: command is required for stdio transport`);
          continue;
        }

        const mcpServer: MCPServerConfig = {
          name: server.name,
          transport: "stdio",
          command: server.command,
        };

        if (Array.isArray(server.args)) {
          mcpServer.args = server.args as string[];
        }

        if (server.env && typeof server.env === "object") {
          mcpServer.env = server.env as Record<string, string>;
        }

        mcpServers.push(mcpServer);
      }
    }
  }

  // Gemini CLI uses Gemini
  const llmProvider: Partial<LLMProviderConfig> = {
    type: "gemini" as LLMProviderType,
  };

  return { mcpServers, llmProvider };
}

/**
 * Parse Cursor configuration
 * Format: JSON with mcpServers object
 */
function parseCursorConfig(content: string): AgentMCPConfig {
  const config = JSON.parse(content);
  const mcpServers: MCPServerConfig[] = [];

  // Cursor format: similar to Claude Code
  if (config.mcpServers && typeof config.mcpServers === "object") {
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      const server = serverConfig as Record<string, unknown>;

      // Skip if command is missing
      if (typeof server.command !== "string") {
        console.warn(`Skipping ${name}: command is required for stdio transport`);
        continue;
      }

      const mcpServer: MCPServerConfig = {
        name,
        transport: "stdio",
        command: server.command,
      };

      if (Array.isArray(server.args)) {
        mcpServer.args = server.args as string[];
      }

      if (server.env && typeof server.env === "object") {
        mcpServer.env = server.env as Record<string, string>;
      }

      mcpServers.push(mcpServer);
    }
  }

  // Cursor can use various providers, but we'll default to OpenAI
  const llmProvider: Partial<LLMProviderConfig> = {
    type: "openai" as LLMProviderType,
  };

  return { mcpServers, llmProvider };
}

/**
 * Parse agent configuration file and extract MCP servers and LLM provider info
 */
export async function parseAgentConfig(
  agent: CodingAgent,
  configPath: string,
): Promise<AgentMCPConfig> {
  try {
    const content = await Deno.readTextFile(configPath);

    switch (agent) {
      case "claude-code":
        return parseClaudeCodeConfig(content);
      case "gemini-cli":
        return parseGeminiConfig(content);
      case "cursor":
        return parseCursorConfig(content);
      default:
        throw new Error(`Unknown coding agent: ${agent}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to parse ${agent} config at ${configPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Normalize server names to avoid conflicts
 * Adds agent prefix to server names (e.g., "git" -> "claude-code:git")
 */
export function normalizeServerNames(
  mcpServers: MCPServerConfig[],
  agent: CodingAgent,
): MCPServerConfig[] {
  return mcpServers.map((server) => ({
    ...server,
    name: `${agent}:${server.name}`,
  }));
}
