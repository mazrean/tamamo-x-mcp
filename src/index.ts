#!/usr/bin/env node
/**
 * Main entry point for tamamo-x-mcp server
 * Integrates existing MCP servers as sub-agents
 */

import { initializeConfig } from './config/index.js';
import { AgentManager } from './agents/index.js';
import { McpServer } from './mcp/index.js';
import { logger } from './utils/logger.js';
import { handleError } from './utils/errors.js';
import { exit, addSignalListener, isDeno } from './utils/runtime.js';

async function main() {
  try {
    const runtime = isDeno() ? 'Deno' : 'Node.js';
    logger.info(`Starting tamamo-x-mcp server on ${runtime}...`);

    // Load configuration
    const config = await initializeConfig();
    logger.info(`Loaded configuration with ${Object.keys(config.mcpServers).length} MCP servers`);

    // Initialize agent manager
    const agentManager = new AgentManager();

    // Register sub-agents for each MCP server (only stdio servers for now)
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      if (serverConfig.type === 'stdio') {
        try {
          await agentManager.registerAgent(serverName, serverConfig);
        } catch (error) {
          logger.warn(
            `Failed to register agent for ${serverName}: ${handleError(error).message}`,
          );
        }
      } else {
        logger.warn(`Skipping ${serverName}: HTTP servers not yet supported`);
      }
    }

    logger.info(`Registered ${agentManager.getAgentCount()} agents`);

    // Create MCP server
    const mcpServer = new McpServer();

    // Register all tools from all agents
    const allTools = agentManager.getAllTools();
    logger.info(`Registering ${allTools.length} tools`);

    for (const tool of allTools) {
      mcpServer.registerTool(tool, async (args) => {
        const result = await agentManager.executeTool({
          name: tool.name,
          arguments: args,
        });
        return result;
      });
    }

    // Setup graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      await agentManager.shutdown();
      exit(0);
    };

    addSignalListener('SIGINT', shutdown);
    addSignalListener('SIGTERM', shutdown);

    // Start the server
    logger.info('MCP server ready');
    await mcpServer.start();
  } catch (error) {
    logger.error('Fatal error', handleError(error));
    exit(1);
  }
}

// Run if this is the main module
if (isDeno()) {
  // @ts-ignore: Deno global
  if (import.meta.main) {
    main();
  }
} else {
  if (import.meta.url === `file://${process.argv[1]}`) {
    main();
  }
}

export { main };

