# Implementation Plan Audit Report

**Feature**: 001-tool-grouping
**Date**: 2025-11-15
**Auditor**: Asagi Aiba (Electric Empress)

## Executive Summary

Implementation plan and design artifacts have been generated successfully. However, **critical implementation guidance is missing** from plan.md. The plan lacks:

1. ✅ Clear implementation phase sequencing
2. ✅ Cross-references to design artifacts
3. ✅ Module dependency mapping
4. ✅ Step-by-step implementation guidance

**Recommendation**: Add **Implementation Roadmap** section to plan.md with detailed references to research.md, data-model.md, and contracts/.

---

## Audit Findings

### ✅ Strengths

1. **Complete Design Artifacts**
   - research.md: All technical decisions resolved
   - data-model.md: 10 entities fully specified
   - contracts/: Config schema + MCP protocol documented
   - quickstart.md: End-user guide complete

2. **Constitution Compliance**
   - All 5 core principles satisfied
   - TDD workflow planned
   - Quality gates defined

3. **Project Structure**
   - Clear module separation
   - Test structure defined
   - File paths specified

---

### ❌ Critical Gaps

#### 1. **Missing Implementation Roadmap**

**Problem**: plan.md does not tell implementers WHERE to start or WHAT to reference.

**Example**: When implementing `src/llm/providers/anthropic.ts`, developer should be told:
- "See research.md § 1 for SDK selection rationale"
- "See data-model.md § 3 (LLMProviderConfig) for entity structure"
- "See research.md § 4 for credential discovery strategy"

**Current State**: No such references exist.

---

#### 2. **No Module Dependency Graph**

**Problem**: Unclear which modules must be implemented first.

**Example**: `src/grouping/grouper.ts` depends on:
- `src/llm/client.ts` (LLM abstraction)
- `src/mcp/client.ts` (tool discovery)
- `src/grouping/validator.ts` (constraint checking)

**Current State**: Dependencies not documented.

---

#### 3. **No Phase-by-Phase Implementation Guide**

**Problem**: Plan doesn't break implementation into phases with milestones.

**Should Have**:
- **Phase 1**: Core infrastructure (config, types, MCP client)
- **Phase 2**: LLM abstraction layer
- **Phase 3**: Tool grouping engine
- **Phase 4**: Sub-agent system
- **Phase 5**: CLI commands
- **Phase 6**: Distribution builds

**Current State**: No phases defined.

---

#### 4. **Weak Cross-References**

**Problem**: Artifacts don't reference each other effectively.

| Artifact | Should Reference | Current State |
|----------|------------------|---------------|
| plan.md | research.md decisions | ❌ No links |
| plan.md | data-model.md entities | ❌ No links |
| plan.md | contracts/ schemas | ❌ No links |
| data-model.md | contracts/config-schema.json | ❌ Not linked |
| quickstart.md | data-model.md (for config structure) | ⚠️ Implicit only |

---

## Detailed Recommendations

### Recommendation 1: Add Implementation Roadmap Section

Add to plan.md after "Project Structure":

