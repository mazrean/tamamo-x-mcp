# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tamamo-x-mcp** is an MCP (Model Context Protocol) server that intelligently groups tools from configured MCP servers into specialized sub-AI-agents. It analyzes tools using LLM intelligence and project context to create 3-10 agent groups with 5-20 complementary tools each.

## Technology Stack

- **Runtime**: Deno 2.x (primary), Node.js 20+ (npm package compatibility)
- **Language**: TypeScript (strict mode with all strict flags enabled)
- **Agent Framework**: Mastra
- **MCP SDK**: @modelcontextprotocol/sdk
- **LLM SDKs**: @anthropic-ai/sdk, openai, @google/generative-ai, ai (Vercel), @aws-sdk/client-bedrock-runtime

## Development Commands

```bash
# Run all tests
deno test --allow-all

# Run specific test file
deno test --allow-all tests/unit/config/loader_test.ts

# Lint code
deno lint

# Format code
deno fmt

# Type check
deno check src/**/*.ts

# Compile standalone binary
deno task compile

# Build npm package
deno task npm:build
```

## Project Structure

```text
src/
├── cli/                    # Command-line interface (init, build, mcp)
├── config/                 # Configuration management
├── mcp/                    # MCP protocol client/server
├── grouping/               # LLM-based tool grouping logic
├── llm/                    # Multi-provider LLM abstraction
│   └── providers/          # Provider-specific implementations
├── agents/                 # Sub-agent execution and routing
└── types/                  # TypeScript type definitions

tests/
├── unit/                   # Per-module unit tests
├── integration/            # Multi-module integration tests
└── fixtures/               # Test data (mock configs, tools)

specs/001-tool-grouping/    # Detailed feature specification
├── spec.md                 # Feature requirements & user stories
├── plan.md                 # Implementation roadmap
├── data-model.md           # Entity definitions & validation
├── research.md             # Technical decisions
├── quickstart.md           # End-user guide
└── contracts/              # API contracts & schemas
```

## Key Architecture Patterns

### Configuration Management
- Configuration stored in `tamamo-x.config.json` at project root
- Embeds MCP server configurations in `.mcp.json` format
- Credentials NEVER stored in config (discovered from CLI tools or env vars)
- See [contracts/config-schema.json](specs/001-tool-grouping/contracts/config-schema.json)

### Multi-Provider LLM Abstraction
- Unified `LLMClient` interface abstracts 6 providers: Anthropic, OpenAI, Gemini, Vercel AI, AWS Bedrock, OpenRouter
- Credential discovery from Claude Code, Codex, Gemini CLI
- See [src/llm/client.ts](src/llm/client.ts) and [src/llm/providers/](src/llm/providers/)

### Tool Grouping Algorithm
- LLM analyzes tools in batches (10 tools per request for performance)
- Groups satisfy constraints: 5-20 tools per group, 3-10 total groups
- Uses project context (Agent.md, CLAUDE.md) for domain-aware grouping
- See [src/grouping/](src/grouping/)

### Sub-Agent System
- Mastra framework wraps MCP tools as agent capabilities
- Each group becomes a specialized sub-agent
- Request routing by agent ID
- See [src/agents/](src/agents/)

## Detailed Design References

When implementing features, **ALWAYS** consult the detailed design documents in `specs/001-tool-grouping/`:

- **[spec.md](specs/001-tool-grouping/spec.md)**: Functional requirements (FR-001 to FR-015), user stories, acceptance criteria
- **[plan.md](specs/001-tool-grouping/plan.md)**: Phase-by-phase implementation roadmap with artifact references
- **[data-model.md](specs/001-tool-grouping/data-model.md)**: Entity definitions and validation rules for all 10 entities
- **[research.md](specs/001-tool-grouping/research.md)**: Technical decisions (LLM SDKs, MCP integration, credential discovery)
- **[quickstart.md](specs/001-tool-grouping/quickstart.md)**: User-facing workflows (reference for CLI behavior)
- **[contracts/](specs/001-tool-grouping/contracts/)**: JSON schemas and protocol contracts

## CLI Commands

The project provides three main commands:

1. **`tamamo-x-mcp init`**: Generate `tamamo-x.config.json` with interactive prompts
2. **`tamamo-x-mcp build`**: Analyze tools and create sub-agent groups using LLM
3. **`tamamo-x-mcp mcp`**: Start MCP server exposing grouped sub-agents

## Distribution

Two distribution formats with identical functionality:
- **Deno standalone binary**: Zero-dependency executable (`deno task compile`)
- **npm package**: Executable via `npx tamamo-x-mcp` (`deno task npm:build`)

<!-- MANUAL ADDITIONS START -->
## Development Guidelines

You are working on a project that follows these strict development practices:

### Development Methodology
- Follow t-wada's TDD (Test-Driven Development) approach
- Make one commit per completed task

### Task Completion Requirements
After completing each task, you **MUST** perform ALL of the following steps in order:

1. **Code Quality Checks**
   - Run build process
   - Run lint checks
   - Run all tests

2. **Functional Verification**
   - Perform manual functionality testing to confirm the feature works as expected

3. **Pre-Documentation Update Steps**
   - Conduct code review using Codex MCP
   - Verify completion criteria with the project-planner sub-agent

4. **Documentation Update**
   - Update task progress in `docs/llm/PLAN.md`

### Important Notes
- Do NOT skip any of these steps
- Do NOT update `docs/llm/PLAN.md` until steps 1-3 are completed
- Always perform these steps in the specified order
<!-- MANUAL ADDITIONS END -->
