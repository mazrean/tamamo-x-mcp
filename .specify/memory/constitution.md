<!--
SYNC IMPACT REPORT
==================
Version Change: [NONE] → 1.0.0 (Initial ratification)
Modified Principles: N/A (Initial creation)
Added Sections:
  - All core principles (I-V)
  - Technical Stack section
  - Development Workflow section
  - Governance section

Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section already references constitution file
  ✅ spec-template.md - No constitution-specific constraints needed
  ✅ tasks-template.md - Test-first requirements already aligned

Follow-up TODOs: None
-->

# tamamo-x-mcp Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)

**TDD mandatory following t-wada's methodology**: All feature development MUST follow the Red-Green-Refactor cycle:

1. Write test cases FIRST based on specifications
2. Verify tests FAIL (Red phase)
3. Implement minimum code to make tests pass (Green phase)
4. Refactor while keeping tests green (Refactor phase)

**Rationale**: Test-first development ensures code correctness, maintainability, and serves as living documentation. t-wada's TDD approach emphasizes behavior-driven test design that guides implementation quality.

### II. Quality Gates (NON-NEGOTIABLE)

**No task is considered complete until it passes ALL quality gates**:

- MUST have zero lint errors
- MUST have all unit tests passing
- MUST have integration tests passing (if applicable to the feature)

**Rationale**: Quality gates prevent technical debt accumulation and ensure consistent code quality across the codebase. These checks are automated and non-negotiable checkpoints before code review.

### III. Modular Agent Design

**Sub-agent architecture principles**:

- Each agent group MUST serve a specific, well-defined role
- Tools within a group MUST complement each other (5-20 tools per group)
- Total number of agent groups MUST remain manageable (3-10 groups)
- Agent boundaries MUST be clear and minimize cross-group dependencies

**Rationale**: Modular agent design enables clear separation of concerns, independent testing, and scalable addition of new capabilities without affecting existing agents.

### IV. API-First & Provider Agnostic

**LLM API integration requirements**:

- Support multiple LLM providers (Anthropic Claude, OpenAI, Gemini, Vercel AI, AWS Bedrock, OpenRouter)
- Abstract provider-specific implementations behind unified interfaces
- Support credential reuse from existing CLI tools (Claude Code, Codex, Gemini CLI)
- NEVER store credentials in configuration files

**Rationale**: Provider agnosticism prevents vendor lock-in and enables users to choose the best LLM for their specific use case while maintaining consistent behavior.

### V. Distribution Flexibility

**Multi-format distribution support**:

- Deno standalone binary for zero-dependency deployment
- npm package with npx execution support
- Both formats MUST provide identical functionality
- Build process MUST validate both distribution formats

**Rationale**: Different deployment contexts require different distribution formats. Supporting both Deno and npm ensures maximum accessibility and deployment flexibility.

## Technical Stack

**Language**: TypeScript (strict mode enabled)
**Agent Framework**: Mastra
**Runtime Targets**: Deno (standalone binary), Node.js (npm package)
**Configuration Format**: JSON (`tamamo-x.config.json`, `.mcp.json`)

## Development Workflow

### TDD Cycle Enforcement

1. Feature specification created → User acceptance criteria defined
2. Test cases written covering acceptance criteria
3. Tests run and verified to FAIL
4. Implementation begins ONLY after test failure confirmation
5. Code committed ONLY after all quality gates pass

### Quality Gate Execution

Before marking any task as complete:

```bash
# Lint check (MUST pass)
deno lint

# Unit tests (MUST pass)
deno test

# Integration tests (MUST pass if applicable)
deno test --filter integration
```

### Code Review Requirements

- All PRs MUST include test coverage for new functionality
- Reviewers MUST verify TDD workflow was followed
- Quality gate failures block merge unconditionally

## Governance

### Amendment Procedure

1. Proposed changes documented with rationale
2. Impact analysis on existing templates and workflows
3. Version bump determination (MAJOR.MINOR.PATCH)
4. Sync updates to dependent templates
5. Update `LAST_AMENDED_DATE` and `CONSTITUTION_VERSION`

### Versioning Policy

- **MAJOR**: Backward-incompatible governance changes, principle removal/redefinition
- **MINOR**: New principles added, materially expanded guidance
- **PATCH**: Clarifications, wording improvements, non-semantic fixes

### Compliance Review

- Constitution compliance MUST be verified during code review
- Template updates MUST maintain alignment with constitution
- Any complexity introduced MUST be justified against constitution principles

**Version**: 1.0.0 | **Ratified**: 2025-11-15 | **Last Amended**: 2025-11-15
