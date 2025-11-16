import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { getToolSubset } from "../../fixtures/mock_tools.ts";
import type { LLMClient, ProjectContext, Tool } from "../../../src/types/index.ts";
import { analyzeTools } from "../../../src/grouping/analyzer.ts";

/**
 * Unit tests for grouping analyzer (src/grouping/analyzer.ts)
 *
 * The analyzer is responsible for:
 * 1. Batching tools for LLM analysis (10 tools per request)
 * 2. Sending tools to LLM for relationship analysis
 * 3. Extracting complementarity scores and grouping suggestions
 * 4. Using project context (Agent.md, CLAUDE.md) for domain-aware grouping
 */

// Mock LLM client that returns deterministic responses
function createMockLLMClient(): LLMClient {
  return {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    complete(prompt: string): Promise<string> {
      // Parse tool names from prompt (format: "1. tool_name: description")
      const toolMatches = prompt.matchAll(/\d+\.\s+([a-z_]+):/g);
      const tools = Array.from(toolMatches).map((match) => match[1]);

      // Group tools by their naming patterns
      const fileTools = tools.filter((t) => t.includes("file") || t.includes("directory"));
      const gitTools = tools.filter((t) => t.startsWith("git_"));
      const dbTools = tools.filter((t) => t.startsWith("db_"));
      const httpTools = tools.filter((t) => t.includes("http") || t.includes("url"));

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

      // Create relationships with scores based on tool proximity
      const relationships = [];
      for (let i = 0; i < tools.length - 1; i++) {
        const tool1 = tools[i];
        const tool2 = tools[i + 1];

        // High score for same category tools
        let score = 0.5;
        if (
          (tool1.includes("file") && tool2.includes("file")) ||
          (tool1.startsWith("git_") && tool2.startsWith("git_")) ||
          (tool1.startsWith("db_") && tool2.startsWith("db_"))
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

describe("Grouping Analyzer", () => {
  describe("Basic functionality", () => {
    it("should analyze tools and return relationships and suggestions", async () => {
      // Arrange
      const tools = getToolSubset(10);
      const llmClient = createMockLLMClient();

      // Act
      const result = await analyzeTools(tools, llmClient);

      // Assert
      assertExists(result.relationships, "Should have relationships");
      assertExists(result.suggestions, "Should have suggestions");
      assert(Array.isArray(result.relationships), "Relationships should be array");
      assert(Array.isArray(result.suggestions), "Suggestions should be array");
    });

    it("should handle empty tool list", async () => {
      // Arrange
      const tools: Tool[] = [];
      const llmClient = createMockLLMClient();

      // Act
      const result = await analyzeTools(tools, llmClient);

      // Assert
      assertEquals(result.relationships.length, 0, "Should have no relationships");
      assertEquals(result.suggestions.length, 0, "Should have no suggestions");
    });

    it("should handle single tool", async () => {
      // Arrange
      const tools = getToolSubset(1);
      const llmClient = createMockLLMClient();

      // Act
      const result = await analyzeTools(tools, llmClient);

      // Assert
      assertExists(result, "Should return result");
      assert(Array.isArray(result.relationships), "Should have relationships array");
      assert(Array.isArray(result.suggestions), "Should have suggestions array");
    });
  });

  describe("Batching behavior", () => {
    it("should process tools in batches", async () => {
      // Arrange
      const tools = getToolSubset(25); // Should create 3 batches (10, 10, 5)
      const llmClient = createMockLLMClient();

      // Act
      const result = await analyzeTools(tools, llmClient);

      // Assert
      assertExists(result.relationships, "Should aggregate results from all batches");
      assertExists(result.suggestions, "Should aggregate suggestions from all batches");
      assert(result.relationships.length > 0, "Should have relationships from multiple batches");
    });
  });

  describe("Relationship analysis", () => {
    it("should extract tool relationships from LLM response", async () => {
      // Arrange
      const tools = getToolSubset(10);
      const llmClient = createMockLLMClient();

      // Act
      const result = await analyzeTools(tools, llmClient);

      // Assert
      assert(result.relationships.length > 0, "Should have tool relationships");
      result.relationships.forEach((rel) => {
        assertExists(rel.tool1, "Relationship should have tool1");
        assertExists(rel.tool2, "Relationship should have tool2");
        assertExists(rel.score, "Relationship should have score");
        assert(
          rel.score >= 0 && rel.score <= 1,
          `Score should be in [0, 1], got ${rel.score}`,
        );
      });
    });
  });

  describe("Grouping suggestions", () => {
    it("should extract grouping suggestions from LLM response", async () => {
      // Arrange
      const tools = getToolSubset(10);
      const llmClient = createMockLLMClient();

      // Act
      const result = await analyzeTools(tools, llmClient);

      // Assert
      assert(result.suggestions.length > 0, "Should have grouping suggestions");
      result.suggestions.forEach((suggestion) => {
        assertExists(suggestion.name, "Suggestion should have name");
        assertExists(suggestion.tools, "Suggestion should have tools array");
        assertExists(suggestion.rationale, "Suggestion should have rationale");
        assert(Array.isArray(suggestion.tools), "Tools should be array");
      });
    });
  });

  describe("Project context integration", () => {
    it("should accept project context parameter", async () => {
      // Arrange
      const tools = getToolSubset(5);
      const llmClient = createMockLLMClient();
      const context: ProjectContext = {
        domain: "web-development",
        customHints: ["Separate database and HTTP operations"],
      };

      // Act
      const result = await analyzeTools(tools, llmClient, context);

      // Assert
      assertExists(result, "Should handle context parameter");
      assertExists(result.relationships, "Should have relationships");
      assertExists(result.suggestions, "Should have suggestions");
    });

    it("should work without project context", async () => {
      // Arrange
      const tools = getToolSubset(5);
      const llmClient = createMockLLMClient();

      // Act
      const result = await analyzeTools(tools, llmClient);

      // Assert
      assertExists(result, "Should work without context");
      assertExists(result.relationships, "Should have relationships");
      assertExists(result.suggestions, "Should have suggestions");
    });
  });

  describe("Error handling", () => {
    it("should handle malformed LLM responses gracefully", async () => {
      // Arrange
      const tools = getToolSubset(5);
      const malformedLLM: LLMClient = {
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        complete(): Promise<string> {
          return Promise.resolve("This is not valid JSON");
        },
      };

      // Act
      const result = await analyzeTools(tools, malformedLLM);

      // Assert
      // Should return empty results instead of throwing
      assertEquals(result.relationships.length, 0, "Should have empty relationships");
      assertEquals(result.suggestions.length, 0, "Should have empty suggestions");
    });
  });
});
