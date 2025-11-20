#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Setup test environment for MCP server testing
 *
 * This script creates:
 * - tamamo-x.config.json (test configuration)
 * - .tamamo-x/groups.json (mock tool groups)
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/setup-test-env.ts
 */

import { join } from "jsr:@std/path@^1.0.0";
import type { Configuration, ToolGroup } from "../src/types/index.ts";

const TEST_CONFIG: Configuration = {
  version: "1.0.0",
  mcpServers: [],
  llmProvider: {
    type: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    credentialSource: "cli-tool",
  },
  groupingConstraints: {
    minToolsPerGroup: 5,
    maxToolsPerGroup: 20,
    minGroups: 3,
    maxGroups: 10,
  },
};

const TEST_GROUPS: ToolGroup[] = [
  {
    id: "file-ops",
    name: "File Operations",
    description: "Tools for reading, writing, and managing files on the filesystem",
    systemPrompt: `You are File Operations.

Description: Tools for reading, writing, and managing files on the filesystem

Available tools:
- read_file: Read contents of a file from the filesystem
- write_file: Write content to a file on the filesystem
- list_directory: List all files and directories in a given path
- delete_file: Delete a file from the filesystem
- move_file: Move or rename a file

Your role is to help users by using these tools effectively. When given a task:
1. Analyze which tools are needed to answer the user's question
2. Execute those tools to gather the necessary information
3. After gathering all needed information, provide a clear and concise response to the user

Important: Always provide a final text response after using tools. Summarize the findings and directly answer the user's question.`,
    tools: [
      {
        name: "read_file",
        description: "Read contents of a file from the filesystem",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to read" },
          },
          required: ["path"],
        },
        serverName: "filesystem-server",
      },
      {
        name: "write_file",
        description: "Write content to a file on the filesystem",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to write" },
            content: { type: "string", description: "Content to write" },
          },
          required: ["path", "content"],
        },
        serverName: "filesystem-server",
      },
      {
        name: "list_directory",
        description: "List all files and directories in a given path",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Directory path to list" },
            recursive: { type: "boolean", description: "List recursively" },
          },
          required: ["path"],
        },
        serverName: "filesystem-server",
      },
      {
        name: "delete_file",
        description: "Delete a file from the filesystem",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path to delete" },
          },
          required: ["path"],
        },
        serverName: "filesystem-server",
      },
      {
        name: "move_file",
        description: "Move or rename a file",
        inputSchema: {
          type: "object",
          properties: {
            source: { type: "string", description: "Source path" },
            destination: { type: "string", description: "Destination path" },
          },
          required: ["source", "destination"],
        },
        serverName: "filesystem-server",
      },
    ],
  },
  {
    id: "git-ops",
    name: "Git Operations",
    description: "Tools for version control using Git",
    systemPrompt: `You are Git Operations.

Description: Tools for version control using Git

Available tools:
- git_status: Get current git repository status
- git_commit: Create a new git commit
- git_push: Push commits to remote repository
- git_pull: Pull changes from remote repository
- git_log: Show commit history

Your role is to help users by using these tools effectively. When given a task:
1. Analyze which tools are needed to answer the user's question
2. Execute those tools to gather the necessary information
3. After gathering all needed information, provide a clear and concise response to the user

Important: Always provide a final text response after using tools. Summarize the findings and directly answer the user's question.`,
    tools: [
      {
        name: "git_status",
        description: "Get current git repository status",
        inputSchema: {
          type: "object",
          properties: {
            repository: { type: "string", description: "Repository path" },
          },
          required: [],
        },
        serverName: "git-server",
      },
      {
        name: "git_commit",
        description: "Create a new git commit",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string", description: "Commit message" },
            files: { type: "array", items: { type: "string" }, description: "Files to commit" },
          },
          required: ["message"],
        },
        serverName: "git-server",
      },
      {
        name: "git_push",
        description: "Push commits to remote repository",
        inputSchema: {
          type: "object",
          properties: {
            remote: { type: "string", description: "Remote name" },
            branch: { type: "string", description: "Branch name" },
          },
          required: [],
        },
        serverName: "git-server",
      },
      {
        name: "git_pull",
        description: "Pull changes from remote repository",
        inputSchema: {
          type: "object",
          properties: {
            remote: { type: "string", description: "Remote name" },
            branch: { type: "string", description: "Branch name" },
          },
          required: [],
        },
        serverName: "git-server",
      },
      {
        name: "git_log",
        description: "Show commit history",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Number of commits to show" },
          },
          required: [],
        },
        serverName: "git-server",
      },
    ],
  },
  {
    id: "http-ops",
    name: "HTTP Operations",
    description: "Tools for making HTTP requests and handling web data",
    systemPrompt: `You are HTTP Operations.

Description: Tools for making HTTP requests and handling web data

Available tools:
- http_get: Send HTTP GET request
- http_post: Send HTTP POST request
- parse_html: Parse HTML content and extract data
- download_file: Download file from URL
- check_url_status: Check if a URL is accessible

Your role is to help users by using these tools effectively. When given a task:
1. Analyze which tools are needed to answer the user's question
2. Execute those tools to gather the necessary information
3. After gathering all needed information, provide a clear and concise response to the user

Important: Always provide a final text response after using tools. Summarize the findings and directly answer the user's question.`,
    tools: [
      {
        name: "http_get",
        description: "Send HTTP GET request",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to request" },
            headers: { type: "object", description: "Request headers" },
          },
          required: ["url"],
        },
        serverName: "http-server",
      },
      {
        name: "http_post",
        description: "Send HTTP POST request",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to request" },
            body: { type: "object", description: "Request body" },
            headers: { type: "object", description: "Request headers" },
          },
          required: ["url", "body"],
        },
        serverName: "http-server",
      },
      {
        name: "parse_html",
        description: "Parse HTML content and extract data",
        inputSchema: {
          type: "object",
          properties: {
            html: { type: "string", description: "HTML content" },
            selector: { type: "string", description: "CSS selector" },
          },
          required: ["html"],
        },
        serverName: "http-server",
      },
      {
        name: "download_file",
        description: "Download file from URL",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "File URL" },
            destination: { type: "string", description: "Save path" },
          },
          required: ["url", "destination"],
        },
        serverName: "http-server",
      },
      {
        name: "check_url_status",
        description: "Check if a URL is accessible",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string", description: "URL to check" },
          },
          required: ["url"],
        },
        serverName: "http-server",
      },
    ],
  },
];

