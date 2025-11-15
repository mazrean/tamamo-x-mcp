/**
 * Type definitions for tamamo-x-mcp
 * Based on data-model.md
 */

// LLM Provider Types
export type LLMProviderType =
  | "anthropic"
  | "openai"
  | "gemini"
  | "vercel"
  | "bedrock"
  | "openrouter";

export type CredentialSource = "cli-tool" | "env-var" | "prompt";

// MCP Transport Types
export type MCPTransport = "stdio" | "http" | "websocket";

// § 3: LLMProviderConfig
export interface LLMProviderConfig {
  type: LLMProviderType;
  model?: string;
  credentialSource: CredentialSource;
  endpointOverride?: string;
}

// § 4: ProjectContext
export interface ProjectContext {
  agentFilePath?: string;
  claudeFilePath?: string;
  domain?: string;
  customHints?: string[];
}

// § 5: GroupingConstraints
export interface GroupingConstraints {
  minToolsPerGroup: number;
  maxToolsPerGroup: number;
  minGroups: number;
  maxGroups: number;
}

// Default grouping constraints
export const DEFAULT_GROUPING_CONSTRAINTS: GroupingConstraints = {
  minToolsPerGroup: 5,
  maxToolsPerGroup: 20,
  minGroups: 3,
  maxGroups: 10,
};

// § 2: MCPServerConfig
export interface MCPServerConfig {
  name: string;
  transport: MCPTransport;
  command?: string; // Required if transport="stdio"
  args?: string[]; // Optional for stdio transport
  url?: string; // Required if transport="http" or "websocket"
  env?: Record<string, string>; // Optional environment variables
}

// § 1: Configuration
export interface Configuration {
  version: string;
  mcpServers: MCPServerConfig[];
  llmProvider: LLMProviderConfig;
  projectContext?: ProjectContext;
  groupingConstraints?: GroupingConstraints;
}

// § 6: Tool
export interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  serverName: string;
  category?: string;
}

// JSON Schema type (simplified)
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

// § 7: ToolGroup
export interface ToolGroup {
  id: string;
  name: string;
  description: string;
  tools: Tool[];
  complementarityScore?: number; // 0-1
  metadata?: Record<string, unknown>;
}

// § 8: SubAgent
export interface SubAgent {
  id: string;
  name: string;
  description: string;
  toolGroup: ToolGroup;
  llmProvider: LLMProviderConfig;
  systemPrompt: string;
}

// § 9: AgentRequest
export interface AgentRequest {
  requestId: string;
  agentId: string;
  prompt: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

// § 10: AgentResponse
export interface AgentResponse {
  requestId: string;
  agentId: string;
  result?: string;
  toolsUsed?: string[];
  timestamp: Date;
  error?: string;
}

// Validation result types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// LLM Completion types
export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface LLMClient {
  provider: LLMProviderType;
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
  inputSchema: JSONSchema;
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
