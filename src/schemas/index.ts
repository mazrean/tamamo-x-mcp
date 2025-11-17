/**
 * Zod schemas for tamamo-x-mcp
 * Based on data-model.md validation rules
 *
 * All validation is performed using Zod for:
 * - Type safety
 * - Runtime validation
 * - Clear error messages
 * - Easy schema composition
 */

import { z } from "npm:zod@3.24.1";

// ============================================================================
// LLM Provider Types
// ============================================================================

export const LLMProviderTypeSchema = z.enum([
  "anthropic",
  "openai",
  "gemini",
  "vercel",
  "bedrock",
  "openrouter",
]);

export const CredentialSourceSchema = z.enum(["cli-tool", "env-var", "prompt"]);

// ============================================================================
// MCP Transport Types
// ============================================================================

export const MCPTransportSchema = z.enum(["stdio", "http", "websocket"]);

// ============================================================================
// § 3: LLMProviderConfig
// ============================================================================

export const LLMProviderConfigSchema = z
  .object({
    type: LLMProviderTypeSchema,
    model: z.string().optional(),
    credentialSource: CredentialSourceSchema,
    endpointOverride: z.string().url().optional(),
  })
  .strict()
  .refine(
    (data) => {
      // Forbidden credential fields - security check
      const obj = data as Record<string, unknown>;
      return !("apiKey" in obj) && !("password" in obj) && !("secret" in obj);
    },
    {
      message: "Credentials (apiKey, password, secret) must not be stored in configuration",
    },
  );

// ============================================================================
// § 4: ProjectContext
// ============================================================================

export const ProjectContextSchema = z
  .object({
    agentFilePath: z.string().optional(),
    claudeFilePath: z.string().optional(),
    domain: z.string().optional(),
    customHints: z.array(z.string()).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Validate file existence for agentFilePath
    if (data.agentFilePath) {
      try {
        const stat = Deno.statSync(data.agentFilePath);
        if (!stat.isFile) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["agentFilePath"],
            message: `agentFilePath must point to a file: ${data.agentFilePath}`,
          });
        }
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["agentFilePath"],
            message: `agentFilePath does not exist: ${data.agentFilePath}`,
          });
        } else {
          // Re-throw other errors (permission denied, etc.) to surface the real issue
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["agentFilePath"],
            message: `Cannot access agentFilePath: ${
              err instanceof Error ? err.message : String(err)
            }`,
          });
        }
      }
    }

    // Validate file existence for claudeFilePath
    if (data.claudeFilePath) {
      try {
        const stat = Deno.statSync(data.claudeFilePath);
        if (!stat.isFile) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["claudeFilePath"],
            message: `claudeFilePath must point to a file: ${data.claudeFilePath}`,
          });
        }
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["claudeFilePath"],
            message: `claudeFilePath does not exist: ${data.claudeFilePath}`,
          });
        } else {
          // Re-throw other errors (permission denied, etc.) to surface the real issue
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["claudeFilePath"],
            message: `Cannot access claudeFilePath: ${
              err instanceof Error ? err.message : String(err)
            }`,
          });
        }
      }
    }
  })
  .optional();

// ============================================================================
// § 5: GroupingConstraints
// ============================================================================

const GroupingConstraintsBaseSchema = z
  .object({
    minToolsPerGroup: z.number().int().min(1, "minToolsPerGroup must be at least 1"),
    maxToolsPerGroup: z.number().int(),
    minGroups: z.number().int().min(1, "minGroups must be at least 1"),
    maxGroups: z.number().int(),
  })
  .strict()
  .refine(
    (data) => data.maxToolsPerGroup >= data.minToolsPerGroup,
    {
      message: "maxToolsPerGroup must be greater than or equal to minToolsPerGroup",
      path: ["maxToolsPerGroup"],
    },
  )
  .refine(
    (data) => data.maxGroups >= data.minGroups,
    {
      message: "maxGroups must be greater than or equal to minGroups",
      path: ["maxGroups"],
    },
  );

// Required version for validation
export const GroupingConstraintsRequiredSchema = GroupingConstraintsBaseSchema;