const TEST_INSTRUCTIONS = `# Tamamo-X Test MCP Server

This is a test instance of tamamo-x-mcp with mock tool groups.

## Available Sub-Agents

1. **file-ops**: File Operations
2. **git-ops**: Git Operations
3. **http-ops**: HTTP Operations

## Usage

Call the agent tools like: agent_file-ops, agent_git-ops, agent_http-ops

Each agent accepts:
- prompt: The task prompt for the agent (required)
- context: Optional context object
`;

async function setupTestEnvironment() {
  const cwd = Deno.cwd();
  const configPath = join(cwd, "tamamo-x.config.json");
  const tamamoDir = join(cwd, ".tamamo-x");
  const groupsPath = join(tamamoDir, "groups.json");

  console.log("Setting up test environment...\n");

  // Create .tamamo-x directory
  try {
    await Deno.mkdir(tamamoDir, { recursive: true });
    console.log("✓ Created .tamamo-x directory");
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
    console.log("✓ .tamamo-x directory already exists");
  }

  // Write config file
  await Deno.writeTextFile(
    configPath,
    JSON.stringify(TEST_CONFIG, null, 2),
  );
  console.log(`✓ Created ${configPath}`);

  // Write groups file (new format with instructions)
  const groupsData = {
    instructions: TEST_INSTRUCTIONS,
    groups: TEST_GROUPS,
  };
  await Deno.writeTextFile(
    groupsPath,
    JSON.stringify(groupsData, null, 2),
  );
  console.log(`✓ Created ${groupsPath}`);

  console.log("\nTest environment ready!");
  console.log("\nNext steps:");
  console.log("1. Start the MCP server:");
  console.log("   deno run --allow-all src/cli/main.ts mcp");
  console.log("\n2. Test with the MCP client:");
  console.log("   deno run --allow-all scripts/mcp-client.ts");
}

if (import.meta.main) {
  try {
    await setupTestEnvironment();
  } catch (error) {
    console.error("Error setting up test environment:", error);
    Deno.exit(1);
  }
}
