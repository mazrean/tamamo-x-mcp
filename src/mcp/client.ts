/**
 * MCP Client for communicating with existing MCP servers via stdio
 */

import type { McpServerConfig } from '../config/types.js';
import type { McpServerCapabilities, ToolCallParams, ToolCallResult } from './types.js';
import { Logger } from '../utils/logger.js';
import { McpServerError } from '../utils/errors.js';
import { isDeno } from '../utils/runtime.js';

export class McpClient {
  private logger: Logger;
  private process: any = null; // Deno.ChildProcess or Node ChildProcess
  private serverName: string;
  private config: McpServerConfig;
  private requestId = 0;

  constructor(serverName: string, config: McpServerConfig) {
    this.serverName = serverName;
    this.config = config;
    this.logger = new Logger(`mcp-client:${serverName}`);
  }

  /**
   * Start the MCP server process
   */
  async start(): Promise<void> {
    if (this.config.type !== 'stdio') {
      throw new McpServerError(
        'Only stdio MCP servers are currently supported',
        this.serverName,
      );
    }

    if (!this.config.command) {
      throw new McpServerError('Missing command in server config', this.serverName);
    }

    try {
      if (isDeno()) {
        // @ts-ignore: Deno global
        const command = new Deno.Command(this.config.command, {
          args: this.config.args || [],
          env: this.config.env || {},
          stdin: 'piped',
          stdout: 'piped',
          stderr: 'piped',
        });
        this.process = command.spawn();
      } else {
        const { spawn } = await import('node:child_process');
        this.process = spawn(this.config.command, this.config.args || [], {
          env: { ...process.env, ...this.config.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.process.on('error', (error: Error) => {
          this.logger.error(`Process error: ${error.message}`);
        });

        this.process.on('exit', (code: number) => {
          this.logger.info(`Process exited with code: ${code}`);
        });
      }

      this.logger.info(`Started MCP server: ${this.serverName}`);
    } catch (error) {
      throw new McpServerError(
        `Failed to start MCP server: ${(error as Error).message}`,
        this.serverName,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Stop the MCP server process
   */
  async stop(): Promise<void> {
    if (this.process) {
      try {
        if (isDeno()) {
          this.process.kill('SIGTERM');
          await this.process.status;
        } else {
          this.process.kill('SIGTERM');
        }
        this.logger.info(`Stopped MCP server: ${this.serverName}`);
      } catch (error) {
        this.logger.warn(`Error stopping MCP server: ${(error as Error).message}`);
      } finally {
        this.process = null;
      }
    }
  }

  /**
   * Send a JSON-RPC request to the MCP server (Deno version)
   */
  private async sendRequestDeno(method: string, params?: unknown): Promise<unknown> {
    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const requestJson = JSON.stringify(request) + '\n';
    const writer = this.process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(requestJson));
    writer.releaseLock();

    // Read response
    const reader = this.process.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const response = JSON.parse(line);
            if (response.id === id) {
              reader.releaseLock();
              if (response.error) {
                throw new Error(response.error.message || 'Unknown error');
              }
              return response.result;
            }
          } catch (e) {
            // Continue reading if JSON parsing fails
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    throw new Error('No response received');
  }

  /**
   * Send a JSON-RPC request to the MCP server (Node.js version)
   */
  private async sendRequestNode(method: string, params?: unknown): Promise<unknown> {
    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      const requestJson = JSON.stringify(request) + '\n';

      let buffer = '';
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const response = JSON.parse(line);
            if (response.id === id) {
              clearTimeout(timeout);
              this.process?.stdout?.removeListener('data', onData);

              if (response.error) {
                reject(new Error(response.error.message || 'Unknown error'));
              } else {
                resolve(response.result);
              }
              return;
            }
          } catch (e) {
            // Continue reading if JSON parsing fails
          }
        }
      };

      this.process.stdout?.on('data', onData);
      this.process.stdin?.write(requestJson);
    });
  }

  /**
   * Send a JSON-RPC request to the MCP server
   */
  private async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (!this.process || !this.process.stdin || !this.process.stdout) {
      throw new McpServerError('MCP server is not running', this.serverName);
    }

    try {
      if (isDeno()) {
        return await this.sendRequestDeno(method, params);
      } else {
        return await this.sendRequestNode(method, params);
      }
    } catch (error) {
      throw new McpServerError(
        `Request failed: ${(error as Error).message}`,
        this.serverName,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Initialize the MCP connection
   */
  async initialize(): Promise<void> {
    try {
      await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'tamamo-x-mcp',
          version: '0.1.0',
        },
      });

      await this.sendRequest('initialized');
      this.logger.info(`Initialized connection to ${this.serverName}`);
    } catch (error) {
      throw new McpServerError(
        `Initialization failed: ${(error as Error).message}`,
        this.serverName,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<McpServerCapabilities> {
    try {
      const result = (await this.sendRequest('tools/list')) as { tools?: unknown[] };
      return {
        tools: result.tools || [],
      } as McpServerCapabilities;
    } catch (error) {
      throw new McpServerError(
        `Failed to list tools: ${(error as Error).message}`,
        this.serverName,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(params: ToolCallParams): Promise<ToolCallResult> {
    try {
      const result = await this.sendRequest('tools/call', {
        name: params.name,
        arguments: params.arguments || {},
      });

      return result as ToolCallResult;
    } catch (error) {
      throw new McpServerError(
        `Tool call failed: ${(error as Error).message}`,
        this.serverName,
        error instanceof Error ? error : undefined,
      );
    }
  }
}

