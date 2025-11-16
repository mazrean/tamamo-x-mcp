# Research: MCP Tool Grouping & Sub-Agent System

**Feature**: 001-tool-grouping
**Date**: 2025-11-15
**Status**: Complete

## Overview

This document resolves all technical uncertainties identified in the implementation plan, particularly around LLM provider SDK selection, MCP protocol integration, and Mastra framework usage for agent coordination.

## 1. LLM Provider SDKs Selection

### Decision

Use official/recommended SDKs for each provider with a unified abstraction layer:

- **Anthropic**: `@anthropic-ai/sdk` (official)
- **OpenAI**: `openai` (official)
- **Gemini**: `@google/generative-ai` (official Google SDK)
- **Vercel AI**: `ai` (Vercel AI SDK with provider adapters)
- **AWS Bedrock**: `@aws-sdk/client-bedrock-runtime` (official AWS SDK)
- **OpenRouter**: `openai` SDK (OpenRouter is OpenAI-compatible)

### Rationale

- **Official support**: Using official SDKs ensures long-term compatibility and access to latest features
- **Type safety**: All SDKs provide TypeScript definitions for strong typing
- **Deno compatibility**: All packages work with Deno via npm specifiers (`npm:package-name`)
- **Credential discovery**: Each SDK has standard environment variable conventions that align with CLI tool credential storage
- **Unified interface**: Despite different APIs, all SDKs support chat completion patterns that can be abstracted

### Alternatives Considered

- **LangChain**: Too heavyweight for our needs, adds unnecessary abstraction layers
- **Direct REST API calls**: Less type-safe, more maintenance burden, no automatic retries/error handling
- **Vercel AI SDK only**: Doesn't support all 6 required providers with credential discovery

### Implementation Notes

```typescript
// Unified LLM client interface
interface LLMClient {
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
  provider: LLMProvider;
}

// Provider-specific implementations wrap official SDKs
class AnthropicClient implements LLMClient { ... }
class OpenAIClient implements LLMClient { ... }
// ... etc
```

## 2. MCP Protocol Integration

### Decision

Use the `@modelcontextprotocol/sdk` package (official MCP SDK) for both client and server implementations.

### Rationale

- **Official specification**: Maintained by Anthropic as the canonical MCP implementation
- **Deno support**: Works via npm specifiers
- **Dual role**: Provides both client (for discovering tools) and server (for exposing sub-agents) capabilities
- **Protocol compliance**: Automatically handles MCP message format, versioning, and handshake

### Alternatives Considered

- **Custom protocol implementation**: High maintenance burden, risk of protocol drift
- **JSON-RPC library + custom MCP layer**: Reinventing the wheel, no type safety for MCP-specific messages

### Implementation Notes

```typescript
import { Client, Server } from "npm:@modelcontextprotocol/sdk";

// Client for tool discovery
const mcpClient = new Client({
  name: "tamamo-x-mcp",
  version: "1.0.0",
});

// Server for exposing sub-agents
const mcpServer = new Server({
  name: "tamamo-x-mcp",
  version: "1.0.0",
});
```

## 3. Mastra Framework Integration

### Decision

Use Mastra for agent orchestration and workflow management, with custom tool grouping logic built on top.

### Rationale

- **Agent primitives**: Mastra provides agent creation, memory, and tool execution primitives
- **TypeScript-first**: Built for TypeScript with strong typing
- **Deno compatibility**: Works with Deno (confirmed via documentation)
- **Flexible**: Allows custom tool implementations (we can wrap MCP tools)
- **LLM agnostic**: Supports multiple LLM providers via adapters

### Integration Strategy

```typescript
import { Agent, Tool } from "npm:mastra";

// Wrap MCP tools as Mastra tools
const mastraTool = new Tool({
  name: mcpTool.name,
  description: mcpTool.description,
  execute: async (args) => {
    // Call original MCP tool via client
    return await mcpClient.callTool(mcpTool.name, args);
  },
});

// Create sub-agent with grouped tools
const subAgent = new Agent({
  name: groupName,
  description: groupDescription,
  tools: groupedMastraTools,
  llm: selectedLLMClient,
});
```

### Alternatives Considered

- **LangChain Agents**: Too opinionated, harder to customize tool grouping behavior
- **Custom agent implementation**: Mastra provides battle-tested primitives; reinventing is unnecessary

## 4. Credential Discovery Strategy

### Decision

Implement platform-specific credential discovery for each CLI tool:

