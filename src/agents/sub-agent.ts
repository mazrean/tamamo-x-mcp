/**
 * Sub-agent base class for delegating to MCP servers
 */

import { McpClient } from '../mcp/client.js';
import type { McpServerConfig } from '../config/types.js';
import type { McpTool, ToolCallParams, ToolCallResult } from '../mcp/types.js';
import { Logger } from '../utils/logger.js';
import { AgentError } from '../utils/errors.js';

export interface AgentConfig {
  name: string;
  description: string;
  mcpServerName: string;
  mcpServerConfig: McpServerConfig;
}

export class SubAgent {
  private logger: Logger;
  private mcpClient: McpClient;
  private tools: McpTool[] = [];
  public readonly name: string;
  public readonly description: string;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.description = config.description;
    this.logger = new Logger(`agent:${config.name}`);
    this.mcpClient = new McpClient(config.mcpServerName, config.mcpServerConfig);
  }

  /**
   * Initialize the sub-agent and its MCP client
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing sub-agent...');
      await this.mcpClient.start();
      await this.mcpClient.initialize();
      
      const capabilities = await this.mcpClient.listTools();
      this.tools = capabilities.tools || [];
      
      this.logger.info(`Initialized with ${this.tools.length} tools`);
    } catch (error) {
      const err = error as Error;
      throw new AgentError(
        `Failed to initialize: ${err.message}`,
        this.name,
        err,
      );
    }
  }

  /**
   * Shutdown the sub-agent
   */
  async shutdown(): Promise<void> {
    try {
      await this.mcpClient.stop();
      this.logger.info('Shut down successfully');
    } catch (error) {
      this.logger.error('Error during shutdown', error as Error);
    }
  }

  /**
   * Get available tools from this agent
   */
  getTools(): McpTool[] {
    return this.tools.map(tool => ({
      ...tool,
      name: `${this.name}_${tool.name}`,
    }));
  }

  /**
   * Execute a tool call
   */
  async executeTool(params: ToolCallParams): Promise<ToolCallResult> {
    try {
      // Remove agent prefix from tool name
      const actualToolName = params.name.replace(`${this.name}_`, '');
      
      const result = await this.mcpClient.callTool({
        name: actualToolName,
        arguments: params.arguments,
      });
      
      return result;
    } catch (error) {
      const err = error as Error;
      throw new AgentError(
        `Tool execution failed: ${err.message}`,
        this.name,
        err,
      );
    }
  }
}
