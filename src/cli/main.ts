/**
 * CLI entry point for tamamo-x-mcp
 * Parses arguments and routes to appropriate command
 *
 * Reference: plan.md § Phase 3 (User Story 1 - CLI Orchestration)
 * Reference: quickstart.md (CLI usage examples)
 */

import { parseArgs } from "jsr:@std/cli@^1.0.0/parse-args";
import { init } from "./commands/init.ts";
import { build } from "./commands/build.ts";
import { mcpCommand } from "./commands/mcp.ts";

const VERSION = "1.0.0";

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
tamamo-x-mcp v${VERSION}
Intelligent MCP tool grouping for specialized sub-agents

USAGE:
    tamamo-x-mcp <COMMAND> [OPTIONS]

COMMANDS:
    init        Initialize configuration (creates tamamo-x.config.json)
    build       Analyze tools and create sub-agent groups
    mcp         Start MCP server with grouped sub-agents
    help        Show this help message

GLOBAL OPTIONS:
    --version   Show version information
    --help      Show this help message

INIT COMMAND OPTIONS:
    --agent <name>        Import config from specific coding agent
                          (claude-code, codex, gemini-cli, cursor, windsurf)
                          Default: auto-detect all installed agents
    --detect-agents       Explicitly auto-detect and import from all installed agents
                          (This is the default behavior when no --agent is specified)
    --no-add-to-agent     Don't add tamamo-x-mcp to agent's MCP server config
                          Default: auto-add tamamo-x-mcp to detected/specified agent configs
    --preserve-servers    Preserve existing servers when adding tamamo-x-mcp
                          Default: replace all existing servers with tamamo-x-mcp only

EXAMPLES:
    # Initialize with default settings (auto-detect agents and add tamamo-x-mcp)
    tamamo-x-mcp init

    # Import from Claude Code and replace its config with tamamo-x-mcp only
    tamamo-x-mcp init --agent claude-code

    # Import from Claude Code and add tamamo-x-mcp while preserving existing servers
    tamamo-x-mcp init --agent claude-code --preserve-servers

    # Auto-detect all agents but don't modify their configs
    tamamo-x-mcp init --no-add-to-agent

    # Import from specific agent without modifying its config
    tamamo-x-mcp init --agent codex --no-add-to-agent

    # Other commands
    tamamo-x-mcp build
    tamamo-x-mcp mcp
    tamamo-x-mcp --version

For more information, visit: https://github.com/your-org/tamamo-x-mcp
  `.trim());
}

/**
 * Show version information
 */
function showVersion(): void {
  console.log(`tamamo-x-mcp v${VERSION}`);
}

/**
 * Main CLI entry point
 */
async function main(args: string[]): Promise<void> {
  const parsed = parseArgs(args, {
    boolean: [
      "help",
      "version",
      "add-to-agent",
      "no-add-to-agent",
      "preserve-servers",
      "detect-agents",
    ],
    string: ["agent"],
    alias: {
      h: "help",
      v: "version",
    },
  });

  // Handle --version
  if (parsed.version) {
    showVersion();
    return;
  }

  // Handle --help
  if (parsed.help) {
    showHelp();
    return;
  }

  // Get command (first positional argument)
  const command = parsed._[0]?.toString();

  if (!command) {
    console.error("Error: No command specified\n");
    showHelp();
    Deno.exit(1);
  }

  // Route to appropriate command
  try {
    switch (command) {
      case "init": {
        // Validate agent option
        const validAgents = ["claude-code", "codex", "gemini-cli", "cursor", "windsurf"];
        if (parsed.agent && !validAgents.includes(parsed.agent)) {
          console.error(`Error: Invalid agent '${parsed.agent}'`);
          console.error(`Valid agents: ${validAgents.join(", ")}`);
          Deno.exit(1);
        }

        // Determine addToAgent behavior:
        // 1. If --no-add-to-agent is specified, addToAgent=false
        // 2. If --add-to-agent is specified, addToAgent=true
        // 3. Otherwise (default), addToAgent=true
        let addToAgent: boolean;
        if (parsed["no-add-to-agent"]) {
          addToAgent = false;
        } else if (parsed["add-to-agent"]) {
          addToAgent = true;
        } else {
          // Default behavior: addToAgent=true
          addToAgent = true;
        }

        // Determine detectAgents behavior:
        // 1. If --agent is specified, detectAgents=false (use specific agent)
        // 2. If --detect-agents is specified, detectAgents=true
        // 3. Otherwise (default), detectAgents=true
        let detectAgents: boolean;
        if (parsed.agent) {
          detectAgents = false;
        } else if (parsed["detect-agents"]) {
          detectAgents = true;
        } else {
          // Default behavior: detectAgents=true
          detectAgents = true;
        }

        await init({
          agent: parsed.agent as
            | "claude-code"
            | "codex"
            | "gemini-cli"
            | "cursor"
            | "windsurf"
            | undefined,
          addToAgent,
          preserveServers: parsed["preserve-servers"],
          detectAgents,
        });
        break;
      }

      case "build":
        await build();
        break;

      case "mcp":
        await mcpCommand();
        break;

      case "help":
        showHelp();
        break;

      default:
        console.error(`Error: Unknown command '${command}'\n`);
        showHelp();
        Deno.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

// Run main if this is the entry point
if (import.meta.main) {
  await main(Deno.args);
}

// Export for testing
export { main, showHelp, showVersion };
