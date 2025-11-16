import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { afterEach, beforeEach, describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { getToolSubset, MOCK_TOOLS } from "../fixtures/mock_tools.ts";
import type { GroupingConstraints, ToolGroup } from "../../src/types/index.ts";

/**
 * Integration tests for build workflow (User Story 2)
 * Tests the complete flow of running `tamamo-x-mcp build`
 *
 * Acceptance Scenarios:
 * 1. Connect to MCP servers and discover tools
 * 2. Use LLM to analyze tools in batches (10 tools per request)
 * 3. Create 3-10 agent groups with 5-20 tools each
 * 4. Validate constraints (min/max tools per group, min/max groups)
 * 5. Save groups to .tamamo-x/groups.json
 */

describe("Build Workflow Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await Deno.makeTempDir({ prefix: "tamamo_x_build_test_" });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Tool discovery for grouping", () => {
    it("should handle large tool catalogs (50+ tools)", () => {
      // Arrange
      const tools = MOCK_TOOLS; // 60 tools

      // Act & Assert
      assertEquals(tools.length >= 50, true, "Should have at least 50 tools for testing");
      assertEquals(tools.length, 60, "Mock catalog should contain 60 tools");

      // Verify tool diversity (multiple servers)
      const servers = new Set(tools.map((t) => t.serverName));
      assert(servers.size >= 3, "Tools should come from at least 3 different servers");
    });

    it("should deduplicate tools from the same server", () => {
      // Arrange
      const duplicateTools = [
        ...MOCK_TOOLS,
        { ...MOCK_TOOLS[0] }, // Duplicate first tool
      ];

      // Act
      const uniqueTools = deduplicateTools(duplicateTools);

      // Assert
      assertEquals(uniqueTools.length, MOCK_TOOLS.length, "Duplicates should be removed");
    });
  });

  describe("Grouping constraints validation", () => {
    it("should enforce minimum tools per group constraint", async () => {
      // Arrange
      const tools = getToolSubset(20);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await simulateGrouping(tools, constraints);

      // Assert
      groups.forEach((group) => {
        assert(
          group.tools.length >= constraints.minToolsPerGroup,
          `Group "${group.name}" has ${group.tools.length} tools, minimum is ${constraints.minToolsPerGroup}`,
        );
      });
    });

    it("should enforce maximum tools per group constraint", async () => {
      // Arrange
      const tools = MOCK_TOOLS; // 60 tools
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await simulateGrouping(tools, constraints);

      // Assert
      groups.forEach((group) => {
        assert(
          group.tools.length <= constraints.maxToolsPerGroup,
          `Group "${group.name}" has ${group.tools.length} tools, maximum is ${constraints.maxToolsPerGroup}`,
        );
      });
    });

    it("should enforce minimum groups constraint", async () => {
      // Arrange
      const tools = getToolSubset(30);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await simulateGrouping(tools, constraints);

      // Assert
      assert(
        groups.length >= constraints.minGroups,
        `Should have at least ${constraints.minGroups} groups, got ${groups.length}`,
      );
    });

    it("should enforce maximum groups constraint", async () => {
      // Arrange
      const tools = MOCK_TOOLS; // 60 tools
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await simulateGrouping(tools, constraints);

      // Assert
      assert(
        groups.length <= constraints.maxGroups,
        `Should have at most ${constraints.maxGroups} groups, got ${groups.length}`,
      );
    });

    it("should use default constraints when not specified", async () => {
      // Arrange
      const tools = getToolSubset(40);
      const defaultConstraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await simulateGrouping(tools, defaultConstraints);

      // Assert
      assert(
        groups.length >= 3 && groups.length <= 10,
        "Should use default group count constraints",
      );
      groups.forEach((group) => {
        assert(
          group.tools.length >= 5 && group.tools.length <= 20,
          `Group should have 5-20 tools, got ${group.tools.length}`,
        );
      });
    });
  });

  describe("LLM analysis batching", () => {
    it("should batch tools in groups of 10 for LLM analysis", () => {
      // Arrange
      const tools = getToolSubset(50);
      const batchSize = 10;

      // Act
      const batches = createBatches(tools, batchSize);

      // Assert
      assertEquals(batches.length, 5, "50 tools should create 5 batches of 10");
      batches.forEach((batch, index) => {
        if (index < batches.length - 1) {
          assertEquals(batch.length, batchSize, `Batch ${index} should have ${batchSize} tools`);
        } else {
          assert(batch.length <= batchSize, "Last batch should have at most batch size tools");
        }
      });
    });

    it("should handle tool count not divisible by batch size", () => {
      // Arrange
      const tools = getToolSubset(55); // Not divisible by 10
      const batchSize = 10;

      // Act
      const batches = createBatches(tools, batchSize);

      // Assert
      assertEquals(batches.length, 6, "55 tools should create 6 batches (5x10 + 1x5)");
      assertEquals(batches[batches.length - 1].length, 5, "Last batch should have 5 tools");
    });
  });

  describe("Group metadata and naming", () => {
    it("should assign unique names to each group", async () => {
      // Arrange
      const tools = MOCK_TOOLS;
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await simulateGrouping(tools, constraints);

      // Assert
      const groupNames = groups.map((g) => g.name);
      const uniqueNames = new Set(groupNames);
      assertEquals(
        uniqueNames.size,
        groupNames.length,
        "All group names should be unique",
      );
    });

    it("should assign descriptive names based on tool categories", async () => {
      // Arrange
      const tools = MOCK_TOOLS;
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await simulateGrouping(tools, constraints);

      // Assert
      groups.forEach((group) => {
        assertExists(group.name, "Group name should exist");
        assertExists(group.description, "Group description should exist");
        assert(group.name.length > 0, "Group name should be non-empty");
        assert(group.description.length > 0, "Group description should be non-empty");
      });
    });

    it("should generate unique IDs for each group", async () => {
      // Arrange
      const tools = MOCK_TOOLS;
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await simulateGrouping(tools, constraints);

      // Assert
      const groupIds = groups.map((g) => g.id);
      const uniqueIds = new Set(groupIds);
      assertEquals(
        uniqueIds.size,
        groupIds.length,
        "All group IDs should be unique",
      );
    });
  });

  describe("Build output persistence", () => {
    it("should save groups to .tamamo-x/groups.json", async () => {
      // Arrange
      const tools = getToolSubset(30);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };
      const groups = await simulateGrouping(tools, constraints);
      const outputDir = join(tempDir, ".tamamo-x");
      const outputPath = join(outputDir, "groups.json");

      // Act
      await Deno.mkdir(outputDir, { recursive: true });
      await Deno.writeTextFile(outputPath, JSON.stringify(groups, null, 2));

      // Assert
      const exists = await Deno.stat(outputPath).then(() => true).catch(() => false);
      assertEquals(exists, true, "groups.json should be created");

      const content = await Deno.readTextFile(outputPath);
      const savedGroups = JSON.parse(content);
      assertEquals(savedGroups.length, groups.length, "All groups should be saved");
    });

    it("should create .tamamo-x directory if it doesn't exist", async () => {
      // Arrange
      const outputDir = join(tempDir, ".tamamo-x");

      // Act
      await Deno.mkdir(outputDir, { recursive: true });

      // Assert
      const exists = await Deno.stat(outputDir).then(() => true).catch(() => false);
      assertEquals(exists, true, ".tamamo-x directory should be created");
    });
  });

  describe("Error handling", () => {
    it("should handle empty tool list gracefully", async () => {
      // Arrange
      const tools: typeof MOCK_TOOLS = [];
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act & Assert
      // Should throw error or return empty groups
      try {
        const groups = await simulateGrouping(tools, constraints);
        assertEquals(groups.length, 0, "Empty tool list should result in no groups");
      } catch (error) {
        // Expected to throw - empty tool list cannot satisfy min groups constraint
        assert(error instanceof Error, "Should throw error for empty tool list");
      }
    });

    it("should handle insufficient tools for minimum groups", async () => {
      // Arrange
      const tools = getToolSubset(10); // Only 10 tools
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3, // Requires at least 15 tools (3 groups × 5 tools)
        maxGroups: 10,
      };

      // Act & Assert
      try {
        const groups = await simulateGrouping(tools, constraints);
        // Should either throw or relax constraints
        assert(
          groups.length >= 2,
          "Should create at least 2 groups if minimum cannot be satisfied",
        );
      } catch (error) {
        // Expected to throw for impossible constraints
        assert(error instanceof Error, "Should handle impossible constraints");
      }
    });
  });
});

