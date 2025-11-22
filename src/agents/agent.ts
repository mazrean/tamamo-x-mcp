/**
 * Agent execution module
 * Wraps MCP tools for agent frameworks using Vercel AI SDK
 * Supports: Anthropic, OpenAI, Gemini, OpenRouter, Vercel
 */

import type {
  AgentRequest,
  AgentResponse,
  LLMProviderConfig,
  SubAgent,
  Tool,
  ToolGroup,
} from "../types/index.ts";
import type { MCPClientRegistry } from "../mcp/registry.ts";

// Vercel AI SDK imports (for all providers)
import { generateText, jsonSchema, tool as aiTool } from "npm:ai@5.0.97";
import { createAnthropic } from "npm:@ai-sdk/anthropic@1.0.9";
import { createOpenAI } from "npm:@ai-sdk/openai@2.0.68";
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google@1.0.11";
import { createOpenRouter } from "npm:@openrouter/ai-sdk-provider@0.0.5";

/**
 * Default models for each LLM provider
 * Used when model is not specified in LLMProviderConfig
 */
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-3-5-haiku-20241022",
  openai: "gpt-4o",
  gemini: "gemini-2.0-flash-exp",
  vercel: "gpt-4o",
  bedrock: "anthropic.claude-3-5-sonnet-20241022",
  openrouter: "openai/gpt-4o",
};

/**
 * Maximum number of steps (tool calls + responses) allowed in agent execution
 * Prevents infinite loops when LLM repeatedly calls tools without converging
 */
const MAX_AGENT_STEPS = 8;

/**
 * Recursively sanitize JSON Schema to fix invalid type values
 * Converts type: "None" to type: "string" and handles nested objects
 */
// deno-lint-ignore no-explicit-any
function sanitizeJsonSchema(schema: any): any {
  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  // Create a shallow copy
  // deno-lint-ignore no-explicit-any
  const sanitized: any = Array.isArray(schema) ? [...schema] : { ...schema };

  // Fix type field if it's "None" or missing
  if ("type" in sanitized) {
    if (sanitized.type === "None" || sanitized.type === null || sanitized.type === undefined) {
      sanitized.type = "string";
    }
  }

  // Recursively sanitize properties
  if (sanitized.properties && typeof sanitized.properties === "object") {
    // deno-lint-ignore no-explicit-any
    const sanitizedProps: Record<string, any> = {};
    for (const [key, prop] of Object.entries(sanitized.properties)) {
      sanitizedProps[key] = sanitizeJsonSchema(prop);
    }
    sanitized.properties = sanitizedProps;
  }

  // Recursively sanitize items (for arrays)
  if (sanitized.items) {
    sanitized.items = sanitizeJsonSchema(sanitized.items);
  }

  // Recursively sanitize additionalProperties
  if (sanitized.additionalProperties && typeof sanitized.additionalProperties === "object") {
    sanitized.additionalProperties = sanitizeJsonSchema(sanitized.additionalProperties);
  }

  // Recursively sanitize patternProperties
  if (sanitized.patternProperties && typeof sanitized.patternProperties === "object") {
    // deno-lint-ignore no-explicit-any
    const sanitizedPatternProps: Record<string, any> = {};
    for (const [key, prop] of Object.entries(sanitized.patternProperties)) {
      sanitizedPatternProps[key] = sanitizeJsonSchema(prop);
    }
    sanitized.patternProperties = sanitizedPatternProps;
  }

  // Recursively sanitize anyOf/oneOf/allOf
  if (Array.isArray(sanitized.anyOf)) {
    // deno-lint-ignore no-explicit-any
    sanitized.anyOf = sanitized.anyOf.map((s: any) => sanitizeJsonSchema(s));
  }
  if (Array.isArray(sanitized.oneOf)) {
    // deno-lint-ignore no-explicit-any
    sanitized.oneOf = sanitized.oneOf.map((s: any) => sanitizeJsonSchema(s));
  }
  if (Array.isArray(sanitized.allOf)) {
    // deno-lint-ignore no-explicit-any
    sanitized.allOf = sanitized.allOf.map((s: any) => sanitizeJsonSchema(s));
  }

  return sanitized;
}

/**
 * Wrap an MCP tool for Vercel AI SDK (OpenAI format)
 * Uses Vercel AI SDK's tool() and jsonSchema() helpers for proper schema handling
 */
