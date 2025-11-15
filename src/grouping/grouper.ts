/**
 * Tool grouping algorithm
 * Groups tools based on LLM analysis and complementarity
 */

import type {
  Tool,
  ToolGroup,
  GroupingConstraints,
  ProjectContext,
  LLMClient,
} from "../types/index.ts";
import { analyzeTools, type AnalysisResult } from "./analyzer.ts";
import { validateGroups } from "./validator.ts";

/**
 * Group tools using LLM analysis
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

  // Step 1: Analyze tools with LLM
  const analysis = await analyzeTools(tools, llmClient, context);

  // Step 2: Create initial groups based on LLM suggestions
  const initialGroups = createGroupsFromSuggestions(tools, analysis, constraints);

  // Step 3: Assign remaining tools to groups
  let finalGroups = assignRemainingTools(initialGroups, tools, constraints);

  // Step 3.5: Ensure minimum groups constraint is met
  while (finalGroups.length < constraints.minGroups && finalGroups.length > 0) {
    // Find largest group to split
    const largestGroup = finalGroups.reduce((a, b) =>
      a.tools.length > b.tools.length ? a : b
    );

    // Strategy 1: Split if the group has enough tools to create two valid groups
    if (largestGroup.tools.length >= constraints.minToolsPerGroup * 2) {
      const index = finalGroups.indexOf(largestGroup);
      finalGroups.splice(index, 1);

      const splitGroups = splitLargeGroup(
        largestGroup.name,
        largestGroup.description,
        largestGroup.tools,
        constraints,
      );

      // Safety check: only continue if we actually created more groups
      if (splitGroups.length > 1) {
        finalGroups.push(...splitGroups);
      } else {
        // Cannot split further - restore the group and break
        finalGroups.push(largestGroup);
        break;
      }
    } else {
      // Strategy 2: Re-balance across all groups by "stealing" tools to create new group
      // Calculate how many tools we need for a new group
      const neededForNewGroup = constraints.minToolsPerGroup;

      // Track how many tools each group donated (for restoration if needed)
      const donations: Map<ToolGroup, Tool[]> = new Map();
      const donatedTools: Tool[] = [];

      // Try to take surplus tools from each group (while keeping each group at minToolsPerGroup)
      for (const group of finalGroups) {
        const surplus = group.tools.length - constraints.minToolsPerGroup;
        if (surplus > 0 && donatedTools.length < neededForNewGroup) {
          const toTake = Math.min(surplus, neededForNewGroup - donatedTools.length);
          const takenTools = group.tools.slice(-toTake);
          donations.set(group, takenTools);
          donatedTools.push(...takenTools);
          group.tools = group.tools.slice(0, -toTake);
        }
      }

      const canRebalance = donatedTools.length >= neededForNewGroup;

      if (canRebalance) {
        // Create new group from donated tools
        finalGroups.push({
          id: sanitizeId(`group-rebalanced-${finalGroups.length}`),
          name: `rebalanced_group_${finalGroups.length}`,
          description: "Tools redistributed from other groups",
          tools: donatedTools,
          complementarityScore: 0.5,
        });
      } else {
        // Cannot create more groups - restore all donated tools to their original groups
        for (const [group, takenTools] of donations.entries()) {
          group.tools.push(...takenTools);
        }
        break;
      }
    }
  }

  // Step 3.9: Fix any groups that exceed maxToolsPerGroup
  let splitIterations = 0;
  // Scale max iterations with total tools divided by max per group (worst case scenario)
  // Guard against division by zero or negative values
  const maxSplitIterations = constraints.maxToolsPerGroup > 0
    ? Math.ceil(tools.length / constraints.maxToolsPerGroup) * 2
    : 100; // Fallback to reasonable limit if constraint is invalid

  for (let i = 0; i < finalGroups.length; i++) {
    const group = finalGroups[i];
    if (group.tools.length > constraints.maxToolsPerGroup) {
      // Check iteration limit
      if (splitIterations >= maxSplitIterations) {
        // Stop splitting - accept constraint violation
        break;
      }

      // Remove this group and split it
      finalGroups.splice(i, 1);
      const splitGroups = splitLargeGroup(
        group.name,
        group.description,
        group.tools,
        constraints,
      );
      finalGroups.push(...splitGroups);
      // Restart check from beginning since we modified the array
      i = -1;
      splitIterations++;
    }
  }

  // Step 3.10: Merge groups if exceeding maxGroups
  let mergeIterations = 0;
  // Need finalGroups.length - maxGroups merges to reach target (e.g., 60 groups → 6 groups = 54 merges)
  const maxMergeIterations = Math.max(finalGroups.length - constraints.maxGroups, 10);

  while (finalGroups.length > constraints.maxGroups && mergeIterations < maxMergeIterations) {
    // Find two smallest groups that can be merged without exceeding maxToolsPerGroup
    const sortedBySize = [...finalGroups].sort((a, b) => a.tools.length - b.tools.length);

    let smallest1 = null;
    let smallest2 = null;

    // Try to find a pair that won't exceed maxToolsPerGroup when merged
    for (let i = 0; i < sortedBySize.length - 1; i++) {
      for (let j = i + 1; j < sortedBySize.length; j++) {
        const combinedSize = sortedBySize[i].tools.length + sortedBySize[j].tools.length;
        if (combinedSize <= constraints.maxToolsPerGroup) {
          smallest1 = sortedBySize[i];
          smallest2 = sortedBySize[j];
          break;
        }
      }
      if (smallest1) break;
    }

    // If no valid pair found, just take the two smallest (accept constraint violation)
    if (!smallest1 || !smallest2) {
      smallest1 = sortedBySize[0];
      smallest2 = sortedBySize[1];
    }

    // Remove both groups
    finalGroups = finalGroups.filter((g) => g !== smallest1 && g !== smallest2);

    // Merge them
    const mergedTools = [...smallest1.tools, ...smallest2.tools];
    const mergedName = `${smallest1.name.split('_')[0]}_${smallest2.name.split('_')[0]}_merged`;
    const mergedDescription = `Merged: ${smallest1.description}`;

    // Add merged group (don't split it)
    finalGroups.push({
      id: sanitizeId(`group-merged-${finalGroups.length}`),
      name: mergedName,
      description: mergedDescription,
      tools: mergedTools,
      complementarityScore: ((smallest1.complementarityScore || 0.5) + (smallest2.complementarityScore || 0.5)) / 2,
    });

    mergeIterations++;
  }

  // Step 4: Validate groups
  const validation = validateGroups(finalGroups, constraints);
  if (!validation.valid) {
    throw new Error(
      `Generated groups failed validation: ${validation.errors.join(", ")}`,
    );
  }

  return finalGroups;
}

/**
 * Create initial groups from LLM suggestions
 */
