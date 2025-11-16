# Data Model: MCP Tool Grouping & Sub-Agent System

**Feature**: 001-tool-grouping
**Date**: 2025-11-15
**Status**: Complete

## Overview

This document defines all data entities, their relationships, and validation rules for the MCP Tool Grouping & Sub-Agent System. These entities represent the core domain model independent of storage implementation.

## Entities

### 1. Configuration

**Purpose**: Project-level configuration for tamamo-x-mcp, stored in `tamamo-x.config.json`.

**Fields**:

- `version` (string, required): Config schema version (e.g., "1.0.0")
- `mcpServers` (MCPServerConfig[], required): List of MCP servers to connect to
- `llmProvider` (LLMProviderConfig, required): LLM provider settings for tool grouping
- `projectContext` (ProjectContext, optional): Project-specific context for grouping
- `groupingConstraints` (GroupingConstraints, optional): Override default grouping constraints

**Validation Rules**:

- `version` must match supported schema versions
- `mcpServers` must contain at least 1 server
- `llmProvider.type` must be one of: "anthropic", "openai", "gemini", "vercel", "bedrock", "openrouter"
- Configuration MUST NOT contain any credential fields (enforced by schema)

**Relationships**:

- Contains multiple `MCPServerConfig`
- Contains one `LLMProviderConfig`
- Optionally contains `ProjectContext`

**State Transitions**:

- Created: `init` command generates default config
- Updated: User manually edits or runs `init` again to reconfigure

---

### 2. MCPServerConfig

**Purpose**: Connection details for a single external MCP server.

**Fields**:

- `name` (string, required): Human-readable server identifier
- `transport` (string, required): Connection transport ("stdio", "http", "websocket")
- `command` (string, conditional): Command to start server (required if transport="stdio")
- `args` (string[], optional): Command arguments (for stdio transport)
- `url` (string, conditional): Server URL (required if transport="http" or "websocket")
- `env` (Record<string, string>, optional): Environment variables for server process

**Validation Rules**:

- `name` must be unique within `mcpServers` array
- If `transport="stdio"`, `command` is required
- If `transport="http"` or `transport="websocket"`, `url` is required
- `url` must be valid URL if provided

**Relationships**:

- Belongs to one `Configuration`
- Associated with discovered `Tool[]` (runtime, not persisted)

---

### 3. LLMProviderConfig

**Purpose**: LLM provider selection and connection settings.

**Fields**:

- `type` (LLMProviderType, required): Provider identifier
- `model` (string, optional): Model name (defaults per provider if not specified)
- `credentialSource` (string, required): How credentials are obtained ("cli-tool", "env-var", "prompt")
- `endpointOverride` (string, optional): Custom API endpoint URL

**Validation Rules**:

- `type` must be valid provider enum value
- `model` defaults:
  - anthropic: "claude-3-5-sonnet-20241022"
  - openai: "gpt-4o"
  - gemini: "gemini-2.0-flash-exp"
  - vercel/bedrock/openrouter: User-specified, no default
- `credentialSource` must be one of: "cli-tool", "env-var", "prompt"

**Relationships**:

- Belongs to one `Configuration`
- Used by `Grouper` to invoke LLM for tool analysis

**Enums**:

```typescript
type LLMProviderType =
  | "anthropic"
  | "openai"
  | "gemini"
  | "vercel"
  | "bedrock"
  | "openrouter";
```

---

### 4. ProjectContext

**Purpose**: Project-specific information that informs tool grouping decisions.

**Fields**:

- `agentFilePath` (string, optional): Path to Agent.md or equivalent
- `claudeFilePath` (string, optional): Path to CLAUDE.md or equivalent
- `domain` (string, optional): Project domain (e.g., "web-development", "data-science")
- `customHints` (string[], optional): User-provided grouping hints

**Validation Rules**:

- File paths must exist if specified
- Files must be readable markdown format

**Relationships**:

- Belongs to one `Configuration`
- Consumed by `Grouper` during LLM analysis

---

### 5. GroupingConstraints

**Purpose**: Constraints for tool grouping algorithm.

**Fields**:

- `minToolsPerGroup` (number, default: 5): Minimum tools in a group
- `maxToolsPerGroup` (number, default: 20): Maximum tools in a group
- `minGroups` (number, default: 3): Minimum number of groups
- `maxGroups` (number, default: 10): Maximum number of groups

