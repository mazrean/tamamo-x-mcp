/**
 * Coding agent detection and configuration file location utilities
 */

import { join } from "jsr:@std/path@^1.0.0";
import { exists } from "jsr:@std/fs@^1.0.0";

/**
 * Supported coding agents with project-level MCP configuration
 */
export type CodingAgent = "claude-code" | "gemini-cli" | "cursor";

/**
 * Agent configuration file location info
 */
export interface AgentConfigLocation {
  agent: CodingAgent;
  configPath: string;
  exists: boolean;
}

/**
 * Get config file path for a specific coding agent
 * @param agent - The coding agent type
 * @param projectRoot - Project root directory (for project-level configs)
 */
export function getAgentConfigPath(agent: CodingAgent, projectRoot: string): string {
  switch (agent) {
    case "claude-code":
      // Project-level: .mcp.json
      return join(projectRoot, ".mcp.json");
    case "gemini-cli":
      // Project-level: .gemini/settings.json
      return join(projectRoot, ".gemini", "settings.json");
    case "cursor":
      // Project-level: .cursor/mcp.json
      return join(projectRoot, ".cursor", "mcp.json");
    default:
      throw new Error(`Unknown coding agent: ${agent}`);
  }
}

/**
 * Detect all installed coding agents by checking config file existence
 * @param projectRoot - Project root directory
 */
export async function detectCodingAgents(projectRoot: string): Promise<AgentConfigLocation[]> {
  const agents: CodingAgent[] = ["claude-code", "gemini-cli", "cursor"];
  const locations: AgentConfigLocation[] = [];

  for (const agent of agents) {
    try {
      const configPath = getAgentConfigPath(agent, projectRoot);
      const fileExists = await exists(configPath, { isFile: true });

      locations.push({
        agent,
        configPath,
        exists: fileExists,
      });
    } catch (error) {
      // If we can't determine the path, mark as non-existent
      console.warn(
        `Failed to detect ${agent}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return locations;
}

/**
 * Detect specific coding agent
 * @param agent - The coding agent type
 * @param projectRoot - Project root directory
 */
export async function detectAgent(
  agent: CodingAgent,
  projectRoot: string,
): Promise<AgentConfigLocation> {
  const configPath = getAgentConfigPath(agent, projectRoot);
  const fileExists = await exists(configPath, { isFile: true });

  return {
    agent,
    configPath,
    exists: fileExists,
  };
}
