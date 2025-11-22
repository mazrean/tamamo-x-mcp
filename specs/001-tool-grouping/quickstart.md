# Quickstart: MCP Tool Grouping & Sub-Agent System

**Feature**: 001-tool-grouping
**Date**: 2025-11-15

## Overview

This quickstart guide walks through using tamamo-x-mcp to organize MCP server tools into specialized sub-agents and deploy them as an MCP server.

## Prerequisites

- **Deno 2.x** or **Node.js 20+** installed
- At least one MCP server installed and accessible
- LLM API credentials (Anthropic, OpenAI, Gemini, etc.)

## Installation

### Option 1: Deno Binary (Recommended)

Download the pre-built standalone binary (zero dependencies):

**Linux/macOS:**

```bash
# Download and install
curl -fsSL https://github.com/mazrean/tamamo-x-mcp/releases/latest/download/tamamo-x-$(uname -s)-$(uname -m) -o tamamo-x
chmod +x tamamo-x
sudo mv tamamo-x /usr/local/bin/

# Verify installation
tamamo-x --version
```

**Windows:**

Download `tamamo-x-Windows-x86_64.exe` from the [releases page](https://github.com/mazrean/tamamo-x-mcp/releases), rename to `tamamo-x.exe`, and add to your PATH.

### Option 2: npm Package

Install via npm registry:

```bash
# Install globally
npm install -g tamamo-x-mcp

# Verify installation
tamamo-x --version

# Or use via npx (no installation required)
npx tamamo-x-mcp --version
```

### Option 3: Build from Source

For development or if pre-built binaries are unavailable:

```bash
# Clone repository
git clone <repository-url>
cd tamamo-x-mcp

# Build Deno binary
deno task compile
./dist/tamamo-x --version

# Or build npm package
deno task npm:build
cd npm && npm pack
```

## Quick Start (3 Steps)

### Step 1: Initialize Configuration

```bash
# Run init command
tamamo-x init

# Follow interactive prompts:
# - Select MCP servers to connect
# - Choose LLM provider
# - Specify project context files (optional)
```

**Output**: `tamamo-x.config.json` created in project root.

**Example config**:

```json
{
  "version": "1.0.0",
  "mcpServers": [
    {
      "name": "filesystem-server",
      "transport": "stdio",
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    }
  ],
  "llmProvider": {
    "type": "anthropic",
    "credentialSource": "cli-tool"
  }
}
```

---

### Step 2: Build Sub-Agents

```bash
# Analyze tools and create groups
tamamo-x build

# The command will:
# 1. Connect to configured MCP servers
# 2. Discover all available tools
# 3. Use LLM to analyze and group tools
# 4. Create 3-10 specialized agent groups
# 5. Save groups to .tamamo-x/groups.json
```

**Output**:

```
Connecting to MCP servers...
✓ Connected to filesystem-server (12 tools found)

Analyzing tools with Claude...
✓ Created 4 agent groups:
  - file_operations_agent (8 tools)
  - search_agent (6 tools)
  - monitoring_agent (5 tools)
  - system_agent (7 tools)

Build complete! Groups saved to .tamamo-x/groups.json
```

---

### Step 3: Start MCP Server

```bash
# Start MCP server exposing sub-agents
tamamo-x mcp

# Server starts and listens for connections
# Sub-agents are exposed as MCP tools
```

**Output**:

```
Starting tamamo-x MCP server...
✓ Loaded 4 sub-agents
✓ Server ready on stdio

Available agents:
  - file_operations_agent
  - search_agent
  - monitoring_agent
  - system_agent

Waiting for connections...
```

---

## Using Sub-Agents

### From Claude Code

Add tamamo-x-mcp to Claude Code's MCP configuration:

```json
{
  "mcpServers": {
    "tamamo-x": {
      "command": "tamamo-x",
      "args": ["mcp"]
    }
  }
}
```

If installed via npx:

```json
{
  "mcpServers": {
    "tamamo-x": {
      "command": "npx",
      "args": ["tamamo-x-mcp", "mcp"]
    }
  }
}
```

Then use sub-agents in Claude Code:

```
User: @tamamo-x file_operations_agent: List all TypeScript files and count lines of code

Claude: Using file_operations_agent...
[Agent uses grouped tools: list_files, read_file, count_lines]

Result: Found 42 TypeScript files with 8,543 total lines of code.
```

### From Other MCP Clients

Any MCP-compatible client can connect to tamamo-x-mcp:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({
  name: "my-client",
  version: "1.0.0",
}, {
  capabilities: {},
});

const transport = new StdioClientTransport({
  command: "tamamo-x",
  args: ["mcp"],
});

await client.connect(transport); // Handshake happens automatically
const tools = await client.listTools();

// Call sub-agent
const result = await client.callTool("search_agent", {
  task: "Find all TODO comments in the codebase",
});
```

If using npx:

```typescript
const transport = new StdioClientTransport({
  command: "npx",
  args: ["tamamo-x-mcp", "mcp"],
});
// ... rest is the same
```

---

## Configuration Options

### MCP Server Transports

**stdio** (Most common):

```json
{
  "name": "my-server",
  "transport": "stdio",
  "command": "mcp-server-command",
  "args": ["--option", "value"]
}
```

**HTTP**:

```json
{
  "name": "remote-server",
  "transport": "http",
  "url": "http://localhost:3000"
}
```

**WebSocket**:

```json
{
  "name": "ws-server",
  "transport": "websocket",
  "url": "ws://localhost:8080"
}
```

---

### LLM Providers

**Anthropic Claude**:

```json
{
  "type": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "credentialSource": "cli-tool"
}
```

**OpenAI**:

```json
{
  "type": "openai",
  "model": "gpt-4o",
  "credentialSource": "env-var"
}
```

**Gemini**:

```json
{
  "type": "gemini",
  "model": "gemini-2.0-flash-exp",
  "credentialSource": "cli-tool"
}
```

**Custom endpoint**:

```json
{
  "type": "openrouter",
  "credentialSource": "env-var",
  "endpointOverride": "https://openrouter.ai/api/v1"
}
```

---

### Project Context

Tailor grouping to your project by referencing context files:

```json
{
  "projectContext": {
    "agentFilePath": ".claude/agent.md",
    "claudeFilePath": ".claude/CLAUDE.md",
    "domain": "web-development",
    "customHints": [
      "Separate frontend and backend tools",
      "Group database operations together"
    ]
  }
}
```

---

### Grouping Constraints

Override default grouping rules:

```json
{
  "groupingConstraints": {
    "minToolsPerGroup": 3,
    "maxToolsPerGroup": 15,
    "minGroups": 2,
    "maxGroups": 8
  }
}
```

---

## Common Workflows

### Add New MCP Server

```bash
# Edit tamamo-x.config.json
vim tamamo-x.config.json

# Add new server to mcpServers array

# Rebuild groups
tamamo-x build

# Restart server
tamamo-x mcp
```

---

### Change LLM Provider

```bash
# Edit config
vim tamamo-x.config.json

# Update llmProvider section

# Rebuild with new provider
tamamo-x build
```

---

### Manual Grouping Adjustment

```bash
# Edit generated groups (advanced)
vim .tamamo-x/groups.json

# Restart server (no rebuild needed)
tamamo-x mcp
```

---

## Troubleshooting

### "Failed to connect to MCP server"

- Verify server command is in PATH
- Check server accepts stdio/http/ws connections
- Test server independently: `mcp-server-command --help`

### "LLM API credentials not found"

- For Claude Code: Run `claude login` first
- For OpenAI: Set `OPENAI_API_KEY` environment variable
- For Gemini: Run `gcloud auth application-default login`

### "Tool grouping violates constraints"

- Adjust `groupingConstraints` in config
- Reduce `minToolsPerGroup` if you have few tools
- Increase `maxGroups` if you have many tools

### "Build takes too long"

- Reduce number of MCP servers temporarily
- Use faster LLM model (e.g., claude-3-haiku, gpt-4o-mini)
- Enable debug logging: `tamamo-x-mcp build --verbose`

---

## Advanced Usage

### Environment Variables

```bash
# Override LLM provider at runtime
TAMAMO_LLM_PROVIDER=openai tamamo-x build

# Set API key directly
ANTHROPIC_API_KEY=sk-... tamamo-x build

# Enable debug logging
TAMAMO_LOG_LEVEL=debug tamamo-x mcp
```

---

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Install tamamo-x-mcp
  run: npm install -g tamamo-x-mcp

- name: Build sub-agents
  run: |
    tamamo-x init --non-interactive
    tamamo-x build
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

- name: Test MCP server
  run: |
    tamamo-x mcp --test-mode &
    sleep 5
    # Run integration tests
```

---

### Programmatic Access

```typescript
import { buildGroups, loadConfig, startServer } from "tamamo-x-mcp/sdk";

// Load config
const config = await loadConfig("./tamamo-x.config.json");

// Build groups
const groups = await buildGroups(config);

// Start server programmatically
const server = await startServer(groups, {
  transport: "http",
  port: 3000,
});
```

---

## Next Steps

- **Explore sub-agent capabilities**: Try different task prompts to see how agents use tools
- **Customize grouping**: Add project context files to tailor agents to your workflow
- **Monitor usage**: Check `.tamamo-x/logs/` for agent execution logs (if enabled)
- **Share groups**: Commit `.tamamo-x/groups.json` to version control for team consistency

---

## Getting Help

- **Documentation**: https://tamamo-x.dev/docs
- **GitHub Issues**: https://github.com/you/tamamo-x-mcp/issues
- **Community**: https://discord.gg/tamamo-x

---

## Quickstart Complete

You now have MCP tools organized into specialized sub-agents! 🎉
