# Implementation Plan: MCP Tool Grouping & Sub-Agent System

**Branch**: `001-tool-grouping` | **Date**: 2025-11-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-tool-grouping/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build an MCP server that intelligently groups tools from configured MCP servers into specialized sub-agents (3-10 groups, 5-20 tools each) using LLM analysis. The system provides three commands: `init` for configuration setup, `build` for LLM-powered tool grouping, and `mcp` for serving grouped agents. Support multiple LLM providers (Anthropic, OpenAI, Gemini, Vercel AI, Bedrock, OpenRouter) with credential reuse from existing CLI tools. Distribute as both Deno standalone binary and npm package.

## Technical Context

**Language/Version**: TypeScript (strict mode), targeting Deno 2.x and Node.js 20+
**Primary Dependencies**: Mastra (agent framework), @modelcontextprotocol/sdk, official LLM SDKs (@anthropic-ai/sdk, openai, @google/generative-ai, ai, @aws-sdk/client-bedrock-runtime)
**Storage**: File-based configuration (`tamamo-x.config.json`), in-memory tool metadata cache
**Testing**: Deno test framework for unit/integration tests
**Target Platform**: Cross-platform CLI (Linux, macOS, Windows)
**Project Type**: Single CLI application with dual distribution
**Performance Goals**: Init <30s, build <10min for 100 tools, MCP server ready <10s
**Constraints**: Zero-dependency Deno binary, credential security (no config storage), MCP protocol compliance
**Scale/Scope**: Support 50-100 tools from 5-10 MCP servers, 3-10 agent groups, concurrent LLM requests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Test-First Development (NON-NEGOTIABLE)
- ✅ **PASS**: Plan includes test structure in project layout
- ✅ **PASS**: TDD workflow will be enforced per constitution (write tests → verify fail → implement)

### II. Quality Gates (NON-NEGOTIABLE)
- ✅ **PASS**: Deno lint configured for zero-error enforcement
- ✅ **PASS**: Unit and integration test suites planned
- ✅ **PASS**: Quality gates align with constitution requirements

### III. Modular Agent Design
- ✅ **PASS**: Feature explicitly requires 3-10 agent groups (FR-006)
- ✅ **PASS**: Each group must contain 5-20 complementary tools (FR-006)
- ✅ **PASS**: Clear separation of concerns via role-based grouping (FR-007)

### IV. API-First & Provider Agnostic
- ✅ **PASS**: Multi-provider LLM support required (FR-008: 6 providers)
- ✅ **PASS**: Credential reuse from CLI tools specified (FR-009)
- ✅ **PASS**: No credential storage in config files (FR-010)

### V. Distribution Flexibility
- ✅ **PASS**: Deno standalone binary required (FR-013)
- ✅ **PASS**: npm package distribution required (FR-014)
- ✅ **PASS**: Feature parity enforcement specified (FR-015)

**Constitution Compliance**: ✅ ALL GATES PASSED

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── cli/                    # Command-line interface entry points
│   ├── commands/           # init, build, mcp subcommands
│   └── main.ts             # CLI orchestration
├── config/                 # Configuration management
│   ├── loader.ts           # Read/write tamamo-x.config.json
│   └── validator.ts        # Config validation
├── mcp/                    # MCP protocol interaction
│   ├── client.ts           # MCP client for connecting to servers
│   ├── server.ts           # MCP server for exposing sub-agents
│   └── discovery.ts        # Tool discovery from MCP servers
├── grouping/               # Tool grouping logic
│   ├── analyzer.ts         # LLM-based tool analysis
│   ├── grouper.ts          # Grouping algorithm
│   └── validator.ts        # Group constraint validation
├── llm/                    # LLM provider abstraction
│   ├── providers/          # Provider-specific implementations
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   ├── gemini.ts
│   │   ├── vercel.ts
│   │   ├── bedrock.ts
│   │   └── openrouter.ts
│   ├── credentials.ts      # Credential discovery from CLI tools
│   └── client.ts           # Unified LLM interface
├── agents/                 # Sub-agent coordination
│   ├── agent.ts            # Agent execution logic
│   └── router.ts           # Request routing to tool groups
└── types/                  # TypeScript type definitions

