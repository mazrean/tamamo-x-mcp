/**
 * Write tamamo-x-mcp configuration to coding agent config files
 */

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
 * Add tamamo-x-mcp to Claude Code configuration
 * @param preserveServers - If true, preserve existing servers. If false (default), replace all servers with tamamo-x-mcp only
 */
async function addToClaudeCode(configPath: string, preserveServers = false): Promise<void> {
  let config: Record<string, unknown>;

  try {
    const content = await Deno.readTextFile(configPath);
    config = JSON.parse(content);
  } catch {
    // If file doesn't exist or is invalid, start fresh
    config = {};
  }

  // Replace or preserve existing servers
  if (preserveServers) {
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

  // Write back
  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Add tamamo-x-mcp to Codex configuration
 * @param preserveServers - If true, preserve existing servers. If false (default), replace all servers with tamamo-x-mcp only
 */
async function addToCodex(configPath: string, preserveServers = false): Promise<void> {
  let config: Record<string, unknown>;

  try {
    const content = await Deno.readTextFile(configPath);
    config = JSON.parse(content);
  } catch {
    // Start fresh
    config = {};
  }

  // Replace or preserve existing servers
  if (preserveServers) {
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

  // Write back
  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Add tamamo-x-mcp to Gemini CLI configuration
 * @param preserveServers - If true, preserve existing servers. If false (default), replace all servers with tamamo-x-mcp only
 */
async function addToGeminiCLI(configPath: string, preserveServers = false): Promise<void> {
  let config: Record<string, unknown>;

  try {
    const content = await Deno.readTextFile(configPath);
    config = JSON.parse(content);
  } catch {
    config = {};
  }

  // Replace or preserve existing servers
  if (preserveServers) {
    // Ensure mcpServers object exists
    if (
      !config.mcpServers || typeof config.mcpServers !== "object" ||
      Array.isArray(config.mcpServers)
    ) {
      config.mcpServers = {};
    }

    const mcpServers = config.mcpServers as Record<string, unknown>;

    if (!mcpServers["tamamo-x-mcp"]) {
      mcpServers["tamamo-x-mcp"] = getTamamoXMCPServerConfig();
    }
  } else {
    // Replace all servers with only tamamo-x-mcp
    config.mcpServers = {
      "tamamo-x-mcp": getTamamoXMCPServerConfig(),
    };
  }

  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Add tamamo-x-mcp to Cursor configuration
 * @param preserveServers - If true, preserve existing servers. If false (default), replace all servers with tamamo-x-mcp only
 */
async function addToCursor(configPath: string, preserveServers = false): Promise<void> {
  let config: Record<string, unknown>;

  try {
    const content = await Deno.readTextFile(configPath);
    config = JSON.parse(content);
  } catch {
    config = {};
  }

  // Replace or preserve existing servers
  if (preserveServers) {
    if (
      !config.mcpServers || typeof config.mcpServers !== "object" ||
      Array.isArray(config.mcpServers)
    ) {
      config.mcpServers = {};
    }

    const mcpServers = config.mcpServers as Record<string, unknown>;

    if (!mcpServers["tamamo-x-mcp"]) {
      mcpServers["tamamo-x-mcp"] = getTamamoXMCPServerConfig();
    }
  } else {
    // Replace all servers with only tamamo-x-mcp
    config.mcpServers = {
      "tamamo-x-mcp": getTamamoXMCPServerConfig(),
    };
  }

  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Add tamamo-x-mcp to Windsurf configuration
 * @param preserveServers - If true, preserve existing servers. If false (default), replace all servers with tamamo-x-mcp only
 */
async function addToWindsurf(configPath: string, preserveServers = false): Promise<void> {
  let config: Record<string, unknown>;

  try {
    const content = await Deno.readTextFile(configPath);
    config = JSON.parse(content);
  } catch {
    config = {};
  }

  // Replace or preserve existing servers
  if (preserveServers) {
    if (
      !config.mcpServers || typeof config.mcpServers !== "object" ||
      Array.isArray(config.mcpServers)
    ) {
      config.mcpServers = {};
    }

    const mcpServers = config.mcpServers as Record<string, unknown>;

    if (!mcpServers["tamamo-x-mcp"]) {
      mcpServers["tamamo-x-mcp"] = getTamamoXMCPServerConfig();
    }
  } else {
    // Replace all servers with only tamamo-x-mcp
    config.mcpServers = {
      "tamamo-x-mcp": getTamamoXMCPServerConfig(),
    };
  }

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
  const parentDir = configPath.substring(0, configPath.lastIndexOf("/"));
  try {
    await Deno.mkdir(parentDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  switch (agent) {
    case "claude-code":
      await addToClaudeCode(configPath, preserveServers);
      break;
    case "codex":
      await addToCodex(configPath, preserveServers);
      break;
    case "gemini-cli":
      await addToGeminiCLI(configPath, preserveServers);
      break;
    case "cursor":
      await addToCursor(configPath, preserveServers);
      break;
    case "windsurf":
      await addToWindsurf(configPath, preserveServers);
      break;
    default:
      throw new Error(`Unknown coding agent: ${agent}`);
  }
}