function createGroupsFromSuggestions(
  tools: Tool[],
  analysis: AnalysisResult,
  constraints: GroupingConstraints,
): ToolGroup[] {
  const groups: ToolGroup[] = [];
  const assignedTools = new Set<string>();

  // Use LLM suggestions if available
  if (analysis.suggestions.length > 0) {
    for (const suggestion of analysis.suggestions) {
      // Map tool names to actual tool objects, excluding already assigned tools
      const groupTools = suggestion.tools
        .map((toolName) => tools.find((t) => t.name === toolName))
        .filter((t): t is Tool => t !== undefined)
        .filter((t) => !assignedTools.has(`${t.serverName}:${t.name}`));

      if (groupTools.length === 0) continue;

      // Check if group meets minimum size requirement
      if (groupTools.length < constraints.minToolsPerGroup) {
        // Skip this group - tools will be assigned later
        continue;
      }

      // Check if group exceeds maximum size
      if (groupTools.length > constraints.maxToolsPerGroup) {
        // Split large groups
        const splitGroups = splitLargeGroup(
          suggestion.name,
          suggestion.rationale,
          groupTools,
          constraints,
        );
        groups.push(...splitGroups);
        splitGroups.forEach((g) =>
          g.tools.forEach((t) => assignedTools.add(`${t.serverName}:${t.name}`))
        );
        continue;
      }

      // Create group
      const groupId = `group-${groups.length + 1}-${sanitizeId(suggestion.name)}`;
      const complementarityScore = calculateComplementarityScore(
        groupTools,
        analysis,
      );

      groups.push({
        id: groupId,
        name: suggestion.name,
        description: suggestion.rationale,
        tools: groupTools,
        complementarityScore,
      });

      // Mark tools as assigned
      groupTools.forEach((t) => assignedTools.add(`${t.serverName}:${t.name}`));
    }
  }

  // If no valid groups created from suggestions, create default groups
  if (groups.length === 0) {
    return createDefaultGroups(tools, constraints);
  }

  return groups;
}

