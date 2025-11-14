/**
 * Configuration loader for MCP servers
 */

import type { AppConfig, McpConfig } from './types.js';
import { isDeno } from '../utils/runtime.js';

/**
 * Load MCP configuration from a JSON file
 */
export async function loadMcpConfig(configPath: string): Promise<McpConfig> {
  try {
    let configText: string;
    
    if (isDeno()) {
      // @ts-ignore: Deno global
      configText = await Deno.readTextFile(configPath);
    } else {
      const { readFile } = await import('node:fs/promises');
      configText = await readFile(configPath, 'utf-8');
    }
    
    const config = JSON.parse(configText) as McpConfig;
    
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      throw new Error('Invalid MCP configuration: mcpServers field is required');
    }
    
    return config;
  } catch (error) {
    const err = error as Error & { code?: string };
    if (isDeno()) {
      // @ts-ignore: Deno global
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`MCP configuration file not found: ${configPath}`);
      }
    } else {
      if (err.code === 'ENOENT') {
        throw new Error(`MCP configuration file not found: ${configPath}`);
      }
    }
    throw new Error(`Failed to load MCP configuration: ${err.message}`);
  }
}

/**
 * Initialize application configuration
 */
export async function initializeConfig(
  configPath: string = '.mcp.json',
): Promise<AppConfig> {
  const mcpConfig = await loadMcpConfig(configPath);
  
  return {
    mcpConfigPath: configPath,
    mcpServers: mcpConfig.mcpServers,
  };
}

/**
 * Validate MCP server configuration
 */
export function validateServerConfig(
  name: string,
  config: unknown,
): void {
  if (!config || typeof config !== 'object') {
    throw new Error(`Invalid configuration for server ${name}`);
  }
  
  const serverConfig = config as Record<string, unknown>;
  
  if (!serverConfig.type || !['stdio', 'http'].includes(serverConfig.type as string)) {
    throw new Error(`Invalid type for server ${name}: must be 'stdio' or 'http'`);
  }
  
  if (serverConfig.type === 'stdio' && !serverConfig.command) {
    throw new Error(`Missing command for stdio server ${name}`);
  }
  
  if (serverConfig.type === 'http' && !serverConfig.url) {
    throw new Error(`Missing url for http server ${name}`);
  }
}