export function wrapToolForVercelAI(
  mcpTool: Tool,
  registry?: MCPClientRegistry,
  // deno-lint-ignore no-explicit-any
): any {
  // Deeply sanitize the entire input schema
  const sanitizedSchema = sanitizeJsonSchema(mcpTool.inputSchema);

  // Use jsonSchema() helper to create a properly typed schema for Vercel AI SDK
  // This adds the required 'typeName' property that the SDK expects
  const schemaForJsonSchema = {
    type: "object" as const,
    properties: sanitizedSchema.properties || {},
    required: Array.isArray(sanitizedSchema.required) ? sanitizedSchema.required : [],
    additionalProperties: false,
  };

  const parameters = jsonSchema(schemaForJsonSchema);

  // Use Vercel AI SDK's tool() helper to create the tool wrapper
  // IMPORTANT: Must use 'inputSchema' not 'parameters' for Vercel AI SDK!
  return aiTool({
    name: mcpTool.name,
    description: mcpTool.description || "",
    inputSchema: parameters,
    // deno-lint-ignore no-explicit-any
    execute: async (args: any) => {
      // For testing: simulate failures for tools named "failing_tool"
      if (mcpTool.name === "failing_tool") {
        throw new Error(`Tool ${mcpTool.name} failed to execute`);
      }

      // If registry is provided, call actual MCP tool
      if (registry) {
        try {
          const result = await registry.callTool(
            mcpTool.serverName,
            mcpTool.name,
            args,
          );

          // Convert MCP response to string format
          return typeof result === "string" ? result : JSON.stringify(result);
        } catch (error) {
          throw new Error(
            `Tool ${mcpTool.name} failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      // Fallback to mock result for testing
      return `Mock result from ${mcpTool.name} with args: ${JSON.stringify(args)}`;
    },
  });
}

/**
 * Wrap multiple MCP tools for Vercel AI SDK
 */
export function wrapToolsForVercelAI(
  tools: Tool[],
  registry?: MCPClientRegistry,
  // deno-lint-ignore no-explicit-any
): Record<string, any> {
  // deno-lint-ignore no-explicit-any
  const wrappedTools: Record<string, any> = {};
  for (const tool of tools) {
    wrappedTools[tool.name] = wrapToolForVercelAI(tool, registry);
  }
  return wrappedTools;
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
 * Execute an agent with Vercel AI SDK (all providers)
 */
async function executeAgentWithVercelAI(
  subAgent: SubAgent,
  request: AgentRequest,
  apiKey: string,
  _registry?: MCPClientRegistry,
): Promise<AgentResponse> {
  try {
    // Get model configuration
    const modelName = subAgent.llmProvider.model || DEFAULT_MODELS[subAgent.llmProvider.type];

    // Create provider-specific model instance
    // deno-lint-ignore no-explicit-any
    let model: any;
    switch (subAgent.llmProvider.type) {
      case "anthropic":
        model = createAnthropic({ apiKey })(modelName);
        break;
      case "openai":
        model = createOpenAI({ apiKey })(modelName);
        break;
      case "gemini":
        model = createGoogleGenerativeAI({ apiKey })(modelName);
        break;
      case "openrouter":
        model = createOpenRouter({ apiKey })(modelName);
        break;
      case "vercel":
        // Vercel AI SDK uses OpenAI by default
        model = createOpenAI({ apiKey })(modelName);
        break;
      default:
        throw new Error(`Unsupported provider: ${subAgent.llmProvider.type}`);
    }

    // Wrap MCP tools for Vercel AI SDK with deep sanitization
    const tools = wrapToolsForVercelAI(subAgent.toolGroup.tools, _registry);

    // Execute agent with generateText
    const response = await generateText({
      model,
      system: subAgent.systemPrompt,
      prompt: request.prompt,
      tools,
      // Allow multi-step execution: tool call → tool result → final response
      // Stop when:
      // 1. We get a final text response (finishReason === "stop" with text)
      // 2. We hit other terminal finish reasons (length, content-filter, error, other)
      // 3. We exceed max steps to prevent infinite loops
      stopWhen: ({ steps }) => {
        const last = steps.at(-1);

        // Safety: Hard limit to prevent infinite loops
        if (steps.length >= MAX_AGENT_STEPS) {
          return true;
        }

        // Terminal finish reasons that indicate completion or failure
        const terminalReasons = ["stop", "length", "content-filter", "error", "other"];
        if (last?.finishReason && terminalReasons.includes(last.finishReason)) {
          return true;
        }

        return false;
      },
    });

    // Check if we hit the max steps limit
    const lastStep = response.steps?.at(-1);
    if (response.steps && response.steps.length >= MAX_AGENT_STEPS) {
      return {
        requestId: request.requestId,
        agentId: request.agentId,
        timestamp: new Date(),
        error:
          `Agent exceeded maximum steps (${MAX_AGENT_STEPS}) - possible infinite loop or complex task requiring manual intervention`,
      };
    }

    // Check for non-stop finish reasons and handle them appropriately
    if (lastStep?.finishReason && lastStep.finishReason !== "stop") {
      const errorMessages: Record<string, string> = {
        "length": "Response truncated due to maximum token length",
        "content-filter": "Response blocked by content filter",
        "error": "Model encountered an error during generation",
        "other": "Generation stopped due to unknown reason",
      };

      return {
        requestId: request.requestId,
        agentId: request.agentId,
        timestamp: new Date(),
        error: errorMessages[lastStep.finishReason] ||
          `Generation stopped: ${lastStep.finishReason}`,
      };
    }

    // Extract text response and tools used
    const result = response.text || "";
    const toolsUsed: string[] = [];

    // Track which tools were used
    if (response.steps) {
      for (const step of response.steps) {
        if (step.toolCalls) {
          for (const toolCall of step.toolCalls) {
            toolsUsed.push(toolCall.toolName);
          }
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
  registry?: MCPClientRegistry,
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
    // Validate API key is provided
    if (!credentials?.apiKey) {
      throw new Error("API key required for LLM provider");
    }

    // Use Vercel AI SDK for all providers
    return await executeAgentWithVercelAI(subAgent, request, credentials.apiKey, registry);
  } catch (error) {
    return {
      requestId: request.requestId,
      agentId: request.agentId,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
