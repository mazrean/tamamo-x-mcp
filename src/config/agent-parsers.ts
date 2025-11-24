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

      // Determine transport type and create appropriate server config
      let mcpServer: MCPServerConfig;

      if (server.url && typeof server.url === "string") {
        // HTTP/WebSocket transport
        if (server.url.startsWith("ws://") || server.url.startsWith("wss://")) {
          // WebSocket transport
          mcpServer = {
            name,
            transport: "websocket",
            url: server.url,
            command: typeof server.command === "string" ? server.command : undefined,
            args: Array.isArray(server.args) ? server.args as string[] : undefined,
            env: server.env && typeof server.env === "object"
              ? server.env as Record<string, string>
              : undefined,
          };
        } else {
          // HTTP transport
          mcpServer = {
            name,
            transport: "http",
            url: server.url,
            command: typeof server.command === "string" ? server.command : undefined,
            args: Array.isArray(server.args) ? server.args as string[] : undefined,
            env: server.env && typeof server.env === "object"
              ? server.env as Record<string, string>
              : undefined,
          };
        }
      } else if (typeof server.command === "string") {
        // stdio transport
        mcpServer = {
          name,
          transport: "stdio",
          command: server.command,
          args: Array.isArray(server.args) ? server.args as string[] : undefined,
          env: server.env && typeof server.env === "object"
            ? server.env as Record<string, string>
            : undefined,
        };
      } else {
        // Skip if neither url nor command is provided
        console.warn(`Skipping ${name}: either url or command must be provided`);
        continue;
      }

      mcpServers.push(mcpServer);
    }
  }

  // Claude Code typically uses Anthropic
  const llmProvider: Partial<LLMProviderConfig> = {
    type: "anthropic" as LLMProviderType,
    credentialSource: "cli-tool",
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

        // Determine transport type and create appropriate server config
        let mcpServer: MCPServerConfig;

        if (server.url && typeof server.url === "string") {
          // HTTP/WebSocket transport
          if (server.url.startsWith("ws://") || server.url.startsWith("wss://")) {
            // WebSocket transport
            mcpServer = {
              name,
              transport: "websocket",
              url: server.url,
              command: typeof server.command === "string" ? server.command : undefined,
              args: Array.isArray(server.args) ? server.args as string[] : undefined,
              env: server.env && typeof server.env === "object"
                ? server.env as Record<string, string>
                : undefined,
            };
          } else {
            // HTTP transport
            mcpServer = {
              name,
              transport: "http",
              url: server.url,
              command: typeof server.command === "string" ? server.command : undefined,
              args: Array.isArray(server.args) ? server.args as string[] : undefined,
              env: server.env && typeof server.env === "object"
                ? server.env as Record<string, string>
                : undefined,
            };
          }
        } else if (typeof server.command === "string") {
          // stdio transport
          mcpServer = {
            name,
            transport: "stdio",
            command: server.command,
            args: Array.isArray(server.args) ? server.args as string[] : undefined,
            env: server.env && typeof server.env === "object"
              ? server.env as Record<string, string>
              : undefined,
          };
        } else {
          // Skip if neither url nor command is provided
          console.warn(`Skipping ${name}: either url or command must be provided`);
          continue;
        }

        mcpServers.push(mcpServer);
      }
    } else if (Array.isArray(config.mcpServers)) {
      // Array format: [{ "name": "...", ... }]
      for (const server of config.mcpServers) {
        if (typeof server.name !== "string") continue;

        // Determine transport type and create appropriate server config
        let mcpServer: MCPServerConfig;

        if (server.url && typeof server.url === "string") {
          // HTTP/WebSocket transport
          if (server.url.startsWith("ws://") || server.url.startsWith("wss://")) {
            // WebSocket transport
            mcpServer = {
              name: server.name,
              transport: "websocket",
              url: server.url,
              command: typeof server.command === "string" ? server.command : undefined,
              args: Array.isArray(server.args) ? server.args as string[] : undefined,
              env: server.env && typeof server.env === "object"
                ? server.env as Record<string, string>
                : undefined,
            };
          } else {
            // HTTP transport
            mcpServer = {
              name: server.name,
              transport: "http",
              url: server.url,
              command: typeof server.command === "string" ? server.command : undefined,
              args: Array.isArray(server.args) ? server.args as string[] : undefined,
              env: server.env && typeof server.env === "object"
                ? server.env as Record<string, string>
                : undefined,
            };
          }
        } else if (typeof server.command === "string") {
          // stdio transport
          mcpServer = {
            name: server.name,
            transport: "stdio",
            command: server.command,
            args: Array.isArray(server.args) ? server.args as string[] : undefined,
            env: server.env && typeof server.env === "object"
              ? server.env as Record<string, string>
              : undefined,
          };
        } else {
          // Skip if neither url nor command is provided
          console.warn(`Skipping ${server.name}: either url or command must be provided`);
          continue;
        }

        mcpServers.push(mcpServer);
      }
    }
  }

  // Gemini CLI uses Gemini
  const llmProvider: Partial<LLMProviderConfig> = {
    type: "gemini" as LLMProviderType,
    credentialSource: "cli-tool",
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

      // Determine transport type and create appropriate server config
      let mcpServer: MCPServerConfig;

      if (server.url && typeof server.url === "string") {
        // HTTP/WebSocket transport
        if (server.url.startsWith("ws://") || server.url.startsWith("wss://")) {
          // WebSocket transport
          mcpServer = {
            name,
            transport: "websocket",
            url: server.url,
            command: typeof server.command === "string" ? server.command : undefined,
            args: Array.isArray(server.args) ? server.args as string[] : undefined,
            env: server.env && typeof server.env === "object"
              ? server.env as Record<string, string>
              : undefined,
          };
        } else {
          // HTTP transport
          mcpServer = {
            name,
            transport: "http",
            url: server.url,
            command: typeof server.command === "string" ? server.command : undefined,
            args: Array.isArray(server.args) ? server.args as string[] : undefined,
            env: server.env && typeof server.env === "object"
              ? server.env as Record<string, string>
              : undefined,
          };
        }
      } else if (typeof server.command === "string") {
        // stdio transport
        mcpServer = {
          name,
          transport: "stdio",
          command: server.command,
          args: Array.isArray(server.args) ? server.args as string[] : undefined,
          env: server.env && typeof server.env === "object"
            ? server.env as Record<string, string>
            : undefined,
        };
      } else {
        // Skip if neither url nor command is provided
        console.warn(`Skipping ${name}: either url or command must be provided`);
        continue;
      }

      mcpServers.push(mcpServer);
    }
  }

  // Cursor can use various providers, but we'll default to OpenAI
  const llmProvider: Partial<LLMProviderConfig> = {
    type: "openai" as LLMProviderType,
    credentialSource: "env-var",
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