// Optional version for configuration
export const GroupingConstraintsSchema = GroupingConstraintsBaseSchema.optional();

// Default grouping constraints
export const DEFAULT_GROUPING_CONSTRAINTS = {
  minToolsPerGroup: 5,
  maxToolsPerGroup: 20,
  minGroups: 3,
  maxGroups: 10,
} as const;

// ============================================================================
// § 2: MCPServerConfig
// ============================================================================

// Define each transport variant separately to reduce type complexity
const StdioServerConfigSchema = z.object({
  name: z.string().min(1, "Server name is required and must be a non-empty string").trim(),
  transport: z.literal("stdio"),
  command: z.string().min(1, "Command is required for stdio transport"),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.string().optional(),
}).strict();

const HttpServerConfigSchema = z.object({
  name: z.string().min(1, "Server name is required and must be a non-empty string").trim(),
  transport: z.literal("http"),
  url: z.string().url("Invalid URL format").min(1, "URL is required for http transport"),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
}).strict();

const WebSocketServerConfigSchema = z.object({
  name: z.string().min(1, "Server name is required and must be a non-empty string").trim(),
  transport: z.literal("websocket"),
  url: z.string().url("Invalid URL format").min(1, "URL is required for websocket transport"),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
}).strict();

// Transport-specific validation using discriminated union
export const MCPServerConfigSchema = z
  .discriminatedUnion("transport", [
    StdioServerConfigSchema,
    HttpServerConfigSchema,
    WebSocketServerConfigSchema,
  ])
  .refine(
    (data) => {
      // Forbidden credential fields - security check
      const obj = data as Record<string, unknown>;
      return !("password" in obj) && !("apiKey" in obj) && !("secret" in obj);
    },
    {
      message: "Password, apiKey, and secret fields are not allowed in configuration",
    },
  );

// ============================================================================
// § 1: Configuration
// ============================================================================

export const ConfigurationSchema = z
  .object({
    version: z.string().refine(
      (v) => ["1.0.0"].includes(v),
      {
        message: "Unsupported version. Supported versions: 1.0.0",
      },
    ),
    mcpServers: z
      .array(MCPServerConfigSchema)
      .min(1, "At least one MCP server must be configured")
      .refine(
        (servers) => {
          // Check for duplicate server names (normalized by trimming)
          const names = servers.map((s) => s.name.trim());
          const uniqueNames = new Set(names);
          return names.length === uniqueNames.size;
        },
        {
          message: "MCP server names must be unique",
        },
      ),
    llmProvider: LLMProviderConfigSchema,
    projectContext: ProjectContextSchema,
    groupingConstraints: GroupingConstraintsSchema,
  })
  .strict();

// ============================================================================
// § 6: Tool
// ============================================================================

// Simplified JSON Schema definitions to reduce type inference complexity
export const JSONSchemaPropertySchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  default: z.unknown().optional(),
}).passthrough();

export const JSONSchemaSchema = z.object({
  type: z.literal("object"), // Tool inputSchema must be a JSON Schema object
  properties: z.record(
    z.string(),
    z.union([
      z.object({}).passthrough(), // Standard JSON Schema object
      z.boolean(), // JSON Schema allows true (accept-all) / false (reject-all)
    ]),
  ).optional(),
  required: z.array(z.string()).optional(),
}).passthrough();

export const ToolSchema = z.object({
  name: z.string().min(1, "Tool name is required and must be non-empty"),
  description: z.string().min(1, "Tool description is required and must be non-empty"),
  inputSchema: JSONSchemaSchema,
  serverName: z.string().min(1, "Server name is required"),
  category: z.string().optional(),
}).strict();

// ============================================================================
// § 7: ToolGroup
// ============================================================================

