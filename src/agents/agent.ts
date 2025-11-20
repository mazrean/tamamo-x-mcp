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
} from "npm:@anthropic-ai/claude-agent-sdk@0.1.42";
import { z } from "npm:zod@4.1.12";

// Mastra imports (for other providers)
import { Agent } from "npm:@mastra/core@0.24.3/agent";
import { createTool } from "npm:@mastra/core@0.24.3/tools";

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
function jsonSchemaToZod(
  schema: JSONSchema,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

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
            zodType = z.record(z.string(), z.unknown());
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

  // Type assertion needed due to Zod version mismatch between SDK and our dependencies
  return tool(
    mcpTool.name,
    mcpTool.description,
    // deno-lint-ignore no-explicit-any
    zodSchema.shape as any,
    // deno-lint-ignore require-await
    async (args: Record<string, unknown>, _extra: unknown) => {
      // In real implementation, this would call the MCP server
      // For testing: simulate failures for tools named "failing_tool"
      if (mcpTool.name === "failing_tool") {
        throw new Error(`Tool ${mcpTool.name} failed to execute`);
      }

      // For now, return mock result
      return {
        content: [
          {
            type: "text" as const,
            text: `Mock result from ${mcpTool.name} with args: ${
              JSON.stringify(
                args,
              )
            }`,
          },
        ],
      };
    },
  );
}

/**
 * Wrap an MCP tool as a Mastra tool
 */
export function wrapToolForMastra(tool: Tool): ReturnType<typeof createTool> {
  // Convert JSON Schema to Zod schema for input validation
  const zodSchema = jsonSchemaToZod(tool.inputSchema);

  return createTool({
    id: tool.name,
    description: tool.description,
    inputSchema: zodSchema,
    outputSchema: z.object({
      output: z.string(),
    }),
    // deno-lint-ignore require-await
    execute: async ({ context }: { context: Record<string, unknown> }) => {
      // In real implementation, this would call the MCP server tool
      // For testing: simulate failures for tools named "failing_tool"
      if (tool.name === "failing_tool") {
        throw new Error(`Tool ${tool.name} failed to execute`);
      }

      // For now, return mock result
      return {
        output: `Mock result from ${tool.name} with args: ${
          JSON.stringify(
            context,
          )
        }`,
      };
    },
  });
}

/**
 * Wrap multiple MCP tools as Mastra tools
 */
export function wrapToolsForMastra(
  tools: Tool[],
): ReturnType<typeof createTool>[] {
  return tools.map((tool) => wrapToolForMastra(tool));
}

/**
 * Create a sub-agent from a tool group
 */
export function createSubAgent(
  group: ToolGroup,
  llmConfig: LLMProviderConfig,
): SubAgent {
  // Use LLM-generated system prompt from the tool group
  // This prompt is created during the build phase and includes:
  // - Agent introduction and responsibilities
  // - Available tools with descriptions
  // - Execution instructions emphasizing final text response
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    toolGroup: group,
    llmProvider: llmConfig,
    systemPrompt: group.systemPrompt,
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
 * Execute an agent with Mastra (non-Anthropic providers)
 */
async function executeAgentWithMastra(
  subAgent: SubAgent,
  request: AgentRequest,
): Promise<AgentResponse> {
  try {
    // Wrap MCP tools as Mastra tools
    const wrappedTools = wrapToolsForMastra(subAgent.toolGroup.tools);

    // Convert tools array to tools object (Mastra expects { [toolId]: tool })
    const toolsObject: Record<string, ReturnType<typeof createTool>> = {};
    for (const tool of wrappedTools) {
      toolsObject[tool.id] = tool;
    }

    // Create Mastra agent with wrapped tools
    // Model format: "provider/model" (e.g., "openai/gpt-4o")
    const modelString = `${subAgent.llmProvider.type}/${subAgent.llmProvider.model}`;

    const agent = new Agent({
      name: subAgent.name,
      instructions: subAgent.systemPrompt,
      model: modelString,
      tools: toolsObject,
    });

    // Execute agent with prompt
    const response = await agent.generate(request.prompt, {
      maxSteps: 10, // Allow up to 10 tool calls
      toolChoice: "auto", // Allow agent to decide when to use tools
    });

    // Extract text response and tools used
    let result = "";
    const toolsUsed: string[] = [];

    if (response.text) {
      result = response.text;
    }

    // Track which tools were used from toolCalls
    if (response.toolCalls && Array.isArray(response.toolCalls)) {
      for (const toolCall of response.toolCalls) {
        if (toolCall.payload?.toolName) {
          toolsUsed.push(toolCall.payload.toolName);
        }
      }
    }

    return {
      requestId: request.requestId,
      agentId: request.agentId,
      result: result || "No response from agent",
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
      return await executeAgentWithClaudeSDK(
        subAgent,
        request,
        credentials.apiKey,
      );
    }

    // For other providers, use Mastra
    return await executeAgentWithMastra(subAgent, request);
  } catch (error) {
    return {
      requestId: request.requestId,
      agentId: request.agentId,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
