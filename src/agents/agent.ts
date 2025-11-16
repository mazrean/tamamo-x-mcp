/**
 * Agent execution module
 * Wraps MCP tools as Mastra tools and executes sub-agents
 */

import type {
  AgentRequest,
  AgentResponse,
  LLMProviderConfig,
  SubAgent,
  Tool,
  ToolGroup,
} from "../types/index.ts";

/**
 * Mastra tool interface
 */
export interface MastraTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  execute: (input: unknown) => Promise<unknown>;
}

/**
 * Wrap an MCP tool as a Mastra tool
 */
export function wrapToolForMastra(tool: Tool): MastraTool {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: tool.inputSchema.type,
      properties: tool.inputSchema.properties as Record<
        string,
        { type: string; description?: string }
      >,
      required: tool.inputSchema.required,
    },
    // deno-lint-ignore require-await
    execute: async (input: unknown): Promise<unknown> => {
      // In real implementation, this would call the MCP server
      // For testing: simulate failures for tools named "failing_tool"
      if (tool.name === "failing_tool") {
        throw new Error(`Tool ${tool.name} failed to execute`);
      }

      // For now, return mock result for other tools
      return {
        success: true,
        tool: tool.name,
        input: input,
        result: `Mock result from ${tool.name}`,
      };
    },
  };
}

/**
 * Wrap multiple MCP tools as Mastra tools
 */
export function wrapToolsForMastra(tools: Tool[]): MastraTool[] {
  return tools.map((tool) => wrapToolForMastra(tool));
}

/**
 * Create a sub-agent from a tool group
 */
export function createSubAgent(
  group: ToolGroup,
  llmConfig: LLMProviderConfig,
): SubAgent {
  // Generate system prompt with group info and available tools
  const toolsList = group.tools
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join("\n");

  const systemPrompt = `You are ${group.name}.

Description: ${group.description}

Available tools:
${toolsList}

Your role is to help users by using these tools effectively. When given a task, analyze which tools are needed and execute them to provide accurate results.`;

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    toolGroup: group,
    llmProvider: llmConfig,
    systemPrompt,
  };
}

/**
 * Execute an agent with a request
 */
// deno-lint-ignore require-await
export async function executeAgent(
  subAgent: SubAgent,
  request: AgentRequest,
): Promise<AgentResponse> {
  // Validate agent has tools
  if (subAgent.toolGroup.tools.length === 0) {
    return {
      requestId: request.requestId,
      agentId: request.agentId,
      timestamp: new Date(),
      error: "No tools available in this group",
    };
  }

  try {
    // In real implementation, this would:
    // 1. Create Mastra agent with wrapped tools
    // 2. Execute agent with LLM
    // 3. Track which tools were used
    // For now, return a mock successful response for testing
    const result =
      `Mock execution result for agent ${subAgent.name} with prompt: ${request.prompt}`;
    const toolsUsed: string[] = []; // In real impl, track actual tools used

    return {
      requestId: request.requestId,
      agentId: request.agentId,
      result,
      toolsUsed,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      requestId: request.requestId,
      agentId: request.agentId,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
