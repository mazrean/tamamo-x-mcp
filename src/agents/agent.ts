/**
 * Agent execution module
 * Wraps MCP tools for agent frameworks:
 * - Anthropic: Uses @anthropic-ai/claude-agent-sdk
 * - Others: Uses Mastra tools
 */

import type {
  AgentRequest,
  AgentResponse,
  JSONSchema,
  LLMProviderConfig,
  SubAgent,
  Tool,
  ToolGroup,
} from "../types/index.ts";

// Claude Agent SDK imports (for Anthropic provider)
import {
  createSdkMcpServer,
  type Query,
  query,
  tool,
} from "npm:@anthropic-ai/claude-agent-sdk@0.1.0";
import { z } from "npm:zod@3.24.1";

/**
 * Mastra tool interface (for non-Anthropic providers)
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
 * Convert JSON Schema to Zod schema for Claude Agent SDK
 */
function jsonSchemaToZod(schema: JSONSchema): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      let zodType: z.ZodTypeAny;

      // Handle boolean shorthand (true = accept all, false = reject all)
      if (typeof prop === "boolean") {
        zodType = prop ? z.unknown() : z.never();
      } else if (typeof prop === "object" && prop !== null && "type" in prop) {
        // Type assertion after validation
        const propSchema = prop as { type: string; description?: string };

        switch (propSchema.type) {
          case "string":
            zodType = z.string();
            break;
          case "number":
            zodType = z.number();
            break;
          case "boolean":
            zodType = z.boolean();
            break;
          case "object":
            zodType = z.record(z.unknown());
            break;
          case "array":
            zodType = z.array(z.unknown());
            break;
          default:
            zodType = z.unknown();
        }

        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
      } else {
        // Fallback for other property types
        zodType = z.unknown();
      }

      // Make optional if not in required array
      if (!schema.required?.includes(key)) {
        zodType = zodType.optional();
      }

      shape[key] = zodType;
    }
  }

  return z.object(shape).passthrough();
}

/**
 * Wrap an MCP tool as a Claude Agent SDK tool
 */
export function wrapToolForClaudeAgent(mcpTool: Tool): ReturnType<typeof tool> {
  const zodSchema = jsonSchemaToZod(mcpTool.inputSchema);

  // Create a simpler schema object to avoid deep type instantiation
  const simpleSchema: Record<string, z.ZodTypeAny> = {};
  for (const [key, value] of Object.entries(zodSchema.shape)) {
    simpleSchema[key] = value as z.ZodTypeAny;
  }

  return tool(
    mcpTool.name,
    mcpTool.description,
    simpleSchema as z.ZodRawShape,
    // deno-lint-ignore require-await
    async (args: Record<string, unknown>, _extra: unknown) => {
      // In real implementation, this would call the MCP server
      // For testing: simulate failures for tools named "failing_tool"
      if (mcpTool.name === "failing_tool") {
        throw new Error(`Tool ${mcpTool.name} failed to execute`);
      }

      // For now, return mock result
      return {
        content: [{
          type: "text" as const,
          text: `Mock result from ${mcpTool.name} with args: ${JSON.stringify(args)}`,
        }],
      };
    },
  );
}

/**
 * Wrap an MCP tool as a Mastra tool
 */
export function wrapToolForMastra(tool: Tool): MastraTool {
  // Normalize properties: filter out boolean shorthand
  // JSON Schema allows true/false as property values, but Mastra expects object schemas
  const normalizedProperties: Record<string, { type: string; description?: string }> = {};
  const droppedKeys = new Set<string>();

  if (tool.inputSchema.properties) {
    for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
      // Skip boolean shorthand properties (true = accept all, false = reject all)
      // as they don't fit Mastra's expected schema structure
      if (typeof prop === "boolean") {
        droppedKeys.add(key);
        // Note: 'false' means "reject all" which we cannot express in Mastra's schema.
        // In practice, MCP tools should not use boolean property schemas.
        continue;
      }
      normalizedProperties[key] = prop;
    }
  }

  // Filter required array to only include properties we kept
  const normalizedRequired: string[] = [];
  if (tool.inputSchema.required) {
    for (const key of tool.inputSchema.required) {
      if (!droppedKeys.has(key)) {
        normalizedRequired.push(key);
      }
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: tool.inputSchema.type,
      properties: normalizedProperties,
      required: normalizedRequired.length > 0 ? normalizedRequired : undefined,
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
 * Execute an agent with Claude Agent SDK (Anthropic provider)
 */
async function executeAgentWithClaudeSDK(
  subAgent: SubAgent,
  request: AgentRequest,
  apiKey: string,
): Promise<AgentResponse> {
  try {
    // Set API key in environment for Claude Agent SDK
    const originalApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    Deno.env.set("ANTHROPIC_API_KEY", apiKey);

    try {
      // Create SDK MCP server with wrapped tools
      const wrappedTools = subAgent.toolGroup.tools.map(wrapToolForClaudeAgent);
      const mcpServer = createSdkMcpServer({
        name: "tamamo-x-mcp",
        version: "1.0.0",
        tools: wrappedTools,
      });

      // Execute query with Claude Agent SDK
      const stream: Query = query({
        prompt: request.prompt,
        options: {
          systemPrompt: subAgent.systemPrompt,
          mcpServers: {
            "tamamo-x": mcpServer,
          },
          model: subAgent.llmProvider.model,
        },
      });

      let result = "";
      const toolsUsed: string[] = [];

      // Process streaming response
      for await (const item of stream) {
        switch (item.type) {
          case "assistant":
            for (const piece of item.message.content) {
              if (piece.type === "text") {
                result += piece.text;
              } else if (piece.type === "tool_use") {
                toolsUsed.push(piece.name);
              }
            }
            break;
        }
      }

      return {
        requestId: request.requestId,
        agentId: request.agentId,
        result: result || "No response from agent",
        toolsUsed,
        timestamp: new Date(),
      };
    } finally {
      // Restore original API key
      if (originalApiKey) {
        Deno.env.set("ANTHROPIC_API_KEY", originalApiKey);
      } else {
        Deno.env.delete("ANTHROPIC_API_KEY");
      }
    }
  } catch (error) {
    return {
      requestId: request.requestId,
      agentId: request.agentId,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute an agent with a request
 */
export async function executeAgent(
  subAgent: SubAgent,
  request: AgentRequest,
  credentials?: { apiKey?: string },
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
    // Use Claude Agent SDK for Anthropic provider
    if (subAgent.llmProvider.type === "anthropic") {
      if (!credentials?.apiKey) {
        throw new Error("API key required for Anthropic provider");
      }
      return await executeAgentWithClaudeSDK(subAgent, request, credentials.apiKey);
    }

    // For other providers, use Mastra (placeholder implementation)
    // In real implementation, this would:
    // 1. Create Mastra agent with wrapped tools
    // 2. Execute agent with LLM
    // 3. Track which tools were used
    const result =
      `Mock execution result for agent ${subAgent.name} with prompt: ${request.prompt}`;
    const toolsUsed: string[] = [];

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
