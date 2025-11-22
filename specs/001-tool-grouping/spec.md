# Feature Specification: MCP Tool Grouping & Sub-Agent System

**Feature Branch**: `001-tool-grouping`
**Created**: 2025-11-15
**Status**: Draft
**Input**: User description: "設定されたMCPサーバーのツールを役割ごとにまとめてサブAIエージェント化し、再構築したツールとして提供するMCPサーバーです。"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Initialize Configuration & Tool Discovery (Priority: P1)

A developer wants to set up tamamo-x-mcp for their project to organize MCP server tools into specialized sub-agents. They run the `init` command to create a configuration file, specify which MCP servers to connect to, and have the system discover available tools automatically.

**Why this priority**: This is the foundational step required before any other functionality can work. Without configuration and tool discovery, there is no input for the agent grouping system.

**Independent Test**: Can be fully tested by running `tamamo-x-mcp init`, verifying that `tamamo-x.config.json` is created with valid MCP server configurations, and confirming that the system can list all discovered tools.

**Acceptance Scenarios**:

1. **Given** no configuration file exists, **When** user runs `tamamo-x-mcp init`, **Then** system creates `tamamo-x.config.json` with interactive prompts for MCP server settings
2. **Given** existing `.mcp.json` in the project, **When** user runs init, **Then** system imports MCP server configurations automatically
3. **Given** configuration file is created, **When** system connects to MCP servers, **Then** all available tools are discovered and listed
4. **Given** user specifies project-specific files (Agent.md, CLAUDE.md), **When** init completes, **Then** these files are referenced in the configuration for context-aware grouping

---

### User Story 2 - Automatic Tool Grouping & Sub-Agent Creation (Priority: P2)

A developer wants to automatically group discovered tools into logical sub-agents based on their functionality. They run the `build` command, which analyzes tools using LLM intelligence and project context, then creates 3-10 specialized agent groups with 5-20 tools each that complement one another.

**Why this priority**: This is the core value proposition of tamamo-x-mcp - intelligent grouping that reduces cognitive load and improves agent specialization. This must work before the MCP server can provide useful functionality.

**Independent Test**: Can be fully tested by running `tamamo-x-mcp build` after init, verifying that tool groups are created, checking that grouping requirements are satisfied (5-20 tools per group, 3-10 total groups, complementary tools), and confirming that each group has a clear role and appropriate name.

**Acceptance Scenarios**:

1. **Given** configuration with discovered tools, **When** user runs `tamamo-x-mcp build`, **Then** system analyzes tools using LLM and creates optimal groups
2. **Given** project context files (Agent.md, CLAUDE.md), **When** grouping occurs, **Then** groups are tailored to project-specific needs and roles
3. **Given** tool grouping completes, **When** reviewing results, **Then** each group contains 5-20 tools that serve a unified purpose
4. **Given** multiple groups created, **When** counting groups, **Then** total number is between 3 and 10
5. **Given** grouped tools, **When** examining relationships, **Then** tools within each group complement and support each other
6. **Given** completed grouping, **When** reviewing group metadata, **Then** each group has a descriptive name reflecting its role

---

### User Story 3 - LLM Provider Selection & Authentication (Priority: P3)

A developer wants to choose their preferred LLM provider for sub-agent processing. They configure the system to use Anthropic Claude, OpenAI, Gemini, Vercel AI, AWS Bedrock, or OpenRouter. The system reuses existing authentication credentials from tools like Claude Code, Codex, or Gemini CLI without requiring manual credential entry.

**Why this priority**: Multi-provider support enables flexibility and prevents vendor lock-in, but the core functionality (grouping) can work with a single default provider initially.

**Independent Test**: Can be fully tested by configuring different LLM providers, verifying that credentials are discovered automatically from existing CLI tools, confirming that the build command succeeds with each provider, and ensuring no credentials are stored in `tamamo-x.config.json`.

**Acceptance Scenarios**:

