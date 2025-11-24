import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { getToolSubset } from "../../fixtures/mock_tools.ts";
import type { GroupingConstraints, ToolGroup } from "../../../src/types/index.ts";
import { validateGroups } from "../../../src/grouping/validator.ts";

/**
 * Unit tests for grouping validator (src/grouping/validator.ts)
 *
 * The validator is responsible for:
 * 1. Validating group metadata (unique IDs/names, non-empty fields)
 * 2. Validating constraint structure (not enforcement)
 *
 * Note: Tool count and group count constraints are advisory only and not enforced.
 */

describe("Grouping Validator", () => {
  describe("Group count validation", () => {
    it("should pass validation when group count is within constraints", () => {
      // Arrange
      const groups = createMockGroups(5, 10);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, true, "Should pass validation for valid group count");
      assertEquals(result.errors.length, 0, "Should have no errors");
    });

    it("should pass validation when group count is below minimum (advisory only)", () => {
      // Arrange
      const groups = createMockGroups(2, 10);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      // Constraints are advisory only, so validation should still pass
      assertEquals(
        result.valid,
        true,
        "Should pass validation even with fewer groups (advisory constraint)",
      );
      assertEquals(
        result.errors.length,
        0,
        "Should have no errors for advisory constraint violation",
      );
    });

    it("should pass validation when group count is above maximum (advisory only)", () => {
      // Arrange
      const groups = createMockGroups(12, 5);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      // Constraints are advisory only, so validation should still pass
      assertEquals(
        result.valid,
        true,
        "Should pass validation even with more groups (advisory constraint)",
      );
      assertEquals(
        result.errors.length,
        0,
        "Should have no errors for advisory constraint violation",
      );
    });
  });

  describe("Tools per group validation", () => {
    it("should pass validation when all groups meet tool count constraints", () => {
      // Arrange
      const groups = createMockGroups(4, 12);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 10,
        maxToolsPerGroup: 15,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, true, "Should pass validation for valid tool counts");
    });

    it("should pass validation when a group has too few tools (advisory only)", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups[2].tools = groups[2].tools.slice(0, 3); // Reduce last group to 3 tools
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      // Constraints are advisory only, so validation should still pass
      assertEquals(
        result.valid,
        true,
        "Should pass validation even with group with too few tools (advisory constraint)",
      );
      assertEquals(
        result.errors.length,
        0,
        "Should have no errors for advisory constraint violation",
      );
    });

    it("should pass validation when a group has too many tools (advisory only)", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      // Add extra tools to first group
      groups[0].tools = [...groups[0].tools, ...getToolSubset(15)];
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      // Constraints are advisory only, so validation should still pass
      assertEquals(
        result.valid,
        true,
        "Should pass validation even with group with too many tools (advisory constraint)",
      );
      assertEquals(
        result.errors.length,
        0,
        "Should have no errors for advisory constraint violation",
      );
    });

    it("should pass validation even when multiple groups violate constraints (advisory only)", () => {
      // Arrange
      const groups = createMockGroups(5, 10);
      groups[1].tools = groups[1].tools.slice(0, 2); // Too few
      groups[3].tools = [...groups[3].tools, ...getToolSubset(15)]; // Too many
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      // Constraints are advisory only, so validation should still pass
      assertEquals(
        result.valid,
        true,
        "Should pass validation even with multiple constraint violations (advisory)",
      );
      assertEquals(
        result.errors.length,
        0,
        "Should have no errors for advisory constraint violations",
      );
    });
  });

  describe("Group metadata validation", () => {
    it("should pass validation when all groups have valid metadata", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, true, "Should pass validation for valid metadata");
    });

    it("should fail validation when group ID is missing", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups[1].id = ""; // Empty ID
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, false, "Should fail validation for empty group ID");
      assert(
        result.errors.some((e) => e.includes("ID") || e.includes("id")),
        "Error should mention missing ID",
      );
    });

    it("should fail validation when group IDs are not unique", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups[2].id = groups[0].id; // Duplicate ID
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, false, "Should fail validation for duplicate group IDs");
      assert(
        result.errors.some((e) => e.includes("unique") && e.includes("ID")),
        "Error should mention non-unique IDs",
      );
    });

    it("should fail validation when group name is missing", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups[1].name = ""; // Empty name
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, false, "Should fail validation for empty group name");
      assert(
        result.errors.some((e) => e.includes("name")),
        "Error should mention missing name",
      );
    });

    it("should fail validation when group names are not unique", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups[2].name = groups[0].name; // Duplicate name
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, false, "Should fail validation for duplicate group names");
      assert(
        result.errors.some((e) => e.includes("unique") && e.includes("name")),
        "Error should mention non-unique names",
      );
    });

    it("should fail validation when group description is missing", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups[1].description = ""; // Empty description
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, false, "Should fail validation for empty description");
      assert(
        result.errors.some((e) => e.includes("description")),
        "Error should mention missing description",
      );
    });
  });

  describe("Complementarity score validation", () => {
    it("should pass validation when complementarity scores are in valid range", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups.forEach((g) => (g.complementarityScore = 0.75));
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, true, "Should pass validation for valid scores");
    });

    it("should fail validation when complementarity score is below 0", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups[1].complementarityScore = -0.2; // Invalid
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, false, "Should fail validation for score < 0");
      assert(
        result.errors.some((e) => e.includes("complementarity") || e.includes("score")),
        "Error should mention invalid score",
      );
    });

    it("should fail validation when complementarity score is above 1", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups[2].complementarityScore = 1.5; // Invalid
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, false, "Should fail validation for score > 1");
      assert(
        result.errors.some((e) => e.includes("complementarity") || e.includes("score")),
        "Error should mention invalid score",
      );
    });

    it("should allow missing complementarity score (optional field)", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      groups.forEach((g) => delete g.complementarityScore);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, true, "Should pass validation when score is missing (optional)");
    });
  });

  describe("Edge cases", () => {
    it("should pass validation even for empty group list (advisory constraint)", () => {
      // Arrange
      const groups: ToolGroup[] = [];
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      // Constraints are advisory only, so validation should pass even for empty list
      assertEquals(
        result.valid,
        true,
        "Should pass validation even for empty group list (advisory constraint)",
      );
      assertEquals(
        result.errors.length,
        0,
        "Should have no errors for advisory constraint violation",
      );
    });

    it("should handle single group", () => {
      // Arrange
      const groups = createMockGroups(1, 10);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 1,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      assertEquals(result.valid, true, "Should pass validation for single group if allowed");
    });

    it("should accumulate metadata validation errors only (constraints are advisory)", () => {
      // Arrange
      const groups = createMockGroups(12, 3); // Tool/group count constraints don't cause errors (advisory)
      groups[0].id = groups[1].id; // Duplicate ID (this should still fail)
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, constraints);

      // Assert
      // Should fail only due to duplicate IDs (metadata validation)
      // Not due to tool/group count constraints (advisory)
      assertEquals(result.valid, false, "Should fail validation for metadata errors");
      assert(result.errors.length >= 1, "Should have at least one error for duplicate IDs");
      assert(
        result.errors.some((e) => e.includes("unique") && e.includes("ID")),
        "Error should mention non-unique IDs",
      );
    });
  });

  describe("Constraint structure validation", () => {
    it("should fail validation when constraint object has invalid structure", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      const invalidConstraints = {
        minToolsPerGroup: -1, // Invalid: negative value
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      } as GroupingConstraints;

      // Act
      const result = validateGroups(groups, invalidConstraints);

      // Assert
      assertEquals(result.valid, false, "Should fail validation for invalid constraint structure");
      assert(result.errors.length > 0, "Should have errors for invalid constraints");
      assert(
        result.errors.some((e) => e.includes("Constraints")),
        "Error should mention constraint validation failure",
      );
    });

    it("should fail validation when required constraint fields are missing", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      const incompleteConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        // Missing minGroups and maxGroups
      } as GroupingConstraints;

      // Act
      const result = validateGroups(groups, incompleteConstraints);

      // Assert
      assertEquals(result.valid, false, "Should fail validation for missing constraint fields");
      assert(result.errors.length > 0, "Should have errors for missing fields");
    });

    it("should pass validation when constraint structure is valid", () => {
      // Arrange
      const groups = createMockGroups(3, 10);
      const validConstraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const result = validateGroups(groups, validConstraints);

      // Assert
      assertEquals(result.valid, true, "Should pass validation for valid constraint structure");
    });
  });
});

// Helper functions

function createMockGroups(count: number, toolsPerGroup: number): ToolGroup[] {
  const groups: ToolGroup[] = [];
  let toolOffset = 0;

  for (let i = 0; i < count; i++) {
    const tools = getToolSubset(toolsPerGroup).map((tool, idx) => ({
      ...tool,
      name: `${tool.name}_${toolOffset + idx}`, // Make tools unique across groups
    }));
    toolOffset += toolsPerGroup;

    groups.push({
      id: `group-${i + 1}`,
      name: `group_${i + 1}_agent`,
      description: `Agent for group ${i + 1} operations`,
      tools,
      systemPrompt: `You are an agent for group ${i + 1} operations.`,
      complementarityScore: 0.8,
    });
  }

  return groups;
}