**Validation Rules**:

- `minToolsPerGroup` must be ≥ 1
- `maxToolsPerGroup` must be ≥ `minToolsPerGroup`
- `minGroups` must be ≥ 1
- `maxGroups` must be ≥ `minGroups`
- `minGroups * minToolsPerGroup` should not exceed total available tools (warning, not error)

**Relationships**:

- Belongs to one `Configuration`
- Enforced by `GroupValidator`

---

### 6. Tool

**Purpose**: Discovered MCP tool with metadata.

**Fields**:

- `name` (string, required): Tool identifier (unique per MCP server)
- `description` (string, required): Tool purpose and capabilities
- `inputSchema` (JSONSchema, required): Tool parameter schema
- `serverName` (string, required): Source MCP server name
- `category` (string, optional): Tool category (if provided by server)

**Validation Rules**:

- `name` must be unique within source server
- `description` must be non-empty
- `inputSchema` must be valid JSON Schema object

**Relationships**:

- Discovered from one `MCPServerConfig`
- Belongs to one `ToolGroup` after grouping
- Referenced by `SubAgent` for execution

**State Transitions**:

- Discovered: Retrieved from MCP server during `init` or `build`
- Analyzed: Processed by LLM to determine group assignment
- Grouped: Assigned to a `ToolGroup`

---

### 7. ToolGroup

**Purpose**: Collection of related tools forming a specialized sub-agent.

**Fields**:

- `id` (string, required): Unique group identifier (generated)
- `name` (string, required): Human-readable group name
- `description` (string, required): Group role and purpose
- `tools` (Tool[], required): Tools in this group
- `complementarityScore` (number, optional): How well tools work together (0-1)
- `metadata` (Record<string, unknown>, optional): Additional group metadata

**Validation Rules**:

- `name` must be unique across all groups
- `tools.length` must be >= `minToolsPerGroup` and <= `maxToolsPerGroup`
- `complementarityScore` must be 0-1 if present
- `tools` must not contain duplicates (by name + serverName)

**Relationships**:

- Contains multiple `Tool` references
- Used by one `SubAgent` for execution

**State Transitions**:

- Created: Generated by `Grouper` during `build` command
- Validated: Checked against grouping constraints
- Persisted: Saved to build artifacts (e.g., `groups.json`)
- Exposed: Registered with MCP server during `mcp` command

---

### 8. SubAgent

**Purpose**: Executable agent instance backed by a tool group.

**Fields**:

- `id` (string, required): Unique agent identifier (matches ToolGroup.id)
- `name` (string, required): Agent name (matches ToolGroup.name)
- `description` (string, required): Agent description
- `toolGroup` (ToolGroup, required): Associated tool group
- `llmProvider` (LLMProviderConfig, required): LLM provider for coordination
- `systemPrompt` (string, required): Agent instructions for LLM

**Validation Rules**:

- `id` must be unique across all sub-agents
- `toolGroup` must be valid and non-empty
- `systemPrompt` must include group role and tool usage guidelines

**Relationships**:

- Backed by one `ToolGroup`
- Uses one `LLMProviderConfig`
- Executes `Tool` operations via MCP client

**State Transitions**:

- Instantiated: Created from `ToolGroup` during `mcp` server startup
- Active: Ready to process requests
- Executing: Processing a request using tools
- Idle: Waiting for next request

---

### 9. AgentRequest

**Purpose**: Incoming request to a sub-agent.

**Fields**:

- `requestId` (string, required): Unique request identifier
- `agentId` (string, required): Target sub-agent ID
- `prompt` (string, required): User request text
- `context` (Record<string, unknown>, optional): Additional request context
- `timestamp` (Date, required): Request arrival time

**Validation Rules**:

- `agentId` must reference an active `SubAgent`
- `prompt` must be non-empty

**Relationships**:

- Routed to one `SubAgent`
- Generates one `AgentResponse`

**State Transitions**:

- Received: Arrives via MCP protocol
- Routed: Assigned to appropriate SubAgent
- Processing: SubAgent executing with tools
- Completed: Response generated

---

### 10. AgentResponse

**Purpose**: Sub-agent response to a request.

**Fields**:

- `requestId` (string, required): Matching request ID
- `agentId` (string, required): Responding agent ID
- `result` (string, required): Response text
- `toolsUsed` (string[], optional): Names of tools invoked
- `timestamp` (Date, required): Response generation time
- `error` (string, optional): Error message if request failed