1. **Given** multiple LLM providers available, **When** user configures provider preference, **Then** system accepts Anthropic Claude, OpenAI, Gemini, Vercel AI, AWS Bedrock, or OpenRouter
2. **Given** Claude Code credentials exist, **When** Anthropic is selected, **Then** system reuses those credentials
3. **Given** Codex credentials exist, **When** OpenAI is selected, **Then** system reuses those credentials
4. **Given** Gemini CLI credentials exist, **When** Gemini is selected, **Then** system reuses those credentials
5. **Given** configuration saved, **When** inspecting `tamamo-x.config.json`, **Then** no API keys or authentication secrets are present

---

### User Story 4 - MCP Server Deployment & Tool Access (Priority: P4)

A developer wants to deploy the sub-agent system as an MCP server that other tools can connect to. They run `tamamo-x-mcp mcp` to start the server, which exposes grouped tools as specialized sub-agents. Client applications can now interact with these agents through the MCP protocol.

**Why this priority**: This enables the actual use of the grouped agents, but requires all previous stories to be complete. It's the final integration step.

**Independent Test**: Can be fully tested by running `tamamo-x-mcp mcp` after build, connecting a client application to the server, verifying that grouped tools are accessible as agents, and confirming that agent calls route to the appropriate tool groups.

**Acceptance Scenarios**:

1. **Given** sub-agents are built, **When** user runs `tamamo-x-mcp mcp`, **Then** MCP server starts and listens for connections
2. **Given** MCP server is running, **When** client connects, **Then** all sub-agent groups are exposed as available tools
3. **Given** client sends request to a sub-agent, **When** processing occurs, **Then** request is routed to the appropriate tool group with LLM coordination
4. **Given** sub-agent processes request, **When** response is generated, **Then** results are returned to client via MCP protocol

---

### User Story 5 - Multi-Format Distribution (Priority: P5)

A developer wants to install and run tamamo-x-mcp in their preferred environment. They can either download a standalone Deno binary for zero-dependency deployment or install via npm and run with `npx tamamo-x-mcp`. Both distribution methods provide identical functionality.

**Why this priority**: Distribution flexibility is important for adoption but doesn't affect core functionality. This is a packaging concern that can be addressed independently.

**Independent Test**: Can be fully tested by building both distribution formats, installing each one in a clean environment, verifying that all commands (init, build, mcp) work identically in both formats, and confirming that no dependencies are required for the Deno binary.

**Acceptance Scenarios**:

1. **Given** Deno binary is available, **When** user downloads and executes it, **Then** all commands work without additional dependencies
2. **Given** npm package is published, **When** user runs `npx tamamo-x-mcp`, **Then** system installs temporarily and executes commands
3. **Given** both distribution formats, **When** running identical commands, **Then** behavior and output are consistent
4. **Given** build process, **When** creating distributions, **Then** both formats are validated for functionality parity

---

### Edge Cases

- **What happens when MCP server configuration is invalid or unreachable?**
  System validates configuration during init and provides clear error messages. During build/mcp commands, unreachable servers are skipped with warnings, and available tools are processed.

- **What happens when no project context files (Agent.md, CLAUDE.md) exist?**
  System falls back to generic tool grouping based solely on tool descriptions and capabilities without project-specific customization.

- **What happens when tool count violates grouping constraints (too few or too many)?**
  If total tools < 15 (minimum for 3 groups × 5 tools), system creates fewer groups while maintaining minimum 5 tools per group. If tools can't be grouped satisfying constraints, system provides warnings and suggestions for manual adjustment.

- **What happens when LLM API credentials are not found?**
  System prompts user to authenticate or provides instructions for setting up credentials. Build command fails with clear instructions rather than proceeding with invalid/missing credentials.

- **What happens when the same MCP server is specified multiple times?**
  System deduplicates server configurations during init and warns the user about duplicates.

