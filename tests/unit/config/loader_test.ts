import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { afterEach, describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { loadConfig, saveConfig } from "../../../src/config/loader.ts";
import type { Configuration } from "../../../src/types/index.ts";

describe("Config Loader", () => {
  const testConfigPath = "./test-config.json";
  const validConfig: Configuration = {
    version: "1.0.0",
    mcpServers: [
      {
        name: "test-server",
        transport: "stdio",
        command: "test-mcp-server",
        args: ["--test"],
      },
    ],
    llmProvider: {
      type: "anthropic",
    },
  };

  afterEach(async () => {
    // Clean up test config file
    try {
      await Deno.remove(testConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("loadConfig", () => {
    it("should load a valid configuration file", async () => {
      // Arrange
      await Deno.writeTextFile(testConfigPath, JSON.stringify(validConfig, null, 2));

      // Act
      const config = await loadConfig(testConfigPath);

      // Assert
      assertEquals(config.version, "1.0.0");
      assertEquals(config.mcpServers.length, 1);
      assertEquals(config.mcpServers[0].name, "test-server");
      assertEquals(config.llmProvider.type, "anthropic");
    });

    it("should throw error when file does not exist", async () => {
      // Act & Assert
      await assertRejects(
        async () => await loadConfig("./non-existent.json"),
        Error,
        "not found",
      );
    });

    it("should throw error when file contains invalid JSON", async () => {
      // Arrange
      await Deno.writeTextFile(testConfigPath, "{ invalid json }");

      // Act & Assert
      await assertRejects(
        async () => await loadConfig(testConfigPath),
        Error,
        "Invalid JSON",
      );
    });

    it("should load config with optional fields", async () => {
      // Arrange
      const configWithOptionals: Configuration = {
        ...validConfig,
        projectContext: {
          domain: "web-development",
          customHints: ["Group by functionality"],
        },
        groupingConstraints: {
          minToolsPerGroup: 3,
          maxToolsPerGroup: 15,
          minGroups: 2,
          maxGroups: 8,
        },
      };
      await Deno.writeTextFile(testConfigPath, JSON.stringify(configWithOptionals, null, 2));

      // Act
      const config = await loadConfig(testConfigPath);

      // Assert
      assertEquals(config.projectContext?.domain, "web-development");
      assertEquals(config.groupingConstraints?.minToolsPerGroup, 3);
    });

    it("should handle different MCP transport types", async () => {
      // Arrange
      const httpConfig: Configuration = {
        version: "1.0.0",
        mcpServers: [
          {
            name: "http-server",
            transport: "http",
            url: "http://localhost:3000",
          },
        ],
        llmProvider: {
          type: "openai",
        },
      };
      await Deno.writeTextFile(testConfigPath, JSON.stringify(httpConfig, null, 2));

      // Act
      const config = await loadConfig(testConfigPath);

      // Assert
      assertEquals(config.mcpServers[0].transport, "http");
      assertEquals(config.mcpServers[0].url, "http://localhost:3000");
    });
  });

  describe("saveConfig", () => {
    it("should save a valid configuration to file", async () => {
      // Act
      await saveConfig(testConfigPath, validConfig);

      // Assert
      const fileContent = await Deno.readTextFile(testConfigPath);
      const savedConfig = JSON.parse(fileContent);
      assertEquals(savedConfig.version, "1.0.0");
      assertEquals(savedConfig.mcpServers.length, 1);
    });

    it("should overwrite existing configuration file", async () => {
      // Arrange
      await Deno.writeTextFile(testConfigPath, '{"old": "config"}');

      // Act
      await saveConfig(testConfigPath, validConfig);

      // Assert
      const fileContent = await Deno.readTextFile(testConfigPath);
      const savedConfig = JSON.parse(fileContent);
      assertEquals(savedConfig.version, "1.0.0");
    });

    it("should format JSON with proper indentation", async () => {
      // Act
      await saveConfig(testConfigPath, validConfig);

      // Assert
      const fileContent = await Deno.readTextFile(testConfigPath);
      assertEquals(fileContent.includes("\n  "), true, "Should have proper indentation");
    });

    it("should create parent directories if they don't exist", async () => {
      // Arrange
      const nestedPath = "./test-nested/config/tamamo-x.config.json";

      // Act
      await saveConfig(nestedPath, validConfig);

      // Assert
      const fileContent = await Deno.readTextFile(nestedPath);
      const savedConfig = JSON.parse(fileContent);
      assertEquals(savedConfig.version, "1.0.0");

      // Cleanup
      await Deno.remove("./test-nested", { recursive: true });
    });
  });
});
