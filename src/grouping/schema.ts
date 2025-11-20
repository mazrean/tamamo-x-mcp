/**
 * JSON schema for LLM tool grouping response
 * Enforces structured output to ensure valid responses
 */

import type { JSONSchema } from "../types/index.ts";

/**
 * JSON Schema for tool grouping response (Full version with validation)
 * This schema is used to enforce structured output from the LLM
 * Contains full JSON Schema properties for documentation and validation
 */
export const TOOL_GROUPING_RESPONSE_SCHEMA: JSONSchema = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the group (kebab-case)",
          },
          name: {
            type: "string",
            description: "Human-readable name for the group",
          },
          description: {
            type: "string",
            description:
              "Description of what this agent group does and why these tools work well together",
          },
          toolKeys: {
            type: "array",
            items: {
              type: "string",
            },
            description: 'Array of tool keys in format "serverName:toolName"',
          },
          systemPrompt: {
            type: "string",
            description:
              "System prompt for the agent that will use this tool group. Should instruct the agent to: 1) use tools to gather information, 2) always provide a final text response after using tools, 3) summarize findings to answer user's question",
          },
          complementarityScore: {
            type: "number",
            description: "Score from 0.0 to 1.0 indicating how well tools complement each other",
            minimum: 0,
            maximum: 1,
          },
        },
        required: ["id", "name", "description", "toolKeys", "systemPrompt", "complementarityScore"],
        additionalProperties: false,
      },
    },
  },
  required: ["groups"],
  additionalProperties: false,
};

/**
 * Simplified JSON Schema for Gemini API compatibility
 * Gemini only supports OpenAPI Schema subset and rejects:
 * - minimum, maximum (use description instead)
 * - additionalProperties
 * - Other extended JSON Schema keywords
 */
export const TOOL_GROUPING_RESPONSE_SCHEMA_GEMINI: JSONSchema = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the group (kebab-case)",
          },
          name: {
            type: "string",
            description: "Human-readable name for the group",
          },
          description: {
            type: "string",
            description:
              "Description of what this agent group does and why these tools work well together",
          },
          toolKeys: {
            type: "array",
            items: {
              type: "string",
            },
            description: 'Array of tool keys in format "serverName:toolName"',
          },
          systemPrompt: {
            type: "string",
            description:
              "System prompt for the agent that will use this tool group. Should instruct the agent to: 1) use tools to gather information, 2) always provide a final text response after using tools, 3) summarize findings to answer user's question",
          },
          complementarityScore: {
            type: "number",
            description: "Score from 0.0 to 1.0 indicating how well tools complement each other",
          },
        },
        required: ["id", "name", "description", "toolKeys", "systemPrompt", "complementarityScore"],
      },
    },
  },
  required: ["groups"],
};

/**
 * TypeScript type for the grouping response (for validation)
 */
export interface ToolGroupingResponse {
  groups: Array<{
    id: string;
    name: string;
    description: string;
    toolKeys: string[];
    systemPrompt: string;
    complementarityScore?: number;
  }>;
}