```markdown
## Implementation Roadmap

### Phase 0: Foundation (Estimated: 2-3 days)

**Goal**: Set up project infrastructure and core types.

**Tasks**:
1. Initialize Deno project (`deno.json`, `deno.lock`)
2. Define TypeScript types (see data-model.md § 1-5)
   - Configuration, MCPServerConfig, LLMProviderConfig
   - Tool, ToolGroup, SubAgent
3. Implement config loader (src/config/loader.ts)
   - Reference: contracts/config-schema.json
4. Implement config validator (src/config/validator.ts)
   - Reference: data-model.md § 1 (validation rules)

**Artifacts to Reference**:
- data-model.md § 1-10 (all entities)
- contracts/config-schema.json (validation schema)

**Milestone**: Config can be loaded and validated against schema.

---

### Phase 1: MCP Client Integration (Estimated: 3-4 days)

**Goal**: Connect to MCP servers and discover tools.

**Tasks**:
1. Implement MCP client (src/mcp/client.ts)
   - Reference: research.md § 2 (MCP SDK decision)
   - Reference: contracts/mcp-protocol.md § 1-3
2. Implement tool discovery (src/mcp/discovery.ts)
   - Reference: contracts/mcp-protocol.md § 2
   - Reference: data-model.md § 6 (Tool entity)
3. Write unit tests (tests/unit/mcp/)
   - Reference: research.md § 7 (testing strategy)

**Artifacts to Reference**:
- research.md § 2 (MCP protocol integration)
- contracts/mcp-protocol.md (all client-mode methods)
- data-model.md § 6 (Tool entity)

**Milestone**: Can connect to MCP server and list tools.

---

### Phase 2: LLM Provider Abstraction (Estimated: 4-5 days)

**Goal**: Support multiple LLM providers with unified interface.

**Tasks**:
1. Implement credential discovery (src/llm/credentials.ts)
   - Reference: research.md § 4 (credential discovery strategy)
   - Reference: data-model.md § 3 (LLMProviderConfig)
2. Implement unified LLM client (src/llm/client.ts)
   - Reference: research.md § 1 (LLM SDK selection)
3. Implement provider adapters (src/llm/providers/*.ts)
   - Anthropic: research.md § 1 → @anthropic-ai/sdk
   - OpenAI: research.md § 1 → openai
   - Gemini: research.md § 1 → @google/generative-ai
   - Others: Vercel, Bedrock, OpenRouter
4. Write unit tests (tests/unit/llm/)

**Artifacts to Reference**:
- research.md § 1 (LLM provider SDKs)
- research.md § 4 (credential discovery)
- data-model.md § 3 (LLMProviderConfig)

**Milestone**: Can invoke any of 6 LLM providers with discovered credentials.

---

### Phase 3: Tool Grouping Engine (Estimated: 5-6 days)

**Goal**: Group tools using LLM analysis.

**Tasks**:
1. Implement LLM analyzer (src/grouping/analyzer.ts)
   - Reference: research.md § 6 (LLM request batching)
   - Uses: src/llm/client.ts
2. Implement grouping algorithm (src/grouping/grouper.ts)
   - Reference: data-model.md § 7 (ToolGroup entity)
   - Reference: spec.md FR-006 (grouping constraints)
3. Implement constraint validator (src/grouping/validator.ts)
   - Reference: data-model.md § 5 (GroupingConstraints)
4. Write integration tests (tests/integration/)
   - Reference: research.md § 7 (testing strategy)

**Artifacts to Reference**:
- research.md § 6 (performance optimization)
- data-model.md § 5 (GroupingConstraints)
- data-model.md § 7 (ToolGroup)
- spec.md FR-006, FR-007

**Milestone**: Can group 50+ tools into 3-10 valid groups.

---

### Phase 4: Sub-Agent System (Estimated: 4-5 days)

**Goal**: Execute sub-agents backed by tool groups.

**Tasks**:
1. Implement agent execution (src/agents/agent.ts)
   - Reference: research.md § 3 (Mastra integration)
   - Reference: data-model.md § 8 (SubAgent entity)
2. Implement request routing (src/agents/router.ts)
   - Reference: data-model.md § 9-10 (AgentRequest/Response)
3. Implement MCP server (src/mcp/server.ts)
   - Reference: contracts/mcp-protocol.md § 4-6
4. Write integration tests

**Artifacts to Reference**:
- research.md § 3 (Mastra framework integration)
- contracts/mcp-protocol.md § 4-6 (server mode)
- data-model.md § 8-10 (SubAgent, Request, Response)

**Milestone**: Can start MCP server and invoke sub-agents.

---

### Phase 5: CLI Commands (Estimated: 3-4 days)

**Goal**: Implement init, build, mcp commands.

**Tasks**:
1. Implement init command (src/cli/commands/init.ts)
   - Reference: quickstart.md § "Step 1"
   - Reference: spec.md User Story 1
2. Implement build command (src/cli/commands/build.ts)
   - Reference: quickstart.md § "Step 2"
   - Reference: spec.md User Story 2
3. Implement mcp command (src/cli/commands/mcp.ts)
   - Reference: quickstart.md § "Step 3"
   - Reference: spec.md User Story 4
4. Implement CLI orchestration (src/cli/main.ts)

**Artifacts to Reference**:
- quickstart.md (all 3 steps)
- spec.md User Stories 1, 2, 4

**Milestone**: All 3 CLI commands functional end-to-end.

---

### Phase 6: Distribution & Testing (Estimated: 2-3 days)

**Goal**: Build Deno binary and npm package.

**Tasks**:
1. Configure Deno compilation (deno.json)
   - Reference: research.md § 5 (dual distribution strategy)
2. Configure npm package build
3. Write distribution validation tests
   - Reference: spec.md User Story 5
4. Run full test suite against both distributions

**Artifacts to Reference**:
- research.md § 5 (distribution strategy)
- spec.md User Story 5 (acceptance criteria)

**Milestone**: Both distributions pass identical test suites.
```

---

### Recommendation 2: Add Module Dependency Graph

Add visual dependency map:

