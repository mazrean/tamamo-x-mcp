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
import { TOOL_GROUPING_RESPONSE_SCHEMA } from "./schema.ts";
import type { ToolGroupingResponse } from "./schema.ts";

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
 * Request LLM to create tool groups using multi-step reasoning
 * Step 1: Analyze project context and tools
 * Step 2: Discuss grouping strategy
 * Step 3: Generate final groups
 *
 * If errors occur in Step 3, continues the conversation to fix issues instead of restarting
 */
async function requestGroupsFromLLM(
  tools: Tool[],
  llmClient: LLMClient,
  constraints: GroupingConstraints,
  context: ProjectContext | undefined,
  attemptNumber: number,
): Promise<ToolGroup[]> {
  // Initialize conversation history with Message type
  const conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  // STEP 1: Project Analysis
  console.log("  Step 1/3: Analyzing project context and tools...");
  const analysisPrompt = constructProjectAnalysisPrompt(tools, context);

  // Add system message to conversation
  conversationHistory.push({
    role: "system",
    content: analysisPrompt.systemPrompt,
  });

  conversationHistory.push({
    role: "user",
    content: analysisPrompt.userPrompt,
  });

  const projectAnalysis = await llmClient.complete(analysisPrompt.userPrompt, {
    messages: conversationHistory,
    temperature: 0.5, // Higher temperature for creative analysis
  });

  // Add assistant response to conversation history
  conversationHistory.push({
    role: "assistant",
    content: projectAnalysis,
  });

  // STEP 2: Grouping Strategy Discussion
  console.log("  Step 2/3: Developing grouping strategy...");
  const strategyPrompt = constructGroupingStrategyPrompt(
    tools,
    constraints,
    projectAnalysis,
  );

  conversationHistory.push({
    role: "user",
    content: strategyPrompt.userPrompt,
  });

  const groupingStrategy = await llmClient.complete(strategyPrompt.userPrompt, {
    messages: conversationHistory,
    temperature: 0.4,
  });

  // Add to conversation history
  conversationHistory.push({
    role: "assistant",
    content: groupingStrategy,
  });

  // STEP 3: Final Grouping Execution with retry logic
  console.log("  Step 3/3: Generating final tool groups...");

  // Get the prompts for Step 3
  const { systemPrompt: step3SystemPrompt, userPrompt: step3UserPrompt } =
    constructFinalGroupingPrompt(
      tools,
      constraints,
      projectAnalysis,
      groupingStrategy,
      attemptNumber,
    );

  // Try Step 3 up to 3 times, continuing the conversation on errors
  let lastStep3Error: Error | null = null;
  for (let step3Attempt = 1; step3Attempt <= 3; step3Attempt++) {
    try {
      let currentPrompt = step3UserPrompt;
      let currentConversation = [...conversationHistory];

      // On first attempt, add Step 3 system prompt if it's different
      if (step3Attempt === 1) {
        // Update system message for Step 3
        currentConversation[0] = {
          role: "system",
          content: step3SystemPrompt,
        };
      }

      // On retry attempts, add error feedback to continue the conversation
      if (step3Attempt > 1 && lastStep3Error) {
        console.log(
          `  Step 3 retry ${step3Attempt}/3: Continuing conversation to fix errors...`,
        );
        currentPrompt = `The previous grouping attempt failed with this error:
${lastStep3Error.message}

Please fix the issue and generate a corrected grouping that satisfies ALL constraints. Remember:
- EVERY tool must be assigned to EXACTLY ONE group
- No tool should appear in multiple groups
- Group count must be within the valid range
- Each group must have the correct number of tools
- Tool keys must be EXACT matches (case-sensitive)

Generate the corrected JSON output now.`;
      }

      currentConversation.push({
        role: "user",
        content: currentPrompt,
      });

      // Request with structured output schema for final grouping
      const response = await llmClient.complete("", {
        messages: currentConversation,
        temperature: 0.3, // Low temperature for deterministic, constraint-following output
        responseSchema: TOOL_GROUPING_RESPONSE_SCHEMA,
      });

      // Add response to conversation history for potential retry
      currentConversation.push({
        role: "assistant",
        content: response,
      });

      // Parse LLM response (should be valid JSON due to schema enforcement)
      let parsed: ToolGroupingResponse;
      try {
        parsed = JSON.parse(response);
      } catch {
        throw new Error("LLM did not return valid JSON despite schema enforcement");
      }

      // Validate response structure
      if (!Array.isArray(parsed.groups)) {
        throw new Error("LLM response does not contain 'groups' array");
      }

      // Convert LLM response to ToolGroup objects
      const groups: ToolGroup[] = [];
      const toolMap = new Map(tools.map((t) => [`${t.serverName}:${t.name}`, t]));
      const assignedToolKeys = new Set<string>();

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
          if (!tool) {
            throw new Error(
              `LLM returned invalid or misspelled tool key: "${toolKey}"`,
            );
          }

          // Check for duplicates
          if (assignedToolKeys.has(toolKey)) {
            throw new Error(
              `LLM assigned tool "${toolKey}" to multiple groups`,
            );
          }

          groupTools.push(tool);
          assignedToolKeys.add(toolKey);
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

      // Verify all tools are assigned exactly once
      if (assignedToolKeys.size !== tools.length) {
        const allToolKeys = new Set(tools.map((t) => `${t.serverName}:${t.name}`));
        const missingKeys = [...allToolKeys].filter((k) => !assignedToolKeys.has(k));
        throw new Error(
          `LLM failed to assign all tools. Missing ${missingKeys.length} tools: ${
            missingKeys.slice(0, 5).join(", ")
          }${missingKeys.length > 5 ? "..." : ""}`,
        );
      }

      // Success! Return the groups
      return groups;
    } catch (error) {
      lastStep3Error = error instanceof Error ? error : new Error(String(error));

      // Log error and continue to retry if not the last attempt
      if (step3Attempt < 3) {
        console.warn(`  Step 3 attempt ${step3Attempt}/3 failed: ${lastStep3Error.message}`);
      } else {
        // Last attempt failed, throw the error
        throw lastStep3Error;
      }
    }
  }

  // This should never be reached due to throw in last attempt, but TypeScript needs it
  throw lastStep3Error || new Error("Failed to generate valid groups in Step 3");
}

