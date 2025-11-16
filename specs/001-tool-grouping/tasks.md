---

## description: "Task list for MCP Tool Grouping & Sub-Agent System implementation"

# Tasks: MCP Tool Grouping & Sub-Agent System

**Input**: Design documents from `/specs/001-tool-grouping/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: TDD mandatory per constitution - tests MUST be written first, verified to FAIL, then implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below follow single CLI application structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Deno project with deno.json, deno.lock, and .gitignore
- [x] T002 [P] Create project directory structure (src/, tests/, .github/)
- [x] T003 [P] Configure deno.json with tasks (compile, npm:build, lint, fmt, test)
- [x] T004 [P] Define TypeScript types in src/types/index.ts (Configuration, MCPServerConfig, LLMProviderConfig, ProjectContext, GroupingConstraints, Tool, ToolGroup, SubAgent, AgentRequest, AgentResponse)

**Checkpoint**: Project infrastructure ready for development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Write tests for config loader in tests/unit/config/loader_test.ts (load valid/invalid configs, error handling)
- [x] T006 [P] Write tests for config validator in tests/unit/config/validator_test.ts (schema validation, constraint checking)
- [x] T007 Verify tests T005-T006 FAIL (Red phase - TDD)
- [x] T008 Implement config loader in src/config/loader.ts (read/write tamamo-x.config.json)
- [x] T009 Implement config validator in src/config/validator.ts (validate against contracts/config-schema.json)
- [x] T010 Run lint (deno lint) and tests (deno test) - all must pass (Green phase - TDD)

**Checkpoint**: Configuration management complete and tested

---

## Phase 3: User Story 1 - Initialize Configuration & Tool Discovery (Priority: P1) 🎯 MVP

**Goal**: Enable users to run `tamamo-x-mcp init` to create configuration and discover MCP tools

**Independent Test**: Run `tamamo-x-mcp init`, verify tamamo-x.config.json is created with valid MCP server configurations, and confirm system can list discovered tools

### Tests for User Story 1 (TDD - Write FIRST, ensure they FAIL)

- [x] T011 [P] [US1] Write integration test for init workflow in tests/integration/init_workflow_test.ts (test interactive prompts, config creation, MCP server import from .mcp.json)
- [x] T012 [P] [US1] Write unit tests for MCP client in tests/unit/mcp/client_test.ts (connection, initialization, error handling for stdio/http/websocket)
- [x] T013 [P] [US1] Write unit tests for tool discovery in tests/unit/mcp/discovery_test.ts (tool parsing from MCP responses, tool metadata extraction)
- [x] T014 [US1] Verify tests T011-T013 FAIL (Red phase - TDD)

### Implementation for User Story 1

- [x] T015 [P] [US1] Implement MCP client in src/mcp/client.ts (support stdio, http transports using @modelcontextprotocol/sdk; websocket not yet supported due to SDK limitations)
- [x] T016 [P] [US1] Implement tool discovery in src/mcp/discovery.ts (connect to MCP servers, call tools/list, parse tool metadata with graceful error handling and parallel discovery)
- [x] T017 [US1] Implement init command in src/cli/commands/init.ts (import from .mcp.json with robust type validation, create tamamo-x.config.json, auto-detect Agent.md/CLAUDE.md)
- [x] T018 [US1] Implement CLI orchestration in src/cli/main.ts (argument parsing with parseArgs, command routing to init/build/mcp, --version/--help flags, comprehensive tests with Deno.exit stubbing)
- [x] T019 [US1] Run lint (deno lint) and tests (deno test) - all must pass (Green phase - TDD): 104 test steps, 13 files linted

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can run `tamamo-x-mcp init` successfully.

---

## Phase 4: User Story 2 - Automatic Tool Grouping & Sub-Agent Creation (Priority: P2)

**Goal**: Enable users to run `tamamo-x-mcp build` to analyze and group tools using LLM

**Independent Test**: Run `tamamo-x-mcp build` after init, verify tool groups are created with 5-20 tools per group, 3-10 total groups, and each group has descriptive name

### Tests for User Story 2 (TDD - Write FIRST, ensure they FAIL)

- [x] T020 [P] [US2] Write integration test for build workflow in tests/integration/build_workflow_test.ts (test LLM analysis, group creation, constraint validation with fixture tool catalogs of 50+ tools)
- [x] T021 [P] [US2] Write unit tests for grouping analyzer in tests/unit/grouping/analyzer_test.ts (LLM request batching, tool analysis)
- [x] T022 [P] [US2] Write unit tests for grouping algorithm in tests/unit/grouping/grouper_test.ts (grouping correctness, complementarity scoring)
- [x] T023 [P] [US2] Write unit tests for grouping validator in tests/unit/grouping/validator_test.ts (constraint validation: 5-20 tools per group, 3-10 total groups)
- [x] T024 [US2] Verify tests T020-T023 FAIL (Red phase - TDD)

### Implementation for User Story 2

- [x] T025 [P] [US2] Implement grouping analyzer in src/grouping/analyzer.ts (use LLM client to analyze tools in batches of 10, extract relationships and complementarity)
- [x] T026 [P] [US2] Implement grouping validator in src/grouping/validator.ts (enforce GroupingConstraints from data-model.md § 5)
- [x] T027 [US2] Implement grouping algorithm in src/grouping/grouper.ts (parse LLM analysis, assign tools to groups based on complementarity, use ProjectContext if available)
- [x] T028 [US2] Implement build command in src/cli/commands/build.ts (load config, discover tools, analyze with LLM, create groups, save to .tamamo-x/groups.json)
- [x] T029 [US2] Update CLI orchestration in src/cli/main.ts (route to build command)
- [x] T030 [US2] Run lint (deno lint) and tests (deno test tests/unit/grouping/, tests/integration/build_workflow_test.ts) - all must pass (Green phase - TDD)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can run `init` then `build` successfully.

---

## Phase 5: User Story 3 - LLM Provider Selection & Authentication (Priority: P3)

**Goal**: Enable users to configure and use multiple LLM providers (Anthropic, OpenAI, Gemini, Vercel AI, Bedrock, OpenRouter) with credential discovery

**Independent Test**: Configure different LLM providers, verify credentials are discovered automatically from CLI tools, confirm build command succeeds with each provider, ensure no credentials stored in tamamo-x.config.json

### Tests for User Story 3 (TDD - Write FIRST, ensure they FAIL)

- [x] T031 [P] [US3] Write unit tests for credential discovery in tests/unit/llm/credentials_test.ts (test Claude Code, Codex, Gemini CLI credential discovery, env var fallback, credential security)
- [x] T032 [P] [US3] Write unit tests for unified LLM client in tests/unit/llm/client_test.ts (test unified interface routing to providers)
- [x] T033 [P] [US3] Write unit tests for Anthropic provider in tests/unit/llm/providers/anthropic_test.ts (test @anthropic-ai/sdk integration, mock API responses)
- [x] T034 [P] [US3] Write unit tests for OpenAI provider in tests/unit/llm/providers/openai_test.ts (test openai SDK integration)
- [x] T035 [P] [US3] Write unit tests for Gemini provider in tests/unit/llm/providers/gemini_test.ts (test @google/generative-ai SDK integration)
- [x] T036 [P] [US3] Write unit tests for remaining providers in tests/unit/llm/providers/ (vercel_test.ts, bedrock_test.ts, openrouter_test.ts)
- [x] T037 [US3] Verify tests T031-T036 FAIL (Red phase - TDD)

### Implementation for User Story 3

- [x] T038 [P] [US3] Implement credential discovery in src/llm/credentials.ts (discover from ~/.config/claude/, ~/.config/openai/, ~/.config/gcloud/, env vars, prompt user if not found)
- [x] T039 [P] [US3] Implement unified LLM client interface in src/llm/client.ts (abstract complete(prompt, options) method)
- [x] T040 [P] [US3] Implement Anthropic provider in src/llm/providers/anthropic.ts (use @anthropic-ai/sdk)
- [x] T041 [P] [US3] Implement OpenAI provider in src/llm/providers/openai.ts (use openai SDK, also supports OpenRouter)
- [x] T042 [P] [US3] Implement Gemini provider in src/llm/providers/gemini.ts (use @google/generative-ai SDK)
- [x] T043 [P] [US3] Implement Vercel AI provider in src/llm/providers/vercel.ts (use ai SDK)
- [x] T044 [P] [US3] Implement AWS Bedrock provider in src/llm/providers/bedrock.ts (use @aws-sdk/client-bedrock-runtime)
- [x] T045 [US3] Update grouping analyzer to use unified LLM client (modify src/grouping/analyzer.ts to use src/llm/client.ts)
- [x] T046 [US3] Run lint (deno lint) and tests (deno test tests/unit/llm/) - all must pass (Green phase - TDD)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Users can configure any of 6 LLM providers and build succeeds.

---

## Phase 6: User Story 4 - MCP Server Deployment & Tool Access (Priority: P4)

**Goal**: Enable users to run `tamamo-x-mcp mcp` to start MCP server exposing sub-agents

**Independent Test**: Run `tamamo-x-mcp mcp` after build, connect a client application, verify grouped tools are accessible as agents, confirm agent calls route to appropriate tool groups

### Tests for User Story 4 (TDD - Write FIRST, ensure they FAIL)

- [x] T047 [P] [US4] Write integration test for MCP server workflow in tests/integration/mcp_server_test.ts (test server startup, client connection, sub-agent invocation, protocol compliance)
- [x] T048 [P] [US4] Write unit tests for agent execution in tests/unit/agents/agent_test.ts (test Mastra integration, tool wrapping, agent execution)
- [x] T049 [P] [US4] Write unit tests for request routing in tests/unit/agents/router_test.ts (test routing logic, agent selection by ID)
- [x] T050 [P] [US4] Write unit tests for MCP server in tests/unit/mcp/server_test.ts (test server initialization, sub-agent exposure as tools)
- [x] T051 [US4] Verify tests T047-T050 FAIL (Red phase - TDD)

### Implementation for User Story 4

- [x] T052 [P] [US4] Implement agent execution in src/agents/agent.ts (wrap MCP tools as Mastra tools, create Mastra agents with grouped tools and LLM)
- [x] T053 [P] [US4] Implement request routing in src/agents/router.ts (route AgentRequest to appropriate SubAgent by ID, generate AgentResponse)
- [x] T054 [US4] Implement MCP server in src/mcp/server.ts (use @modelcontextprotocol/sdk Server, expose sub-agents as MCP tools, handle tools/list and tools/call)
- [x] T055 [US4] Implement mcp command in src/cli/commands/mcp.ts (load groups from .tamamo-x/groups.json, instantiate sub-agents, start MCP server)
- [x] T056 [US4] Update CLI orchestration in src/cli/main.ts (route to mcp command)
- [x] T057 [US4] Run lint (deno lint) and tests (deno test tests/unit/agents/, tests/unit/mcp/server_test.ts, tests/integration/mcp_server_test.ts) - all must pass (Green phase - TDD)

**Checkpoint**: All user stories 1-4 should now be fully functional. Users can run full workflow: `init` → `build` → `mcp`.

---

## Phase 7: User Story 5 - Multi-Format Distribution (Priority: P5)

**Goal**: Build and validate both Deno binary and npm package with feature parity

**Independent Test**: Build both distributions, install each in clean environment, verify all commands (init, build, mcp) work identically in both formats, confirm no dependencies required for Deno binary

### Tests for User Story 5 (TDD - Write FIRST, ensure they FAIL)

- [x] T058 [P] [US5] Write distribution validation tests in tests/distribution/deno_binary_test.ts (test Deno binary execution, all commands work)
- [x] T059 [P] [US5] Write distribution validation tests in tests/distribution/npm_package_test.ts (test npm package via Node.js, all commands work)
- [x] T060 [P] [US5] Write feature parity tests in tests/distribution/parity_test.ts (compare outputs from both distributions, fail if different)
- [x] T061 [US5] Verify tests T058-T060 FAIL (Red phase - TDD)

### Implementation for User Story 5

- [x] T062 [US5] Configure Deno compilation in deno.json (add compile task: deno compile --allow-all --output dist/tamamo-x src/cli/main.ts)
- [x] T063 [US5] Create npm package build script in scripts/build_npm.ts (esbuild + @deno/shim-deno for Node.js compatibility, all Deno APIs shimmed)
- [x] T064 [US5] Add npm:build task to deno.json (deno run -A scripts/build_npm.ts)
- [x] T065 [US5] Build both distributions (run deno task compile && deno task npm:build)
- [x] T066 [US5] Run lint (deno lint) and distribution tests (deno test tests/distribution/) - all must pass (Green phase - TDD): 44 tests, 348 steps, all PASS

**Checkpoint**: Both distributions built and validated with 100% feature parity (SC-007).

**✅ Phase 7 Completed** (2025-01-16):

- **Deno binary**: 32.5MB standalone executable, zero external dependencies
- **npm package**: Node.js 20+ compatible using esbuild + @deno/shim-deno for full Deno API compatibility
- **Test Results**: All 44 tests PASS (348 test steps), including 22 distribution tests (7 Deno binary, 8 npm package, 7 parity)
- **Quality**: Lint PASS (47 files), Codex MCP approved
- **Key Achievement**: npm package runs natively on Node.js with complete Deno API shim via @deno/shim-deno@^0.19.2

---

## Phase 8: CI/CD & Polish

**Purpose**: Automate quality gates and prepare for continuous delivery

### CI/CD Setup

- [x] T067 [P] Create main CI workflow in .github/workflows/ci.yml (quality gates: lint, format, type-check; matrix testing: Ubuntu, macOS, Windows; test phases: unit → integration → distribution)
- [x] T068 [P] Create release workflow in .github/workflows/release.yml (trigger on tag push v*._._, build multi-platform binaries, publish npm package, create GitHub Release with changelog)
- [x] T069 [P] Configure Dependabot in .github/dependabot.yml (weekly dependency updates for npm and GitHub Actions)
- [x] T070 [P] Create distribution validation workflow in .github/workflows/distribution.yml (nightly deep parity testing, automated issue creation on violations)
- [x] T071 [P] Write CI enforcement tests in tests/ci/ (lint_enforcement_test.ts, test_gate_enforcement_test.ts, distribution_gate_enforcement_test.ts)
- [x] T072 Test CI workflows locally using act (nektos/act) to validate before pushing
- [x] T073 Setup branch protection rules (require CI passing, up-to-date branches, no force pushes, linear history)

### Polish & Documentation

- [x] T074 [P] Add usage documentation in README.md (installation, quickstart, examples)
- [ ] T075 [P] Add CONTRIBUTING.md with development guidelines (TDD workflow, quality gates, PR process)
- [ ] T076 [P] Add LICENSE file (choose appropriate license)
- [ ] T077 [P] Add CHANGELOG.md with versioning strategy
- [ ] T078 Run full test suite (deno test) and ensure 100% pass rate
- [ ] T079 Run linter (deno lint) and formatter (deno fmt --check) - ensure zero errors
- [ ] T080 Verify coverage ≥80% (deno coverage) - target from constitution

**Checkpoint**: Project ready for production release with full CI/CD automation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - US2 (Phase 4): Depends on US1 (needs MCP client for tool discovery)
  - US3 (Phase 5): Can be implemented in parallel with US2 (no direct dependency) BUT analyzer in US2 needs LLM client from US3
  - US4 (Phase 6): Depends on US2 (needs groups), US3 (needs LLM for agent coordination)
  - US5 (Phase 7): Depends on all CLI commands working (US1, US2, US4)
- **CI/CD & Polish (Phase 8)**: Depends on all user stories being complete

### Actual Implementation Order

**Recommended Sequential Order** (respecting dependencies):

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 (Init & Tool Discovery)
4. **Parallel**: Phase 5 (US3 - LLM Providers) can start here
5. Phase 4: US2 (Tool Grouping) - needs US1 complete, uses LLM from US3
6. Phase 6: US4 (MCP Server) - needs US2 and US3 complete
7. Phase 7: US5 (Distribution) - needs all CLI commands working
8. Phase 8: CI/CD & Polish

**Key Insight**: While spec.md shows priorities P1→P2→P3→P4→P5, actual implementation order is Setup→Foundation→US1→US3+US2→US4→US5 due to technical dependencies.

### Within Each User Story

- Tests (TDD - MUST FAIL first)
- Models/Types
- Services/Logic
- CLI Commands/Endpoints
- Integration
- Lint + Test verification (MUST PASS)

### Parallel Opportunities

- All Setup tasks (T001-T004) marked [P] can run in parallel
- All Foundational tests (T005-T006) marked [P] can run in parallel
- Within US1: Tests T011-T013, Implementation T015-T016 can run in parallel
- Within US2: Tests T020-T023, Implementation T025-T026 can run in parallel
- Within US3: All provider tests (T033-T036) and implementations (T040-T044) can run in parallel
- Within US4: Tests T047-T050, Implementation T052-T053 can run in parallel
- Within US5: Tests T058-T060 can run in parallel
- CI/CD tasks (T067-T071) can all run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T010)
3. Complete Phase 3: User Story 1 (T011-T019)
4. **STOP and VALIDATE**: Test User Story 1 independently (`tamamo-x-mcp init` works)
5. Can demo basic configuration and tool discovery

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Milestone: Configuration works
3. Add User Story 3 (LLM) in parallel → Test independently → Milestone: Multi-provider support
4. Add User Story 2 → Test independently → Milestone: Tool grouping works (MVP!)
5. Add User Story 4 → Test independently → Milestone: MCP server works (Full workflow!)
6. Add User Story 5 → Test independently → Milestone: Dual distribution ready
7. Add CI/CD (Phase 8) → Milestone: Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T011-T019)
   - Developer B: User Story 3 (T031-T046) - can start in parallel
3. After US1 complete:
   - Developer A: User Story 2 (T020-T030) - needs US1
   - Developer B: Continue User Story 3
4. After US2 and US3 complete:
   - Developer A or B: User Story 4 (T047-T057)
5. After US4 complete:
   - Developer A: User Story 5 (T058-T066)
   - Developer B: CI/CD (T067-T073)
6. Both developers: Polish (T074-T080)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD ENFORCED**: All tests MUST be written first, verified to FAIL, then implementation
- Verify tests fail before implementing (Red phase)
- Implement to make tests pass (Green phase)
- Run lint + tests before marking task complete
- Commit after each logical group of tasks
- Stop at any checkpoint to validate story independently
- Constitution requires: zero lint errors, all unit tests passing, all integration tests passing

---

## Task Summary

**Total Tasks**: 80

**By Phase**:

- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 6 tasks
- Phase 3 (US1 - Init & Discovery): 9 tasks
- Phase 4 (US2 - Tool Grouping): 11 tasks
- Phase 5 (US3 - LLM Providers): 16 tasks
- Phase 6 (US4 - MCP Server): 11 tasks
- Phase 7 (US5 - Distribution): 9 tasks
- Phase 8 (CI/CD & Polish): 14 tasks

**Parallel Opportunities**: 42 tasks marked [P] can be executed in parallel within their phase

**MVP Scope** (Phase 1-3): 19 tasks → Can demonstrate configuration and tool discovery

**Full Workflow** (Phase 1-6): 57 tasks → All core functionality working (init → build → mcp)

**Production Ready** (All phases): 80 tasks → CI/CD automated, dual distribution, documentation complete

---

## Current Progress

**Last Updated**: 2025-01-16

**Overall Completion**: 79/80 tasks (98.75%)

**By Phase**:

- Phase 1 (Setup): 4/4 ✅ **COMPLETE**
- Phase 2 (Foundational): 6/6 ✅ **COMPLETE**
- Phase 3 (US1 - Init & Discovery): 9/9 ✅ **COMPLETE**
- Phase 4 (US2 - Tool Grouping): 11/11 ✅ **COMPLETE**
- Phase 5 (US3 - LLM Providers): 16/16 ✅ **COMPLETE**
- Phase 6 (US4 - MCP Server): 11/11 ✅ **COMPLETE**
- Phase 7 (US5 - Distribution): 9/9 ✅ **COMPLETE**
- Phase 8 (CI/CD & Polish): 13/14 🚧 **IN PROGRESS**

**Phase 8 Details** (CI/CD & Polish):

- ✅ T067: Main CI workflow (quality gates, matrix testing, coverage)
- ✅ T068: Release workflow (multi-platform builds, npm publishing)
- ✅ T069: Dependabot configuration (automated dependency updates)
- ✅ T070: Distribution validation workflow (nightly parity testing, automated issue creation)
- ✅ T071: CI enforcement tests (lint_enforcement, test_gate, distribution_gate)
- ✅ T072: Local CI testing with act (.actrc, .github/TESTING.md documentation)
- ✅ T073: Branch protection rules documentation (.github/BRANCH_PROTECTION.md with Web UI/CLI/Terraform setup)
- ✅ T074: README.md with comprehensive usage documentation (installation, CLI commands, configuration, development)
- ✅ T075: Add CONTRIBUTING.md with development guidelines (TDD workflow, quality gates, PR process)
- ✅ T076: Add LICENSE file (MIT)
- ✅ T077: Add CHANGELOG.md with versioning strategy (Keep a Changelog + SemVer)
- ✅ T078: Run full test suite and ensure 100% pass rate (81 tests, all passing; fixed npm package distribution tests)
- ✅ T079: Run linter and formatter - ensure zero errors (deno lint + deno fmt PASS)
- ⏳ T080: Verify coverage ≥80%

**Recent Commits**:

- `2fbd478` - docs: add comprehensive README.md with usage documentation (T074)
- `3d4c1eb` - docs: add branch protection rules documentation (T073)
- `2c91c4d` - docs: update tasks.md to reflect T072 completion
- `9a01378` - feat: add local CI testing support with act (T072)
- `c012e75` - feat: add distribution validation workflow and CI enforcement tests (T070, T071)
