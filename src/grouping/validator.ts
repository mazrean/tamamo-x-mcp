/**
 * Grouping constraint validator
 * Validates tool group metadata (IDs, names, descriptions) using Zod.
 * Note: Tool count and group count constraints are advisory only and not enforced.
 */

import { GroupingConstraintsRequiredSchema, ToolGroupSchema } from "../schemas/index.ts";
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

  // First, validate each group individually using Zod schema
  groups.forEach((group, index) => {
    const result = ToolGroupSchema.safeParse(group);
    if (!result.success) {
      result.error.issues.forEach((err) => {
        errors.push(`Group[${index}].${err.path.join(".")}: ${err.message}`);
      });
    }
  });

  // Validate constraints using Zod schema
  const constraintsResult = GroupingConstraintsRequiredSchema.safeParse(constraints);
  if (!constraintsResult.success) {
    constraintsResult.error.issues.forEach((err) => {
      errors.push(`Constraints.${err.path.join(".")}: ${err.message}`);
    });
    // If constraints are invalid, we can't proceed with further validation
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // NOTE: Tool count and group count constraints are advisory only.
  // They serve as guidelines for the LLM during grouping but are not enforced here.

  // Validate unique group IDs
  const groupIds = groups.map((g) => g.id);
  const uniqueIds = new Set(groupIds);
  if (uniqueIds.size !== groupIds.length) {
    errors.push("Group IDs are not unique");
  }

  // Validate unique group names
  const groupNames = groups.map((g) => g.name);
  const uniqueNames = new Set(groupNames);
  if (uniqueNames.size !== groupNames.length) {
    errors.push("Group names are not unique");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