tests/
├── unit/                   # Unit tests (per-module)
│   ├── config/
│   ├── mcp/
│   ├── grouping/
│   ├── llm/
│   └── agents/
├── integration/            # Integration tests (multi-module)
│   ├── init_workflow_test.ts
│   ├── build_workflow_test.ts
│   └── mcp_server_test.ts
└── fixtures/               # Test data (mock configs, tools)
```

**Structure Decision**: Single-project layout selected. This is a CLI application with no frontend/backend separation. The structure emphasizes modularity with clear separation between MCP protocol handling, LLM abstraction, tool grouping logic, and agent coordination. Each major concern has its own directory under `src/` with focused responsibilities.

## Design Artifacts

This implementation plan is supported by detailed design documents:

- **[research.md](research.md)**: Technical decisions (LLM SDKs, MCP integration, Mastra usage, credential discovery, dual distribution)
- **[data-model.md](data-model.md)**: Entity definitions and validation rules (10 entities fully specified)
- **[contracts/](contracts/)**: API contracts and schemas
  - [config-schema.json](contracts/config-schema.json): Configuration validation schema
  - [mcp-protocol.md](contracts/mcp-protocol.md): MCP client/server protocol interactions
- **[quickstart.md](quickstart.md)**: End-user guide (reference for CLI behavior and workflows)

**When implementing**: Always reference these documents for detailed specifications. Each implementation phase below links to relevant sections.

## Module Dependencies

Module dependency graph (implement in topological order):

```
[Types] ──────────────────────────┐
   │                               │
   ↓                               ↓
[Config] ─→ [MCP Client] ─→ [Tool Discovery]
   │              │                │
   │              │                ↓
   │              │         [LLM Client] ←─ [Credentials]
   │              │                │
   │              │                ↓
   │              │         [Tool Grouper] ←─ [Validator]
   │              │                │
   │              │                ↓
   │              │         [Tool Groups]
   │              │                │
   │              ↓                ↓
   └─────→ [Sub-Agent] ←──────────┘
                  │
                  ↓
           [MCP Server] ─→ [CLI Commands]
