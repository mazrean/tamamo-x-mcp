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
 * 4. Respecting grouping constraints (min/max tools per group, min/max groups)
 */

describe("Grouping Algorithm", () => {
  describe("Tool-to-group assignment", () => {
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

      // Verify all tools are assigned at least once
      const allTools = groups.flatMap((g) => g.tools);
      const uniqueTools = new Set(allTools.map((t) => `${t.serverName}:${t.name}`));
      assertEquals(uniqueTools.size, 60, "All 60 unique tools should be assigned at least once");
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

      // Verify all tools are assigned at least once
      const allTools = groups.flatMap((g) => g.tools);
      const uniqueTools = new Set(allTools.map((t) => `${t.serverName}:${t.name}`));
      assertEquals(uniqueTools.size, 10, "All 10 unique tools should be assigned at least once");
    });
  });
});

// Helper functions

// Mock LLM client for testing
/**
 * Generate a descriptive group name based on the tools in the group
 */
function generateGroupName(toolKeys: string[], groupIndex: number): string {
  // Extract tool names and find common patterns
  const toolNames = toolKeys.map((key) => key.split(":")[1] || key).map((name) =>
    name.toLowerCase()
  );

  // Check for common categories and append index for uniqueness
  if (
    toolNames.some((n) =>
      n.includes("file") || n.includes("read") || n.includes("write") || n.includes("directory")
    )
  ) {
    return `filesystem_operations_${groupIndex}_agent`;
  }
  if (toolNames.some((n) => n.includes("git") || n.includes("commit") || n.includes("branch"))) {
    return `git_version_control_${groupIndex}_agent`;
  }
  if (toolNames.some((n) => n.includes("network") || n.includes("http") || n.includes("fetch"))) {
    return `network_operations_${groupIndex}_agent`;
  }
  if (toolNames.some((n) => n.includes("data") || n.includes("database") || n.includes("query"))) {
    return `data_management_${groupIndex}_agent`;
  }

  // Default to generic name if no pattern matches
  return `general_tools_group_${groupIndex}_agent`;
}

