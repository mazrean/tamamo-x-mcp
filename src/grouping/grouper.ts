/**
 * Tool grouping algorithm
 * Delegates grouping entirely to LLM for simplicity
 */

import type {
  GroupingConstraints,
  LLMClient,
  ProjectContext,
  Tool,
  ToolGroup,
} from "../types/index.ts";
import { validateGroups } from "./validator.ts";

const MAX_RETRIES = 3;

/**
 * Group tools using LLM (fully delegated approach)
 */
export async function groupTools(
  tools: Tool[],
  llmClient: LLMClient,
  constraints: GroupingConstraints,
  context?: ProjectContext,
): Promise<ToolGroup[]> {
  // Validate input
  if (tools.length === 0) {
    throw new Error("Cannot create groups from empty tool list");
  }

  // Check if constraints are satisfiable
  const minToolsRequired = constraints.minGroups * constraints.minToolsPerGroup;
  if (tools.length < minToolsRequired) {
    throw new Error(
      `insufficient tools: need at least ${minToolsRequired} tools for ${constraints.minGroups} groups with minimum ${constraints.minToolsPerGroup} tools each (constraints cannot be satisfied)`,
    );
  }

  // Try up to MAX_RETRIES times to get valid groups from LLM
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const groups = await requestGroupsFromLLM(tools, llmClient, constraints, context, attempt);

      // Validate groups
      const validation = validateGroups(groups, constraints);
      if (!validation.valid) {
        throw new Error(
          `Generated groups failed validation: ${validation.errors.join(", ")}`,
        );
      }

      return groups;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

      // Continue to next retry unless it's the last attempt
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying with adjusted prompt...`);
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to generate valid groups after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`,
  );
}

/**
 * Request LLM to create tool groups directly
 */
async function requestGroupsFromLLM(
  tools: Tool[],
  llmClient: LLMClient,
  constraints: GroupingConstraints,
  context: ProjectContext | undefined,
  attemptNumber: number,
): Promise<ToolGroup[]> {
  const prompt = constructGroupingPrompt(tools, constraints, context, attemptNumber);
  const response = await llmClient.complete(prompt);

  // Parse LLM response (expected JSON format)
  let parsed;
  try {
    parsed = JSON.parse(response);
  } catch {
    throw new Error("LLM did not return valid JSON");
  }

  // Validate response structure
  if (!Array.isArray(parsed.groups)) {
    throw new Error("LLM response does not contain 'groups' array");
  }

  // Convert LLM response to ToolGroup objects
  const groups: ToolGroup[] = [];
  const toolMap = new Map(tools.map((t) => [`${t.serverName}:${t.name}`, t]));

  for (const groupData of parsed.groups) {
    if (
      !groupData.id || !groupData.name || !groupData.description ||
      !Array.isArray(groupData.toolKeys)
    ) {
      throw new Error("Invalid group structure in LLM response");
    }

    // Map tool keys back to Tool objects
    const groupTools: Tool[] = [];
    for (const toolKey of groupData.toolKeys) {
      const tool = toolMap.get(toolKey);
      if (tool) {
        groupTools.push(tool);
      }
    }

    if (groupTools.length === 0) {
      throw new Error(`Group "${groupData.name}" has no valid tools`);
    }

    groups.push({
      id: sanitizeId(groupData.id),
      name: groupData.name,
      description: groupData.description,
      tools: groupTools,
      complementarityScore: typeof groupData.complementarityScore === "number"
        ? groupData.complementarityScore
        : 0.5,
    });
  }

  return groups;
}

/**
 * Construct prompt for LLM to create tool groups
 */
function constructGroupingPrompt(
  tools: Tool[],
  constraints: GroupingConstraints,
  context: ProjectContext | undefined,
  attemptNumber: number,
): string {
  let prompt =
    `You are a tool grouping expert. Your task is to organize the following ${tools.length} tools into specialized agent groups.

CONSTRAINTS (MUST BE SATISFIED):
- Create between ${constraints.minGroups} and ${constraints.maxGroups} groups
- Each group must have between ${constraints.minToolsPerGroup} and ${constraints.maxToolsPerGroup} tools
- Each tool must be assigned to exactly ONE group (no duplicates, no omissions)
- Groups should contain complementary tools that work well together

`;

  if (context) {
    if (context.domain) {
      prompt += `PROJECT DOMAIN: ${context.domain}\n\n`;
    }
    if (context.customHints && context.customHints.length > 0) {
      prompt += `CUSTOM GROUPING HINTS:\n`;
      context.customHints.forEach((hint) => {
        prompt += `- ${hint}\n`;
      });
      prompt += `\n`;
    }
  }

  prompt += `TOOLS TO GROUP:\n`;
  tools.forEach((tool, idx) => {
    const toolKey = `${tool.serverName}:${tool.name}`;
    prompt += `${idx + 1}. [${toolKey}] ${tool.description}\n`;
  });

  if (attemptNumber > 1) {
    prompt +=
      `\nNOTE: This is attempt #${attemptNumber}. Previous attempts failed validation. Please ensure:
- All tools are assigned to exactly one group
- Group counts and tool counts per group satisfy the constraints
- Tool keys match exactly (format: "serverName:toolName")
`;
  }

  prompt += `\nProvide your response in the following JSON format:
{
  "groups": [
    {
      "id": "unique-group-id",
      "name": "descriptive_group_name",
      "description": "What this agent group does and why these tools work well together",
      "toolKeys": ["serverName:toolName", "serverName:toolName", ...],
      "complementarityScore": 0.8
    }
  ]
}

IMPORTANT:
- Use the exact tool keys shown above (format: "serverName:toolName")
- Every tool must appear in exactly one group
- Respond with ONLY the JSON object, no additional text
- Ensure all constraints are satisfied`;

  return prompt;
}

/**
 * Sanitize ID to remove invalid characters
 */
function sanitizeId(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
