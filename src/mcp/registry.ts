/**
 * MCP Client Registry
 * Manages connections to multiple MCP servers for tool execution
 */

import { MCPClient } from "./client.ts";
import type { MCPServerConfig } from "../types/index.ts";

/**
 * Registry for managing MCP client connections
 */
export class MCPClientRegistry {
  private clients: Map<string, MCPClient> = new Map();
  private serverConfigs: Map<string, MCPServerConfig> = new Map();

  /**
   * Add an MCP server configuration to the registry
   */
  addServer(config: MCPServerConfig): void {
    this.serverConfigs.set(config.name, config);
  }

  /**
   * Get or create an MCP client for a server
   */
  async getClient(serverName: string): Promise<MCPClient> {
    // Return existing client if already connected
    if (this.clients.has(serverName)) {
      const client = this.clients.get(serverName)!;
      if (client.isConnected) {
        return client;
      }
    }

    // Get server config
    const config = this.serverConfigs.get(serverName);
    if (!config) {
      throw new Error(`Server ${serverName} not found in registry`);
    }

    // Create and connect new client
    const client = new MCPClient(config);
    await client.connect();
    this.clients.set(serverName, client);

    return client;
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const client = await this.getClient(serverName);
    return await client.callTool(toolName, args);
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map((client) =>
      client.disconnect().catch(() => {
        // Ignore disconnect errors
      })
    );

    await Promise.all(disconnectPromises);
    this.clients.clear();
  }

  /**
   * Get all server names in the registry
   */
  getServerNames(): string[] {
    return Array.from(this.serverConfigs.keys());
  }
}
