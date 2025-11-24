import {
  assertEquals,
  assertExists,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { extractJsonFromText, toJsonSchema7 } from "../../../src/llm/utils.ts";
import type { JSONSchema } from "../../../src/types/index.ts";

/**
 * Unit tests for LLM utility functions (src/llm/utils.ts)
 * Tests JSON extraction and schema conversion utilities
 */

describe("LLM Utilities", () => {
  describe("extractJsonFromText", () => {
    it("should extract plain JSON object", () => {
      const input = '{"key": "value", "number": 42}';
      const result = extractJsonFromText(input, "TestProvider");
      assertEquals(result, input);
    });

    it("should remove markdown code fences (json)", () => {
      const input = '```json\n{"key": "value"}\n```';
      const result = extractJsonFromText(input, "TestProvider");
      assertEquals(result, '{"key": "value"}');
    });

    it("should remove markdown code fences (no language)", () => {
      const input = '```\n{"key": "value"}\n```';
      const result = extractJsonFromText(input, "TestProvider");
      assertEquals(result, '{"key": "value"}');
    });

    it("should extract JSON from text with leading/trailing content", () => {
      const input = 'Here is the JSON:\n{"key": "value"}\nEnd of JSON';
      const result = extractJsonFromText(input, "TestProvider");
      assertEquals(result, '{"key": "value"}');
    });

    it("should handle nested objects", () => {
      const input = '{"outer": {"inner": {"deep": "value"}}}';
      const result = extractJsonFromText(input, "TestProvider");
      assertEquals(result, input);
    });

    it("should handle arrays", () => {
      const input = '{"items": [1, 2, 3], "nested": [{"a": 1}, {"b": 2}]}';
      const result = extractJsonFromText(input, "TestProvider");
      assertEquals(result, input);
    });

    it("should trim whitespace", () => {
      const input = '   \n  {"key": "value"}  \n  ';
      const result = extractJsonFromText(input, "TestProvider");
      assertEquals(result, '{"key": "value"}');
    });

    it("should throw error for invalid JSON", () => {
      const input = '{"invalid": json}';
      assertThrows(
        () => extractJsonFromText(input, "TestProvider"),
        Error,
        "TestProvider provider: Failed to generate valid JSON",
      );
    });

    it("should throw error with parse details", () => {
      const input = '{"unclosed": "string';
      assertThrows(
        () => extractJsonFromText(input, "TestProvider"),
        Error,
        "Parse error:",
      );
    });

    it("should include response preview in error", () => {
      const input = '{"invalid": json}';
      assertThrows(
        () => extractJsonFromText(input, "TestProvider"),
        Error,
        "Response was:",
      );
    });

    it("should handle complex real-world scenario", () => {
      const input = `
Here's the response you requested:

\`\`\`json
{
  "groups": [
    {
      "id": "g1",
      "name": "Group 1",
      "tools": ["tool1", "tool2"]
    }
  ]
}
\`\`\`

Hope this helps!
      `.trim();

      const result = extractJsonFromText(input, "TestProvider");
      const parsed = JSON.parse(result);
      assertEquals(parsed.groups.length, 1);
      assertEquals(parsed.groups[0].id, "g1");
    });
  });

  describe("toJsonSchema7", () => {
    it("should convert simple schema", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      };

      const result = toJsonSchema7(schema);
      assertExists(result);
      assertEquals(result.type, "object");
    });

    it("should preserve nested properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
            },
          },
        },
      };

      const result = toJsonSchema7(schema);
      assertExists(result);
      assertExists(result.properties);
    });

    it("should handle schemas with array properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
              },
            },
          },
        },
      };

      const result = toJsonSchema7(schema);
      assertExists(result);
      assertEquals(result.type, "object");
    });
  });
});