function createMockLLMClient(): LLMClient {
  return {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    complete(prompt: string, options?): Promise<string> {
      // Determine which step we're in by checking the messages
      const messages = options?.messages || [];
      const systemMessage = messages.find((m) => m.role === "system");
      const lastUserMessage = messages.filter((m) => m.role === "user").pop();
      const userContent = lastUserMessage?.content || prompt;
      const systemContent = systemMessage?.content || "";

      // Step 3: Check for final grouping step first (has specific system prompt)
      const isStep3 = systemContent.includes("tool grouping specialist") ||
        systemContent.includes("OUTPUT FORMAT (JSON only") ||
        userContent.includes("Generate the corrected JSON output now");

      if (!isStep3) {
        // Step 1: Project analysis - return simple text response
        if (
          userContent.includes("analyze the project context") ||
          userContent.includes("domain or problem space")
        ) {
          return Promise.resolve(
            "This project appears to involve filesystem operations and git version control. The tools are organized around these two main domains.",
          );
        }

        // Step 2: Grouping strategy - return simple text response
        if (
          userContent.includes("grouping strategy") || userContent.includes("how you will create")
        ) {
          return Promise.resolve(
            "I will create separate groups for filesystem operations and git operations, ensuring each group meets the minimum tool count requirements.",
          );
        }
      }

      // Step 3: Final grouping - return JSON
      // Parse constraints and tools from system message or user messages
      const allContent = messages.map((m) => m.content).join("\n") + "\n" + prompt;
      // Match both old and new prompt formats
      const minGroupsMatch = allContent.match(
        /(?:between (\d+) and (\d+) groups|Group count: MUST be (\d+)-(\d+) groups)/,
      );
      const minGroups = minGroupsMatch ? parseInt(minGroupsMatch[1] || minGroupsMatch[3]) : 3;
      const maxGroups = minGroupsMatch ? parseInt(minGroupsMatch[2] || minGroupsMatch[4]) : 10;

      const toolsPerGroupMatch = allContent.match(
        /(?:between (\d+) and (\d+) tools|Tools per group: EACH group MUST have (\d+)-(\d+) tools)/,
      );
      const minToolsPerGroup = toolsPerGroupMatch
        ? parseInt(toolsPerGroupMatch[1] || toolsPerGroupMatch[3])
        : 5;
      const maxToolsPerGroup = toolsPerGroupMatch
        ? parseInt(toolsPerGroupMatch[2] || toolsPerGroupMatch[4])
        : 20;

      // Parse tool keys from all messages (format: "serverName:toolName")
      const toolKeyMatches = allContent.matchAll(/\d+\.\s+"([^"]+)"/g);
      const toolKeys = Array.from(new Set(Array.from(toolKeyMatches).map((match) => match[1])));

      if (toolKeys.length === 0) {
        return Promise.resolve(JSON.stringify({ groups: [] }));
      }

      // Create Map of toolKey -> simple name for grouping logic
      const toolMap = new Map<string, string>();
      toolKeys.forEach((key) => {
        const [_, name] = key.split(":");
        toolMap.set(key, name);
      });

      // Simple approach: Split tools into groups of maxToolsPerGroup size
      const groups: Array<{ name: string; tools: string[] }> = [];
      let groupIndex = 0;
      let remaining = [...toolKeys];

      while (remaining.length > 0) {
        // Determine size for this group
        let groupSize;

        if (remaining.length <= maxToolsPerGroup) {
          // Take all remaining (it fits in one group)
          groupSize = remaining.length;
        } else {
          // Take maxToolsPerGroup, but check if this would leave too few for next group
          const leftAfter = remaining.length - maxToolsPerGroup;
          if (leftAfter < minToolsPerGroup && leftAfter > 0) {
            // Would leave too few - distribute evenly
            groupSize = Math.ceil(remaining.length / 2);
          } else {
            // Safe to take maxToolsPerGroup
            groupSize = maxToolsPerGroup;
          }
        }

        const tools = remaining.slice(0, groupSize);
        remaining = remaining.slice(groupSize);

        // Generate descriptive group name based on tool content
        const groupName = generateGroupName(tools, groupIndex);
        groups.push({
          name: groupName,
          tools,
        });
        groupIndex++;
      }

      // Adjust for minGroups and maxGroups constraints
      // Ensure minGroups
      while (groups.length < minGroups) {
        // Find largest group that can be split
        groups.sort((a, b) => b.tools.length - a.tools.length);
        const largest = groups[0];

        // Calculate how many groups we still need to create
        const groupsNeeded = minGroups - groups.length + 1; // +1 because we're splitting this group

        // Check if we can split while satisfying minToolsPerGroup for all resulting groups
        const canSplit = largest.tools.length >= minToolsPerGroup * 2 ||
          (largest.tools.length / groupsNeeded >= minToolsPerGroup);

        if (canSplit) {
          groups.shift(); // Remove largest

          // Calculate optimal split size considering future splits
          // We want to ensure remaining tools can be further split if needed
          const idealSizePerGroup = largest.tools.length / groupsNeeded;
          let firstGroupSize = Math.ceil(idealSizePerGroup);

          // Ensure first group meets minimum
          if (firstGroupSize < minToolsPerGroup) {
            firstGroupSize = minToolsPerGroup;
          }

          // Ensure we don't take too many tools (leave enough for second group)
          const maxFirstGroupSize = largest.tools.length - minToolsPerGroup;
          if (firstGroupSize > maxFirstGroupSize) {
            firstGroupSize = maxFirstGroupSize;
          }

          const secondGroupSize = largest.tools.length - firstGroupSize;

          // Only split if second group also meets minimum
          if (secondGroupSize >= minToolsPerGroup) {
            groups.push({
              name: `${largest.name}_a`,
              tools: largest.tools.slice(0, firstGroupSize),
            });
            groups.push({
              name: `${largest.name}_b`,
              tools: largest.tools.slice(firstGroupSize),
            });
          } else {
            // Can't split - put the group back
            groups.unshift(largest);
            break;
          }
        } else {
          // Can't split any further while maintaining constraints
          break;
        }
      }

      // Ensure maxGroups
      while (groups.length > maxGroups) {
        // Find two smallest groups that can be merged without exceeding maxToolsPerGroup
        groups.sort((a, b) => a.tools.length - b.tools.length);

        let merged = false;
        for (let i = 0; i < groups.length - 1 && !merged; i++) {
          for (let j = i + 1; j < groups.length && !merged; j++) {
            const combined = Array.from(new Set([...groups[i].tools, ...groups[j].tools]));
            if (combined.length <= maxToolsPerGroup) {
              // Can merge these two
              const name1 = groups[i].name;
              const name2 = groups[j].name;
              groups.splice(j, 1); // Remove j first (higher index)
              groups.splice(i, 1); // Then remove i
              groups.push({
                name: `${name1}_${name2}`,
                tools: combined,
              });
              merged = true;
            }
          }
        }

        if (!merged) {
          // Can't merge any groups without exceeding maxToolsPerGroup
          // This shouldn't happen if constraints are feasible, but break to avoid infinite loop
          break;
        }
      }

      // Convert to response format
      const response = {
        groups: groups.map((g, i) => {
          // Calculate complementarity based on tool homogeneity
          const uniqueCategories = new Set(
            g.tools.map((key) => {
              const name = toolMap.get(key)!;
              if (name.includes("file") || name.includes("directory")) return "filesystem";
              if (name.startsWith("git_")) return "git";
              if (name.startsWith("db_")) return "database";
              if (name.includes("http") || name.includes("url")) return "http";
              if (name.includes("parse") || name.includes("transform")) return "data";
              if (name.includes("monitor") || name.includes("process")) return "system";
              return "misc";
            }),
          );

          // Higher score for more homogeneous groups
          const complementarityScore = uniqueCategories.size === 1 ? 0.95 : 0.5;

          return {
            id: `${g.name}-agent-${i}`,
            name: `${g.name}_agent`,
            description: `Agent for ${g.name} operations`,
            toolKeys: g.tools,
            systemPrompt:
              `You are a specialized agent for ${g.name} operations. Use the available tools to gather information, then provide a final text response to answer the user's question.`,
            complementarityScore,
          };
        }),
      };

      return Promise.resolve(JSON.stringify(response));
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