/**
 * STEP 1: Construct prompts for project and tool analysis
 */
function constructProjectAnalysisPrompt(
  tools: Tool[],
  context: ProjectContext | undefined,
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt =
    `You are an expert software architect analyzing a development project to understand its characteristics, workflows, and tool requirements.

Your task is to thoroughly analyze the project context and available tools to identify:
1. The project's technical characteristics (stack, patterns, methodologies)
2. Primary development workflows and processes
3. Tool relationships and dependencies
4. Domain-specific requirements and constraints

Provide a comprehensive analysis that will inform intelligent tool grouping decisions.`;

  const toolList = tools.map((tool, idx) => {
    const toolKey = `${tool.serverName}:${tool.name}`;
    return `${idx + 1}. "${toolKey}"\n   Description: ${tool.description}`;
  }).join("\n\n");

  let userPrompt = `Analyze this development project and its ${tools.length} available tools.

AVAILABLE TOOLS:
${toolList}`;

  if (context?.fullContent) {
    const contentPreview = context.fullContent.length > 4000
      ? context.fullContent.slice(0, 4000) + "\n\n[... content truncated ...]"
      : context.fullContent;

    userPrompt += `\n\nPROJECT DOCUMENTATION:
${contentPreview}`;
  }

  if (context?.domain) {
    userPrompt += `\n\nPROJECT DOMAIN: ${context.domain}`;
  }

  if (context?.customHints && context.customHints.length > 0) {
    userPrompt += `\n\nPROJECT HINTS:\n${context.customHints.map((h) => `• ${h}`).join("\n")}`;
  }

  userPrompt += `\n\nProvide a detailed analysis covering:

1. **Project Characteristics**:
   - What type of project is this? (web app, CLI tool, library, etc.)
   - What technologies and frameworks are being used?
   - What development methodologies or patterns are evident?

2. **Workflow Analysis**:
   - What are the main development workflows? (e.g., project setup, code exploration, editing, testing, deployment)
   - What are the typical task sequences?
   - Which operations are prerequisites for others?

3. **Tool Relationships**:
   - Which tools work together to accomplish common tasks?
   - Which tools are foundational (used first)?
   - Which tools are specialized (used in specific scenarios)?
   - Are there natural tool clusters based on functionality?

4. **Domain-Specific Insights**:
   - Any special requirements based on the project domain?
   - Terminology or concepts specific to this project?
   - Constraints that should guide tool organization?

Be thorough and specific. This analysis will guide the creation of specialized agent groups.`;

  return { systemPrompt, userPrompt };
}

