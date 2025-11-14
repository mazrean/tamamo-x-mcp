/**
 * MCP Server implementation providing stdio-based communication
 */

import { Logger } from '../utils/logger.js';
import type { McpTool } from './types.js';
import { isDeno } from '../utils/runtime.js';

interface JsonRpcRequest {
  jsonrpc: string;
  id?: number | string;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id?: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class McpServer {
  private logger: Logger;
  private tools: Map<string, McpTool> = new Map();
  private toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>> =
    new Map();

  constructor() {
    this.logger = new Logger('mcp-server');
  }

  /**
   * Register a tool with the server
   */
  registerTool(
    tool: McpTool,
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ): void {
    this.tools.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);
    this.logger.info(`Registered tool: ${tool.name}`);
  }

  /**
   * Handle incoming JSON-RPC requests
   */
  private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(id);

        case 'initialized':
          return { jsonrpc: '2.0', id, result: {} };

        case 'tools/list':
          return this.handleToolsList(id);

        case 'tools/call':
          return await this.handleToolCall(id, params);

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          };
      }
    } catch (error) {
      this.logger.error(`Error handling request: ${method}`, error as Error);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(id?: number | string): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'tamamo-x-mcp',
          version: '0.1.0',
        },
      },
    };
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(id?: number | string): JsonRpcResponse {
    const tools = Array.from(this.tools.values());
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools,
      },
    };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolCall(
    id: number | string | undefined,
    params: unknown,
  ): Promise<JsonRpcResponse> {
    if (!params || typeof params !== 'object') {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Invalid params',
        },
      };
    }

    const { name, arguments: args } = params as {
      name?: string;
      arguments?: Record<string, unknown>;
    };

    if (!name) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Missing tool name',
        },
      };
    }

    const handler = this.toolHandlers.get(name);
    if (!handler) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: `Tool not found: ${name}`,
        },
      };
    }

    try {
      const result = await handler(args || {});
      return {
        jsonrpc: '2.0',
        id,
        result,
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Tool execution failed',
        },
      };
    }
  }

  /**
   * Start the server and listen for requests on stdin (Deno version)
   */
  private async startDeno(): Promise<void> {
    this.logger.info('Starting MCP server (Deno)...');

    const decoder = new TextDecoder();
    let buffer = '';

    // @ts-ignore: Deno global
    for await (const chunk of Deno.stdin.readable) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const request = JSON.parse(line) as JsonRpcRequest;
          const response = await this.handleRequest(request);

          // Write response to stdout
          const responseJson = JSON.stringify(response) + '\n';
          // @ts-ignore: Deno global
          await Deno.stdout.write(new TextEncoder().encode(responseJson));
        } catch (error) {
          this.logger.error('Failed to process request', error as Error);
        }
      }
    }
  }

  /**
   * Start the server and listen for requests on stdin (Node.js version)
   */
  private async startNode(): Promise<void> {
    this.logger.info('Starting MCP server (Node.js)...');

    const { createInterface } = await import('node:readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line) => {
      if (!line.trim()) return;

      try {
        const request = JSON.parse(line) as JsonRpcRequest;
        const response = await this.handleRequest(request);

        // Write response to stdout
        const responseJson = JSON.stringify(response) + '\n';
        process.stdout.write(responseJson);
      } catch (error) {
        this.logger.error('Failed to process request', error as Error);
      }
    });

    // Keep the process alive
    await new Promise(() => {});
  }

  /**
   * Start the server and listen for requests on stdin
   */
  async start(): Promise<void> {
    if (isDeno()) {
      await this.startDeno();
    } else {
      await this.startNode();
    }
  }
}