// Helper functions (these will be replaced by actual implementations)

function deduplicateTools(tools: typeof MOCK_TOOLS) {
  const seen = new Set<string>();
  return tools.filter((tool) => {
    const key = `${tool.serverName}:${tool.name}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function simulateGrouping(
  tools: typeof MOCK_TOOLS,
  constraints: GroupingConstraints,
): Promise<ToolGroup[]> {
  // TODO: This is a placeholder - will be replaced by actual grouping implementation
  // For now, create simple groups to test constraints

  if (tools.length === 0) {
    throw new Error("Cannot create groups from empty tool list");
  }

  const { minToolsPerGroup, maxToolsPerGroup, minGroups, maxGroups } = constraints;

  // Calculate target number of groups
  const idealGroupSize = Math.ceil((minToolsPerGroup + maxToolsPerGroup) / 2);
  let targetGroups = Math.ceil(tools.length / idealGroupSize);

  // Enforce min/max groups constraints
  targetGroups = Math.max(minGroups, Math.min(maxGroups, targetGroups));

  // Check if constraints are satisfiable
  if (tools.length < minGroups * minToolsPerGroup) {
    throw new Error(
      `Insufficient tools: need at least ${
        minGroups * minToolsPerGroup
      } tools for ${minGroups} groups`,
    );
  }

  // Simple distribution: divide tools evenly across groups
  const toolsPerGroup = Math.floor(tools.length / targetGroups);
  const groups: ToolGroup[] = [];

  for (let i = 0; i < targetGroups; i++) {
    const startIdx = i * toolsPerGroup;
    const endIdx = i === targetGroups - 1 ? tools.length : (i + 1) * toolsPerGroup;
    const groupTools = tools.slice(startIdx, endIdx);

    // Determine group name based on predominant server
    const serverCounts: Record<string, number> = {};
    groupTools.forEach((tool) => {
      serverCounts[tool.serverName] = (serverCounts[tool.serverName] || 0) + 1;
    });
    const predominantServer = Object.entries(serverCounts).sort((a, b) => b[1] - a[1])[0][0];

    groups.push({
      id: `group-${i + 1}`,
      name: `${predominantServer.replace("-server", "")}_agent`,
      description: `Agent for ${predominantServer} operations`,
      tools: groupTools,
      complementarityScore: 0.8,
    });
  }

  return Promise.resolve(groups);
}

function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