export const ToolGroupSchema = z.object({
  id: z.string().min(1, "Group ID is required and must be non-empty"),
  name: z.string().min(1, "Group name is required and must be non-empty"),
  description: z.string().min(1, "Group description is required and must be non-empty"),
  tools: z.array(ToolSchema).min(1, "Tool group must contain at least one tool"),
  complementarityScore: z
    .number()
    .min(0, "Complementarity score must be between 0 and 1")
    .max(1, "Complementarity score must be between 0 and 1")
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

// ============================================================================
// § 8: SubAgent
// ============================================================================

export const SubAgentSchema = z.object({
  id: z.string().min(1, "Agent ID is required and must be non-empty"),
  name: z.string().min(1, "Agent name is required and must be non-empty"),
  description: z.string().min(1, "Agent description is required and must be non-empty"),
  toolGroup: ToolGroupSchema,
  llmProvider: LLMProviderConfigSchema,
  systemPrompt: z.string().min(1, "System prompt is required and must be non-empty"),
}).strict();

// ============================================================================
// § 9: AgentRequest
// ============================================================================

export const AgentRequestSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  agentId: z.string().min(1, "Agent ID is required"),
  prompt: z.string().min(1, "Prompt is required and must be non-empty"),
  context: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.date(),
}).strict();

// ============================================================================
// § 10: AgentResponse
// ============================================================================

export const AgentResponseSchema = z
  .object({
    requestId: z.string().min(1, "Request ID is required"),
    agentId: z.string().min(1, "Agent ID is required"),
    result: z.string().optional(),
    toolsUsed: z.array(z.string()).optional(),
    timestamp: z.date(),
    error: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      // Either result or error must be present, but not both
      const hasResult = data.result !== undefined && data.result !== "";
      const hasError = data.error !== undefined && data.error !== "";
      return (hasResult && !hasError) || (!hasResult && hasError);
    },
    {
      message: "Either result or error must be present (not both)",
    },
  );

// ============================================================================
// Validation Result Types
// ============================================================================

export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
}).strict();

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
}).strict();

// ============================================================================
// Type Exports (manually defined to reduce compilation memory usage)
// ============================================================================

export type LLMProviderType =
  | "anthropic"
  | "openai"
  | "gemini"
  | "vercel"
  | "bedrock"
  | "openrouter";

export type CredentialSource = "cli-tool" | "env-var" | "prompt";

export type MCPTransport = "stdio" | "http" | "websocket";

export interface LLMProviderConfig {
  type: LLMProviderType;
  model?: string;
  credentialSource: CredentialSource;
  endpointOverride?: string;
}

export interface ProjectContext {
  agentFilePath?: string;
  claudeFilePath?: string;
  domain?: string;
  customHints?: string[];
  /** Full merged content from CLAUDE.md/AGENT.md files for deeper LLM understanding */
  fullContent?: string;
}

export interface GroupingConstraints {
  minToolsPerGroup: number;
  maxToolsPerGroup: number;
  minGroups: number;
  maxGroups: number;
}

export type MCPServerConfig =
  | {
    name: string;
    transport: "stdio";
    command: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
  }
  | {
    name: string;
    transport: "http";
    url: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  }
  | {
    name: string;
    transport: "websocket";
    url: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  };

export interface Configuration {
  version: string;
  mcpServers: MCPServerConfig[];
  llmProvider: LLMProviderConfig;
  projectContext?: ProjectContext;
  groupingConstraints?: GroupingConstraints;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

export interface JSONSchema {
  type: "object"; // Tool inputSchema must be a JSON Schema object
  properties?: Record<string, JSONSchemaProperty | boolean>;
  required?: string[];
  [key: string]: unknown;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  serverName: string;
  category?: string;
}

export interface ToolGroup {
  id: string;
  name: string;
  description: string;
  tools: Tool[];
  complementarityScore?: number;
  metadata?: Record<string, unknown>;
}

export interface SubAgent {
  id: string;
  name: string;
  description: string;
  toolGroup: ToolGroup;
  llmProvider: LLMProviderConfig;
  systemPrompt: string;
}

export interface AgentRequest {
  requestId: string;
  agentId: string;
  prompt: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

export interface AgentResponse {
  requestId: string;
  agentId: string;
  result?: string;
  toolsUsed?: string[];
  timestamp: Date;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
