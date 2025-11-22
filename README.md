# tamamo-x-mcp

**Intelligent MCP Tool Grouping & Sub-Agent System**

tamamo-x-mcp is an MCP (Model Context Protocol) server that automatically organizes tools from configured MCP servers into specialized sub-AI-agents using LLM intelligence and project context.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why tamamo-x-mcp?

When working with multiple MCP servers, managing dozens of tools becomes overwhelming. tamamo-x-mcp solves this by intelligently grouping related tools into specialized sub-agents, making your AI assistant more organized and efficient.

**Key Benefits**:

- 🧠 **Smart Tool Organization**: LLM analyzes and groups tools based on functionality and your project context
- 🎯 **Specialized Sub-Agents**: Creates 3-10 focused agent groups with 5-20 complementary tools each
- 🔌 **Multi-Provider Support**: Works with Anthropic, OpenAI, Gemini, AWS Bedrock, and more
- 🔐 **Zero Config Credentials**: Automatically discovers credentials from Claude Code, Codex, Gemini CLI
- 📦 **Easy Distribution**: Standalone Deno binary (zero dependencies) or npm package

## Quick Start

### Installation

**Option 1: Deno Binary (Recommended)**

Build from source:

```bash
# Clone repository
git clone <repository-url>
cd tamamo-x-mcp

# Build standalone binary
deno task compile

# Binary will be at: dist/tamamo-x
./dist/tamamo-x --version
```

**Option 2: npm Package**

```bash
# Install globally
npm install -g tamamo-x-mcp

# Or use via npx (no installation)
npx tamamo-x-mcp --version
```

### Usage (3 Simple Steps)

#### 1. Initialize Configuration

```bash
./dist/tamamo-x init
```

Creates `tamamo-x.config.json` with auto-detected MCP servers and LLM settings.

#### 2. Build Sub-Agents

```bash
./dist/tamamo-x build
```

Analyzes tools and creates specialized agent groups using LLM intelligence.

#### 3. Start MCP Server

```bash
./dist/tamamo-x mcp
```

Starts MCP server exposing grouped sub-agents via stdio transport.

## Example Configuration

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

## Documentation

### For Users

- **[Getting Started](docs/getting-started.md)**: Step-by-step tutorial for first-time users
- **[Usage Guide](docs/usage.md)**: Detailed configuration and CLI command reference
- **[Use Cases](docs/use-cases.md)**: Real-world examples for different project types
- **[Troubleshooting](docs/troubleshooting.md)**: Solutions to common problems

### For Developers

- **[Development Guide](DEVELOPMENT.md)**: Contributing and development setup
- **[Feature Specification](specs/001-tool-grouping/spec.md)**: Complete feature documentation

## Support

For issues and questions, please refer to the project repository.

## License

MIT License - see [LICENSE](LICENSE) for details.

## References

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Mastra Framework](https://mastra.ai/)
- [Deno Runtime](https://deno.com/)
