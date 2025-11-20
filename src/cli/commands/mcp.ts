/**
 * MCP command - Start MCP server with sub-agents
 * Command: tamamo-x-mcp mcp
 */

import { join } from "jsr:@std/path@^1.0.0";
import type { LLMProviderConfig, SubAgent, ToolGroup } from "../../types/index.ts";
import { createSubAgent } from "../../agents/agent.ts";
import { createMCPServer, startServer } from "../../mcp/server.ts";
import { loadConfig } from "../../config/loader.ts";

/**
 * Load tool groups and instructions from .tamamo-x/groups.json
 */
export async function loadGroups(
  groupsPath?: string,
): Promise<{ groups: ToolGroup[]; instructions?: string }> {
  const path = groupsPath || join(Deno.cwd(), ".tamamo-x", "groups.json");

  try {
    const content = await Deno.readTextFile(path);
    const data = JSON.parse(content);

    // Support both old format (array) and new format (object with instructions)
    if (Array.isArray(data)) {
      // Old format: just array of groups
      return { groups: data as ToolGroup[] };
    } else {
      // New format: object with instructions and groups
      return {
        groups: data.groups as ToolGroup[],
        instructions: data.instructions,
      };
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        `groups.json not found at ${path}. Please run 'tamamo-x-mcp build' first.`,
      );
    }
    throw new Error(`Failed to load groups: ${error}`);
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

    // Create sub-agents
    console.error(`Creating ${groups.length} sub-agents...`);
    const subAgents = createSubAgentsFromGroups(groups, config.llmProvider);

    // Create MCP server
    console.error("Starting tamamo-x MCP server...");
    const server = createMCPServer(subAgents, instructions);

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