/**
 * STEP 2: Construct prompts for grouping strategy discussion
 */
function constructGroupingStrategyPrompt(
  tools: Tool[],
  constraints: GroupingConstraints,
  projectAnalysis: string,
): { systemPrompt: string; userPrompt: string } {
  const maxPossibleGroups = Math.floor(tools.length / constraints.minToolsPerGroup);
  const effectiveMaxGroups = Math.min(constraints.maxGroups, maxPossibleGroups);
  const effectiveMinGroups = Math.max(
    constraints.minGroups,
    Math.ceil(tools.length / constraints.maxToolsPerGroup),
  );

  const systemPrompt =
    `You are an expert in software architecture and tool organization, specializing in creating specialized agent groups.

Based on the project analysis, develop a strategic plan for organizing ${tools.length} tools into ${effectiveMinGroups}-${effectiveMaxGroups} specialized agent groups.

Each group should:
- Contain ${constraints.minToolsPerGroup}-${constraints.maxToolsPerGroup} tools
- Represent a coherent functional domain
- Support common workflows
- Have tools that work well together

Your strategy should align with the project's specific needs and development patterns.`;

  const userPrompt = `Based on the following project analysis, develop a grouping strategy.

PROJECT ANALYSIS:
${projectAnalysis}

CONSTRAINTS:
- Total tools: ${tools.length}
- Number of groups: ${effectiveMinGroups}-${effectiveMaxGroups}
- Tools per group: ${constraints.minToolsPerGroup}-${constraints.maxToolsPerGroup}

Develop a grouping strategy that addresses:

1. **Group Themes**: What should each agent group specialize in?
   - Consider the workflows identified in the analysis
   - Think about tool dependencies and relationships
   - Align with project-specific patterns

2. **Tool Distribution**: How should tools be distributed?
   - Which tools belong together?
   - Which tools are foundational vs. specialized?
   - How to balance group sizes while maintaining coherence?

3. **Agent Descriptions**: How should each agent be described?
   - When should developers use each agent?
   - What workflows does each agent support?
   - How do agents work together in larger workflows?

4. **Workflow Alignment**: How do the groups support common workflows?
   - Which agent should be called first?
   - Which agents work in sequence?
   - Which agents can work in parallel?

Provide a detailed strategy covering these aspects. Be specific about group themes and tool assignments.`;

  return { systemPrompt, userPrompt };
}

/**
 * STEP 3: Construct prompts for final tool grouping execution
 * (Enhanced version of the original constructGroupingPrompt)
 */
