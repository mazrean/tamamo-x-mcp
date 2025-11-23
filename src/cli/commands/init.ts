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
import { type CodingAgent, detectAgent, detectCodingAgents } from "../../config/agent-detector.ts";
import { normalizeServerNames, parseAgentConfig } from "../../config/agent-parsers.ts";
import { addTamamoXToAgent } from "../../config/agent-writer.ts";

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

      // Determine transport type and create appropriate server config
      let server: MCPServerConfig;

      if (serverConfig.url) {
        // Validate URL is a string before calling string methods
        if (typeof serverConfig.url !== "string") {
          console.warn(`Skipping server '${name}': url must be a string`);
          continue;
        }

        if (serverConfig.url.startsWith("ws://") || serverConfig.url.startsWith("wss://")) {
          // WebSocket transport
          server = {
            name,
            transport: "websocket",
            url: serverConfig.url,
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env,
          };
        } else {
          // HTTP transport
          server = {
            name,
            transport: "http",
            url: serverConfig.url,
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env,
          };
        }
      } else {
        // stdio transport
        // Validate command is a string
        if (!serverConfig.command || typeof serverConfig.command !== "string") {
          console.warn(`Skipping server '${name}': command must be a non-empty string`);
          continue;
        }

        server = {
          name,
          transport: "stdio",
          command: serverConfig.command,
          args: serverConfig.args,
          env: serverConfig.env,
        };
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
 * Import MCP servers from a coding agent's configuration
 * @param preserveServers - If false (default), replace all servers with tamamo-x-mcp only. If true, preserve existing servers.
 */
async function importFromAgent(
  agent: CodingAgent,
  projectRoot: string,
  addToAgentConfig: boolean = false,
  preserveServers: boolean = false,
): Promise<{ mcpServers: MCPServerConfig[]; llmProviderType?: string }> {
  try {
    const location = await detectAgent(agent, projectRoot);

    if (!location.exists) {
      console.log(`${agent} configuration not found at ${location.configPath}`);
      return { mcpServers: [] };
    }

    console.log(`Found ${agent} configuration at ${location.configPath}`);

    // Parse agent config
    const agentConfig = await parseAgentConfig(agent, location.configPath);

    // Normalize server names to avoid conflicts (e.g., "git" -> "claude-code:git")
    const normalizedServers = normalizeServerNames(agentConfig.mcpServers, agent);

    console.log(`Imported ${normalizedServers.length} MCP server(s) from ${agent}`);

    // Optionally add tamamo-x-mcp to the agent's config
    if (addToAgentConfig) {
      try {
        await addTamamoXToAgent(agent, location.configPath, preserveServers);
        if (preserveServers) {
          console.log(
            `✓ Added tamamo-x-mcp to ${agent} configuration (preserving existing servers)`,
          );
        } else {
          console.log(`✓ Replaced ${agent} configuration with tamamo-x-mcp only`);
        }
      } catch (error) {
        console.warn(
          `Warning: Failed to add tamamo-x-mcp to ${agent}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      mcpServers: normalizedServers,
      llmProviderType: agentConfig.llmProvider?.type,
    };
  } catch (error) {
    console.error(
      `Failed to import from ${agent}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { mcpServers: [] };
  }
}

/**
 * Initialize tamamo-x-mcp configuration
 * @param options Initialization options
 * @param options.projectRoot Project root directory (defaults to current directory)
 * @param options.agent Coding agent to import configuration from
 * @param options.addToAgent Add tamamo-x-mcp to the agent's configuration
 * @param options.preserveServers Preserve existing servers when adding tamamo-x-mcp (default: false, replaces all servers)
 * @param options.detectAgents Auto-detect and import from all installed agents
 */
export async function init(options: {
  projectRoot?: string;
  agent?: CodingAgent;
  addToAgent?: boolean;
  preserveServers?: boolean;
  detectAgents?: boolean;
} = {}): Promise<void> {
  const projectRoot = options.projectRoot || Deno.cwd();
  const configPath = join(projectRoot, "tamamo-x.config.json");

  // Check if config already exists
  if (await fileExists(configPath)) {
    console.log("tamamo-x.config.json already exists. Skipping initialization.");
    return;
  }

  console.log("Initializing tamamo-x-mcp configuration...");

  let mcpServers: MCPServerConfig[] = [];
  let llmProviderType: string | undefined;

  // Priority 1: Import from specified coding agent
  if (options.agent) {
    const imported = await importFromAgent(
      options.agent,
      projectRoot,
      options.addToAgent,
      options.preserveServers ?? false,
    );
    mcpServers = imported.mcpServers;
    llmProviderType = imported.llmProviderType;
  } // Priority 2: Auto-detect all installed coding agents
  else if (options.detectAgents) {
    console.log("Detecting installed coding agents...");
    const agents = await detectCodingAgents(projectRoot);
    const installedAgents = agents.filter((a) => a.exists);

    if (installedAgents.length > 0) {
      console.log(`Found ${installedAgents.length} installed coding agent(s):`);
      installedAgents.forEach((a) => console.log(`  - ${a.agent}`));

      // Import from all detected agents
      for (const agentLoc of installedAgents) {
        const imported = await importFromAgent(
          agentLoc.agent,
          projectRoot,
          options.addToAgent,
          options.preserveServers ?? false,
        );
        mcpServers.push(...imported.mcpServers);

        // Use the first detected LLM provider
        if (!llmProviderType && imported.llmProviderType) {
          llmProviderType = imported.llmProviderType;
        }
      }
    } else {
      console.log("No coding agents detected");
    }
  } // Priority 3: Import MCP servers from .mcp.json if present
  else {
    mcpServers = await importMCPServers(projectRoot);

    if (mcpServers.length > 0) {
      console.log(`Imported ${mcpServers.length} MCP server(s) from .mcp.json`);
    } else {
      console.log("No .mcp.json found or no servers configured");
    }
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
  // Determine LLM provider type (use detected or default to anthropic)
  // Only use standard providers (not ACP which requires different config)
  type StandardProviderType =
    | "anthropic"
    | "openai"
    | "gemini"
    | "vercel"
    | "bedrock"
    | "openrouter";
  const standardProviders: StandardProviderType[] = [
    "anthropic",
    "openai",
    "gemini",
    "vercel",
    "bedrock",
    "openrouter",
  ];

  const llmType: StandardProviderType = (llmProviderType &&
      standardProviders.includes(llmProviderType as StandardProviderType))
    ? llmProviderType as StandardProviderType
    : "anthropic";

  const config: Configuration = {
    version: "1.0.0",
    mcpServers: mcpServers.length > 0 ? mcpServers : [],
    llmProvider: {
      type: llmType,
      credentialSource: "cli-tool",
    },
    projectContext,
  };

  // Validate configuration (but allow empty mcpServers and file existence errors during init)
  const validation = validateConfig(config);
  if (!validation.valid) {
    // Filter out non-critical errors during init:
    // - EMPTY_MCP_SERVERS: OK to start with no servers
    // - File existence errors: Validator checks from wrong directory during init
    const criticalErrors = validation.errors.filter((err) =>
      err.code !== "EMPTY_MCP_SERVERS" &&
      !err.field.includes("agentFilePath") &&
      !err.field.includes("claudeFilePath")
    );

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
