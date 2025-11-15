#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env
/**
 * Build command for tamamo-x-mcp
 * Analyzes tools and creates sub-agent groups using LLM
 *
 * Reference: plan.md § Phase 4 (User Story 2 - Tool Grouping)
 * Reference: spec.md (FR-003, FR-004, FR-005)
 */

import { join, resolve } from "jsr:@std/path@^1.0.0";
import { ensureDir } from "jsr:@std/fs@^1.0.0/ensure-dir";
import { loadConfig } from "../../config/loader.ts";
import { validateConfig } from "../../config/validator.ts";
import { discoverAllTools } from "../../mcp/discovery.ts";
import { groupTools } from "../../grouping/grouper.ts";
import { createLLMClient } from "../../llm/client.ts";
import { discoverCredentials, discoverBedrockCredentials, type BedrockCredentials } from "../../llm/credentials.ts";
import type { ToolGroup, ProjectContext, Configuration } from "../../types/index.ts";

const CONFIG_FILE = "tamamo-x.config.json";
const GROUPS_OUTPUT_DIR = ".tamamo-x";
const GROUPS_OUTPUT_FILE = "groups.json";

/**
 * Read project context from configuration and/or Agent.md/CLAUDE.md files
 * Merges config-driven context with file-based context
 */
async function readProjectContext(
  configContext?: ProjectContext,
): Promise<ProjectContext | undefined> {
  // Start with config-provided context if available
  let domain = configContext?.domain;
  const customHints = configContext?.customHints ? [...configContext.customHints] : [];

  // Build list of files to read (config paths + fallback defaults)
  const contextFiles: string[] = [];
  const seenPaths = new Set<string>();

  // Helper to add a path with normalization/deduplication
  const addPath = (path: string) => {
    const normalized = resolve(path);
    if (!seenPaths.has(normalized)) {
      contextFiles.push(path); // Keep original path for error messages
      seenPaths.add(normalized);
    }
  };

  // Add configured paths first (both agentFilePath and claudeFilePath)
  if (configContext?.agentFilePath) {
    addPath(configContext.agentFilePath);
  }
  if (configContext?.claudeFilePath) {
    addPath(configContext.claudeFilePath);
  }

  // Add default fallback paths (if not already added via config)
  const defaultPaths = ["Agent.md", "CLAUDE.md", "agent.md", "claude.md"];
  for (const path of defaultPaths) {
    addPath(path);
  }

  // Read all context files (don't break early - merge hints from all files)
  for (const filename of contextFiles) {
    try {
      const content = await Deno.readTextFile(filename);

      // Extract domain hints from the content if not already set
      if (!domain) {
        const domainMatch = content.match(/(?:Project|Domain):\s*(.+)/i);
        domain = domainMatch?.[1]?.trim();
      }

      // Extract custom hints from markdown lists
      const hintMatches = content.matchAll(/^[-*]\s+(.+)$/gm);
      for (const match of hintMatches) {
        const hint = match[1].trim();
        if (!customHints.includes(hint)) {
          customHints.push(hint);
        }
      }
    } catch {
      // File not found or unreadable, try next one
      continue;
    }
  }

  // Return context if we found anything
  if (domain || customHints.length > 0) {
    return {
      domain: domain || "General purpose development",
      customHints: customHints.slice(0, 10), // Limit to first 10 hints
    };
  }

  return undefined;
}

/**
 * Save tool groups to .tamamo-x/groups.json
 */
async function saveGroups(groups: ToolGroup[]): Promise<void> {
  const outputDir = GROUPS_OUTPUT_DIR;
  const outputPath = join(outputDir, GROUPS_OUTPUT_FILE);

  // Ensure output directory exists
  await ensureDir(outputDir);

  // Write groups with proper formatting
  const content = JSON.stringify(groups, null, 2);
  await Deno.writeTextFile(outputPath, content + "\n");

  console.log(`✓ Saved ${groups.length} agent groups to ${outputPath}`);
}