function constructFinalGroupingPrompt(
  tools: Tool[],
  constraints: GroupingConstraints,
  projectAnalysis: string,
  groupingStrategy: string,
  attemptNumber: number,
): { systemPrompt: string; userPrompt: string } {
  // Calculate valid group count range
  const maxPossibleGroups = Math.floor(
    tools.length / constraints.minToolsPerGroup,
  );
  const effectiveMaxGroups = Math.min(
    constraints.maxGroups,
    maxPossibleGroups,
  );
  const effectiveMinGroups = Math.max(
    constraints.minGroups,
    Math.ceil(tools.length / constraints.maxToolsPerGroup),
  );

  // Construct SYSTEM prompt (role, constraints, output format)
  const systemPrompt =
    `You are a tool grouping specialist. Your role is to organize tools into specialized agent groups that follow STRICT mathematical constraints.

ABSOLUTE REQUIREMENTS:
1. Group count: MUST be ${effectiveMinGroups}-${effectiveMaxGroups} groups (calculated from ${tools.length} tools ÷ ${constraints.minToolsPerGroup}-${constraints.maxToolsPerGroup} tools/group)
2. Tools per group: EACH group MUST have ${constraints.minToolsPerGroup}-${constraints.maxToolsPerGroup} tools (NO EXCEPTIONS)
3. Complete coverage: EVERY tool assigned to EXACTLY ONE group
4. No duplicates: Each tool appears ONCE across all groups
5. Proper distribution: Sum of all group sizes = ${tools.length}

OUTPUT FORMAT (JSON only, no explanations):
{
  "groups": [
    {
      "id": "kebab-case-identifier",
      "name": "Descriptive Name",
      "description": "DETAILED usage-focused description (see guidelines below)",
      "toolKeys": ["server:tool1", "server:tool2", ...],
      "complementarityScore": 0.85
    }
  ]
}

DESCRIPTION GUIDELINES:
Each group description MUST help LLMs understand WHEN and HOW to use this agent. Include:

1. PURPOSE: What this agent specializes in (1 sentence)
2. USAGE TIMING: When to invoke this agent (use phrases like "Use this agent when...", "This agent should be called before/after...", "Always use this agent for...")
3. WORKFLOW CONTEXT: How this agent fits into larger workflows (e.g., "Call before code modification", "Use after project activation", "Invoke for retrieval-augmented tasks")
4. TOOL SYNERGY: How the tools work together to accomplish the purpose

EXAMPLE DESCRIPTIONS:
• "Use this agent to activate projects and verify onboarding status before starting any development work. Always call check_onboarding_performed after activating a project. The think_about tools help maintain task alignment throughout long conversations, especially before code modifications."
• "This agent provides comprehensive codebase navigation through symbolic analysis. Use it when you need to understand code structure without reading entire files. Start with get_symbols_overview for high-level understanding, then use find_symbol for targeted reads. The editing tools (replace/insert) should only be used after thorough analysis with find_symbol and find_referencing_symbols."
• "Manages persistent project knowledge and external reasoning. Use write_memory to store important project insights for future sessions. Read memories at conversation start when their names suggest relevance. Invoke codex tool for complex reasoning tasks that benefit from external AI sessions with specialized capabilities."

CRITICAL: Your response MUST be ONLY the JSON object above. No text before or after.`;

  // Construct USER prompt (specific task, tools, context)
  const toolList = tools.map((tool, idx) => {
    const toolKey = `${tool.serverName}:${tool.name}`;
    return `${idx + 1}. "${toolKey}": ${tool.description}`;
  }).join("\n");

  // Calculate valid distributions as examples
  const validDistributions = [];
  for (
    let numGroups = effectiveMinGroups;
    numGroups <= effectiveMaxGroups;
    numGroups++
  ) {
    const dist = Array.from(
      { length: numGroups },
      (_, i) =>
        Math.floor(tools.length / numGroups) +
        (i < tools.length % numGroups ? 1 : 0),
    );
    validDistributions.push(
      `${numGroups} groups = [${dist.join(" + ")}] tools`,
    );
  }

  let userPrompt = `Now create the final tool groups based on your analysis and strategy.

PREVIOUS ANALYSIS AND STRATEGY:
───────────────────────────────

PROJECT ANALYSIS:
${projectAnalysis}

GROUPING STRATEGY:
${groupingStrategy}

───────────────────────────────

EXECUTION REQUIREMENTS:

VALID DISTRIBUTIONS (choose one):
${validDistributions.map((d) => `• ${d}`).join("\n")}

TOOLS TO ORGANIZE (${tools.length} total):
${toolList}

CRITICAL INSTRUCTIONS:
1. Follow the grouping strategy you developed
2. Ensure EVERY tool is assigned to EXACTLY ONE group
3. Respect the distribution constraints (${effectiveMinGroups}-${effectiveMaxGroups} groups, ${constraints.minToolsPerGroup}-${constraints.maxToolsPerGroup} tools each)
4. Create descriptions that reflect the project-specific insights from your analysis
5. Use exact tool keys from the list above (case-sensitive)

Generate the final JSON output now.`;

  if (attemptNumber > 1) {
    userPrompt +=
      `\n\n⚠️ RETRY #${attemptNumber}: Previous attempts failed validation. Double-check:
• Group count is ${effectiveMinGroups}-${effectiveMaxGroups}
• Each group has ${constraints.minToolsPerGroup}-${constraints.maxToolsPerGroup} tools
• All ${tools.length} tools assigned exactly once
• No duplicate tool assignments
• Tool keys are EXACT matches (case-sensitive)`;
  }

  return { systemPrompt, userPrompt };
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
