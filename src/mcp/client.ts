/**
 * MCP Client implementation
 * Supports stdio and http (SSE) transports
 * WebSocket transport is not yet supported (MCP SDK limitation)
 *
 * Reference: research.md § 2 (MCP Protocol Integration)
 * Reference: data-model.md § 2 (MCPServerConfig)
 */

import { Client } from "npm:@modelcontextprotocol/sdk@1.0.4/client/index.js";
import { StdioClientTransport } from "npm:@modelcontextprotocol/sdk@1.0.4/client/stdio.js";
import { SSEClientTransport } from "npm:@modelcontextprotocol/sdk@1.0.4/client/sse.js";
import { z } from "npm:zod@3.23.8";
import type { MCPServerConfig } from "../types/index.ts";

/**
 * MCP Client for connecting to and communicating with MCP servers
 */
export class MCPClient {
  private client: Client;
  private config: MCPServerConfig;
  private connected = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.validateConfig();

    // Create client instance
    this.client = new Client({
      name: "tamamo-x-mcp",
      version: "1.0.0",
    }, {
      capabilities: {},
    });
  }

  /**
   * Validate server configuration
   */
  private validateConfig(): void {
    // WebSocket transport is not yet implemented in MCP SDK
    if (this.config.transport === "websocket") {
      throw new Error(
        "WebSocket transport is not yet supported. " +
          "The MCP SDK does not currently provide WebSocket transport. " +
          "Use 'stdio' or 'http' transport instead.",
      );
    }

    if (this.config.transport === "stdio" && !this.config.command) {
      throw new Error("command is required for stdio transport");
    }

    if (this.config.transport === "http" && !this.config.url) {
      throw new Error(`url is required for ${this.config.transport} transport`);
    }
  }

  /**
   * Get transport type
   */
  get transport(): string {
    return this.config.transport;
  }

  /**
   * Get server name
   */
  get serverName(): string {
    return this.config.name;
  }

  /**
   * Get URL (for http/websocket transports)
   */
  get url(): string | undefined {
    return this.config.url;
  }

  /**
   * Check if client is connected
   */
  get isConnected(): boolean {
    return this.connected;
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error("Already connected");
    }

    try {
      if (this.config.transport === "stdio") {
        await this.connectStdio();
      } else if (this.config.transport === "http") {
        await this.connectHttp();
      } else {
        // Should never reach here due to validateConfig() check
        throw new Error(`Unsupported transport: ${this.config.transport}`);
      }

      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to ${this.config.name}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Connect via stdio transport
   */
  private async connectStdio(): Promise<void> {
    if (!this.config.command) {
      throw new Error("command is required for stdio transport");
    }

    const transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args || [],
      env: this.config.env,
    });

    await this.client.connect(transport);
  }

  /**
   * Connect via HTTP (SSE) transport
   */
  private async connectHttp(): Promise<void> {
    if (!this.config.url) {
      throw new Error("url is required for http transport");
    }

    const transport = new SSEClientTransport(new URL(this.config.url));
    await this.client.connect(transport);
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<unknown[]> {
    if (!this.connected) {
      throw new Error("Not connected - call connect() first");
    }

    try {
      const schema = z.object({
        tools: z.array(z.unknown()),
      });

      const result = await this.client.request(
        { method: "tools/list", params: {} },
        schema,
      );

      return result.tools || [];
    } catch (error) {
      throw new Error(
        `Failed to list tools: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.connected) {
      throw new Error("Not connected - call connect() first");
    }

    try {
      const schema = z.unknown();

      const result = await this.client.request(
        {
          method: "tools/call",
          params: {
            name,
            arguments: args,
          },
        },
        schema,
      );

      return result;
    } catch (error) {
      throw new Error(
        `Failed to call tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();
    } catch (error) {
      throw new Error(`Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      });
    } finally {
      // Always reset connected flag, even if close() fails
      this.connected = false;
    }
  }
}