/**
 * Split a large group into smaller groups
 */
function splitLargeGroup(
  baseName: string,
  rationale: string,
  tools: Tool[],
  constraints: GroupingConstraints,
): ToolGroup[] {
  const groups: ToolGroup[] = [];

  // Calculate target size to create at least 2 groups with even distribution
  // This ensures we always split the group and avoid infinite loops
  const targetSize = Math.ceil(tools.length / 2);

  let currentGroup: Tool[] = [];
  let groupIndex = 1;

  for (const tool of tools) {
    currentGroup.push(tool);

    if (currentGroup.length >= targetSize) {
      const groupId = `group-split-${baseName}-${groupIndex}`;
      groups.push({
        id: sanitizeId(groupId),
        name: `${baseName}_${groupIndex}`,
        description: rationale,
        tools: currentGroup,
        complementarityScore: 0.7, // Default score for split groups
      });
      currentGroup = [];
      groupIndex++;
    }
  }

  // Add remaining tools
  if (currentGroup.length > 0) {
    // If remaining tools are too few, merge with last group
    if (
      currentGroup.length < constraints.minToolsPerGroup &&
      groups.length > 0
    ) {
      // Add to last group if it doesn't exceed max
      const lastGroup = groups[groups.length - 1];
      if (
        lastGroup.tools.length + currentGroup.length <=
          constraints.maxToolsPerGroup
      ) {
        lastGroup.tools.push(...currentGroup);
      } else {
        // Create a new group even if it's small (for tight constraints scenarios)
        // This prevents infinite split loops
        const groupId = `group-split-${baseName}-${groupIndex}`;
        groups.push({
          id: sanitizeId(groupId),
          name: `${baseName}_${groupIndex}`,
          description: rationale,
          tools: currentGroup,
          complementarityScore: 0.7,
        });
      }
    } else {
      // Create new group if enough tools
      const groupId = `group-split-${baseName}-${groupIndex}`;
      groups.push({
        id: sanitizeId(groupId),
        name: `${baseName}_${groupIndex}`,
        description: rationale,
        tools: currentGroup,
        complementarityScore: 0.7,
      });
    }
  }

  return groups;
}

/**
 * Assign remaining unassigned tools to existing groups
 */