| CLI Tool               | Credential Location                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| **Claude Code**        | `~/.config/claude/credentials.json` (Linux/macOS), `%APPDATA%\claude\credentials.json` (Windows) |
| **Codex (OpenAI CLI)** | `~/.config/openai/config.json` or `OPENAI_API_KEY` env var                                       |
| **Gemini CLI**         | `~/.config/gcloud/application_default_credentials.json` or `GOOGLE_API_KEY` env var              |

### Rationale

- **Security**: Never store credentials in config files (constitution requirement)
- **User convenience**: Reuse existing credentials users have already set up
- **Fallback**: If CLI tool credentials not found, prompt for API key (stored in env var or system keychain)

### Implementation Notes

```typescript
async function discoverCredentials(provider: LLMProvider): Promise<string> {
  switch (provider) {
    case "anthropic":
      return await readClaudeCodeCredentials() ??
        Deno.env.get("ANTHROPIC_API_KEY") ??
        await promptForKey();
      // ... other providers
  }
}
```

## 5. Dual Distribution Strategy

### Decision

- **Deno binary**: Use `deno compile` with `--allow-all` for zero-dependency standalone executable
- **npm package**: Publish to npm with `deno.json` configured for Node.js compatibility

### Rationale

- **Deno compile**: Bundles all dependencies into single binary, no runtime installation needed
- **Node.js compatibility**: Deno 2.x provides first-class Node.js compatibility via `npm:` specifiers
- **Build validation**: CI pipeline tests both distributions against identical test suites

### Build Configuration

```json
// deno.json
{
  "tasks": {
    "compile": "deno compile --allow-all --output dist/tamamo-x src/cli/main.ts",
    "npm:build": "deno run -A scripts/build_npm.ts"
  },
  "exports": "./src/cli/main.ts"
}
```

## 6. Performance Optimization

### Decision

- **Concurrent tool discovery**: Use `Promise.all()` to discover tools from multiple MCP servers in parallel
- **LLM request batching**: Group tool analysis requests to minimize LLM API calls
- **Caching**: Cache tool metadata in memory during build process (no persistent cache needed)

### Rationale

- **Performance goals**: Build must complete <10min for 100 tools (SC-003)
- **Cost efficiency**: Fewer LLM API calls reduce costs
- **Simplicity**: In-memory cache avoids filesystem complexity

### Implementation Notes

```typescript
// Parallel tool discovery
const allTools = await Promise.all(
  mcpServers.map((server) => discoverTools(server)),
);

// Batch LLM analysis (analyze 10 tools per request)
const batches = chunk(allTools, 10);
const analysisResults = await Promise.all(
  batches.map((batch) => llm.analyzeTools(batch)),
);
```

## 7. Testing Strategy

### Decision

Three-tier testing approach:

1. **Unit tests**: Test individual modules (config, MCP client, LLM abstraction) with mocks
2. **Integration tests**: Test workflows (init → build → mcp) with fixture data
3. **Contract tests**: Validate MCP protocol compliance and LLM provider responses

### Rationale

- **TDD requirement**: Constitution mandates test-first development
- **Quality gates**: All tests must pass before task completion
- **Real-world validation**: Integration tests use fixture data resembling actual MCP tool catalogs

### Test Structure

```typescript
// tests/unit/grouping/grouper_test.ts
Deno.test("grouper satisfies tool count constraints", async () => {
  const tools = createMockTools(50);
  const groups = await groupTools(tools, mockLLM);

  assertEquals(groups.length >= 3 && groups.length <= 10, true);
  groups.forEach((group) => {
    assertEquals(group.tools.length >= 5 && group.tools.length <= 20, true);
  });
});
```

## 8. CI/CD Strategy (GitHub Actions)

### Decision

Implement comprehensive CI/CD pipeline using GitHub Actions with the following workflows:

1. **Continuous Integration (CI)**: Lint, test, and build on every push/PR
2. **Distribution Validation**: Test both Deno binary and npm package
3. **Release Automation**: Automated releases with changelog generation
4. **Dependency Updates**: Automated dependency updates via Dependabot

### Rationale

- **Constitution compliance**: Automate quality gates (lint, tests) enforcement
- **Feature parity validation**: Ensure Deno binary and npm package remain identical
- **Test-first enforcement**: CI fails if tests don't exist or fail
- **Cross-platform validation**: Test on Linux, macOS, Windows
- **Fast feedback**: Developers get immediate feedback on quality gate violations

### Workflow Architecture

```yaml
# .github/workflows/ci.yml - Main CI pipeline
on: [push, pull_request]

jobs:
  lint:
    - deno lint
    - deno fmt --check

  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - deno test tests/unit/
      - deno test tests/integration/

  build:
    - deno compile (Deno binary)
    - deno task npm:build (npm package)

  distribution-parity:
    - Test Deno binary against test suite
    - Test npm package against same test suite
    - Fail if results differ
```

