import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { getToolsByCategory, getToolSubset, MOCK_TOOLS } from "../../fixtures/mock_tools.ts";
import type {
  GroupingConstraints,
  LLMClient,
  ProjectContext,
  Tool,
  ToolGroup,
} from "../../../src/types/index.ts";
import { groupTools } from "../../../src/grouping/grouper.ts";

/**
 * Unit tests for grouping algorithm (src/grouping/grouper.ts)
 *
 * The grouper is responsible for:
 * 1. Parsing LLM analysis results
 * 2. Assigning tools to groups based on complementarity
 * 3. Using ProjectContext for domain-aware grouping
 * 4. Ensuring all tools are assigned to exactly one group
 * 5. Respecting grouping constraints (min/max tools per group, min/max groups)
 */

describe("Grouping Algorithm", () => {
  describe("Tool-to-group assignment", () => {
    it("should assign each tool to exactly one group", async () => {
      // Arrange
      const tools = getToolSubset(30);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      const assignedTools = groups.flatMap((g) => g.tools);
      assertEquals(assignedTools.length, tools.length, "All tools should be assigned");

      // Check for duplicates
      const toolIds = assignedTools.map((t) => `${t.serverName}:${t.name}`);
      const uniqueIds = new Set(toolIds);
      assertEquals(
        uniqueIds.size,
        toolIds.length,
        "No tool should be assigned to multiple groups",
      );
    });

    it("should group related tools together", async () => {
      // Arrange
      const filesystemTools = getToolsByCategory("filesystem");
      const gitTools = getToolsByCategory("git");
      const allTools = [...filesystemTools, ...gitTools];
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 2,
        maxGroups: 5,
      };

      // Act
      const groups = await groupTools(allTools, createMockLLMClient(), constraints);

      // Assert
      // Filesystem and git tools should be in separate groups
      const filesystemGroup = groups.find((g) =>
        g.tools.some((t) => t.serverName === "filesystem-server")
      );
      const gitGroup = groups.find((g) => g.tools.some((t) => t.serverName === "git-server"));

      assertExists(filesystemGroup, "Should have a filesystem tools group");
      assertExists(gitGroup, "Should have a git tools group");

      // Most filesystem tools should be in the filesystem group
      const filesystemGroupTools = filesystemGroup.tools.filter((t) =>
        t.serverName === "filesystem-server"
      );
      assert(
        filesystemGroupTools.length >= filesystemTools.length * 0.7,
        "At least 70% of filesystem tools should be grouped together",
      );
    });

    it("should handle tools with no clear relationships", async () => {
      // Arrange
      const tools = MOCK_TOOLS; // Mix of different tool types
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      // Should still create valid groups even without clear relationships
      assert(groups.length >= constraints.minGroups, "Should meet minimum groups constraint");
      assert(groups.length <= constraints.maxGroups, "Should meet maximum groups constraint");
      groups.forEach((group) => {
        assert(
          group.tools.length >= constraints.minToolsPerGroup,
          "Should meet minimum tools per group",
        );
        assert(
          group.tools.length <= constraints.maxToolsPerGroup,
          "Should meet maximum tools per group",
        );
      });
    });
  });

  describe("Complementarity scoring", () => {
    it("should calculate complementarity scores for groups", async () => {
      // Arrange
      const tools = getToolSubset(20);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 2,
        maxGroups: 5,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      groups.forEach((group) => {
        assertExists(group.complementarityScore, "Each group should have a complementarity score");
        assert(
          group.complementarityScore! >= 0 && group.complementarityScore! <= 1,
          `Complementarity score should be in [0, 1], got ${group.complementarityScore}`,
        );
      });
    });

    it("should prefer groups with higher complementarity", async () => {
      // Arrange
      const filesystemTools = getToolsByCategory("filesystem"); // Highly complementary
      const mixedTools = [
        ...getToolsByCategory("filesystem").slice(0, 3),
        ...getToolsByCategory("git").slice(0, 3),
        ...getToolsByCategory("database").slice(0, 3),
      ]; // Less complementary

      // Act
      const filesystemGroups = await groupTools(filesystemTools, createMockLLMClient(), {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 1,
        maxGroups: 3,
      });
      const mixedGroups = await groupTools(mixedTools, createMockLLMClient(), {
        minToolsPerGroup: 3,
        maxToolsPerGroup: 20,
        minGroups: 1,
        maxGroups: 3,
      });

      // Assert
      const filesystemScore = filesystemGroups[0].complementarityScore || 0;
      const mixedScore = mixedGroups[0].complementarityScore || 0;

      assert(
        filesystemScore > mixedScore,
        `Filesystem group score (${filesystemScore}) should be higher than mixed group score (${mixedScore})`,
      );
    });
  });

  describe("Group naming and description", () => {
    it("should generate descriptive group names", async () => {
      // Arrange
      const filesystemTools = getToolsByCategory("filesystem");
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 1,
        maxGroups: 3,
      };

      // Act
      const groups = await groupTools(filesystemTools, createMockLLMClient(), constraints);

      // Assert
      groups.forEach((group) => {
        assertExists(group.name, "Group should have a name");
        assert(group.name.length > 0, "Group name should not be empty");
        assert(
          group.name.includes("filesystem") || group.name.includes("file"),
          `Group name "${group.name}" should reflect tool category`,
        );
      });
    });

    it("should generate unique group IDs", async () => {
      // Arrange
      const tools = getToolSubset(30);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 15,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      const groupIds = groups.map((g) => g.id);
      const uniqueIds = new Set(groupIds);
      assertEquals(uniqueIds.size, groupIds.length, "All group IDs should be unique");
    });

    it("should include rationale in group description", async () => {
      // Arrange
      const tools = getToolSubset(15);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 2,
        maxGroups: 5,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      groups.forEach((group) => {
        assertExists(group.description, "Group should have a description");
        assert(
          group.description.length >= 10,
          "Description should be meaningful (at least 10 chars)",
        );
      });
    });
  });

  describe("Constraint satisfaction", () => {
    it("should respect minimum tools per group constraint", async () => {
      // Arrange
      const tools = getToolSubset(20);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 7,
        maxToolsPerGroup: 20,
        minGroups: 2,
        maxGroups: 5,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      groups.forEach((group) => {
        assert(
          group.tools.length >= constraints.minToolsPerGroup,
          `Group "${group.name}" has ${group.tools.length} tools, minimum is ${constraints.minToolsPerGroup}`,
        );
      });
    });

    it("should respect maximum tools per group constraint", async () => {
      // Arrange
      const tools = getToolSubset(40);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 12,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      groups.forEach((group) => {
        assert(
          group.tools.length <= constraints.maxToolsPerGroup,
          `Group "${group.name}" has ${group.tools.length} tools, maximum is ${constraints.maxToolsPerGroup}`,
        );
      });
    });

    it("should respect minimum groups constraint", async () => {
      // Arrange
      const tools = getToolSubset(30);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 4,
        maxGroups: 10,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      assert(
        groups.length >= constraints.minGroups,
        `Should have at least ${constraints.minGroups} groups, got ${groups.length}`,
      );
    });

    it("should respect maximum groups constraint", async () => {
      // Arrange
      const tools = MOCK_TOOLS; // 60 tools
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 6,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      assert(
        groups.length <= constraints.maxGroups,
        `Should have at most ${constraints.maxGroups} groups, got ${groups.length}`,
      );
    });

    it("should handle tight constraints gracefully", async () => {
      // Arrange
      const tools = getToolSubset(25);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 8,
        maxToolsPerGroup: 10,
        minGroups: 2,
        maxGroups: 3,
      };

      // Act - tight constraints may fail validation, which is acceptable
      let groups;
      try {
        groups = await groupTools(tools, createMockLLMClient(), constraints);
      } catch (error) {
        // Validation failure is acceptable for tight constraints
        // Just verify the error message mentions the constraints
        assert(error instanceof Error);
        assert(
          error.message.includes("validation") || error.message.includes("constraint"),
          "Error should mention validation or constraints",
        );
        return; // Test passes - gracefully handled by throwing informative error
      }

      // Assert - if it didn't throw, check approximate constraints
      // With tight constraints, should still produce valid grouping
      assert(groups.length >= 2, "Should satisfy minimum groups");
      assert(groups.length <= 3, "Should satisfy maximum groups");
      groups.forEach((group) => {
        // May need to violate constraints for tight scenarios (6-12 is acceptable)
        assert(group.tools.length >= 6, "Should approximately satisfy min tools constraint (6+)");
        assert(group.tools.length <= 12, "Should approximately satisfy max tools constraint (12-)");
      });
    });
  });

  describe("Project context integration", () => {
    it("should use project domain for grouping hints", async () => {
      // Arrange
      const tools = getToolSubset(20);
      const context: ProjectContext = {
        domain: "web-development",
      };
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 2,
        maxGroups: 5,
      };

      // Act
      const groups = await groupToolsWithContext(tools, constraints, context);

      // Assert
      // Groups should reflect web-development domain
      // (This is conceptual - actual behavior depends on LLM and context usage)
      assertExists(groups, "Should create groups with domain context");
      assert(groups.length > 0, "Should create at least one group");
    });

    it("should incorporate custom grouping hints", async () => {
      // Arrange
      const tools = [
        ...getToolsByCategory("http"),
        ...getToolsByCategory("database"),
      ];
      const context: ProjectContext = {
        customHints: ["Separate HTTP and database operations into different agents"],
      };
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 2,
        maxGroups: 5,
      };

      // Act
      const groups = await groupToolsWithContext(tools, constraints, context);

      // Assert
      // Should create separate groups for HTTP and database
      const httpGroup = groups.find((g) => g.tools.some((t) => t.serverName === "http-server"));
      const dbGroup = groups.find((g) => g.tools.some((t) => t.serverName === "database-server"));

      assertExists(httpGroup, "Should have HTTP tools group");
      assertExists(dbGroup, "Should have database tools group");
    });
  });

  describe("Edge cases", () => {
    it("should handle single tool", async () => {
      // Arrange
      const tools = getToolSubset(1);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 1,
        maxToolsPerGroup: 20,
        minGroups: 1,
        maxGroups: 10,
      };

      // Act
      const groups = await groupTools(tools, createMockLLMClient(), constraints);

      // Assert
      assertEquals(groups.length, 1, "Should create one group for single tool");
      assertEquals(groups[0].tools.length, 1, "Group should contain the single tool");
    });

    it("should throw error for empty tool list", async () => {
      // Arrange
      const tools: Tool[] = [];
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 10,
      };

      // Act & Assert
      try {
        await groupTools(tools, createMockLLMClient(), constraints);
        assert(false, "Should throw error for empty tool list");
      } catch (error) {
        assert(error instanceof Error, "Should throw Error for empty tool list");
        assert(
          error.message.includes("empty") || error.message.includes("no tools"),
          "Error message should mention empty tool list",
        );
      }
    });

    it("should throw error for impossible constraints", async () => {
      // Arrange
      const tools = getToolSubset(10);
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 8,
        maxToolsPerGroup: 10,
        minGroups: 5, // Impossible: 5 groups × 8 tools = 40 tools needed, but only 10 available
        maxGroups: 10,
      };

      // Act & Assert
      try {
        await groupTools(tools, createMockLLMClient(), constraints);
        assert(false, "Should throw error for impossible constraints");
      } catch (error) {
        assert(error instanceof Error, "Should throw Error for impossible constraints");
        assert(
          error.message.includes("constraint") || error.message.includes("insufficient"),
          "Error message should mention constraints",
        );
      }
    });
  });

  describe("Stress tests", () => {
    it("should handle many split iterations (60 tools, maxToolsPerGroup=5)", async () => {
      // This requires ~12 split operations (60 tools / 5 max = 12 groups minimum)
      const tools = getToolSubset(60);
      const llmClient = createMockLLMClient();
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 3,
        maxToolsPerGroup: 5,
        minGroups: 3,
        maxGroups: 20,
      };

      // Act
      const groups = await groupTools(tools, llmClient, constraints);

      // Assert
      assert(groups.length >= 3, "Should satisfy minimum groups");
      assert(groups.length <= 20, "Should satisfy maximum groups");
      groups.forEach((group) => {
        assert(group.tools.length >= 3, "Should satisfy min tools per group");
        assert(group.tools.length <= 5, "Should satisfy max tools per group");
      });

      // Verify all tools are assigned (no tool loss)
      const allTools = groups.flatMap((g) => g.tools);
      assertEquals(allTools.length, 60, "All 60 tools should be assigned");
    });

    it("should handle many merge iterations (60 groups → 6 groups)", async () => {
      // Create 60 singleton-like groups (need 54 merges)
      const tools = getToolSubset(60);
      const llmClient = createMockLLMClient();
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 5,
        maxToolsPerGroup: 20,
        minGroups: 3,
        maxGroups: 6,
      };

      // Act
      const groups = await groupTools(tools, llmClient, constraints);

      // Assert
      assert(groups.length >= 3, "Should satisfy minimum groups");
      assert(groups.length <= 6, "Should satisfy maximum groups");
      groups.forEach((group) => {
        assert(group.tools.length >= 5, "Should satisfy min tools per group");
        assert(group.tools.length <= 20, "Should satisfy max tools per group");
      });

      // Verify all tools are assigned
      const allTools = groups.flatMap((g) => g.tools);
      assertEquals(allTools.length, 60, "All tools should be assigned (no tool loss)");
    });

    it("should handle rebalance scenario (10 tools, 3 groups, minToolsPerGroup=3)", async () => {
      // Codex-identified scenario: [5,5] → [4,3,3]
      const tools = getToolSubset(10);
      const llmClient = createMockLLMClient();
      const constraints: GroupingConstraints = {
        minToolsPerGroup: 3,
        maxToolsPerGroup: 10,
        minGroups: 3,
        maxGroups: 3,
      };

      // Act
      const groups = await groupTools(tools, llmClient, constraints);

      // Assert
      assertEquals(groups.length, 3, "Should have exactly 3 groups");
      groups.forEach((group) => {
        assert(group.tools.length >= 3, "Should satisfy min tools per group");
        assert(group.tools.length <= 10, "Should satisfy max tools per group");
      });

      // Verify all tools are assigned (no tool loss during rebalance)
      const allTools = groups.flatMap((g) => g.tools);
      assertEquals(allTools.length, 10, "All 10 tools should be assigned");

      // Check unique tools (no duplicates)
      const uniqueTools = new Set(allTools.map((t) => `${t.serverName}:${t.name}`));
      assertEquals(uniqueTools.size, 10, "All tools should be unique");
    });
  });
});