function assignRemainingTools(
  groups: ToolGroup[],
  allTools: Tool[],
  constraints: GroupingConstraints,
): ToolGroup[] {
  // Find unassigned tools
  const assignedToolKeys = new Set(
    groups.flatMap((g) => g.tools.map((t) => `${t.serverName}:${t.name}`)),
  );
  const unassignedTools = allTools.filter(
    (t) => !assignedToolKeys.has(`${t.serverName}:${t.name}`),
  );

  if (unassignedTools.length === 0) {
    return groups;
  }

  // Try to assign to existing groups first
  const stillUnassigned: Tool[] = [];

  for (const tool of unassignedTools) {
    // Find group with same server name and space available
    let assigned = false;
    for (const group of groups) {
      const sameServerTools = group.tools.filter((t) => t.serverName === tool.serverName);
      if (
        sameServerTools.length > 0 &&
        group.tools.length < constraints.maxToolsPerGroup
      ) {
        group.tools.push(tool);
        assigned = true;
        break;
      }
    }

    // If not assigned, add to smallest group that has space
    if (!assigned) {
      const sortedGroups = [...groups].sort((a, b) => a.tools.length - b.tools.length);
      for (const group of sortedGroups) {
        if (group.tools.length < constraints.maxToolsPerGroup) {
          group.tools.push(tool);
          assigned = true;
          break;
        }
      }
    }

    // Collect still unassigned tools
    if (!assigned) {
      stillUnassigned.push(tool);
    }
  }

  // Handle remaining unassigned tools
  if (stillUnassigned.length > 0) {
    // Create new group only if we have enough tools AND under max groups
    if (
      stillUnassigned.length >= constraints.minToolsPerGroup &&
      groups.length < constraints.maxGroups
    ) {
      // Check if stillUnassigned fits in one group
      if (stillUnassigned.length <= constraints.maxToolsPerGroup) {
        const newGroupId = `group-${groups.length + 1}-misc`;
        groups.push({
          id: newGroupId,
          name: `misc_agent_${groups.length + 1}`,
          description: "Miscellaneous tools",
          tools: stillUnassigned,
          complementarityScore: 0.5,
        });
      } else {
        // Too many tools - split into multiple groups
        const splitGroups = splitLargeGroup(
          "misc_agent",
          "Miscellaneous tools",
          stillUnassigned,
          constraints,
        );
        groups.push(...splitGroups);
      }
    } else {
      // Force assignment to existing groups (distribute evenly)
      // but respect maxToolsPerGroup when possible
      for (const tool of stillUnassigned) {
        const targetGroup = groups.reduce((a, b) =>
          a.tools.length < b.tools.length ? a : b
        );
        targetGroup.tools.push(tool);
      }
    }
  }

  return groups;
}

/**
 * Create default groups when LLM suggestions are unavailable
 */
function createDefaultGroups(
  tools: Tool[],
  constraints: GroupingConstraints,
): ToolGroup[] {
  const groups: ToolGroup[] = [];

  // Group by server name first
  const toolsByServer: Record<string, Tool[]> = {};
  for (const tool of tools) {
    if (!toolsByServer[tool.serverName]) {
      toolsByServer[tool.serverName] = [];
    }
    toolsByServer[tool.serverName].push(tool);
  }

  // Create groups from servers
  for (const [serverName, serverTools] of Object.entries(toolsByServer)) {
    const baseName = serverName.replace("-server", "");

    // If server tools fit in one group
    if (
      serverTools.length >= constraints.minToolsPerGroup &&
      serverTools.length <= constraints.maxToolsPerGroup
    ) {
      groups.push({
        id: `group-${groups.length + 1}-${baseName}`,
        name: `${baseName}_agent`,
        description: `Agent for ${serverName} operations`,
        tools: serverTools,
        complementarityScore: 0.8, // High score for same-server tools
      });
    } else if (serverTools.length > constraints.maxToolsPerGroup) {
      // Split large server groups
      const splitGroups = splitLargeGroup(
        `${baseName}_agent`,
        `Agent for ${serverName} operations`,
        serverTools,
        constraints,
      );
      groups.push(...splitGroups);
    } else {
      // Too few tools - will be distributed later
      // For now, add as-is and we'll merge small groups
      groups.push({
        id: `group-${groups.length + 1}-${baseName}`,
        name: `${baseName}_agent`,
        description: `Agent for ${serverName} operations`,
        tools: serverTools,
        complementarityScore: 0.6,
      });
    }
  }

  // Merge small groups if needed
  const mergedGroups = mergeSmallGroups(groups, constraints);

  // Ensure we meet minimum groups constraint
  while (mergedGroups.length < constraints.minGroups && tools.length > 0) {
    // Split largest group
    const largestGroup = mergedGroups.reduce((a, b) =>
      a.tools.length > b.tools.length ? a : b
    );
    const index = mergedGroups.indexOf(largestGroup);
    mergedGroups.splice(index, 1);

    const splitGroups = splitLargeGroup(
      largestGroup.name,
      largestGroup.description,
      largestGroup.tools,
      constraints,
    );
    mergedGroups.push(...splitGroups);
  }

  return mergedGroups;
}

