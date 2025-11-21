# tamamo-x-mcp

**Intelligent MCP Tool Grouping & Sub-Agent System**

tamamo-x-mcp is an MCP (Model Context Protocol) server that automatically organizes tools from configured MCP servers into specialized sub-AI-agents using LLM intelligence and project context.

[![CI](https://github.com/yourusername/tamamo-x-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/tamamo-x-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yourusername/tamamo-x-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/tamamo-x-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Intelligent Tool Grouping**: Uses LLM to analyze and group tools based on functionality and project context
- **Multi-Provider LLM Support**: Anthropic, OpenAI, Gemini, Vercel AI, AWS Bedrock, OpenRouter
- **Automatic Credential Discovery**: Finds credentials from Claude Code, Codex, Gemini CLI
- **Specialized Sub-Agents**: Creates 3-10 agent groups with 5-20 complementary tools each
- **MCP Protocol Compliant**: Exposes grouped sub-agents via standard MCP server
- **Dual Distribution**: Standalone Deno binary (zero dependencies) and npm package
- **Project Context Awareness**: Incorporates `Agent.md` and `CLAUDE.md` for domain-specific grouping

## Quick Start

### Installation

**Option 1: Deno Binary (Recommended)**

```bash
# Download standalone binary
curl -fsSL https://tamamo-x.dev/install.sh | sh

# Verify installation
tamamo-x --version
```

**Option 2: npm Package**

```bash
# Install globally
npm install -g tamamo-x-mcp

# Or use via npx (no installation)
npx tamamo-x-mcp --version
```

### Usage (3 Steps)

#### 1. Initialize Configuration

```bash
tamamo-x-mcp init
```

Creates `tamamo-x.config.json` in your project root with:

- Auto-detected MCP servers from `.mcp.json` (if present)
- Default LLM provider configuration (Anthropic with CLI credential discovery)
- Optional project context from `Agent.md` and `CLAUDE.md` (if present)

#### 2. Build Sub-Agents

```bash
tamamo-x-mcp build
```

Analyzes tools and creates specialized agent groups:

- Connects to configured MCP servers
- Discovers all available tools
- Uses LLM to analyze and group tools
- Creates 3-10 specialized agent groups
- Saves groups to `.tamamo-x/` directory structure (instructions.md + groups/)

#### 3. Start MCP Server

```bash
tamamo-x-mcp mcp
```

Starts MCP server exposing grouped sub-agents on stdio transport.

## Configuration

Example `tamamo-x.config.json`:

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

- **mcpServers**: Array of MCP server configurations (name, transport, command, args)
- **llmProvider**: LLM provider configuration (type, credentialSource, optional model/endpoint)
- **groupingConstraints**: Tool grouping constraints (optional, defaults: 5-20 tools/group, 3-10 groups)
- **projectContext**: Project context files for domain-aware grouping (optional agentFilePath, claudeFilePath)

**Supported LLM Providers**:

- `anthropic`: Claude (via @anthropic-ai/sdk)
- `openai`: GPT-4, GPT-3.5 (via openai)
- `gemini`: Gemini Pro (via @google/generative-ai)
- `vercel`: Vercel AI SDK (via ai)
- `bedrock`: AWS Bedrock (via @aws-sdk/client-bedrock-runtime)
- `openrouter`: OpenRouter (via openai-compatible API)

## CLI Commands

### `tamamo-x-mcp init`

Generate `tamamo-x.config.json` with auto-detected settings.

- Auto-imports MCP servers from `.mcp.json` (if present)
- Detects project context files (`Agent.md`, `CLAUDE.md`)
- Creates config at `./tamamo-x.config.json`

### `tamamo-x-mcp build`

Analyze tools and create sub-agent groups using LLM.

- Reads configuration from `./tamamo-x.config.json`
- Connects to configured MCP servers
- Groups tools using LLM analysis
- Saves groups to `./.tamamo-x/` directory structure

### `tamamo-x-mcp mcp`

Start MCP server exposing grouped sub-agents.

- Reads configuration from `./tamamo-x.config.json`
- Loads groups from `./.tamamo-x/` directory structure
- Starts stdio-based MCP server

### Global Options

- `--version`, `-v`: Show version information
- `--help`, `-h`: Show help message

## Development

### Prerequisites

- Deno 2.x installed
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/tamamo-x-mcp.git
cd tamamo-x-mcp

# Run tests
deno test --allow-all

# Lint code
deno lint

# Format code
deno fmt

# Type check
deno check src/**/*.ts
```

### Build

```bash
# Build Deno standalone binary
deno task compile

# Build npm package
deno task npm:build
```

### Testing

```bash
# Run all tests
deno test --allow-all

# Run specific test suite
deno test --allow-all tests/unit/
deno test --allow-all tests/integration/
deno test --allow-all tests/distribution/

# Run with coverage
deno test --allow-all --coverage=cov_profile
deno coverage cov_profile --lcov --output=cov_profile.lcov
```

### Local CI Testing

Use [act](https://github.com/nektos/act) to test GitHub Actions workflows locally:

```bash
# Install act
brew install act  # macOS
# or follow instructions at https://github.com/nektos/act

# Run CI workflow
act push

# Run specific job
act -j quality-gates
act -j test-matrix
```

See [.github/TESTING.md](.github/TESTING.md) for detailed testing instructions.

## Architecture

### Tool Grouping Algorithm

1. **Discovery**: Connect to MCP servers and enumerate all tools
2. **Batching**: Process tools in batches of 10 for performance
3. **Analysis**: LLM analyzes tool descriptions, parameters, and project context
4. **Grouping**: Creates groups satisfying constraints (5-20 tools, 3-10 groups)
5. **Validation**: Ensures no tool is in multiple groups, all constraints met

### Multi-Provider LLM Abstraction

Unified `LLMClient` interface abstracts 6 providers:

- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- OpenAI (GPT-4, GPT-3.5 Turbo)
- Google (Gemini Pro)
- Vercel AI SDK
- AWS Bedrock
- OpenRouter

Credentials discovered automatically from:

- Claude Code (`~/.claude/config.json`)
- Codex (`~/.codex/config.json`)
- Gemini CLI (`gcloud auth print-access-token`)
- Environment variables

### Sub-Agent System

- Mastra framework wraps MCP tools as agent capabilities
- Each group becomes a specialized sub-agent
- Request routing by agent ID via MCP server

## Project Structure

```
tamamo-x-mcp/
├── src/
│   ├── cli/            # CLI commands (init, build, mcp)
│   ├── config/         # Configuration management
│   ├── mcp/            # MCP protocol client/server
│   ├── grouping/       # LLM-based tool grouping logic
│   ├── llm/            # Multi-provider LLM abstraction
│   │   └── providers/  # Provider-specific implementations
│   └── agents/         # Sub-agent execution and routing
├── tests/
│   ├── unit/           # Per-module unit tests
│   ├── integration/    # Multi-module integration tests
│   ├── distribution/   # Distribution parity tests
│   └── ci/             # CI enforcement meta-tests
├── .github/
│   ├── workflows/      # CI/CD workflows
│   ├── TESTING.md      # Local testing guide
│   └── BRANCH_PROTECTION.md  # Branch protection setup
└── specs/001-tool-grouping/  # Feature specification
```

## Contributing

We welcome contributions!

**Quick contribution checklist**:

- Follow TDD workflow (test-first development)
- Run `deno lint` and `deno fmt` before committing
- Ensure all tests pass (`deno test --allow-all`)
- Maintain ≥80% test coverage
- Follow constitution requirements (see `.specify/memory/constitution.md`)

## License

MIT License - see [LICENSE](LICENSE) for details.

## References

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Mastra Framework](https://mastra.ai/)
- [Deno Runtime](https://deno.com/)
- [Feature Specification](specs/001-tool-grouping/spec.md)
- [Implementation Plan](specs/001-tool-grouping/plan.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tamamo-x-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tamamo-x-mcp/discussions)
- **Documentation**: [specs/001-tool-grouping/](specs/001-tool-grouping/)
