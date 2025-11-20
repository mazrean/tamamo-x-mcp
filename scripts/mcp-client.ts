#!/usr/bin/env -S deno run --allow-all
/**
 * MCP Client for testing tamamo-x-mcp server
 *
 * This script connects to a running MCP server via stdio and allows
 * interactive testing of sub-agent tools.
 *
 * Usage:
 *   # Start MCP server in another terminal:
 *   deno run --allow-all src/cli/main.ts mcp
 *
 *   # Run this client:
 *   deno run --allow-all scripts/mcp-client.ts
 *
 *   # Or test specific agent:
 *   deno run --allow-all scripts/mcp-client.ts --agent file-ops --prompt "List files"
 */

import { Client } from "npm:@modelcontextprotocol/sdk@1.22.0/client/index.js";
import { StdioClientTransport } from "npm:@modelcontextprotocol/sdk@1.22.0/client/stdio.js";
import { parseArgs } from "jsr:@std/cli@^1.0.0/parse-args";

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface MCPToolCallResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

async function listTools(client: Client): Promise<MCPTool[]> {
  console.log("Fetching available tools...\n");
  const response = await client.listTools();

  const tools = response.tools as MCPTool[];
  console.log(`Found ${tools.length} available sub-agents:\n`);

  tools.forEach((tool, index) => {
    console.log(`${index + 1}. ${tool.name}`);
    console.log(`   ${tool.description}`);
    console.log();
  });

  return tools;
}

async function callTool(
  client: Client,
  toolName: string,
  args: Record<string, unknown>,
): Promise<MCPToolCallResponse> {
  console.log(`\nCalling tool: ${toolName}`);
  console.log(`Arguments:`, JSON.stringify(args, null, 2));
  console.log();

  const response = await client.callTool({
    name: toolName,
    arguments: args,
  });

  return response as MCPToolCallResponse;
}

async function interactiveMode(client: Client, tools: MCPTool[]) {
  console.log("\n=== Interactive Mode ===");
  console.log("Type 'list' to see available tools");
  console.log("Type 'exit' or 'quit' to exit\n");

  while (true) {
    const input = prompt("\nEnter command (or 'help'):");
    if (!input) continue;

    const trimmed = input.trim().toLowerCase();

    if (trimmed === "exit" || trimmed === "quit") {
      console.log("Goodbye!");
      break;
    }

    if (trimmed === "list") {
      tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
      });
      continue;
    }

    if (trimmed === "help") {
      console.log("\nAvailable commands:");
      console.log("  list        - List all available tools");
      console.log("  call <num>  - Call a tool by number");
      console.log("  exit/quit   - Exit the client");
      console.log("\nExample: call 1");
      continue;
    }

    if (trimmed.startsWith("call ")) {
      const numStr = trimmed.substring(5).trim();
      const num = parseInt(numStr, 10);

      if (isNaN(num) || num < 1 || num > tools.length) {
        console.log(`Invalid tool number. Use 1-${tools.length}`);
        continue;
      }

      const tool = tools[num - 1];
      console.log(`\nSelected: ${tool.name}`);
      console.log(`Description: ${tool.description}\n`);

      // Get prompt
      const promptText = prompt("Enter prompt:");
      if (!promptText) {
        console.log("Cancelled");
        continue;
      }

      // Get optional context
      const wantContext = prompt("Add context? (y/n):");
      let context: Record<string, unknown> | undefined;

      if (wantContext?.toLowerCase() === "y") {
        const contextJson = prompt("Enter context JSON:");
        if (contextJson) {
          try {
            context = JSON.parse(contextJson);
          } catch (error) {
            console.log(`Invalid JSON: ${error}`);
            continue;
          }
        }
      }

      // Call the tool
      try {
        const args: Record<string, unknown> = { prompt: promptText };
        if (context) {
          args.context = context;
        }

        const response = await callTool(client, tool.name, args);

        console.log("\n=== Response ===");
        if (response.isError) {
          console.log("ERROR:");
        }
        response.content.forEach((item) => {
          console.log(item.text);
        });
        console.log("================\n");
      } catch (error) {
        console.error(`Error calling tool: ${error}`);
      }

      continue;
    }

    console.log("Unknown command. Type 'help' for available commands.");
  }
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["agent", "prompt", "context", "server"],
    boolean: ["help", "list"],
    default: {
      server: "deno run --allow-all src/cli/main.ts mcp",
    },
  });

  if (args.help) {
    console.log(`
MCP Client for tamamo-x-mcp

Usage:
  scripts/mcp-client.ts [options]

Options:
  --help                Show this help message
  --list                List available tools and exit
  --agent <name>        Agent ID to call (e.g., file-ops)
  --prompt <text>       Prompt to send to agent
  --context <json>      Optional context as JSON string
  --server <cmd>        Server command (default: "deno run --allow-all src/cli/main.ts mcp")

Examples:
  # Interactive mode
  deno run --allow-all scripts/mcp-client.ts

  # List available tools
  deno run --allow-all scripts/mcp-client.ts --list

  # Call specific agent
  deno run --allow-all scripts/mcp-client.ts --agent file-ops --prompt "List all files"

  # With context
  deno run --allow-all scripts/mcp-client.ts --agent file-ops --prompt "Read file" --context '{"path":"/tmp/test.txt"}'
`);
    Deno.exit(0);
  }

  console.log("Starting MCP client...\n");

  // Parse server command
  const serverCmd = args.server.split(" ");
  const command = serverCmd[0];
  const commandArgs = serverCmd.slice(1);

  // Create transport with command and args
  const transport = new StdioClientTransport({
    command: command,
    args: commandArgs,
  });

  // Create client
  const client = new Client(
    {
      name: "tamamo-x-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  try {
    // Connect to server
    console.log("Connecting to MCP server...");
    await client.connect(transport);
    console.log("Connected!\n");

    // List tools
    const tools = await listTools(client);

    if (args.list) {
      // Just list and exit
      await client.close();
      Deno.exit(0);
    }

    // If agent and prompt specified, call it
    if (args.agent && args.prompt) {
      const toolName = `agent_${args.agent}`;
      const tool = tools.find((t) => t.name === toolName);

      if (!tool) {
        console.error(`Agent '${args.agent}' not found`);
        console.log("\nAvailable agents:");
        tools.forEach((t) => {
          const agentId = t.name.replace(/^agent_/, "");
          console.log(`  - ${agentId}`);
        });
        await client.close();
        Deno.exit(1);
      }

      const callArgs: Record<string, unknown> = { prompt: args.prompt };
      if (args.context) {
        try {
          callArgs.context = JSON.parse(args.context);
        } catch (error) {
          console.error(`Invalid context JSON: ${error}`);
          await client.close();
          Deno.exit(1);
        }
      }

      const response = await callTool(client, toolName, callArgs);

      console.log("\n=== Response ===");
      if (response.isError) {
        console.log("ERROR:");
      }
      response.content.forEach((item) => {
        console.log(item.text);
      });
      console.log("================\n");

      await client.close();
      Deno.exit(0);
    }

    // Interactive mode
    await interactiveMode(client, tools);

    // Cleanup
    await client.close();
  } catch (error) {
    console.error("Error:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
