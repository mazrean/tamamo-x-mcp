/**
 * Configuration parsers for various coding agents
 */

import { parse as parseToml } from "jsr:@std/toml@^1.0.0";
import type { CodingAgent } from "./agent-detector.ts";
import type { LLMProviderConfig, LLMProviderType, MCPServerConfig } from "../types/index.ts";

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
    credentialSource: "cli-tool",
  };

  return { mcpServers, llmProvider };
}

/**
 * Parse Codex configuration
 * Format: TOML with [[mcp.servers]] array
 */
function parseCodexConfig(content: string): AgentMCPConfig {
  const config = parseToml(content) as Record<string, unknown>;
  const mcpServers: MCPServerConfig[] = [];

  // Codex format: [[mcp.servers]]
  if (config.mcp && typeof config.mcp === "object") {
    const mcpSection = config.mcp as Record<string, unknown>;
    if (Array.isArray(mcpSection.servers)) {
      for (const server of mcpSection.servers) {
        const s = server as Record<string, unknown>;

        if (typeof s.name !== "string") continue;

        // Skip if command is missing (required for stdio transport)
        if (typeof s.command !== "string") {
          console.warn(`Skipping ${s.name}: command is required for stdio transport`);
          continue;
        }

        const mcpServer: MCPServerConfig = {
          name: s.name,
          transport: "stdio", // Codex primarily uses stdio
          command: s.command,
        };

        if (Array.isArray(s.args)) {
          mcpServer.args = s.args as string[];
        }

        if (s.env && typeof s.env === "object") {
          mcpServer.env = s.env as Record<string, string>;
        }

        mcpServers.push(mcpServer);
      }
    }
  }

  // Try to detect LLM provider from Codex config
  let llmProvider: Partial<LLMProviderConfig> | undefined;
  if (config.llm && typeof config.llm === "object") {
    const llmSection = config.llm as Record<string, unknown>;
    if (typeof llmSection.provider === "string") {
      const providerMap: Record<string, LLMProviderType> = {
        "openai": "openai",
        "anthropic": "anthropic",
        "gemini": "gemini",
      };

      const providerType = providerMap[llmSection.provider.toLowerCase()];
      if (providerType) {
        llmProvider = {
          type: providerType,
          credentialSource: "cli-tool",
        };

        if (llmProvider && typeof llmSection.model === "string") {
          llmProvider.model = llmSection.model;
        }
      }
    }
  }

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
    credentialSource: "env-var",
  };

  return { mcpServers, llmProvider };
}

/**
 * Parse Windsurf configuration
 * Format: JSON with mcpServers object
 */
function parseWindsurfConfig(content: string): AgentMCPConfig {
  const config = JSON.parse(content);
  const mcpServers: MCPServerConfig[] = [];

  // Windsurf format: similar to Claude Code
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

  // Windsurf uses various providers
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
      case "codex":
        return parseCodexConfig(content);
      case "gemini-cli":
        return parseGeminiConfig(content);
      case "cursor":
        return parseCursorConfig(content);
      case "windsurf":
        return parseWindsurfConfig(content);
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