- **What happens when tools have overlapping functionality across groups?**
  LLM-based grouping analyzes tool relationships and assigns each tool to the most appropriate group based on primary purpose. Tools with broad utility (e.g., logging, error handling) may be included in multiple groups if needed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an `init` command that generates `tamamo-x.config.json` in the project root
- **FR-002**: Configuration file MUST support MCP server definitions in `.mcp.json` format embedded within the config structure
- **FR-003**: System MUST discover and list all tools available from configured MCP servers
- **FR-004**: System MUST reference project context files (Agent.md, CLAUDE.md) when specified to inform grouping decisions
- **FR-005**: System MUST provide a `build` command that analyzes tools using LLM intelligence
- **FR-006**: Tool grouping MUST satisfy constraints: 5-20 tools per group, 3-10 total groups, complementary relationships
- **FR-007**: Each tool group MUST be assigned a descriptive name reflecting its specialized role
- **FR-008**: System MUST support multiple LLM providers: Anthropic Claude, OpenAI, Gemini, Vercel AI, AWS Bedrock, OpenRouter
- **FR-009**: System MUST detect and reuse credentials from Claude Code (Anthropic), Codex (OpenAI), and Gemini CLI
- **FR-010**: System MUST NOT store authentication credentials in `tamamo-x.config.json`
- **FR-011**: System MUST provide an `mcp` command that starts an MCP server exposing sub-agents
- **FR-012**: MCP server MUST expose grouped tools as accessible sub-agents via MCP protocol
- **FR-013**: System MUST be distributable as a Deno standalone binary with zero external dependencies
- **FR-014**: System MUST be distributable as an npm package executable via `npx tamamo-x-mcp`
- **FR-015**: Both distribution formats MUST provide identical functionality across all commands

### Key Entities

- **Tool Group**: A collection of related MCP tools grouped by role and function. Contains: group name (string), role description (string), tool references (list), complementarity score (numeric indicator of how well tools work together).

- **Sub-Agent**: An AI agent specialized for a specific role, backed by a tool group and coordinated by an LLM. Contains: group reference, LLM provider configuration, execution context, request routing logic.

- **MCP Server Configuration**: Connection information for external MCP servers. Contains: server URL/connection string, authentication method, protocol version, discovered tool list.

- **LLM Provider Configuration**: Settings for connecting to LLM services. Contains: provider type (Anthropic/OpenAI/etc.), credential source (CLI tool name or manual), model selection, API endpoint overrides (if needed).

- **Project Context**: Information about the project that informs grouping decisions. Contains: Agent.md content, CLAUDE.md content, project type/domain, custom grouping hints.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete initial configuration (init command) in under 5 minutes for a typical project
- **SC-002**: Tool grouping accuracy achieves 90%+ user satisfaction (minimal manual regrouping needed) as measured by post-build survey
- **SC-003**: Sub-agent build process completes within 10 minutes for projects with up to 100 tools
- **SC-004**: MCP server starts and becomes ready to accept connections within 10 seconds
- **SC-005**: All six supported LLM providers (Anthropic, OpenAI, Gemini, Vercel AI, Bedrock, OpenRouter) successfully complete the build process in test environments
- **SC-006**: Zero credentials are stored in configuration files (100% compliance with security requirement)
- **SC-007**: Both distribution formats (Deno binary and npm package) achieve 100% feature parity on all supported platforms
- **SC-008**: 95% of projects with valid MCP configurations successfully complete init → build → mcp workflow without errors

## Assumptions

- Users have at least one MCP server configured or available to configure
- LLM API providers remain accessible and maintain backward-compatible APIs
- Project context files (Agent.md, CLAUDE.md) follow readable markdown format when present
- MCP protocol specification remains stable across versions used by connected servers
- Users running the tool have appropriate permissions to write configuration files in project root
- Credential discovery from CLI tools (Claude Code, Codex, Gemini CLI) uses standard credential storage locations for each tool