### Quality Gate Matrix

| Gate                   | Tool                            | Blocking   | Configuration              |
| ---------------------- | ------------------------------- | ---------- | -------------------------- |
| **Linting**            | `deno lint`                     | ✅ Yes     | Strict mode, zero warnings |
| **Formatting**         | `deno fmt`                      | ✅ Yes     | Standard Deno style        |
| **Unit Tests**         | `deno test tests/unit/`         | ✅ Yes     | 100% must pass             |
| **Integration Tests**  | `deno test tests/integration/`  | ✅ Yes     | 100% must pass             |
| **Distribution Tests** | `deno test tests/distribution/` | ✅ Yes     | Parity validation          |
| **Type Checking**      | `deno check`                    | ✅ Yes     | Strict TypeScript mode     |
| **Coverage**           | `deno coverage`                 | ⚠️ Warning | Minimum 80% (not blocking) |

### Workflow Files Structure

```
.github/
├── workflows/
│   ├── ci.yml                 # Main CI pipeline (lint + test + build)
│   ├── release.yml            # Release automation (tags → GitHub Releases)
│   ├── distribution.yml       # Distribution validation (feature parity)
│   └── dependency-update.yml  # Automated dependency updates
├── dependabot.yml             # Dependabot configuration
└── CODEOWNERS                 # Code ownership rules
```

### CI Pipeline Phases

**Phase 1: Quality Gates** (runs first, fast feedback)

- Lint check (30s)
- Format check (30s)
- Type check (1min)

**Phase 2: Testing** (parallel across OS matrix)

- Unit tests (5-10min per OS)
- Integration tests (10-15min per OS)

**Phase 3: Distribution** (only on main branch)

- Build Deno binary (2min)
- Build npm package (2min)
- Distribution parity tests (5min)

**Phase 4: Release** (only on tag push)

- Create GitHub Release
- Upload Deno binary artifacts
- Publish npm package
- Generate changelog

### Environment Variables & Secrets

Required GitHub Secrets:

- `ANTHROPIC_API_KEY` (for integration tests with real LLM)
- `OPENAI_API_KEY` (for multi-provider testing)
- `NPM_TOKEN` (for automated npm publishing)

**Security**: Use GitHub Environments for production deployments with approval gates.

### Test Fixtures & Mocking

- **Unit tests**: Use mocked LLM responses (no API calls)
- **Integration tests**: Use fixture MCP servers (no external dependencies)
- **Distribution tests**: Use real Deno/npm binaries against fixtures
- **E2E tests** (optional): Use real LLM APIs (only on main branch, rate-limited)

### CI Performance Optimization

```yaml
# Cache Deno dependencies
- uses: actions/cache@v3
  with:
    path: |
      ~/.deno
      ~/.cache/deno
    key: deno-${{ hashFiles('deno.lock') }}

# Parallel test execution
- deno test --parallel tests/unit/
```

### Branch Protection Rules

Required for `main` branch:

- ✅ Require status checks to pass before merging
  - ✅ lint
  - ✅ test (all OS matrix)
  - ✅ build
- ✅ Require branches to be up to date before merging
- ✅ Require linear history (no merge commits)
- ✅ Do not allow force pushes

### Release Strategy

**Versioning**: Semantic Versioning (MAJOR.MINOR.PATCH)

**Automated Release Process**:

1. Developer creates tag: `git tag v1.0.0 && git push --tags`
2. GitHub Actions triggers release workflow
3. Builds both distributions (Deno binary + npm package)
4. Creates GitHub Release with:
   - Changelog (auto-generated from commits)
   - Deno binary attachments (Linux, macOS, Windows)
   - npm package published to registry
5. Updates documentation with new version

### Continuous Monitoring

- **CI Success Rate**: Target >95% green builds
- **Build Time**: Target <20min total pipeline time
- **Test Flakiness**: Zero tolerance for flaky tests
- **Coverage Trend**: Monitor coverage over time (target 80%+)

### Implementation Notes

```yaml
# Example: ci.yml structure
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x
      - run: deno lint
      - run: deno fmt --check
      - run: deno check src/**/*.ts

  test:
    needs: quality-gates
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      - run: deno test --parallel tests/unit/
      - run: deno test tests/integration/

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      - run: deno task compile
      - run: deno task npm:build
      - uses: actions/upload-artifact@v3
        with:
          name: distributions
          path: dist/
```

## Research Complete

All technical uncertainties resolved, including CI/CD automation strategy. Ready to proceed to Phase 1 (Design & Contracts).
