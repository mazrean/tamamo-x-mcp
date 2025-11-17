/**
 * Type definitions for tamamo-x-mcp
 * Based on data-model.md
 *
 * All types are inferred from Zod schemas for consistency
 */

// Import types from schemas for use in this file
import type {
  JSONSchema as JSONSchemaType,
  LLMProviderType as LLMProviderTypeType,
} from "../schemas/index.ts";

// Re-export all types from Zod schemas
export type {
  AgentRequest,
  AgentResponse,
  Configuration,
  CredentialSource,
  GroupingConstraints,
  JSONSchema,
  JSONSchemaProperty,
  LLMProviderConfig,
  LLMProviderType,
  MCPServerConfig,
  MCPTransport,
  ProjectContext,
  SubAgent,
  Tool,
  ToolGroup,
  ValidationError,
  ValidationResult,
} from "../schemas/index.ts";

// Re-export constants
export { DEFAULT_GROUPING_CONSTRAINTS } from "../schemas/index.ts";

// NOTE: Zod schemas are NOT re-exported here to reduce type checking complexity
// Import schemas directly from "../schemas/index.ts" where validation is needed

// LLM Completion types
export interface CompletionOptions {
  /** System prompt to set the behavior and constraints */
  system?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  /** JSON schema to enforce structured output (if supported by provider) */
  responseSchema?: JSONSchemaType;
}

export interface LLMClient {
  provider: LLMProviderTypeType;
  model: string;
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

// MCP Protocol types
export interface MCPInitializeRequest {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  clientInfo: MCPClientInfo;
}

export interface MCPCapabilities {
  tools?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
}

export interface MCPClientInfo {
  name: string;
  version: string;
}

export interface MCPInitializeResponse {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  serverInfo: MCPServerInfo;
}

export interface MCPServerInfo {
  name: string;
  version: string;
}

export interface MCPToolsListResponse {
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchemaType;
}

export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolCallResponse {
  content: MCPContent[];
  isError?: boolean;
}

export interface MCPContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}
