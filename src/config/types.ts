/**
 * Type definitions for MCP server configuration
 */

export interface McpServerConfig {
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

export interface AppConfig {
  mcpConfigPath: string;
  mcpServers: Record<string, McpServerConfig>;
}
