import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { validateConfig } from "../../../src/config/validator.ts";
import type { Configuration } from "../../../src/types/index.ts";

describe("Config Validator", () => {
  const validConfig: Configuration = {
    version: "1.0.0",
    mcpServers: [
      {
        name: "test-server",
        transport: "stdio",
        command: "test-mcp-server",
      },
    ],
    llmProvider: {
      type: "anthropic",
    },
  };

  describe("Configuration validation", () => {
    it("should validate a valid configuration", () => {
      // Act
      const result = validateConfig(validConfig);

      // Assert
      assertEquals(result.valid, true);
      assertEquals(result.errors.length, 0);
    });

    it("should reject configuration without version", () => {
      // Arrange
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as { version?: string }).version;

      // Act
      const result = validateConfig(invalidConfig as Configuration);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field === "version"),
        true,
      );
    });

    it("should reject configuration with unsupported version", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        version: "banana",
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field === "version" && e.message.includes("supported")),
        true,
      );
    });

    it("should reject configuration without MCP servers", () => {
      // Arrange
      const invalidConfig = { ...validConfig, mcpServers: [] };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field === "mcpServers"),
        true,
      );
    });

    it("should reject configuration without LLM provider", () => {
      // Arrange
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as { llmProvider?: unknown }).llmProvider;

      // Act
      const result = validateConfig(invalidConfig as Configuration);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field === "llmProvider"),
        true,
      );
    });
  });

  describe("MCPServerConfig validation", () => {
    it("should reject non-object MCP server entry", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          null as never, // null entry
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) =>
          e.field.includes("mcpServers[0]") && e.message.includes("object")
        ),
        true,
      );
    });

    it("should reject string MCP server entry", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          "not-an-object" as never, // string entry
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) =>
          e.field.includes("mcpServers[0]") && e.message.includes("object")
        ),
        true,
      );
    });

    it("should reject array MCP server entry", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          ["array", "entry"] as never, // array entry
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) =>
          e.field.includes("mcpServers[0]") && e.message.includes("object")
        ),
        true,
      );
    });

    it("should reject server without name", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          {
            transport: "stdio",
            command: "test-server",
          } as never,
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("name")),
        true,
      );
    });

    it("should reject server with empty name", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          {
            name: "",
            transport: "stdio",
            command: "test-server",
          },
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("name")),
        true,
      );
    });

    it("should reject server with invalid transport", () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        mcpServers: [
          {
            name: "test-server",
            transport: "ftp",
          },
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("transport")),
        true,
      );
    });

    it("should reject server without transport", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          {
            name: "test-server",
            command: "test-command",
          } as never,
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("transport")),
        true,
      );
    });

    it("should require 'command' field when transport is stdio", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          {
            name: "stdio-server",
            transport: "stdio",
            // Missing 'command' field
          } as never,
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("command")),
        true,
      );
    });

    it("should require 'url' field when transport is http", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          {
            name: "http-server",
            transport: "http",
            // Missing 'url' field
          } as never,
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("url")),
        true,
      );
    });

    it("should require 'url' field when transport is websocket", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          {
            name: "ws-server",
            transport: "websocket",
            // Missing 'url' field
          } as never,
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("url")),
        true,
      );
    });

    it("should reject duplicate MCP server names", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          {
            name: "duplicate",
            transport: "stdio",
            command: "server1",
          },
          {
            name: "duplicate",
            transport: "stdio",
            command: "server2",
          },
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.message.includes("duplicate") || e.message.includes("unique")),
        true,
      );
    });

    it("should reject duplicate MCP server names after trimming", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          {
            name: "foo",
            transport: "stdio",
            command: "server1",
          },
          {
            name: "foo ",
            transport: "stdio",
            command: "server2",
          },
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.message.includes("duplicate") || e.message.includes("unique")),
        true,
      );
    });

    it("should validate valid URL format for http/websocket transports", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        mcpServers: [
          {
            name: "invalid-url-server",
            transport: "http",
            url: "not-a-valid-url",
          },
        ],
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("url")),
        true,
      );
    });
  });

  describe("LLMProviderConfig validation", () => {
    it("should validate supported LLM provider types", () => {
      // Arrange - Standard API-based providers
      const standardProviders: Array<
        "anthropic" | "openai" | "gemini" | "vercel" | "bedrock" | "openrouter"
      > = [
        "anthropic",
        "openai",
        "gemini",
        "vercel",
        "bedrock",
        "openrouter",
      ];

      // Act & Assert - Standard providers
      standardProviders.forEach((type) => {
        const config: Configuration = {
          ...validConfig,
          llmProvider: {
            type,
          },
        };
        const result = validateConfig(config);
        assertEquals(result.valid, true, `Provider ${type} should be valid`);
      });

      // Act & Assert - ACP provider (different structure)
      const acpConfig: Configuration = {
        ...validConfig,
        llmProvider: {
          type: "acp",
          agentCommand: "/path/to/agent",
        },
      };
      const acpResult = validateConfig(acpConfig);
      assertEquals(acpResult.valid, true, "ACP provider should be valid");
    });

    it("should reject invalid LLM provider type", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        llmProvider: {
          type: "invalid-provider" as never,
        },
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("type")),
        true,
      );
    });

    it("should handle llmProvider as non-object without throwing", () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        llmProvider: "anthropic" as never,
      };

      // Act & Assert - should not throw TypeError
      const result = validateConfig(invalidConfig as Configuration);
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field === "llmProvider"),
        true,
      );
    });

    it("should validate ACP provider with required agentCommand", () => {
      // Arrange
      const acpConfig: Configuration = {
        ...validConfig,
        llmProvider: {
          type: "acp",
          agentCommand: "/usr/bin/gemini",
        },
      };

      // Act
      const result = validateConfig(acpConfig);

      // Assert
      assertEquals(result.valid, true, "ACP provider with agentCommand should be valid");
    });

    it("should validate ACP provider with optional agentArgs and model", () => {
      // Arrange
      const acpConfig: Configuration = {
        ...validConfig,
        llmProvider: {
          type: "acp",
          agentCommand: "/usr/bin/gemini",
          agentArgs: ["--model", "gemini-2.0-flash"],
          model: "gemini-2.0-flash",
        },
      };

      // Act
      const result = validateConfig(acpConfig);

      // Assert
      assertEquals(result.valid, true, "ACP provider with full config should be valid");
    });

    it("should reject ACP provider without agentCommand", () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        llmProvider: {
          type: "acp",
          // Missing agentCommand
        } as never,
      };

      // Act
      const result = validateConfig(invalidConfig as Configuration);

      // Assert
      assertEquals(result.valid, false, "ACP provider without agentCommand should be invalid");
      assertEquals(
        result.errors.some((e) => e.field.includes("agentCommand")),
        true,
        "Should have agentCommand error",
      );
    });

    it("should reject ACP provider with empty agentCommand", () => {
      // Arrange
      const invalidConfig: Configuration = {
        ...validConfig,
        llmProvider: {
          type: "acp",
          agentCommand: "",
        },
      };

      // Act
      const result = validateConfig(invalidConfig);

      // Assert
      assertEquals(result.valid, false, "ACP provider with empty agentCommand should be invalid");
      assertEquals(
        result.errors.some((e) => e.message.includes("Agent command is required")),
        true,
        "Should have 'Agent command is required' error",
      );
    });
  });

  describe("GroupingConstraints validation", () => {
    it("should validate valid grouping constraints", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        groupingConstraints: {
          minToolsPerGroup: 3,
          maxToolsPerGroup: 15,
          minGroups: 2,
          maxGroups: 8,
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, true);
    });

    it("should reject when minToolsPerGroup < 1", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        groupingConstraints: {
          minToolsPerGroup: 0,
          maxToolsPerGroup: 15,
          minGroups: 2,
          maxGroups: 8,
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("minToolsPerGroup")),
        true,
      );
    });

    it("should reject when maxToolsPerGroup < minToolsPerGroup", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        groupingConstraints: {
          minToolsPerGroup: 10,
          maxToolsPerGroup: 5,
          minGroups: 2,
          maxGroups: 8,
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) =>
          e.message.includes("maxToolsPerGroup") || e.message.includes("greater")
        ),
        true,
      );
    });

    it("should reject when minGroups < 1", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        groupingConstraints: {
          minToolsPerGroup: 3,
          maxToolsPerGroup: 15,
          minGroups: 0,
          maxGroups: 8,
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("minGroups")),
        true,
      );
    });

    it("should reject when maxGroups < minGroups", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        groupingConstraints: {
          minToolsPerGroup: 3,
          maxToolsPerGroup: 15,
          minGroups: 10,
          maxGroups: 5,
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.message.includes("maxGroups") || e.message.includes("greater")),
        true,
      );
    });
  });

  describe("ProjectContext validation", () => {
    it("should validate config with valid project context", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        projectContext: {
          // Use actual existing files in the project
          claudeFilePath: "CLAUDE.md",
          domain: "web-development",
          customHints: ["Group by feature"],
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, true);
    });

    it("should reject config with non-existent file paths", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        projectContext: {
          agentFilePath: "./non-existent-file.md",
          domain: "web-development",
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("agentFilePath")),
        true,
      );
    });

    it("should validate config without optional project context", () => {
      // Arrange
      const config: Configuration = validConfig;

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, true);
    });

    it("should reject customHints with non-string elements", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        projectContext: {
          customHints: ["valid string", 123 as never, "another string"],
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("customHints[1]")),
        true,
      );
    });

    it("should reject customHints with null elements", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        projectContext: {
          customHints: ["valid string", null as never],
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("customHints[1]")),
        true,
      );
    });

    it("should reject customHints with object elements", () => {
      // Arrange
      const config: Configuration = {
        ...validConfig,
        projectContext: {
          customHints: ["valid string", { foo: "bar" } as never],
        },
      };

      // Act
      const result = validateConfig(config);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.field.includes("customHints[1]")),
        true,
      );
    });
  });

  describe("Security validation", () => {
    it("should reject config with credential fields (security requirement)", () => {
      // Arrange
      const configWithCredentials = {
        ...validConfig,
        llmProvider: {
          ...validConfig.llmProvider,
          apiKey: "sk-secret-key", // Should never be stored
        },
      };

      // Act
      const result = validateConfig(configWithCredentials as Configuration);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.message.includes("credential") || e.message.includes("apiKey")),
        true,
      );
    });

    it("should reject config with password fields", () => {
      // Arrange
      const configWithPassword = {
        ...validConfig,
        mcpServers: [
          {
            ...validConfig.mcpServers[0],
            password: "secret-password",
          },
        ],
      };

      // Act
      const result = validateConfig(configWithPassword as Configuration);

      // Assert
      assertEquals(result.valid, false);
      assertEquals(
        result.errors.some((e) => e.message.includes("password") || e.message.includes("secret")),
        true,
      );
    });
  });
});
