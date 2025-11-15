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

OPTIONS:
    --version   Show version information
    --help      Show this help message

EXAMPLES:
    tamamo-x-mcp init
    tamamo-x-mcp --version
    tamamo-x-mcp help

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
    boolean: ["help", "version"],
    string: [],
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
      case "init":
        await init();
        break;

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
