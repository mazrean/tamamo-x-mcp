# Getting Started with tamamo-x-mcp

This tutorial will guide you through setting up tamamo-x-mcp and creating your first sub-agent groups.

## Prerequisites

- **Deno 2.x** installed ([installation guide](https://deno.com/manual/getting_started/installation))
- At least one MCP server installed (see [MCP Server Examples](#mcp-server-examples))
- LLM API credentials (Anthropic, OpenAI, or Gemini)

## Step 1: Installation

### Build from Source

```bash
# Clone repository
git clone <repository-url>
cd tamamo-x-mcp

# Build standalone binary
deno task compile

# Verify installation
./dist/tamamo-x --version
```

Expected output:

```
tamamo-x-mcp v0.1.0
```

## Step 2: Set Up MCP Servers

tamamo-x-mcp works with existing MCP servers. Here are some popular options:

### MCP Server Examples

**Filesystem Server** (File operations):

```bash
npm install -g @modelcontextprotocol/server-filesystem
```

**GitHub Server** (GitHub API):

```bash
npm install -g @modelcontextprotocol/server-github
```

**Brave Search Server** (Web search):

```bash
npm install -g @modelcontextprotocol/server-brave-search
```

### Create MCP Configuration

Create `.mcp.json` in your project directory:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    "github": {
      "command": "mcp-server-github"
    }
  }
}
```

## Step 3: Configure LLM Provider

### Option A: Use Claude Code Credentials (Recommended)

If you have Claude Code installed, tamamo-x-mcp can auto-discover your credentials:

```bash
# No setup needed - credentials auto-discovered from:
# ~/.config/claude/credentials.json
```

### Option B: Use Environment Variables

Set your API key as an environment variable:

```bash
# For Anthropic Claude
export ANTHROPIC_API_KEY="your-api-key-here"

# For OpenAI
export OPENAI_API_KEY="your-api-key-here"

# For Google Gemini
export GOOGLE_API_KEY="your-api-key-here"
```

### Option C: Use Codex Credentials

If you have Codex installed:

```bash
# Credentials auto-discovered from:
# ~/.codex/auth.json
```

## Step 4: Initialize Configuration

### Default Initialization (Recommended)

By default, `tamamo-x init` automatically detects all installed coding agents and replaces their MCP server configurations with tamamo-x-mcp only:

```bash
./dist/tamamo-x init
```

Expected output:

```
Initializing tamamo-x-mcp configuration...
Detecting installed coding agents...
Found 2 installed coding agent(s):
  - claude-code
  - codex
Found claude-code configuration at .mcp.json
Imported 5 MCP server(s) from claude-code
✓ Replaced claude-code configuration with tamamo-x-mcp only
Found codex configuration at .mcp.json
Imported 3 MCP server(s) from codex
✓ Replaced codex configuration with tamamo-x-mcp only
✓ Created tamamo-x.config.json
  MCP servers: 8
  LLM provider: anthropic
```

### Import from Specific Agent

To import from a specific coding agent instead of auto-detecting all:

```bash
# Import from Claude Code and replace its config with tamamo-x-mcp only (default)
./dist/tamamo-x init --agent claude-code

# Import from Claude Code and add tamamo-x-mcp while preserving existing servers
./dist/tamamo-x init --agent claude-code --preserve-servers

# Import from agent without modifying its config
./dist/tamamo-x init --agent codex --no-add-to-agent
```

### Manual Configuration (No Agent Modification)

If you don't want to modify any agent configurations, create `.mcp.json` first (see Step 2), then run:

```bash
./dist/tamamo-x init --no-add-to-agent
```

Expected output:

```
✓ Detected 2 MCP servers from .mcp.json
✓ Created tamamo-x.config.json
```

This creates a configuration file:

```json
{
  "version": "1.0.0",
  "mcpServers": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    {
      "name": "github",
      "transport": "stdio",
      "command": "mcp-server-github"
    }
  ],
  "llmProvider": {
    "type": "anthropic",
    "credentialSource": "cli-tool"
  }
}
```

## Step 5: Add Project Context (Optional)

Create `Agent.md` to help the LLM understand your project:

```markdown
# Project Context

This is a full-stack web application using:

- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL
- Infrastructure: Docker + AWS
```

tamamo-x-mcp will use this context to create more relevant tool groupings.

## Step 6: Build Sub-Agent Groups

Run the build command to analyze tools and create groups:

```bash
./dist/tamamo-x build
```

Expected output:

```
✓ Connected to 2 MCP servers
✓ Discovered 42 tools
✓ Analyzing tools with LLM...
✓ Created 5 specialized agent groups
✓ Saved groups to .tamamo-x/

Agent Groups:
  1. filesystem-operations (8 tools)
  2. github-management (12 tools)
  3. code-analysis (9 tools)
  4. documentation (7 tools)
  5. project-setup (6 tools)
```

### Inspect Generated Groups

Check the generated group structure:

```bash
ls -la .tamamo-x/
```

Output:

```
.tamamo-x/
├── instructions.md
└── groups/
    ├── filesystem-operations/
    │   ├── group.json
    │   ├── description.md
    │   └── prompt.md
    ├── github-management/
    │   ├── group.json
    │   ├── description.md
    │   └── prompt.md
    └── ...
```

View a group's description:

```bash
cat .tamamo-x/groups/filesystem-operations/description.md
```

## Step 7: Start MCP Server

Start the MCP server to expose your sub-agents:

```bash
./dist/tamamo-x mcp
```

Expected output:

```
✓ Loaded 5 agent groups
✓ MCP server started (stdio transport)
  Listening for requests...
```

The server is now running and ready to accept requests from MCP clients.

## Step 8: Connect to MCP Client

Configure your MCP client (e.g., Claude Desktop) to connect to tamamo-x-mcp:

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "tamamo-x": {
      "command": "/path/to/tamamo-x-mcp/dist/tamamo-x",
      "args": ["mcp"]
    }
  }
}
```

Restart Claude Desktop to apply changes.

## Verify Setup

Test that everything works:

1. Open Claude Desktop
2. Start a new conversation
3. Type: "List available tools"
4. You should see tools organized by your sub-agent groups

Example output:

```
Available tool groups:
- filesystem-operations: read_file, write_file, list_directory...
- github-management: create_issue, create_pr, search_repos...
- code-analysis: analyze_code, find_bugs, suggest_improvements...
```

## Next Steps

- **[Usage Guide](usage.md)**: Learn about advanced configuration options
- **[Use Cases](use-cases.md)**: See examples for different project types
- **[Troubleshooting](troubleshooting.md)**: Fix common issues

## Common Issues

### "No credentials found"

**Solution**: Ensure your API key is set:

```bash
export ANTHROPIC_API_KEY="your-key"
./dist/tamamo-x build
```

### "MCP server not responding"

**Solution**: Verify the MCP server command works standalone:

```bash
mcp-server-filesystem --root .
```

### "No tools discovered"

**Solution**: Check your `.mcp.json` configuration and ensure MCP servers are installed.

## Quick Reference

```bash
# Initialize configuration
./dist/tamamo-x init

# Build agent groups
./dist/tamamo-x build

# Start MCP server
./dist/tamamo-x mcp

# Show version
./dist/tamamo-x --version

# Show help
./dist/tamamo-x --help
```

## Example Workflow

Here's a complete workflow for a web development project:

```bash
# 1. Install MCP servers
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github

# 2. Create MCP config
cat > .mcp.json <<EOF
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    "github": {
      "command": "mcp-server-github"
    }
  }
}
EOF

# 3. Set API key
export ANTHROPIC_API_KEY="your-key"

# 4. Initialize tamamo-x
./dist/tamamo-x init

# 5. Build groups
./dist/tamamo-x build

# 6. Start server
./dist/tamamo-x mcp
```

Now you're ready to use tamamo-x-mcp with your AI assistant!
