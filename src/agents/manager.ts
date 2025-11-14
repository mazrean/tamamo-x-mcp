/**
 * Agent manager for coordinating multiple sub-agents
 */

import { SubAgent } from './sub-agent.js';
import type { AgentConfig } from './sub-agent.js';
import type { McpServerConfig } from '../config/types.js';
import type { McpTool, ToolCallParams, ToolCallResult } from '../mcp/types.js';
import { Logger } from '../utils/logger.js';
import { AgentError } from '../utils/errors.js';

export class AgentManager {
  private logger: Logger;
  private agents: Map<string, SubAgent> = new Map();

  constructor() {
    this.logger = new Logger('agent-manager');
  }

  /**
   * Create and register a sub-agent for an MCP server
   */
  async registerAgent(
    serverName: string,
    serverConfig: McpServerConfig,
  ): Promise<void> {
    try {
      const agentConfig: AgentConfig = {
        name: serverName,
        description: `Sub-agent for ${serverName} MCP server`,
        mcpServerName: serverName,
        mcpServerConfig: serverConfig,
      };

      const agent = new SubAgent(agentConfig);
      await agent.initialize();

      this.agents.set(serverName, agent);
      this.logger.info(`Registered agent: ${serverName}`);
    } catch (error) {
      const err = error as Error;
      throw new AgentError(
        `Failed to register agent ${serverName}: ${err.message}`,
        serverName,
        err,
      );
    }
  }

  /**
   * Get all available tools from all agents
   */
  getAllTools(): McpTool[] {
    const allTools: McpTool[] = [];
    
    for (const agent of this.agents.values()) {
      allTools.push(...agent.getTools());
    }
    
    return allTools;
  }

  /**
   * Execute a tool call by routing to the appropriate agent
   */
  async executeTool(params: ToolCallParams): Promise<ToolCallResult> {
    // Extract agent name from tool name (format: agentName_toolName)
    const parts = params.name.split('_');
    if (parts.length < 2) {
      throw new Error(`Invalid tool name format: ${params.name}`);
    }

    const agentName = parts[0];
    const agent = this.agents.get(agentName);

    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    try {
      return await agent.executeTool(params);
    } catch (error) {
      const err = error as Error;
      throw new AgentError(
        `Tool execution failed: ${err.message}`,
        agentName,
        err,
      );
    }
  }

  /**
   * Shutdown all agents
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down all agents...');
    
    const shutdownPromises = Array.from(this.agents.values()).map(agent =>
      agent.shutdown()
    );
    
    await Promise.allSettled(shutdownPromises);
    this.agents.clear();
    
    this.logger.info('All agents shut down');
  }

  /**
   * Get the number of registered agents
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): SubAgent | undefined {
    return this.agents.get(name);
  }
}