**Validation Rules**:

- `requestId` must match an existing `AgentRequest`
- Either `result` or `error` must be present (not both)

**Relationships**:

- Corresponds to one `AgentRequest`
- Generated by one `SubAgent`

---

## Entity Relationship Diagram

```
Configuration
├── mcpServers: MCPServerConfig[]
│   └── discovers → Tool[]
├── llmProvider: LLMProviderConfig
├── projectContext?: ProjectContext
└── groupingConstraints?: GroupingConstraints

Tool
└── groupedInto → ToolGroup

ToolGroup
├── tools: Tool[]
└── backsAgent → SubAgent

SubAgent
├── toolGroup: ToolGroup
├── llmProvider: LLMProviderConfig
├── receives → AgentRequest
└── generates → AgentResponse

AgentRequest
└── generatesResponse → AgentResponse
```

## Validation Summary

| Entity            | Key Constraints                               | Enforced By      |
| ----------------- | --------------------------------------------- | ---------------- |
| Configuration     | ≥1 MCP server, valid provider, no credentials | Config validator |
| MCPServerConfig   | Unique name, valid transport params           | Config validator |
| LLMProviderConfig | Valid provider type, credential source        | Config validator |
| Tool              | Unique name per server, valid schema          | MCP client       |
| ToolGroup         | 5-20 tools, unique name, no duplicates        | Group validator  |
| SubAgent          | Valid tool group, non-empty prompt            | Agent factory    |
| AgentRequest      | Valid agent ID, non-empty prompt              | Request router   |
| AgentResponse     | Matching request ID, result XOR error         | Response builder |

## Storage Implementation

- **Configuration**: Persisted to `tamamo-x.config.json` (user-editable)
- **Tool Groups**: Persisted to `.tamamo-x/groups.json` (build artifact)
- **Tool metadata**: In-memory during build, not persisted
- **SubAgents**: In-memory during `mcp` server runtime
- **Request/Response**: In-memory, not persisted (unless logging enabled)

## Implementation References

When implementing these entities, reference the following documents for additional context:

### Configuration & Validation

- **JSON Schema validation**: [contracts/config-schema.json](contracts/config-schema.json)
- **Config entity details**: This document § 1 (Configuration)
- **Implementation phase**: [plan.md](plan.md) § Phase 0 (Foundation)

### LLM Provider Integration

- **Provider SDK selection**: [research.md](research.md) § 1 (LLM Provider SDKs Selection)
- **Credential discovery strategy**: [research.md](research.md) § 4 (Credential Discovery Strategy)
- **LLMProviderConfig entity**: This document § 3
- **Implementation phase**: [plan.md](plan.md) § Phase 2 (LLM Provider Abstraction)

### MCP Protocol

- **Protocol specification**: [contracts/mcp-protocol.md](contracts/mcp-protocol.md)
- **Tool entity structure**: This document § 6 (Tool)
- **MCP SDK usage**: [research.md](research.md) § 2 (MCP Protocol Integration)
- **Implementation phases**:
  - Client mode: [plan.md](plan.md) § Phase 1 (MCP Client Integration)
  - Server mode: [plan.md](plan.md) § Phase 4 (Sub-Agent System)

### Tool Grouping

- **Grouping algorithm**: This document § 7 (ToolGroup)
- **Constraint validation**: This document § 5 (GroupingConstraints)
- **Performance optimization**: [research.md](research.md) § 6 (Performance Optimization)
- **Functional requirements**: [spec.md](spec.md) FR-006, FR-007
- **Implementation phase**: [plan.md](plan.md) § Phase 3 (Tool Grouping Engine)

### Sub-Agent Execution

- **SubAgent entity**: This document § 8
- **Request/Response entities**: This document § 9-10
- **Mastra integration**: [research.md](research.md) § 3 (Mastra Framework Integration)
- **Implementation phase**: [plan.md](plan.md) § Phase 4 (Sub-Agent System)

### Testing Strategy

- **Testing approach**: [research.md](research.md) § 7 (Testing Strategy)
- **Test structure**: [plan.md](plan.md) § Project Structure (tests/ directory)
- **Contract tests**: [contracts/mcp-protocol.md](contracts/mcp-protocol.md) § Contract Testing

## Data Model Complete

All entities, relationships, and validation rules defined. Implementation references provided. Ready for implementation.
