import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it, beforeEach, afterEach } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { showHelp, showVersion, main } from "../../../src/cli/main.ts";

/**
 * Unit tests for CLI main entry point
 * Tests argument parsing and command routing
 */

describe("CLI Main", () => {
  describe("showVersion", () => {
    it("should display version information", () => {
      // Capture console output
      const originalLog = console.log;
      let output = "";
      console.log = (msg: string) => {
        output += msg;
      };

      try {
        showVersion();
        assertStringIncludes(output, "tamamo-x-mcp");
        assertStringIncludes(output, "1.0.0");
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("showHelp", () => {
    it("should display help message with available commands", () => {
      // Capture console output
      const originalLog = console.log;
      let output = "";
      console.log = (msg: string) => {
        output += msg;
      };

      try {
        showHelp();
        assertStringIncludes(output, "tamamo-x-mcp");
        assertStringIncludes(output, "init");
        assertStringIncludes(output, "build");
        assertStringIncludes(output, "mcp");
        assertStringIncludes(output, "USAGE");
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("Command routing", () => {
    let originalExit: typeof Deno.exit;
    let originalError: typeof console.error;
    let exitCode: number | undefined;
    let errorOutput: string[];

    beforeEach(() => {
      // Stub Deno.exit to capture exit codes
      originalExit = Deno.exit;
      exitCode = undefined;
      Deno.exit = ((code?: number) => {
        exitCode = code ?? 0;
        throw new Error(`EXIT_${code ?? 0}`); // Throw to stop execution
      }) as typeof Deno.exit;

      // Capture console.error output
      originalError = console.error;
      errorOutput = [];
      console.error = (...args: unknown[]) => {
        errorOutput.push(args.join(" "));
      };
    });

    afterEach(() => {
      Deno.exit = originalExit;
      console.error = originalError;
    });

    it("should route to init command", async () => {
      // Use a temporary directory to verify init actually runs
      const tempDir = await Deno.makeTempDir({ prefix: "cli_test_" });
      const originalCwd = Deno.cwd();

      try {
        // Change to temp directory so init creates config there
        Deno.chdir(tempDir);

        await main(["init"]);

        // Verify init actually ran by checking for created config
        const configPath = `${tempDir}/tamamo-x.config.json`;
        const configExists = await Deno.stat(configPath)
          .then(() => true)
          .catch(() => false);

        assertEquals(configExists, true, "Init should create tamamo-x.config.json");
        assertEquals(exitCode, undefined, "Should not exit when init succeeds");
      } finally {
        // Restore original working directory
        Deno.chdir(originalCwd);

        // Cleanup
        try {
          await Deno.remove(tempDir, { recursive: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it("should exit with error for unimplemented build command", async () => {
      try {
        await main(["build"]);
        assertEquals(true, false, "Should have exited");
      } catch (error) {
        assertEquals((error as Error).message, "EXIT_1");
        assertEquals(exitCode, 1);
        assertStringIncludes(errorOutput.join("\n"), "not yet implemented");
      }
    });

    it("should exit with error for unimplemented mcp command", async () => {
      try {
        await main(["mcp"]);
        assertEquals(true, false, "Should have exited");
      } catch (error) {
        assertEquals((error as Error).message, "EXIT_1");
        assertEquals(exitCode, 1);
        assertStringIncludes(errorOutput.join("\n"), "not yet implemented");
      }
    });

    it("should exit with error for unknown command", async () => {
      try {
        await main(["unknown-command"]);
        assertEquals(true, false, "Should have exited");
      } catch (error) {
        assertEquals((error as Error).message, "EXIT_1");
        assertEquals(exitCode, 1);
        assertStringIncludes(errorOutput.join("\n"), "Unknown command");
      }
    });

    it("should show help when no command is provided", async () => {
      try {
        await main([]);
        assertEquals(true, false, "Should have exited");
      } catch (error) {
        assertEquals((error as Error).message, "EXIT_1");
        assertEquals(exitCode, 1);
        assertStringIncludes(errorOutput.join("\n"), "No command specified");
      }
    });

    it("should show help for help command", async () => {
      await main(["help"]);
      assertEquals(exitCode, undefined, "Should not exit for help command");
    });

    it("should show version for --version flag", async () => {
      await main(["--version"]);
      assertEquals(exitCode, undefined, "Should not exit for version flag");
    });

    it("should show help for --help flag", async () => {
      await main(["--help"]);
      assertEquals(exitCode, undefined, "Should not exit for help flag");
    });
  });
});