```markdown
## Module Dependencies

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
1. Types
2. Config (loader + validator)
3. MCP Client
4. Tool Discovery
5. LLM Credentials
6. LLM Client
7. Tool Grouper + Validator
8. Sub-Agent
9. MCP Server
10. CLI Commands
```

---

### Recommendation 3: Enhance Cross-References

#### In plan.md

After "Technical Context", add:

```markdown
## Design Artifacts

This implementation plan is supported by detailed design documents:

- **[research.md](research.md)**: Technical decisions (LLM SDKs, MCP integration, Mastra usage)
- **[data-model.md](data-model.md)**: Entity definitions and validation rules
- **[contracts/](contracts/)**: API contracts and schemas
  - [config-schema.json](contracts/config-schema.json): Configuration validation
  - [mcp-protocol.md](contracts/mcp-protocol.md): MCP client/server interactions
- **[quickstart.md](quickstart.md)**: End-user guide (reference for CLI behavior)

**When implementing**: Always reference these documents for detailed specifications.
```

#### In data-model.md

After entity definitions, add:

```markdown
## Implementation References

When implementing these entities:

- **Configuration validation**: See [contracts/config-schema.json](contracts/config-schema.json)
- **LLM provider selection**: See [research.md § 1](research.md#1-llm-provider-sdks-selection)
- **MCP protocol compliance**: See [contracts/mcp-protocol.md](contracts/mcp-protocol.md)
- **Credential discovery**: See [research.md § 4](research.md#4-credential-discovery-strategy)
```

---

## Summary of Required Changes

