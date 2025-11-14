/**
 * MCP Client types and interfaces
 */

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface McpServerCapabilities {
  tools?: McpTool[];
  resources?: McpResource[];
  prompts?: McpPrompt[];
}

export interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface ToolCallResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
}
