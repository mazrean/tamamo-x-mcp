import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { afterEach, beforeEach, describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import {
  discoverBedrockCredentials,
  discoverCredentials,
  validateConfigSecurity,
} from "../../../src/llm/credentials.ts";

/**
 * Unit tests for credential discovery (src/llm/credentials.ts)
 *
 * Tests credential discovery from:
 * - Claude Code: ~/.config/claude/credentials.json
 * - Codex (OpenAI): ~/.config/openai/config.json or OPENAI_API_KEY env var
 * - Gemini CLI: ~/.config/gcloud/application_default_credentials.json or GOOGLE_API_KEY env var
 * - Environment variables (fallback)
 * - Interactive prompt (if not found)
 *
 * Security: Ensures no credentials are stored in tamamo-x.config.json
 */

describe("Credential Discovery", () => {
  let tempHomeDir: string;
  let originalEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    // Create temporary home directory
    tempHomeDir = await Deno.makeTempDir({ prefix: "tamamo_x_home_" });

    // Save original env vars
    originalEnv = {
      ANTHROPIC_API_KEY: Deno.env.get("ANTHROPIC_API_KEY"),
      OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY"),
      GOOGLE_API_KEY: Deno.env.get("GOOGLE_API_KEY"),
      AWS_ACCESS_KEY_ID: Deno.env.get("AWS_ACCESS_KEY_ID"),
      AWS_SECRET_ACCESS_KEY: Deno.env.get("AWS_SECRET_ACCESS_KEY"),
      AWS_REGION: Deno.env.get("AWS_REGION"),
      TAMAMO_X_ANTHROPIC_API_KEY: Deno.env.get("TAMAMO_X_ANTHROPIC_API_KEY"),
      TAMAMO_X_OPENAI_API_KEY: Deno.env.get("TAMAMO_X_OPENAI_API_KEY"),
      TAMAMO_X_GOOGLE_API_KEY: Deno.env.get("TAMAMO_X_GOOGLE_API_KEY"),
      TAMAMO_X_AWS_ACCESS_KEY_ID: Deno.env.get("TAMAMO_X_AWS_ACCESS_KEY_ID"),
      TAMAMO_X_AWS_SECRET_ACCESS_KEY: Deno.env.get("TAMAMO_X_AWS_SECRET_ACCESS_KEY"),
      TAMAMO_X_AWS_REGION: Deno.env.get("TAMAMO_X_AWS_REGION"),
    };

    // Clear env vars for testing
    Deno.env.delete("ANTHROPIC_API_KEY");
    Deno.env.delete("OPENAI_API_KEY");
    Deno.env.delete("GOOGLE_API_KEY");
    Deno.env.delete("AWS_ACCESS_KEY_ID");
    Deno.env.delete("AWS_SECRET_ACCESS_KEY");
    Deno.env.delete("AWS_REGION");
    Deno.env.delete("TAMAMO_X_ANTHROPIC_API_KEY");
    Deno.env.delete("TAMAMO_X_OPENAI_API_KEY");
    Deno.env.delete("TAMAMO_X_GOOGLE_API_KEY");
    Deno.env.delete("TAMAMO_X_AWS_ACCESS_KEY_ID");
    Deno.env.delete("TAMAMO_X_AWS_SECRET_ACCESS_KEY");
    Deno.env.delete("TAMAMO_X_AWS_REGION");
  });

  afterEach(async () => {
    // Restore original env vars
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        Deno.env.set(key, value);
      } else {
        Deno.env.delete(key);
      }
    });

    // Clean up temp directory
    try {
      await Deno.remove(tempHomeDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Claude Code credentials", () => {
    it("should discover credentials from ~/.config/claude/credentials.json", async () => {
      // Arrange
      const claudeConfigDir = join(tempHomeDir, ".config", "claude");
      await Deno.mkdir(claudeConfigDir, { recursive: true });
      const credentialsPath = join(claudeConfigDir, "credentials.json");
      await Deno.writeTextFile(
        credentialsPath,
        JSON.stringify({ apiKey: "sk-ant-test-key-123" }, null, 2),
      );

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(apiKey, "sk-ant-test-key-123", "Should discover Claude Code API key");
    });

    it("should fallback to ANTHROPIC_API_KEY env var", async () => {
      // Arrange
      Deno.env.set("ANTHROPIC_API_KEY", "sk-ant-env-key-456");

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(apiKey, "sk-ant-env-key-456", "Should use env var fallback");
    });

    it("should handle missing Claude Code credentials file", async () => {
      // Arrange - no credentials file created

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(apiKey, null, "Should return null when credentials not found");
    });

    it("should handle malformed credentials.json", async () => {
      // Arrange
      const claudeConfigDir = join(tempHomeDir, ".config", "claude");
      await Deno.mkdir(claudeConfigDir, { recursive: true });
      const credentialsPath = join(claudeConfigDir, "credentials.json");
      await Deno.writeTextFile(credentialsPath, "{ invalid json");

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(apiKey, null, "Should handle malformed JSON gracefully");
    });
  });

  describe("OpenAI/Codex credentials", () => {
    it("should discover credentials from ~/.codex/auth.json", async () => {
      // Arrange
      const codexConfigDir = join(tempHomeDir, ".codex");
      await Deno.mkdir(codexConfigDir, { recursive: true });
      const authPath = join(codexConfigDir, "auth.json");
      await Deno.writeTextFile(
        authPath,
        JSON.stringify({ OPENAI_API_KEY: "sk-openai-test-key-789" }, null, 2),
      );

      // Act
      const apiKey = await discoverCredentials("openai", tempHomeDir);

      // Assert
      assertEquals(apiKey, "sk-openai-test-key-789", "Should discover OpenAI API key");
    });

    it("should fallback to OPENAI_API_KEY env var", async () => {
      // Arrange
      Deno.env.set("OPENAI_API_KEY", "sk-openai-env-key-abc");

      // Act
      const apiKey = await discoverCredentials("openai", tempHomeDir);

      // Assert
      assertEquals(apiKey, "sk-openai-env-key-abc", "Should use env var fallback");
    });

    it("should work for OpenRouter provider (OpenAI-compatible)", async () => {
      // Arrange
      Deno.env.set("OPENAI_API_KEY", "sk-or-test-key-xyz");

      // Act
      const apiKey = await discoverCredentials("openrouter", tempHomeDir);

      // Assert
      assertEquals(apiKey, "sk-or-test-key-xyz", "OpenRouter should use OPENAI_API_KEY");
    });
  });

  describe("Gemini credentials", () => {
    it("should discover credentials from gcloud config", async () => {
      // Arrange
      const gcloudConfigDir = join(tempHomeDir, ".config", "gcloud");
      await Deno.mkdir(gcloudConfigDir, { recursive: true });
      const credentialsPath = join(gcloudConfigDir, "application_default_credentials.json");
      await Deno.writeTextFile(
        credentialsPath,
        JSON.stringify({ api_key: "AIza-gemini-api-key-123" }, null, 2),
      );

      // Act
      const apiKey = await discoverCredentials("gemini", tempHomeDir);

      // Assert
      assertExists(apiKey, "Should discover Gemini credentials");
      assertEquals(apiKey, "AIza-gemini-api-key-123", "Should return api_key from gcloud config");
    });

    it("should fallback to GOOGLE_API_KEY env var", async () => {
      // Arrange
      Deno.env.set("GOOGLE_API_KEY", "AIzaSy-gemini-key-123");

      // Act
      const apiKey = await discoverCredentials("gemini", tempHomeDir);

      // Assert
      assertEquals(apiKey, "AIzaSy-gemini-key-123", "Should use env var fallback");
    });
  });

  describe("AWS Bedrock credentials", () => {
    it("should discover credentials from AWS env vars", async () => {
      // Arrange
      Deno.env.set("AWS_ACCESS_KEY_ID", "AKIA-test-access-key");
      Deno.env.set("AWS_SECRET_ACCESS_KEY", "aws-secret-key-xyz");
      Deno.env.set("AWS_REGION", "us-east-1");

      // Act
      const credentials = await discoverBedrockCredentials();

      // Assert
      assertExists(credentials, "Should discover AWS credentials");
      assertEquals(credentials.accessKeyId, "AKIA-test-access-key");
      assertEquals(credentials.secretAccessKey, "aws-secret-key-xyz");
      assertEquals(credentials.region, "us-east-1");
    });

    it("should handle missing AWS credentials", async () => {
      // Arrange - no AWS env vars set

      // Act
      const credentials = await discoverBedrockCredentials();

      // Assert
      assertEquals(credentials, null, "Should return null when AWS credentials not found");
    });

    it("should default to us-east-1 region if not specified", async () => {
      // Arrange
      Deno.env.set("AWS_ACCESS_KEY_ID", "AKIA-test-key");
      Deno.env.set("AWS_SECRET_ACCESS_KEY", "aws-secret");
      // AWS_REGION not set

      // Act
      const credentials = await discoverBedrockCredentials();

      // Assert
      assertExists(credentials);
      assertEquals(credentials.region, "us-east-1", "Should default to us-east-1");
    });
  });

  describe("Vercel AI credentials", () => {
    it("should require explicit API key configuration", async () => {
      // Arrange - Vercel AI doesn't have standard credential locations

      // Act
      const apiKey = await discoverCredentials("vercel", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        null,
        "Vercel AI should return null (requires user configuration)",
      );
    });
  });

  describe("Credential security", () => {
    it("should never store credentials in returned config", async () => {
      // Arrange
      const claudeConfigDir = join(tempHomeDir, ".config", "claude");
      await Deno.mkdir(claudeConfigDir, { recursive: true });
      const credentialsPath = join(claudeConfigDir, "credentials.json");
      await Deno.writeTextFile(
        credentialsPath,
        JSON.stringify({ apiKey: "sk-ant-secret-key" }, null, 2),
      );

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      // Credential should be returned but NEVER stored in config file
      assertExists(apiKey, "Should return discovered credential");
      // In actual implementation, ensure config validator rejects credentials
    });

    it("should validate that config schema rejects credential fields", () => {
      // Arrange
      const invalidConfig = {
        version: "1.0.0",
        mcpServers: [],
        llmProvider: {
          type: "anthropic",
          apiKey: "sk-ant-SHOULD-NOT-BE-HERE", // Invalid!
        },
      };

      // Act & Assert
      const isValid = validateConfigSecurity(invalidConfig);
      assertEquals(isValid, false, "Config with credentials should be rejected");
    });
  });

  describe("Prefixed environment variables", () => {
    it("should prefer TAMAMO_X_ANTHROPIC_API_KEY over ANTHROPIC_API_KEY", async () => {
      // Arrange
      Deno.env.set("TAMAMO_X_ANTHROPIC_API_KEY", "sk-ant-prefixed-key");
      Deno.env.set("ANTHROPIC_API_KEY", "sk-ant-standard-key");

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        "sk-ant-prefixed-key",
        "Should prefer TAMAMO_X_ prefixed env var",
      );
    });

    it("should fallback to ANTHROPIC_API_KEY when TAMAMO_X_ANTHROPIC_API_KEY not set", async () => {
      // Arrange
      Deno.env.set("ANTHROPIC_API_KEY", "sk-ant-standard-key");

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        "sk-ant-standard-key",
        "Should fallback to standard env var",
      );
    });

    it("should prefer TAMAMO_X_OPENAI_API_KEY over OPENAI_API_KEY", async () => {
      // Arrange
      Deno.env.set("TAMAMO_X_OPENAI_API_KEY", "sk-openai-prefixed-key");
      Deno.env.set("OPENAI_API_KEY", "sk-openai-standard-key");

      // Act
      const apiKey = await discoverCredentials("openai", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        "sk-openai-prefixed-key",
        "Should prefer TAMAMO_X_ prefixed env var",
      );
    });

    it("should prefer TAMAMO_X_GOOGLE_API_KEY over GOOGLE_API_KEY", async () => {
      // Arrange
      Deno.env.set("TAMAMO_X_GOOGLE_API_KEY", "AIza-prefixed-key");
      Deno.env.set("GOOGLE_API_KEY", "AIza-standard-key");

      // Act
      const apiKey = await discoverCredentials("gemini", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        "AIza-prefixed-key",
        "Should prefer TAMAMO_X_ prefixed env var",
      );
    });

    it("should prefer TAMAMO_X_AWS_* over AWS_* for Bedrock credentials", async () => {
      // Arrange
      Deno.env.set("TAMAMO_X_AWS_ACCESS_KEY_ID", "AKIA-prefixed-key");
      Deno.env.set("TAMAMO_X_AWS_SECRET_ACCESS_KEY", "secret-prefixed-key");
      Deno.env.set("TAMAMO_X_AWS_REGION", "ap-northeast-1");
      Deno.env.set("AWS_ACCESS_KEY_ID", "AKIA-standard-key");
      Deno.env.set("AWS_SECRET_ACCESS_KEY", "secret-standard-key");
      Deno.env.set("AWS_REGION", "us-east-1");

      // Act
      const credentials = await discoverBedrockCredentials();

      // Assert
      assertExists(credentials);
      assertEquals(
        credentials.accessKeyId,
        "AKIA-prefixed-key",
        "Should prefer TAMAMO_X_AWS_ACCESS_KEY_ID",
      );
      assertEquals(
        credentials.secretAccessKey,
        "secret-prefixed-key",
        "Should prefer TAMAMO_X_AWS_SECRET_ACCESS_KEY",
      );
      assertEquals(
        credentials.region,
        "ap-northeast-1",
        "Should prefer TAMAMO_X_AWS_REGION",
      );
    });

    it("should ignore empty or whitespace-only TAMAMO_X_ values and fallback", async () => {
      // Arrange - Set prefixed env var to empty/whitespace
      Deno.env.set("TAMAMO_X_ANTHROPIC_API_KEY", "   ");
      Deno.env.set("ANTHROPIC_API_KEY", "sk-ant-standard-key");

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        "sk-ant-standard-key",
        "Should fallback to standard env var when prefixed is whitespace-only",
      );
    });

    it("should ignore empty TAMAMO_X_ values and fallback to standard env var", async () => {
      // Arrange
      Deno.env.set("TAMAMO_X_OPENAI_API_KEY", "");
      Deno.env.set("OPENAI_API_KEY", "sk-openai-standard-key");

      // Act
      const apiKey = await discoverCredentials("openai", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        "sk-openai-standard-key",
        "Should fallback to standard env var when prefixed is empty",
      );
    });

    it("should prefer prefixed env vars over CLI tool credentials", async () => {
      // Arrange
      const claudeConfigDir = join(tempHomeDir, ".config", "claude");
      await Deno.mkdir(claudeConfigDir, { recursive: true });
      const credentialsPath = join(claudeConfigDir, "credentials.json");
      await Deno.writeTextFile(
        credentialsPath,
        JSON.stringify({ apiKey: "sk-ant-cli-key" }, null, 2),
      );
      Deno.env.set("TAMAMO_X_ANTHROPIC_API_KEY", "sk-ant-prefixed-key");
      Deno.env.set("ANTHROPIC_API_KEY", "sk-ant-standard-key");

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        "sk-ant-prefixed-key",
        "Prefixed env var should take highest precedence",
      );
    });
  });

  describe("Credential precedence", () => {
    it("should prefer env vars over CLI tool credentials", async () => {
      // Arrange
      const claudeConfigDir = join(tempHomeDir, ".config", "claude");
      await Deno.mkdir(claudeConfigDir, { recursive: true });
      const credentialsPath = join(claudeConfigDir, "credentials.json");
      await Deno.writeTextFile(
        credentialsPath,
        JSON.stringify({ apiKey: "sk-ant-cli-key" }, null, 2),
      );
      Deno.env.set("ANTHROPIC_API_KEY", "sk-ant-env-key");

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        "sk-ant-env-key",
        "Environment variable should take precedence over CLI tool credentials",
      );
    });

    it("should use CLI tool credentials when env vars not found", async () => {
      // Arrange
      const codexConfigDir = join(tempHomeDir, ".codex");
      await Deno.mkdir(codexConfigDir, { recursive: true });
      const authPath = join(codexConfigDir, "auth.json");
      await Deno.writeTextFile(
        authPath,
        JSON.stringify({ OPENAI_API_KEY: "sk-openai-cli-key" }, null, 2),
      );

      // Act
      const apiKey = await discoverCredentials("openai", tempHomeDir);

      // Assert
      assertEquals(
        apiKey,
        "sk-openai-cli-key",
        "Should fallback to CLI tool credentials when env var not found",
      );
    });
  });

  describe("Error handling", () => {
    it("should handle permission errors reading credential files", async () => {
      // Skip on Windows and macOS where chmod doesn't reliably work
      if (Deno.build.os === "windows" || Deno.build.os === "darwin") {
        console.log("  Skipping permission test on", Deno.build.os);
        return;
      }

      // Arrange
      const claudeConfigDir = join(tempHomeDir, ".config", "claude");
      await Deno.mkdir(claudeConfigDir, { recursive: true });
      const credentialsPath = join(claudeConfigDir, "credentials.json");
      await Deno.writeTextFile(credentialsPath, JSON.stringify({ apiKey: "test" }));
      // Make file unreadable (Note: may not work on all systems)
      try {
        await Deno.chmod(credentialsPath, 0o000);
      } catch {
        // Skip test if chmod fails
        return;
      }

      // Act
      const apiKey = await discoverCredentials("anthropic", tempHomeDir);

      // Assert
      assertEquals(apiKey, null, "Should handle permission errors gracefully");

      // Cleanup
      await Deno.chmod(credentialsPath, 0o644);
    });

    it("should handle non-existent home directory", async () => {
      // Arrange
      const nonExistentHome = "/nonexistent/home/directory";

      // Act
      const apiKey = await discoverCredentials("anthropic", nonExistentHome);

      // Assert
      assertEquals(apiKey, null, "Should handle non-existent paths gracefully");
    });
  });
});
