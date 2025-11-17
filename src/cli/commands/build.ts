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
import {
  type BedrockCredentials,
  discoverBedrockCredentials,
  discoverCredentials,
} from "../../llm/credentials.ts";
import type { Configuration, ProjectContext, ToolGroup } from "../../types/index.ts";

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
  const contentParts: string[] = []; // Collect full content from all files

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

      // Store full content for LLM context
      contentParts.push(`=== ${filename} ===\n${content}`);

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
  if (domain || customHints.length > 0 || contentParts.length > 0) {
    return {
      domain: domain || "General purpose development",
      customHints: customHints.slice(0, 10), // Limit to first 10 hints
      fullContent: contentParts.length > 0 ? contentParts.join("\n\n") : undefined,
    };
  }

  return undefined;
}

/**
 * Generate usage instructions for the MCP server based on tool groups
 * Uses LLM to create tailored instructions based on serena MCP's template
 */
async function generateInstructions(
  groups: ToolGroup[],
  llmClient: ReturnType<typeof createLLMClient>,
  context?: ProjectContext,
): Promise<string> {
  const serenaMCPTemplate =
    `You are a professional coding agent with access to specialized tool groups for various development tasks.

CORE PRINCIPLES:
1. **Resource Efficiency**: Only use tools and read code when necessary for the task at hand
2. **Intelligent Tool Selection**: Choose the right agent group based on the task requirements
3. **Step-by-Step Approach**: Break down complex tasks and explain your reasoning
4. **Minimal Code Reading**: Prefer symbolic/overview tools over reading entire files

AVAILABLE AGENT GROUPS:
{{GROUPS_SUMMARY}}

TOOL USAGE GUIDELINES:
- **File Operations**: Use list_dir, find_file for navigation. Avoid reading entire files unnecessarily
- **Code Exploration**: Use symbolic tools (get_symbols_overview, find_symbol) for targeted code reading
- **Editing**: Use symbolic editing (replace_symbol_body, insert_after_symbol) when modifying entire symbols
- **Pattern Search**: Use search_for_pattern when symbol names are unknown
- **Memory Management**: Use read_memory/write_memory for persistent project knowledge

IMPORTANT WARNINGS:
- DO NOT read entire files without need - use overview and symbolic tools first
- DO NOT re-analyze code you've already read with symbolic tools
- DO NOT use tools from unavailable agent groups

When uncertain about which agent group to use, ask for clarification rather than making assumptions.`;

  const groupsSummary = groups.map((g, idx) => {
    const toolNames = g.tools.map((t) => `${t.serverName}:${t.name}`).join(", ");
    return `${idx + 1}. **${g.name}** (${g.tools.length} tools)
   Purpose: ${g.description}
   Tools: ${toolNames}`;
  }).join("\n\n");

  const prompt =
    `Based on the following tool groups for an MCP server, generate comprehensive usage instructions for LLMs.

Use this template as inspiration (from serena MCP), but adapt it to fit the available tool groups:

${serenaMCPTemplate}

AVAILABLE TOOL GROUPS:
${groupsSummary}

${context?.fullContent ? `\nPROJECT CONTEXT:\n${context.fullContent.slice(0, 2000)}` : ""}

Generate clear, actionable instructions that:
1. Explain the purpose and capabilities of this MCP server
2. Provide guidance on which agent groups to use for different tasks
3. Include best practices for tool usage based on the available groups
4. Warn about common mistakes (e.g., reading entire files, using unavailable tools)
5. Maintain the professional, instructional tone of the template

The instructions should be comprehensive but concise (aim for 300-500 words).`;

  const instructions = await llmClient.complete(prompt, {
    system:
      "You are an expert at writing clear, actionable instructions for AI agents. Generate professional documentation that helps LLMs use MCP servers effectively.",
    temperature: 0.4,
  });

  return instructions.trim();
}

/**
 * Save tool groups and instructions to .tamamo-x/groups.json
 */
async function saveGroups(
  groups: ToolGroup[],
  instructions: string,
): Promise<void> {
  const outputDir = GROUPS_OUTPUT_DIR;
  const outputPath = join(outputDir, GROUPS_OUTPUT_FILE);

  // Ensure output directory exists
  await ensureDir(outputDir);

  // Write groups with instructions
  const content = JSON.stringify(
    {
      instructions,
      groups,
    },
    null,
    2,
  );
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
      console.error(
        "Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables.",
      );
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

  console.log(
    `  Constraints: ${constraints.minGroups}-${constraints.maxGroups} groups, ${constraints.minToolsPerGroup}-${constraints.maxToolsPerGroup} tools per group`,
  );

  let groups: ToolGroup[];
  try {
    groups = await groupTools(
      tools,
      llmClient,
      constraints,
      context,
    );
  } catch (error) {
    console.error(
      `Error during grouping: ${error instanceof Error ? error.message : String(error)}`,
    );
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

  // Step 7: Generate usage instructions
  console.log("Generating usage instructions...");
  const instructions = await generateInstructions(groups, llmClient, context);
  console.log("✓ Instructions generated\n");

  // Step 8: Save groups and instructions
  await saveGroups(groups, instructions);

  console.log("\n✓ Build complete! Run 'tamamo-x-mcp mcp' to start the MCP server.");
}