| File | Change Required | Priority |
|------|----------------|----------|
| plan.md | Add Implementation Roadmap section | 🔴 Critical |
| plan.md | Add Module Dependency Graph | 🟡 High |
| plan.md | Add Design Artifacts reference section | 🟡 High |
| data-model.md | Add Implementation References section | 🟢 Medium |
| research.md | No changes (well-structured) | ✅ None |
| contracts/* | No changes (complete) | ✅ None |
| quickstart.md | No changes (serves as reference) | ✅ None |

---

## Validation Checklist

After implementing recommendations, verify:

- [x] Can a developer start implementation by reading plan.md alone? ✅ **YES** - Complete roadmap added
- [x] Does plan.md clearly link to all design artifacts? ✅ **YES** - "Design Artifacts" section added
- [x] Is the implementation sequence obvious (phases 0-6)? ✅ **YES** - 6 phases with detailed tasks
- [x] Are module dependencies documented? ✅ **YES** - Dependency graph added
- [x] Does each phase reference specific sections of design docs? ✅ **YES** - Every task has references
- [x] Can tasks.md be generated from this roadmap? ✅ **YES** - Sufficient detail provided

---

## Remediation Summary

### ✅ Implemented Recommendations

**Recommendation 1: Implementation Roadmap** - ✅ **COMPLETE**
- Added 6-phase roadmap to [plan.md](plan.md)
- Each phase includes: Goal, Tasks, Artifacts to Reference, Milestone, Test Coverage
- Total estimated time: 23-30 days
- Clear critical path defined

**Recommendation 2: Module Dependency Graph** - ✅ **COMPLETE**
- ASCII dependency graph added to [plan.md](plan.md)
- Topological sort implementation order (1-10)
- Clear visualization of module relationships

**Recommendation 3: Cross-References Enhanced** - ✅ **COMPLETE**
- "Design Artifacts" section added to [plan.md](plan.md)
- "Implementation References" section added to [data-model.md](data-model.md)
- Every phase links to specific sections in research.md, data-model.md, contracts/, spec.md

### Files Modified

| File | Changes Made | Status |
|------|-------------|--------|
| [plan.md](plan.md) | Added: Design Artifacts, Module Dependencies, Implementation Roadmap (Phases 0-6), Implementation Summary | ✅ Complete |
| [data-model.md](data-model.md) | Added: Implementation References section with links to all related docs | ✅ Complete |
| [AUDIT.md](AUDIT.md) | Updated: Validation checklist, remediation summary | ✅ Complete |

---

## Audit Complete (Updated)

**Overall Assessment**: ✅ **Implementation plan is now fully actionable and developer-ready.**

**Action Required**: ✅ **NONE** - All recommendations implemented.

**Next Step**: Generate tasks.md using `/speckit.tasks` command.

---

## Before/After Comparison

### Before Audit
- ❌ No implementation sequence
- ❌ No cross-references
- ❌ No module dependencies
- ❌ Developer would struggle to start

### After Remediation
- ✅ 6-phase roadmap with 24-32 day estimate (including CI/CD)
- ✅ Every task references specific design docs
- ✅ Module dependency graph with topological order
- ✅ Developer can start immediately from Phase 0

### After CI/CD Integration (Latest Update)
- ✅ CI/CD automation fully specified in research.md § 8
- ✅ GitHub Actions workflows detailed in contracts/ci-workflows.md
- ✅ Quality gates automated (lint, format, type-check, tests)
- ✅ Distribution parity validation automated
- ✅ Release automation (tag → GitHub Release + npm publish)
- ✅ Branch protection rules specified
- ✅ Constitution updated (v1.0.1) with CI/CD requirements

---

## CI/CD Integration Update (2025-11-15)

### Additional Files Modified

| File | CI/CD Changes | Status |
|------|---------------|--------|
| [research.md](research.md) | Added § 8: CI/CD Strategy (GitHub Actions architecture) | ✅ Complete |
| [plan.md](plan.md) | Expanded Phase 6 with CI/CD tasks (6.1-6.3 subsections) | ✅ Complete |
| [contracts/ci-workflows.md](contracts/ci-workflows.md) | Complete GitHub Actions workflow specifications (NEW) | ✅ Complete |
| [constitution.md](../../.specify/memory/constitution.md) | Added CI/CD Automation section, bumped to v1.0.1 | ✅ Complete |

### CI/CD Specifications Added

**1. Main CI Workflow** (`.github/workflows/ci.yml`):
- Quality gates job (lint, format, type-check)
- Matrix testing across Linux, macOS, Windows
- Parallel unit and integration tests
- Coverage tracking with Codecov
- Build validation (Deno binary + npm package)
- Distribution parity testing

**2. Release Workflow** (`.github/workflows/release.yml`):
- Semantic version validation
- Multi-platform binary builds
- Automated npm publishing with provenance
- GitHub Release creation with changelog
- Binary artifact uploads

**3. Dependabot Configuration** (`.github/dependabot.yml`):
- Weekly dependency updates
- GitHub Actions version updates
- Automated PR creation

**4. Distribution Validation** (`.github/workflows/distribution.yml`):
- Nightly deep parity testing
- Automated issue creation on violations

**5. Branch Protection Rules**:
- Required status checks (all quality gates)
- Code review requirements
- Linear history enforcement
- No force pushes

### CI/CD Quality Gate Matrix

| Gate | Tool | Blocking | Automation |
|------|------|----------|------------|
| Linting | `deno lint` | ✅ Yes | GitHub Actions |
| Formatting | `deno fmt --check` | ✅ Yes | GitHub Actions |
| Type Checking | `deno check` | ✅ Yes | GitHub Actions |
| Unit Tests | `deno test tests/unit/` | ✅ Yes | GitHub Actions (3 OS) |
| Integration Tests | `deno test tests/integration/` | ✅ Yes | GitHub Actions (3 OS) |
| Distribution Parity | `tests/distribution/` | ✅ Yes | GitHub Actions |
| Coverage | `deno coverage` | ⚠️ Warning | GitHub Actions + Codecov |

### Implementation Impact

**Phase 6 Expansion**:
- Estimated time: 2-3 days → 3-4 days
- New tasks: 6.2 (CI/CD Pipeline Setup), 6.3 (CI/CD Testing)
- Total implementation estimate: 23-30 days → 24-32 days

**Quality Assurance**:
- Manual quality gates → Fully automated enforcement
- Post-merge validation → Pre-merge blocking
- Manual releases → Tag-triggered automation
- Single-platform testing → Cross-platform matrix (3 OS)

**Developer Experience**:
- Immediate feedback on quality violations (CI runs on push)
- Cannot merge code that fails any quality gate
- Releases fully automated (no manual steps)
- Consistent behavior across all platforms guaranteed

---

## Updated Validation Checklist

After CI/CD integration, verify:

- [x] Can a developer start implementation by reading plan.md alone? ✅ **YES**
- [x] Does plan.md clearly link to all design artifacts? ✅ **YES**
- [x] Is the implementation sequence obvious (phases 0-6)? ✅ **YES**
- [x] Are module dependencies documented? ✅ **YES**
- [x] Does each phase reference specific sections of design docs? ✅ **YES**
- [x] Can tasks.md be generated from this roadmap? ✅ **YES**
- [x] Are quality gates automated via CI/CD? ✅ **YES** (NEW)
- [x] Is release process automated? ✅ **YES** (NEW)
- [x] Are all workflows specified in detail? ✅ **YES** (NEW)

---

*This audit, remediation, and CI/CD integration ensures the implementation team has a clear, actionable path from design to code with fully automated quality enforcement. All artifacts are now production-ready with continuous delivery capabilities.*
