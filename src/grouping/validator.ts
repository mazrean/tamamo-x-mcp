/**
 * Grouping constraint validator
 * Enforces grouping constraints and validates tool groups
 */

import type { GroupingConstraints, ToolGroup } from "../types/index.ts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate tool groups against grouping constraints
 */
export function validateGroups(
  groups: ToolGroup[],
  constraints: GroupingConstraints,
): ValidationResult {
  const errors: string[] = [];

  // Validate group count
  if (groups.length < constraints.minGroups) {
    errors.push(
      `Too few groups: ${groups.length} (minimum: ${constraints.minGroups})`,
    );
  }
  if (groups.length > constraints.maxGroups) {
    errors.push(
      `Too many groups: ${groups.length} (maximum: ${constraints.maxGroups})`,
    );
  }

  // Validate tools per group
  groups.forEach((group) => {
    if (group.tools.length < constraints.minToolsPerGroup) {
      errors.push(
        `Group "${group.name}" has too few tools: ${group.tools.length} (minimum: ${constraints.minToolsPerGroup})`,
      );
    }
    if (group.tools.length > constraints.maxToolsPerGroup) {
      errors.push(
        `Group "${group.name}" has too many tools: ${group.tools.length} (maximum: ${constraints.maxToolsPerGroup})`,
      );
    }
  });

  // Validate unique group IDs
  const groupIds = groups.map((g) => g.id);
  const uniqueIds = new Set(groupIds);
  if (uniqueIds.size !== groupIds.length) {
    errors.push("Group IDs are not unique");
  }

  // Validate non-empty IDs
  groups.forEach((group) => {
    if (!group.id || group.id.trim() === "") {
      errors.push(`Group at index has empty ID`);
    }
  });

  // Validate unique group names
  const groupNames = groups.map((g) => g.name);
  const uniqueNames = new Set(groupNames);
  if (uniqueNames.size !== groupNames.length) {
    errors.push("Group names are not unique");
  }

  // Validate non-empty names
  groups.forEach((group) => {
    if (!group.name || group.name.trim() === "") {
      errors.push(`Group "${group.id}" has empty name`);
    }
  });

  // Validate non-empty descriptions
  groups.forEach((group) => {
    if (!group.description || group.description.trim() === "") {
      errors.push(`Group "${group.name}" has empty description`);
    }
  });

  // Validate complementarity scores
  groups.forEach((group) => {
    if (group.complementarityScore !== undefined) {
      if (group.complementarityScore < 0 || group.complementarityScore > 1) {
        errors.push(
          `Group "${group.name}" has invalid complementarity score: ${group.complementarityScore} (must be in [0, 1])`,
        );
      }
    }
  });

  // Validate tool uniqueness across groups
  const allTools = groups.flatMap((g) => g.tools);
  const toolKeys = allTools.map((t) => `${t.serverName}:${t.name}`);
  const uniqueToolKeys = new Set(toolKeys);
  if (uniqueToolKeys.size !== toolKeys.length) {
    errors.push("Some tools appear in multiple groups");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if constraints are satisfiable with given tool count
 */
export function checkConstraintsSatisfiable(
  toolCount: number,
  constraints: GroupingConstraints,
): boolean {
  // Minimum tools required: minGroups * minToolsPerGroup
  const minToolsRequired = constraints.minGroups * constraints.minToolsPerGroup;

  if (toolCount < minToolsRequired) {
    return false;
  }

  // Maximum tools allowed: maxGroups * maxToolsPerGroup
  const maxToolsAllowed = constraints.maxGroups * constraints.maxToolsPerGroup;

  if (toolCount > maxToolsAllowed) {
    // This is a warning, not a hard failure - we can still group the tools
    // but we might need to relax some constraints
    return true;
  }

  return true;
}
