/**
 * MCP command - Start MCP server with sub-agents
 * Command: tamamo-x-mcp mcp
 */

import { join } from "jsr:@std/path@^1.0.0";
import type { LLMProviderConfig, SubAgent, ToolGroup } from "../../types/index.ts";
import { createSubAgent } from "../../agents/agent.ts";
import { createMCPServer, startServer } from "../../mcp/server.ts";
import { loadConfig } from "../../config/loader.ts";
import { MCPClientRegistry } from "../../mcp/registry.ts";

/**
 * Load tool groups and instructions from .tamamo-x/ directory structure
 * - instructions.md: Top-level usage instructions
 * - groups/<group-id>/group.json: Group metadata
 * - groups/<group-id>/description.md: Group description
 * - groups/<group-id>/prompt.md: Group system prompt
 */
export async function loadGroups(
  baseDir?: string,
): Promise<{ groups: ToolGroup[]; instructions?: string }> {
  const tamamoDir = baseDir || join(Deno.cwd(), ".tamamo-x");

  try {
    // Load instructions.md
    let instructions: string | undefined;
    try {
      const instructionsPath = join(tamamoDir, "instructions.md");
      instructions = await Deno.readTextFile(instructionsPath);
    } catch {
      // instructions.md is optional
      instructions = undefined;
    }

    // Load groups from groups/ directory
    const groupsDir = join(tamamoDir, "groups");
    const groups: ToolGroup[] = [];

    // Read all group directories
    for await (const entry of Deno.readDir(groupsDir)) {
      if (!entry.isDirectory) continue;

      const groupId = entry.name;
      const groupDir = join(groupsDir, groupId);

      try {
        // Load group.json
        const groupJsonPath = join(groupDir, "group.json");
        const groupJson = JSON.parse(await Deno.readTextFile(groupJsonPath));

        // Load description.md
        const descriptionPath = join(groupDir, "description.md");
        const description = (await Deno.readTextFile(descriptionPath)).trim();

        // Load prompt.md
        const promptPath = join(groupDir, "prompt.md");
        const systemPrompt = (await Deno.readTextFile(promptPath)).trim();

        // Assemble ToolGroup
        const group: ToolGroup = {
          id: groupJson.id,
          name: groupJson.name,
          description,
          tools: groupJson.tools,
          systemPrompt,
          ...(groupJson.complementarityScore !== undefined && {
            complementarityScore: groupJson.complementarityScore,
          }),
          ...(groupJson.metadata && { metadata: groupJson.metadata }),
        };

        groups.push(group);
      } catch (error) {
        console.error(
          `Warning: Failed to load group from ${groupDir}: ${error}`,
        );
        // Skip this group and continue
        continue;
      }
    }

    if (groups.length === 0) {
      throw new Error(
        `No groups found in ${groupsDir}. Please run 'tamamo-x-mcp build' first.`,
      );
    }

    // Sort groups by ID for consistent ordering across different filesystems
    groups.sort((a, b) => a.id.localeCompare(b.id));

    return { groups, instructions };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        `.tamamo-x directory not found. Please run 'tamamo-x-mcp build' first.`,
      );
    }
    throw error;
  }
}

/**
 * Create sub-agents from tool groups
 */
export function createSubAgentsFromGroups(
  groups: ToolGroup[],
  llmConfig: LLMProviderConfig,
): SubAgent[] {
  return groups.map((group) => createSubAgent(group, llmConfig));
}

/**
 * MCP command implementation
 */
export async function mcpCommand(): Promise<void> {
  try {
    // Load configuration (log to stderr to keep stdout clean for MCP protocol)
    console.error("Loading configuration...");
    const configPath = join(Deno.cwd(), "tamamo-x.config.json");
    const config = await loadConfig(configPath);

    // Load tool groups and instructions
    console.error("Loading tool groups...");
    const { groups, instructions } = await loadGroups();

    if (groups.length === 0) {
      console.error(
        "No tool groups found. Please run 'tamamo-x-mcp build' first.",
      );
      Deno.exit(1);
    }

    // Create MCP client registry
    console.error("Initializing MCP client registry...");
    const registry = new MCPClientRegistry();

    // Add all MCP servers from config to registry
    for (const serverConfig of config.mcpServers) {
      registry.addServer(serverConfig);
    }

    console.error(`✓ Added ${config.mcpServers.length} MCP servers to registry`);

    // Create sub-agents
    console.error(`Creating ${groups.length} sub-agents...`);
    const subAgents = createSubAgentsFromGroups(groups, config.llmProvider);

    // Create MCP server with registry
    console.error("Starting tamamo-x MCP server...");
    const server = createMCPServer(subAgents, instructions, registry);

    // Start server
    const started = await startServer(server);

    if (!started) {
      console.error("Failed to start MCP server");
      Deno.exit(1);
    }

    console.error(`✓ Loaded ${subAgents.length} sub-agents`);
    console.error("✓ Server ready on stdio");
    console.error("");
    console.error("Available agents:");
    subAgents.forEach((agent) => {
      console.error(`  - ${agent.id} (${agent.toolGroup.tools.length} tools)`);
    });
    console.error("");
    console.error("Waiting for connections...");

    // Keep process running - the stdio transport will keep it alive
    await new Promise(() => {}); // Run forever
  } catch (error) {
    console.error(
      `Error starting MCP server: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    Deno.exit(1);
  }
}

/**
 * Test helper: Load groups with custom path
 */
export async function loadGroupsForTest(
  path: string,
): Promise<{ groups: ToolGroup[]; instructions?: string }> {
  return await loadGroups(path);
}