/**
 * Merge small groups to meet minimum tools constraint
 */
function mergeSmallGroups(
  groups: ToolGroup[],
  constraints: GroupingConstraints,
): ToolGroup[] {
  const result: ToolGroup[] = [];
  const smallGroups: ToolGroup[] = [];

  // Separate small and normal groups
  for (const group of groups) {
    if (group.tools.length < constraints.minToolsPerGroup) {
      smallGroups.push(group);
    } else {
      result.push(group);
    }
  }

  // Merge small groups
  let mergedTools: Tool[] = [];
  let mergedNames: string[] = [];

  for (const group of smallGroups) {
    mergedTools.push(...group.tools);
    mergedNames.push(group.name);

    if (mergedTools.length >= constraints.minToolsPerGroup) {
      result.push({
        id: `group-merged-${result.length + 1}`,
        name: mergedNames.join("_"),
        description: `Merged group: ${mergedNames.join(", ")}`,
        tools: mergedTools,
        complementarityScore: 0.5,
      });
      mergedTools = [];
      mergedNames = [];
    }
  }

  // Add remaining merged tools to groups with space
  if (mergedTools.length > 0 && result.length > 0) {
    // Try to find groups with available space
    const groupsWithSpace = result.filter(
      (g) => g.tools.length + mergedTools.length <= constraints.maxToolsPerGroup,
    );

    if (groupsWithSpace.length > 0) {
      // Add to group with most space
      const targetGroup = groupsWithSpace.reduce((a, b) =>
        a.tools.length < b.tools.length ? a : b
      );
      targetGroup.tools.push(...mergedTools);
    } else {
      // Distribute tools across groups without exceeding max
      for (const tool of mergedTools) {
        const groupWithSpace = result.find(
          (g) => g.tools.length < constraints.maxToolsPerGroup,
        );
        if (groupWithSpace) {
          groupWithSpace.tools.push(tool);
        } else {
          // All groups are at max - force into smallest group
          const smallestGroup = result.reduce((a, b) =>
            a.tools.length < b.tools.length ? a : b
          );
          smallestGroup.tools.push(tool);
        }
      }
    }
  }

  return result;
}

/**
 * Calculate complementarity score for a group based on analysis
 */
function calculateComplementarityScore(
  groupTools: Tool[],
  analysis: AnalysisResult,
): number {
  if (groupTools.length <= 1) {
    return 1.0; // Single tool = perfect complementarity
  }

  // Calculate score based on relationships
  const toolNames = new Set(groupTools.map((t) => t.name));
  const relevantRelationships = analysis.relationships.filter(
    (r) => toolNames.has(r.tool1) && toolNames.has(r.tool2),
  );

  if (relevantRelationships.length === 0) {
    // No relationships found - use server-based scoring
    const servers = new Set(groupTools.map((t) => t.serverName));
    return servers.size === 1 ? 0.8 : 0.5; // Same server = higher score
  }

  // Average of relationship scores
  const avgScore =
    relevantRelationships.reduce((sum, r) => sum + r.score, 0) /
    relevantRelationships.length;

  return Math.max(0, Math.min(1, avgScore));
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