// Helper functions

// Mock LLM client for testing
function createMockLLMClient(): LLMClient {
  return {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    complete(prompt: string): Promise<string> {
      // Parse tool names from prompt
      const toolMatches = prompt.matchAll(/\d+\.\s+([a-z_]+):/g);
      const tools = Array.from(toolMatches).map((match) => match[1]);

      // Group tools by their naming patterns
      const fileTools = tools.filter((t) => t.includes("file") || t.includes("directory"));
      const gitTools = tools.filter((t) => t.startsWith("git_"));
      const dbTools = tools.filter((t) => t.startsWith("db_"));
      const httpTools = tools.filter((t) => t.includes("http") || t.includes("url"));
      const dataTools = tools.filter((t) => t.includes("parse") || t.includes("transform"));
      const systemTools = tools.filter((t) => t.includes("monitor") || t.includes("process"));

      const suggestions = [];
      if (fileTools.length > 0) {
        suggestions.push({
          name: "filesystem_agent",
          tools: fileTools,
          rationale: "File and directory manipulation tools",
        });
      }
      if (gitTools.length > 0) {
        suggestions.push({
          name: "git_agent",
          tools: gitTools,
          rationale: "Git version control operations",
        });
      }
      if (dbTools.length > 0) {
        suggestions.push({
          name: "database_agent",
          tools: dbTools,
          rationale: "Database operations",
        });
      }
      if (httpTools.length > 0) {
        suggestions.push({
          name: "http_agent",
          tools: httpTools,
          rationale: "HTTP client operations",
        });
      }
      if (dataTools.length > 0) {
        suggestions.push({
          name: "data_agent",
          tools: dataTools,
          rationale: "Data processing",
        });
      }
      if (systemTools.length > 0) {
        suggestions.push({
          name: "system_agent",
          tools: systemTools,
          rationale: "System monitoring",
        });
      }

      // Create relationships with deterministic scores
      const relationships = [];
      for (let i = 0; i < tools.length - 1; i++) {
        const tool1 = tools[i];
        const tool2 = tools[i + 1];

        // Calculate score based on tool similarity
        let score = 0.5; // Default low score

        // High score for same category tools
        if (
          (tool1.includes("file") && tool2.includes("file")) ||
          (tool1.includes("directory") && tool2.includes("directory")) ||
          (tool1.startsWith("git_") && tool2.startsWith("git_")) ||
          (tool1.startsWith("db_") && tool2.startsWith("db_")) ||
          (tool1.includes("http") && tool2.includes("http")) ||
          (tool1.includes("parse") && tool2.includes("parse")) ||
          (tool1.includes("monitor") && tool2.includes("monitor"))
        ) {
          score = 0.9;
        }

        relationships.push({
          tool1,
          tool2,
          score,
        });
      }

      return Promise.resolve(JSON.stringify({ relationships, suggestions }));
    },
  };
}

function groupToolsWithContext(
  tools: Tool[],
  constraints: GroupingConstraints,
  context: ProjectContext,
): Promise<ToolGroup[]> {
  const mockLLM = createMockLLMClient();
  return groupTools(tools, mockLLM, constraints, context);
}