```

**Implementation Order** (topological sort):
1. Types (`src/types/`)
2. Config (`src/config/loader.ts`, `src/config/validator.ts`)
3. MCP Client (`src/mcp/client.ts`)
4. Tool Discovery (`src/mcp/discovery.ts`)
5. LLM Credentials (`src/llm/credentials.ts`)
6. LLM Client (`src/llm/client.ts`, `src/llm/providers/*.ts`)
7. Tool Grouper + Validator (`src/grouping/`)
8. Sub-Agent (`src/agents/`)
9. MCP Server (`src/mcp/server.ts`)
10. CLI Commands (`src/cli/`)

## Implementation Roadmap

### Phase 0: Foundation (Estimated: 2-3 days)

**Goal**: Set up project infrastructure and core types.

**Tasks**:
1. Initialize Deno project (`deno.json`, `deno.lock`, `.gitignore`)
2. Define TypeScript types in `src/types/`
   - **Reference**: [data-model.md](data-model.md) § 1-10 (all entities)
   - Types to define: `Configuration`, `MCPServerConfig`, `LLMProviderConfig`, `ProjectContext`, `GroupingConstraints`, `Tool`, `ToolGroup`, `SubAgent`, `AgentRequest`, `AgentResponse`
3. Implement config loader (`src/config/loader.ts`)
   - **Reference**: [contracts/config-schema.json](contracts/config-schema.json)
   - Reads/writes `tamamo-x.config.json`
4. Implement config validator (`src/config/validator.ts`)
   - **Reference**: [data-model.md](data-model.md) § 1 (Configuration validation rules)
   - **Reference**: [contracts/config-schema.json](contracts/config-schema.json)
   - Validates against JSON Schema

**Artifacts to Reference**:
- [data-model.md](data-model.md) § 1-10 (all entities)
- [contracts/config-schema.json](contracts/config-schema.json) (validation schema)

**Milestone**: Config can be loaded and validated against schema. Tests pass.

**Test Coverage**:
- `tests/unit/config/loader_test.ts`: Load valid/invalid configs
- `tests/unit/config/validator_test.ts`: Validation rules enforcement

---

### Phase 1: MCP Client Integration (Estimated: 3-4 days)

**Goal**: Connect to MCP servers and discover tools.

**Tasks**:
1. Implement MCP client (`src/mcp/client.ts`)
   - **Reference**: [research.md](research.md) § 2 (MCP SDK decision: `@modelcontextprotocol/sdk`)
   - **Reference**: [contracts/mcp-protocol.md](contracts/mcp-protocol.md) § 1-3 (client-mode methods)
   - Support stdio, HTTP, WebSocket transports
2. Implement tool discovery (`src/mcp/discovery.ts`)
   - **Reference**: [contracts/mcp-protocol.md](contracts/mcp-protocol.md) § 2 (`tools/list` method)
   - **Reference**: [data-model.md](data-model.md) § 6 (Tool entity)
   - Parse tool metadata from MCP servers
3. Write unit tests (`tests/unit/mcp/`)
   - **Reference**: [research.md](research.md) § 7 (testing strategy)
   - Mock MCP server responses

**Artifacts to Reference**:
- [research.md](research.md) § 2 (MCP protocol integration)
- [contracts/mcp-protocol.md](contracts/mcp-protocol.md) (all client-mode interactions)
- [data-model.md](data-model.md) § 6 (Tool entity structure)

**Milestone**: Can connect to MCP server and list all tools. Tests pass.

**Test Coverage**:
- `tests/unit/mcp/client_test.ts`: Connection, initialization, error handling
- `tests/unit/mcp/discovery_test.ts`: Tool parsing from MCP responses
- `tests/integration/mcp_discovery_test.ts`: Real MCP server integration (with test fixture server)

---

### Phase 2: LLM Provider Abstraction (Estimated: 4-5 days)

**Goal**: Support multiple LLM providers with unified interface.

**Tasks**:
1. Implement credential discovery (`src/llm/credentials.ts`)
   - **Reference**: [research.md](research.md) § 4 (credential discovery strategy)
   - **Reference**: [data-model.md](data-model.md) § 3 (LLMProviderConfig)
   - Discover from Claude Code, Codex, Gemini CLI
   - Fallback to env vars or prompt
2. Implement unified LLM client interface (`src/llm/client.ts`)
   - **Reference**: [research.md](research.md) § 1 (unified LLM interface design)
   - Abstract `complete(prompt, options)` method
3. Implement provider adapters (`src/llm/providers/*.ts`)
   - **Reference**: [research.md](research.md) § 1 (LLM SDK selection)
   - Anthropic: `@anthropic-ai/sdk`
   - OpenAI: `openai` SDK
   - Gemini: `@google/generative-ai`
   - Vercel AI: `ai` SDK
   - AWS Bedrock: `@aws-sdk/client-bedrock-runtime`
   - OpenRouter: `openai` SDK (compatible)
4. Write unit tests (`tests/unit/llm/`)
   - **Reference**: [research.md](research.md) § 7 (testing strategy)
   - Mock LLM API responses

**Artifacts to Reference**:
- [research.md](research.md) § 1 (LLM provider SDKs selection)
- [research.md](research.md) § 4 (credential discovery locations)
- [data-model.md](data-model.md) § 3 (LLMProviderConfig entity)

**Milestone**: Can invoke any of 6 LLM providers with discovered credentials. Tests pass.

**Test Coverage**:
- `tests/unit/llm/credentials_test.ts`: Credential discovery from CLI tools
- `tests/unit/llm/providers/*_test.ts`: Each provider adapter
- `tests/unit/llm/client_test.ts`: Unified interface routing

---

### Phase 3: Tool Grouping Engine (Estimated: 5-6 days)

**Goal**: Group tools using LLM analysis with constraint validation.

**Tasks**:
1. Implement LLM analyzer (`src/grouping/analyzer.ts`)
   - **Reference**: [research.md](research.md) § 6 (LLM request batching for performance)
   - **Reference**: [spec.md](spec.md) FR-005, FR-006, FR-007
   - Uses `src/llm/client.ts` for analysis
   - Batch 10 tools per LLM request
2. Implement grouping algorithm (`src/grouping/grouper.ts`)
   - **Reference**: [data-model.md](data-model.md) § 7 (ToolGroup entity)
   - **Reference**: [spec.md](spec.md) FR-006 (grouping constraints: 5-20 tools per group, 3-10 groups)
   - **Reference**: [data-model.md](data-model.md) § 4 (ProjectContext for context-aware grouping)
   - Parse LLM analysis results
   - Assign tools to groups based on complementarity
3. Implement constraint validator (`src/grouping/validator.ts`)
   - **Reference**: [data-model.md](data-model.md) § 5 (GroupingConstraints validation rules)
   - **Reference**: [spec.md](spec.md) FR-006
   - Validate group counts and tool counts
4. Write integration tests (`tests/integration/build_workflow_test.ts`)
   - **Reference**: [research.md](research.md) § 7 (testing strategy)
   - Test with fixture tool catalogs (50+ tools)

**Artifacts to Reference**:
- [research.md](research.md) § 6 (performance optimization: batching, caching)
- [data-model.md](data-model.md) § 5 (GroupingConstraints)
- [data-model.md](data-model.md) § 7 (ToolGroup entity)
- [spec.md](spec.md) FR-006, FR-007 (grouping requirements)

**Milestone**: Can group 50+ tools into 3-10 valid groups satisfying all constraints. Tests pass.

**Test Coverage**:
- `tests/unit/grouping/analyzer_test.ts`: LLM analysis batching
- `tests/unit/grouping/grouper_test.ts`: Grouping algorithm correctness
- `tests/unit/grouping/validator_test.ts`: Constraint validation
- `tests/integration/build_workflow_test.ts`: End-to-end grouping with fixtures

---

### Phase 4: Sub-Agent System (Estimated: 4-5 days)

**Goal**: Execute sub-agents backed by tool groups.

**Tasks**:
1. Implement agent execution (`src/agents/agent.ts`)
   - **Reference**: [research.md](research.md) § 3 (Mastra framework integration strategy)
   - **Reference**: [data-model.md](data-model.md) § 8 (SubAgent entity)
   - Wrap MCP tools as Mastra tools
   - Create Mastra agents with grouped tools
2. Implement request routing (`src/agents/router.ts`)
   - **Reference**: [data-model.md](data-model.md) § 9 (AgentRequest entity)
   - **Reference**: [data-model.md](data-model.md) § 10 (AgentResponse entity)
   - Route requests to appropriate sub-agent by ID
3. Implement MCP server (`src/mcp/server.ts`)
   - **Reference**: [contracts/mcp-protocol.md](contracts/mcp-protocol.md) § 4-6 (server-mode methods)
   - **Reference**: [research.md](research.md) § 2 (MCP SDK usage)
   - Expose sub-agents as MCP tools
4. Write integration tests (`tests/integration/mcp_server_test.ts`)
   - **Reference**: [research.md](research.md) § 7 (contract testing)
   - Test MCP server protocol compliance

**Artifacts to Reference**:
- [research.md](research.md) § 3 (Mastra agent orchestration)
- [contracts/mcp-protocol.md](contracts/mcp-protocol.md) § 4-6 (server mode)
- [data-model.md](data-model.md) § 8-10 (SubAgent, AgentRequest, AgentResponse)

**Milestone**: Can start MCP server, expose sub-agents, and invoke them via MCP protocol. Tests pass.

**Test Coverage**:
- `tests/unit/agents/agent_test.ts`: Agent execution with Mastra
- `tests/unit/agents/router_test.ts`: Request routing logic
- `tests/unit/mcp/server_test.ts`: MCP server initialization
- `tests/integration/mcp_server_test.ts`: Full server workflow (protocol compliance)

---

### Phase 5: CLI Commands (Estimated: 3-4 days)

**Goal**: Implement init, build, mcp commands with user-facing workflows.

**Tasks**:
1. Implement `init` command (`src/cli/commands/init.ts`)
   - **Reference**: [quickstart.md](quickstart.md) § "Step 1: Initialize Configuration"
   - **Reference**: [spec.md](spec.md) User Story 1 (acceptance scenarios)
   - Interactive prompts for MCP servers, LLM provider
   - Generate `tamamo-x.config.json`
2. Implement `build` command (`src/cli/commands/build.ts`)
   - **Reference**: [quickstart.md](quickstart.md) § "Step 2: Build Sub-Agents"
   - **Reference**: [spec.md](spec.md) User Story 2 (acceptance scenarios)
   - Discover tools, analyze with LLM, create groups
   - Save groups to `.tamamo-x/groups.json`
3. Implement `mcp` command (`src/cli/commands/mcp.ts`)
   - **Reference**: [quickstart.md](quickstart.md) § "Step 3: Start MCP Server"
   - **Reference**: [spec.md](spec.md) User Story 4 (acceptance scenarios)
   - Start MCP server with sub-agents
4. Implement CLI orchestration (`src/cli/main.ts`)
   - Parse command-line arguments
   - Route to appropriate command handler

**Artifacts to Reference**:
- [quickstart.md](quickstart.md) § Steps 1-3 (user workflows)
- [spec.md](spec.md) User Stories 1, 2, 4 (acceptance scenarios)

**Milestone**: All 3 CLI commands functional end-to-end (`init` → `build` → `mcp`). Tests pass.

**Test Coverage**:
- `tests/integration/init_workflow_test.ts`: Full init command workflow
- `tests/integration/build_workflow_test.ts`: Full build command workflow
- `tests/integration/mcp_server_test.ts`: Full mcp command workflow

---

### Phase 6: Distribution, CI/CD & Release (Estimated: 3-4 days)

**Goal**: Build distributions, set up CI/CD automation, and prepare for continuous delivery.

**Tasks**:

#### 6.1 Distribution Build Configuration
1. Configure Deno compilation (`deno.json`)
   - **Reference**: [research.md](research.md) § 5 (dual distribution strategy)
   - **Reference**: [spec.md](spec.md) FR-013 (Deno binary requirement)
   - Add task: `deno compile --allow-all --output dist/tamamo-x src/cli/main.ts`
2. Configure npm package build
   - **Reference**: [research.md](research.md) § 5 (npm compatibility)
   - **Reference**: [spec.md](spec.md) FR-014 (npm package requirement)
   - Setup `package.json` for npx execution
   - Create build script for npm package generation
3. Write distribution validation tests
   - **Reference**: [spec.md](spec.md) User Story 5 (acceptance scenarios)
   - **Reference**: [spec.md](spec.md) FR-015 (feature parity requirement)
   - Test both distributions against identical test suites

#### 6.2 CI/CD Pipeline Setup (GitHub Actions)
1. Create main CI workflow (`.github/workflows/ci.yml`)
   - **Reference**: [research.md](research.md) § 8 (CI/CD Strategy)
   - **Reference**: [contracts/ci-workflows.md](contracts/ci-workflows.md) (workflow specifications)
   - Implement quality gates: lint, format, type-check
   - Matrix testing: Ubuntu, macOS, Windows
   - Test phases: unit → integration → distribution
2. Create release workflow (`.github/workflows/release.yml`)
   - **Reference**: [research.md](research.md) § 8 (Release Strategy)
   - Trigger on tag push (`v*.*.*`)
   - Build distributions for all platforms
   - Create GitHub Release with artifacts
   - Publish npm package automatically
3. Configure Dependabot (`.github/dependabot.yml`)
   - **Reference**: [research.md](research.md) § 8 (Dependency Updates)
   - Enable for Deno dependencies
   - Weekly update schedule
4. Create distribution validation workflow (`.github/workflows/distribution.yml`)
   - **Reference**: [research.md](research.md) § 8 (Distribution Validation)
   - Test feature parity between Deno binary and npm package
   - Fail if behavior differs
5. Setup branch protection rules
   - **Reference**: [research.md](research.md) § 8 (Branch Protection Rules)
   - Require CI passing before merge
   - Require up-to-date branches
   - No force pushes to main

#### 6.3 CI/CD Testing & Validation
1. Write CI-specific tests (`tests/ci/`)
   - Test that CI workflow catches lint violations
   - Test that CI workflow catches test failures
   - Test that CI workflow validates distributions
2. Validate CI pipeline locally
   - Use `act` (GitHub Actions local runner) to test workflows
   - Ensure all jobs pass in local environment
3. Test release workflow in staging
   - Create test tag to validate release automation
   - Verify artifacts are generated correctly
   - Validate npm package can be published (dry-run)

**Artifacts to Reference**:
- [research.md](research.md) § 5 (distribution build configuration)
- [research.md](research.md) § 8 (CI/CD Strategy - comprehensive)
- [contracts/ci-workflows.md](contracts/ci-workflows.md) (GitHub Actions specifications)
- [spec.md](spec.md) User Story 5 (distribution acceptance criteria)
- [spec.md](spec.md) FR-013, FR-014, FR-015 (distribution requirements)

**Milestone**:
- ✅ Both Deno binary and npm package pass identical test suites (SC-007)
- ✅ CI/CD pipeline automatically enforces all quality gates
- ✅ Release automation functional (tag → GitHub Release + npm publish)
- ✅ All platforms tested automatically (Linux, macOS, Windows)

**Test Coverage**:
- `tests/distribution/deno_binary_test.ts`: Deno binary validation
- `tests/distribution/npm_package_test.ts`: npm package validation
- `tests/distribution/parity_test.ts`: Feature parity verification
- `tests/ci/lint_enforcement_test.ts`: CI lint gate validation
- `tests/ci/test_gate_enforcement_test.ts`: CI test gate validation
- `tests/ci/distribution_gate_enforcement_test.ts`: CI distribution gate validation

---

## Implementation Summary

**Total Estimated Time**: 24-32 days for full implementation (including CI/CD)

**Critical Path**:
1. Foundation (Types, Config) →
2. MCP Client →
3. LLM Abstraction →
4. Grouping Engine →
5. Sub-Agent System →
6. CLI Commands →
7. Distribution + CI/CD

**Parallel Opportunities**:
- Unit tests can be written in parallel with implementation
- Provider adapters (Phase 2) can be implemented in parallel
- CLI commands (Phase 5) can be partially parallelized
- CI workflow creation can happen in parallel with Phase 5 (CLI Commands)

**Quality Gates** (automated via CI/CD):
- ✅ Zero lint errors (`deno lint` - enforced by CI)
- ✅ Code formatting (`deno fmt --check` - enforced by CI)
- ✅ Type checking (`deno check` - enforced by CI)
- ✅ All unit tests passing (`deno test tests/unit/` - enforced by CI)
- ✅ All integration tests passing (`deno test tests/integration/` - enforced by CI)
- ✅ Distribution parity (`tests/distribution/` - enforced by CI)
- ⚠️ Code coverage ≥80% (`deno coverage` - warning only, not blocking)

**CI/CD Enforcement**:
- All quality gates run automatically on every push and PR
- Branch protection prevents merging failing builds
- Release automation eliminates manual release process
- Cross-platform testing ensures compatibility (Linux, macOS, Windows)

**Ready for tasks.md generation**: This roadmap provides sufficient detail for task breakdown.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
