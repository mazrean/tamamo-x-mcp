/**
 * Grouping constraint validator
 * Enforces grouping constraints and validates tool groups using Zod
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

  // NOTE: Grouping constraints (tool count and group count) are now advisory only.
  // They are not enforced during validation to allow flexibility in tool grouping.
  // The constraints serve as guidelines for the LLM during the grouping process.

  // COMMENTED OUT: Group count validation (advisory only)
  // if (groups.length < validatedConstraints.minGroups) {
  //   errors.push(
  //     `Too few groups: ${groups.length} (minimum constraint: ${validatedConstraints.minGroups})`,
  //   );
  // }
  // if (groups.length > validatedConstraints.maxGroups) {
  //   errors.push(
  //     `Too many groups: ${groups.length} (maximum constraint: ${validatedConstraints.maxGroups})`,
  //   );
  // }

  // COMMENTED OUT: Tools per group validation (advisory only)
  // groups.forEach((group) => {
  //   if (group.tools.length < validatedConstraints.minToolsPerGroup) {
  //     errors.push(
  //       `Group "${group.name}" has too few tools: ${group.tools.length} (minimum constraint: ${validatedConstraints.minToolsPerGroup})`,
  //     );
  //   }
  //   if (group.tools.length > validatedConstraints.maxToolsPerGroup) {
  //     errors.push(
  //       `Group "${group.name}" has too many tools: ${group.tools.length} (maximum constraint: ${validatedConstraints.maxToolsPerGroup})`,
  //     );
  //   }
  // });

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