/**
 * Build command implementation
 * Workflow:
 * 1. Load configuration from tamamo-x.config.json
 * 2. Validate configuration
 * 3. Discover tools from MCP servers
 * 4. Read project context (if available)
 * 5. Create LLM client with discovered credentials
 * 6. Analyze and group tools using LLM
 * 7. Save groups to .tamamo-x/groups.json
 */
export async function build(): Promise<void> {
  console.log("Building sub-agent groups...\n");

  // Step 1: Load configuration
  console.log(`Loading configuration from ${CONFIG_FILE}...`);
  let config: Configuration;
  try {
    config = await loadConfig(CONFIG_FILE);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`\nRun 'tamamo-x-mcp init' to create configuration first.`);
    Deno.exit(1);
  }

  // Step 2: Validate configuration
  console.log("Validating configuration...");
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error("Error: Invalid configuration:");
    validation.errors.forEach((err) => console.error(`  - ${String(err)}`));
    Deno.exit(1);
  }
  console.log("✓ Configuration is valid\n");

  // Step 3: Discover tools from MCP servers
  console.log(`Discovering tools from ${config.mcpServers.length} MCP servers...`);
  const tools = await discoverAllTools(config.mcpServers);

  if (tools.length === 0) {
    console.error("Error: No tools discovered from MCP servers");
    console.error("Please check your MCP server configurations and ensure servers are running.");
    Deno.exit(1);
  }

  console.log(`✓ Discovered ${tools.length} tools\n`);

  // Step 4: Read project context
  console.log("Reading project context...");
  const context = await readProjectContext(config.projectContext);
  if (context) {
    console.log(`✓ Found project context: ${context.domain}`);
    if (context.customHints && context.customHints.length > 0) {
      console.log(`  Custom hints: ${context.customHints.length} items`);
    }
  } else {
    console.log("  No project context found, using default");
  }
  console.log();

  // Step 5: Create LLM client with discovered credentials
  console.log(`Initializing LLM client (${config.llmProvider.type})...`);
  let credentials: string | BedrockCredentials | null;

  if (config.llmProvider.type === "bedrock") {
    credentials = await discoverBedrockCredentials();
    if (!credentials) {
      console.error("Error: AWS Bedrock credentials not found");
      console.error("Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables.");
      Deno.exit(1);
    }
  } else {
    credentials = await discoverCredentials(config.llmProvider.type);
    if (!credentials) {
      console.error(`Error: ${config.llmProvider.type} credentials not found`);
      console.error("Please configure API credentials for your chosen LLM provider.");
      Deno.exit(1);
    }
  }

  const llmClient = createLLMClient(config.llmProvider, credentials);
  console.log("✓ LLM client initialized\n");

  // Step 6: Analyze and group tools
  console.log("Analyzing tools and creating groups...");

  // Use default constraints if not specified
  const constraints = config.groupingConstraints || {
    minToolsPerGroup: 5,
    maxToolsPerGroup: 20,
    minGroups: 3,
    maxGroups: 10,
  };

  console.log(`  Constraints: ${constraints.minGroups}-${constraints.maxGroups} groups, ${constraints.minToolsPerGroup}-${constraints.maxToolsPerGroup} tools per group`);

  let groups: ToolGroup[];
  try {
    groups = await groupTools(
      tools,
      llmClient,
      constraints,
      context,
    );
  } catch (error) {
    console.error(`Error during grouping: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }

  console.log(`✓ Created ${groups.length} agent groups\n`);

  // Display group summary
  console.log("Group Summary:");
  groups.forEach((group, idx) => {
    console.log(`  ${idx + 1}. ${group.name} (${group.tools.length} tools)`);
    console.log(`     ${group.description}`);
  });
  console.log();

  // Step 7: Save groups
  await saveGroups(groups);

  console.log("\n✓ Build complete! Run 'tamamo-x-mcp mcp' to start the MCP server.");
}
