# Usage Guide

This guide provides detailed instructions for using tamamo-x-mcp.

## Table of Contents

- [Configuration](#configuration)
- [CLI Commands](#cli-commands)
- [LLM Provider Configuration](#llm-provider-configuration)
- [Architecture](#architecture)
- [Advanced Usage](#advanced-usage)

## Configuration

tamamo-x-mcp is configured via `tamamo-x.config.json` in your project root.

### Configuration Schema

```json
{
  "version": "1.0.0",
  "mcpServers": [
    {
      "name": "filesystem-server",
      "transport": "stdio",
      "command": "mcp-server-filesystem",
      "args": ["--root", "."]
    },
    {
      "name": "github-server",
      "transport": "stdio",
      "command": "mcp-server-github"
    }
  ],
  "llmProvider": {
    "type": "anthropic",
    "credentialSource": "cli-tool"
  },
  "groupingConstraints": {
    "minToolsPerGroup": 5,
    "maxToolsPerGroup": 20,
    "minGroups": 3,
    "maxGroups": 10
  },
  "projectContext": {
    "agentFilePath": "Agent.md",
    "claudeFilePath": "CLAUDE.md"
  }
}
```

### Configuration Fields

#### `version` (required)

- **Type**: `string`
- **Description**: Configuration schema version
- **Allowed Values**: `"1.0.0"`

#### `mcpServers` (required)

- **Type**: `array`
- **Description**: Array of MCP server configurations

**Server Object Schema**:

- `name` (required): Unique server identifier (string)
- `transport` (required): Transport type (`"stdio"`)
- `command` (required): Executable command (string)
- `args` (optional): Command-line arguments (array of strings)

**Example**:

```json
{
  "name": "filesystem-server",
  "transport": "stdio",
  "command": "mcp-server-filesystem",
  "args": ["--root", "."]
}
```

#### `llmProvider` (required)

- **Type**: `object`
- **Description**: LLM provider configuration for tool grouping

**Provider Object Schema**:

- `type` (required): Provider type (see [LLM Provider Configuration](#llm-provider-configuration))
- `credentialSource` (required): Credential discovery method
  - `"cli-tool"`: Auto-discover from Claude Code/Codex/Gemini CLI
  - `"env-var"`: Read from environment variables
  - `"prompt"`: Prompt user for credentials interactively
- `model` (optional): Model identifier (provider-specific)
- `endpointOverride` (optional): Custom API endpoint URL

#### `groupingConstraints` (optional)

- **Type**: `object`
- **Description**: Tool grouping algorithm constraints

**Default Values**:

```json
{
  "minToolsPerGroup": 5,
  "maxToolsPerGroup": 20,
  "minGroups": 3,
  "maxGroups": 10
}
```

#### `projectContext` (optional)

- **Type**: `object`
- **Description**: Project context files for domain-aware tool grouping

**Context Object Schema**:

- `agentFilePath` (optional): Path to Agent.md file (string)
- `claudeFilePath` (optional): Path to CLAUDE.md file (string)

**Example**:

```json
{
  "agentFilePath": "Agent.md",
  "claudeFilePath": "CLAUDE.md"
}
```

## CLI Commands

### `tamamo-x-mcp init`

Generate `tamamo-x.config.json` with auto-detected settings.

**Usage**:

```bash
tamamo-x-mcp init [options]
```

**Options**:

- `--version`, `-v`: Show version information
- `--help`, `-h`: Show help message

**Behavior**:

1. Auto-imports MCP servers from `.mcp.json` (if present)
2. Detects project context files (`Agent.md`, `CLAUDE.md`)
3. Creates config at `./tamamo-x.config.json`
4. Uses default LLM provider (Anthropic with CLI credential discovery)

**Example**:

```bash
$ tamamo-x-mcp init
✓ Detected 2 MCP servers from .mcp.json
✓ Found project context: Agent.md, CLAUDE.md
✓ Created tamamo-x.config.json
```

### `tamamo-x-mcp build`

Analyze tools and create sub-agent groups using LLM.

**Usage**:

```bash
tamamo-x-mcp build [options]
```

**Options**:

- `--version`, `-v`: Show version information
- `--help`, `-h`: Show help message

**Behavior**:

1. Reads configuration from `./tamamo-x.config.json`
2. Connects to configured MCP servers
3. Discovers all available tools
4. Groups tools using LLM analysis
5. Saves groups to `./.tamamo-x/` directory structure

**Output Structure**:

```
.tamamo-x/
├── instructions.md          # Master instructions for all groups
└── groups/
    ├── group-1/             # Group 1 directory
    │   ├── group.json       # Group metadata
    │   ├── description.md   # Group description
    │   └── prompt.md        # System prompt
    ├── group-2/             # Group 2 directory
    │   ├── group.json
    │   ├── description.md
    │   └── prompt.md
    └── group-3/             # Group 3 directory
        ├── group.json
        ├── description.md
        └── prompt.md
```

**Example**:

```bash
$ tamamo-x-mcp build
✓ Connected to 2 MCP servers
✓ Discovered 42 tools
✓ Created 5 specialized agent groups
✓ Saved groups to .tamamo-x/
```

### `tamamo-x-mcp mcp`

Start MCP server exposing grouped sub-agents.

**Usage**:

```bash
tamamo-x-mcp mcp [options]
```

**Options**:

- `--version`, `-v`: Show version information
- `--help`, `-h`: Show help message

**Behavior**:

1. Reads configuration from `./tamamo-x.config.json`
2. Loads groups from `./.tamamo-x/` directory structure
3. Starts stdio-based MCP server
4. Exposes sub-agents as MCP tools

**Example**:

```bash
$ tamamo-x-mcp mcp
✓ Loaded 5 agent groups
✓ MCP server started (stdio transport)
```

### Global Options

All commands support these global options:

- `--version`, `-v`: Show version information
- `--help`, `-h`: Show help message

## LLM Provider Configuration

tamamo-x-mcp supports 6 LLM providers.

### Anthropic (Claude)

**Type**: `anthropic`

**Credential Sources**:

- `cli-tool`: Auto-discover from `~/.config/claude/credentials.json`
- `env-var`: Read from `ANTHROPIC_API_KEY` environment variable

**Configuration Example**:

```json
{
  "type": "anthropic",
  "credentialSource": "cli-tool",
  "model": "claude-4-5-haiku"
}
```

**Default Model**: `claude-4-5-haiku`

### OpenAI (GPT)

**Type**: `openai`

**Credential Sources**:

- `cli-tool`: Auto-discover from `~/.codex/auth.json`
- `env-var`: Read from `OPENAI_API_KEY` environment variable

**Configuration Example**:

```json
{
  "type": "openai",
  "credentialSource": "env-var",
  "model": "gpt-5.1"
}
```

**Default Model**: `gpt-5.1`

### Google (Gemini)

**Type**: `gemini`

**Credential Sources**:

- `cli-tool`: Auto-discover from `~/.config/gcloud/application_default_credentials.json`
- `env-var`: Read from `GOOGLE_API_KEY` environment variable

**Configuration Example**:

```json
{
  "type": "gemini",
  "credentialSource": "cli-tool",
  "model": "gemini-2.5-pro-latest"
}
```

**Default Model**: `gemini-2.5-pro-latest`

### Vercel AI SDK

**Type**: `vercel`

**Credential Sources**:

- `env-var`: Read from provider-specific environment variables

**Configuration Example**:

```json
{
  "type": "vercel",
  "credentialSource": "env-var",
  "model": "gpt-4"
}
```

### AWS Bedrock

**Type**: `bedrock`

**Credential Sources**:

- `env-var`: Read from AWS SDK environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)

**Configuration Example**:

```json
{
  "type": "bedrock",
  "credentialSource": "env-var",
  "model": "anthropic.claude-3-sonnet-20240229-v1:0"
}
```

### OpenRouter

**Type**: `openrouter`

**Credential Sources**:

- `env-var`: Read from `OPENROUTER_API_KEY` environment variable

**Configuration Example**:

```json
{
  "type": "openrouter",
  "credentialSource": "env-var",
  "model": "anthropic/claude-3-opus",
  "endpointOverride": "https://openrouter.ai/api/v1"
}
```

**Note**: OpenRouter uses the OpenAI client with a custom `endpointOverride`.

## Architecture

### Tool Grouping Algorithm

The tool grouping algorithm works in 5 phases:

#### 1. Discovery Phase

- Connects to all configured MCP servers
- Enumerates all available tools
- Collects tool metadata (name, description, parameters)

#### 2. Analysis Phase

- LLM analyzes tool descriptions and parameters
- Incorporates project context from `Agent.md` and `CLAUDE.md`
- Identifies semantic relationships between tools

#### 3. Grouping Phase

- Creates groups satisfying constraints (5-20 tools, 3-10 groups)
- Tools may appear in multiple groups if they fit multiple contexts
- Optimizes for complementary tool combinations

#### 4. Validation Phase

- Verifies all constraints are met
- Saves groups to `.tamamo-x/` directory

### Multi-Provider LLM Abstraction

The `LLMClient` interface provides a unified abstraction over 6 providers:

- **Anthropic**: Claude models via `@anthropic-ai/sdk`
- **OpenAI**: GPT models via `openai` SDK
- **Gemini**: Gemini models via `@google/genai`
- **Vercel AI**: Multiple models via Vercel AI SDK
- **AWS Bedrock**: Claude and other models via AWS Bedrock Runtime
- **OpenRouter**: Multiple models via OpenAI-compatible API (uses OpenAI SDK with custom endpoint)

**Credential Discovery Flow**:

1. Check credential source configuration
2. For `cli-tool`:
   - Anthropic: Read `~/.config/claude/credentials.json`
   - OpenAI: Read `~/.codex/auth.json`
   - Gemini: Read `~/.config/gcloud/application_default_credentials.json` or `GOOGLE_API_KEY`
3. For `env-var`: Read provider-specific environment variables
4. For `prompt`: Interactively prompt user for credentials (not stored in config)

### Sub-Agent System

Each agent group becomes a specialized sub-agent using agent frameworks:

- **Anthropic provider**: Uses Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- **Other providers**: Uses Vercel AI SDK (`ai`)

**Architecture**:

```
MCP Server
├── Agent Group 1 (Filesystem Tools)
│   ├── read_file
│   ├── write_file
│   └── list_directory
├── Agent Group 2 (GitHub Tools)
│   ├── create_issue
│   ├── create_pr
│   └── search_repos
└── Agent Group 3 (Search Tools)
    ├── web_search
    ├── code_search
    └── documentation_search
```

**Request Routing**:

1. Client sends request to MCP server
2. MCP server identifies target agent group by ID
3. Request forwarded to Mastra agent
4. Agent executes MCP tools
5. Response returned to client

## Advanced Usage

### Custom Grouping Constraints

Adjust grouping constraints for different use cases:

**Fewer, Larger Groups** (for simpler projects):

```json
{
  "groupingConstraints": {
    "minToolsPerGroup": 10,
    "maxToolsPerGroup": 30,
    "minGroups": 2,
    "maxGroups": 5
  }
}
```

**More, Smaller Groups** (for complex projects):

```json
{
  "groupingConstraints": {
    "minToolsPerGroup": 3,
    "maxToolsPerGroup": 10,
    "minGroups": 5,
    "maxGroups": 15
  }
}
```

### Using Project Context

Provide domain-specific context for better tool grouping:

**Agent.md** (agent behavior instructions):

```markdown
# Agent Instructions

You are a full-stack web developer specializing in React and Node.js.
```

**CLAUDE.md** (project-specific instructions):

```markdown
# Project Instructions

This is a monorepo using Turborepo with:

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + PostgreSQL
```

tamamo-x-mcp will use this context to create domain-aware groupings (e.g., "Frontend Tools", "Backend Tools", "Database Tools").

### Multiple MCP Server Configurations

Configure multiple MCP servers for comprehensive tool coverage:

```json
{
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
    },
    {
      "name": "postgres",
      "transport": "stdio",
      "command": "mcp-server-postgres",
      "args": ["--connection-string", "postgresql://localhost/mydb"]
    },
    {
      "name": "brave-search",
      "transport": "stdio",
      "command": "mcp-server-brave-search"
    }
  ]
}
```
