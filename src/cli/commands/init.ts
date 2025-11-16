/**
 * Init command implementation
 * Creates tamamo-x.config.json with default or imported settings
 *
 * Reference: plan.md § Phase 3 (User Story 1 - Initialize Configuration)
 * Reference: quickstart.md § Step 1 (Initialize Configuration)
 */

import { join } from "jsr:@std/path@^1.0.0";
import { saveConfig } from "../../config/loader.ts";
import { validateConfig } from "../../config/validator.ts";
import type { Configuration, MCPServerConfig } from "../../types/index.ts";

/**
 * Check if a file exists at the given path
 * @throws {Error} If there's a real I/O error (permissions, etc.)
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    // Only catch NotFound errors - let real errors propagate
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

/**
 * Import MCP server configurations from .mcp.json if present
 * .mcp.json format: { "mcpServers": { "server-name": { "command": "...", "args": [...] } } }
 */
async function importMCPServers(projectRoot: string): Promise<MCPServerConfig[]> {
  const mcpJsonPath = join(projectRoot, ".mcp.json");

  if (!await fileExists(mcpJsonPath)) {
    return [];
  }

  try {
    const content = await Deno.readTextFile(mcpJsonPath);
    const mcpJson = JSON.parse(content);

    if (!mcpJson.mcpServers || typeof mcpJson.mcpServers !== "object") {
      console.warn(".mcp.json found but mcpServers is missing or invalid");
      return [];
    }

    const servers: MCPServerConfig[] = [];

    for (const [name, config] of Object.entries(mcpJson.mcpServers)) {
      const serverConfig = config as {
        command?: string;
        args?: string[];
        url?: string;
        env?: Record<string, string>;
      };

      // Determine transport type based on what's provided
      let transport: "stdio" | "http" | "websocket" = "stdio";
      if (serverConfig.url) {
        // Validate URL is a string before calling string methods
        if (typeof serverConfig.url !== "string") {
          console.warn(`Skipping server '${name}': url must be a string`);
          continue;
        }

        if (serverConfig.url.startsWith("ws://") || serverConfig.url.startsWith("wss://")) {
          transport = "websocket";
        } else {
          transport = "http";
        }
      }

      const server: MCPServerConfig = {
        name,
        transport,
      };

      if (transport === "stdio") {
        // Validate command is a string
        if (!serverConfig.command || typeof serverConfig.command !== "string") {
          console.warn(`Skipping server '${name}': command must be a non-empty string`);
          continue;
        }
        server.command = serverConfig.command;
        server.args = serverConfig.args;
        server.env = serverConfig.env;
      } else {
        // Validate URL is a string
        if (!serverConfig.url || typeof serverConfig.url !== "string") {
          console.warn(`Skipping server '${name}': url must be a non-empty string`);
          continue;
        }
        server.url = serverConfig.url;
      }

      servers.push(server);
    }

    return servers;
  } catch (error) {
    console.warn(
      `Failed to import .mcp.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * Detect project context files (Agent.md, CLAUDE.md)
 */
async function detectProjectContext(projectRoot: string) {
  const agentMdPath = join(projectRoot, "Agent.md");
  const claudeMdPath = join(projectRoot, "CLAUDE.md");

  const hasAgentMd = await fileExists(agentMdPath);
  const hasCLAUDEMd = await fileExists(claudeMdPath);

  if (!hasAgentMd && !hasCLAUDEMd) {
    return undefined;
  }

  return {
    agentFilePath: hasAgentMd ? "Agent.md" : undefined,
    claudeFilePath: hasCLAUDEMd ? "CLAUDE.md" : undefined,
  };
}

/**
 * Initialize tamamo-x-mcp configuration
 * @param options Initialization options
 * @param options.projectRoot Project root directory (defaults to current directory)
 */
export async function init(options: { projectRoot?: string } = {}): Promise<void> {
  const projectRoot = options.projectRoot || Deno.cwd();
  const configPath = join(projectRoot, "tamamo-x.config.json");

  // Check if config already exists
  if (await fileExists(configPath)) {
    console.log("tamamo-x.config.json already exists. Skipping initialization.");
    return;
  }

  console.log("Initializing tamamo-x-mcp configuration...");

  // Import MCP servers from .mcp.json if present
  const mcpServers = await importMCPServers(projectRoot);

  if (mcpServers.length > 0) {
    console.log(`Imported ${mcpServers.length} MCP server(s) from .mcp.json`);
  } else {
    console.log("No .mcp.json found or no servers configured");
  }

  // Detect project context files
  const projectContext = await detectProjectContext(projectRoot);

  if (projectContext) {
    console.log("Detected project context files:");
    if (projectContext.agentFilePath) {
      console.log(`  - ${projectContext.agentFilePath}`);
    }
    if (projectContext.claudeFilePath) {
      console.log(`  - ${projectContext.claudeFilePath}`);
    }
  }

  // Create default configuration
  const config: Configuration = {
    version: "1.0.0",
    mcpServers: mcpServers.length > 0 ? mcpServers : [],
    llmProvider: {
      type: "anthropic",
      credentialSource: "cli-tool",
    },
    projectContext,
  };

  // Validate configuration (but allow empty mcpServers during init)
  const validation = validateConfig(config);
  if (!validation.valid) {
    // Filter out EMPTY_MCP_SERVERS error during init - it's OK to start with no servers
    const criticalErrors = validation.errors.filter((err) => err.code !== "EMPTY_MCP_SERVERS");

    if (criticalErrors.length > 0) {
      console.error("Configuration validation failed:");
      criticalErrors.forEach((err) => {
        console.error(`  - ${err.field}: ${err.message}`);
      });
      throw new Error("Failed to create valid configuration");
    }
  }

  // Save configuration
  await saveConfig(configPath, config);

  console.log(`✓ Created tamamo-x.config.json`);
  console.log(`  MCP servers: ${config.mcpServers.length}`);
  console.log(`  LLM provider: ${config.llmProvider.type}`);

  if (config.mcpServers.length === 0) {
    console.log("\nNote: No MCP servers configured.");
    console.log("Add servers to tamamo-x.config.json manually or create a .mcp.json file.");
  }
}
