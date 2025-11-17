/**
 * MCP Client implementation
 * Supports stdio and http (SSE) transports
 * WebSocket transport is not yet supported (MCP SDK limitation)
 *
 * Reference: research.md § 2 (MCP Protocol Integration)
 * Reference: data-model.md § 2 (MCPServerConfig)
 */

import { Client } from "npm:@modelcontextprotocol/sdk@1.22.0/client/index.js";
import { StdioClientTransport } from "npm:@modelcontextprotocol/sdk@1.22.0/client/stdio.js";
import { StreamableHTTPClientTransport } from "npm:@modelcontextprotocol/sdk@1.22.0/client/streamableHttp.js";
import { z } from "npm:zod@3.24.1";
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
        `Failed to connect to ${this.config.name}: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
   * Connect via HTTP (Streamable HTTP) transport
   * MCP Streamable HTTP transport (protocol revision 2025-03-26) specification:
   * - Single MCP endpoint that supports both POST and GET methods
   * - Base URL example: https://example.com/mcp
   * - POST: Client sends JSON-RPC messages to server
   * - GET: Client receives SSE stream from server
   * - Session management via Mcp-Session-Id header
   * - Resumability with event IDs and Last-Event-ID header
   */
  private async connectHttp(): Promise<void> {
    if (!this.config.url) {
      throw new Error("url is required for http transport");
    }

    try {
      const baseUrl = new URL(this.config.url);
      console.log(`[MCP Client] Connecting to Streamable HTTP transport at ${baseUrl.href}`);
      console.log(`[MCP Client] Using single MCP endpoint supporting both POST and GET methods`);

      const transport = new StreamableHTTPClientTransport(baseUrl);

      // Add timeout for HTTP connection (30 seconds)
      const connectPromise = this.client.connect(transport);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout after 30 seconds")), 30000);
      });

      await Promise.race([connectPromise, timeoutPromise]);
      console.log(`[MCP Client] Successfully connected to ${this.config.name} via Streamable HTTP`);
    } catch (error) {
      // Enhanced error message with more details
      const errorDetails = error instanceof Error ? error.message : JSON.stringify(error);

      // Extract more error information if available
      const errorCause = error instanceof Error && error.cause ? ` (cause: ${error.cause})` : "";

      throw new Error(
        `Streamable HTTP connection failed: ${errorDetails}${errorCause}. ` +
          `Verify that:\n` +
          `  1. The server at ${this.config.url} is accessible\n` +
          `  2. The server implements MCP Streamable HTTP transport (single endpoint with POST/GET support)\n` +
          `  3. CORS is properly configured if connecting from browser context\n` +
          `  4. No firewall or network issues blocking the connection`,
        { cause: error },
      );
    }
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

      // Type assertion to avoid "excessively deep" type instantiation with Zod schemas
      // deno-lint-ignore no-explicit-any
      const schemaAny = schema as any;

      const result = await this.client.request(
        { method: "tools/list", params: {} },
        schemaAny,
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
      const schema = z.object({}).passthrough();

      // Type assertion to avoid "excessively deep" type instantiation with Zod schemas
      // deno-lint-ignore no-explicit-any
      const schemaAny = schema as any;

      const result = await this.client.request(
        {
          method: "tools/call",
          params: {
            name,
            arguments: args,
          },
        },
        schemaAny,
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
      throw new Error(
        `Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`,
        {
          cause: error,
        },
      );
    } finally {
      // Always reset connected flag, even if close() fails
      this.connected = false;
    }
  }
}
