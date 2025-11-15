/**
 * LLM-based tool grouping analyzer
 * Analyzes tools in batches and provides grouping suggestions
 */

import type { Tool, ProjectContext } from "../types/index.ts";
import type { LLMClient } from "../llm/client.ts";

export interface ToolRelationship {
  tool1: string;
  tool2: string;
  score: number; // Complementarity score [0, 1]
}

export interface GroupingSuggestion {
  name: string;
  tools: string[];
  rationale: string;
}

export interface AnalysisResult {
  relationships: ToolRelationship[];
  suggestions: GroupingSuggestion[];
}

const BATCH_SIZE = 10;

/**
 * Analyze tools using LLM and generate grouping suggestions
 */
export async function analyzeTools(
  tools: Tool[],
  llmClient: LLMClient,
  context?: ProjectContext,
): Promise<AnalysisResult> {
  // Batch tools for efficient LLM processing
  const batches = createToolBatches(tools, BATCH_SIZE);

  // Process batches sequentially (could be parallelized for performance)
  const batchResults = [];
  for (const batch of batches) {
    const result = await analyzeBatch(batch, llmClient, context);
    batchResults.push(result);
  }

  // Aggregate results from all batches
  return aggregateBatchResults(batchResults);
}

/**
 * Create batches of tools for LLM analysis
 */
function createToolBatches(tools: Tool[], batchSize: number): Tool[][] {
  const batches: Tool[][] = [];
  for (let i = 0; i < tools.length; i += batchSize) {
    batches.push(tools.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Analyze a single batch of tools
 */
async function analyzeBatch(
  batch: Tool[],
  llmClient: LLMClient,
  context?: ProjectContext,
): Promise<AnalysisResult> {
  const prompt = constructAnalysisPrompt(batch, context);
  const response = await llmClient.complete(prompt);

  // Parse LLM response (expected JSON format)
  try {
    const parsed = JSON.parse(response);
    return {
      relationships: parsed.relationships || [],
      suggestions: parsed.suggestions || [],
    };
  } catch {
    // If LLM doesn't return valid JSON, return empty result
    return { relationships: [], suggestions: [] };
  }
}

/**
 * Construct analysis prompt for LLM
 */
function constructAnalysisPrompt(batch: Tool[], context?: ProjectContext): string {
  let prompt = `Analyze the following tools and suggest how to group them into specialized agents.

For each tool, consider:
- Its purpose and functionality
- Complementarity with other tools
- Common workflows where tools might be used together

Tools to analyze:
`;

  batch.forEach((tool, idx) => {
    prompt += `\n${idx + 1}. ${tool.name}: ${tool.description}`;
    if (tool.serverName) {
      prompt += ` (from ${tool.serverName})`;
    }
  });

  if (context) {
    if (context.domain) {
      prompt += `\n\nProject domain: ${context.domain}`;
    }
    if (context.customHints && context.customHints.length > 0) {
      prompt += `\n\nCustom grouping hints:`;
      context.customHints.forEach((hint) => {
        prompt += `\n- ${hint}`;
      });
    }
  }

  prompt += `\n\nProvide your analysis in the following JSON format:
{
  "relationships": [
    {"tool1": "tool_name_1", "tool2": "tool_name_2", "score": 0.9}
  ],
  "suggestions": [
    {"name": "group_name", "tools": ["tool1", "tool2"], "rationale": "why these tools work well together"}
  ]
}

Respond with ONLY the JSON object, no additional text.`;

  return prompt;
}

/**
 * Aggregate results from multiple batches
 */
function aggregateBatchResults(batchResults: AnalysisResult[]): AnalysisResult {
  const allRelationships: ToolRelationship[] = [];
  const allSuggestions: GroupingSuggestion[] = [];

  for (const result of batchResults) {
    allRelationships.push(...result.relationships);
    allSuggestions.push(...result.suggestions);
  }

  return {
    relationships: allRelationships,
    suggestions: allSuggestions,
  };
}
