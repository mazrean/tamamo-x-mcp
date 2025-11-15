/**
 * MCP command - Start MCP server with sub-agents
 * Command: tamamo-x-mcp mcp
 */

import { join } from "jsr:@std/path@^1.0.0";
import type { ToolGroup, LLMProviderConfig, SubAgent } from "../../types/index.ts";
import { createSubAgent } from "../../agents/agent.ts";
import {
  createMCPServer,
  startServer,
} from "../../mcp/server.ts";
import { loadConfig } from "../../config/loader.ts";

/**
 * Load tool groups from .tamamo-x/groups.json
 */
export async function loadGroups(
  groupsPath?: string,
): Promise<ToolGroup[]> {
  const path = groupsPath || join(Deno.cwd(), ".tamamo-x", "groups.json");

  try {
    const content = await Deno.readTextFile(path);
    const groups = JSON.parse(content) as ToolGroup[];
    return groups;
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
    // Load configuration
    console.log("Loading configuration...");
    const configPath = join(Deno.cwd(), "tamamo-x.config.json");
    const config = await loadConfig(configPath);

    // Load tool groups
    console.log("Loading tool groups...");
    const groups = await loadGroups();

    if (groups.length === 0) {
      console.error(
        "No tool groups found. Please run 'tamamo-x-mcp build' first.",
      );
      Deno.exit(1);
    }

    // Create sub-agents
    console.log(`Creating ${groups.length} sub-agents...`);
    const subAgents = createSubAgentsFromGroups(groups, config.llmProvider);

    // Create MCP server
    console.log("Starting tamamo-x MCP server...");
    const server = createMCPServer(subAgents);

    // Start server
    const started = await startServer(server);

    if (!started) {
      console.error("Failed to start MCP server");
      Deno.exit(1);
    }

    console.log(`✓ Loaded ${subAgents.length} sub-agents`);
    console.log("✓ Server ready on stdio");
    console.log("");
    console.log("Available agents:");
    subAgents.forEach((agent) => {
      console.log(`  - ${agent.id} (${agent.toolGroup.tools.length} tools)`);
    });
    console.log("");
    console.log("Waiting for connections...");

    // Keep process running
    await new Promise(() => {}); // Run forever
  } catch (error) {
    console.error(
      `Error starting MCP server: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    Deno.exit(1);
  }
}

/**
 * Test helper: Load groups with custom path
 */
export async function loadGroupsForTest(path: string): Promise<ToolGroup[]> {
  return await loadGroups(path);
}
