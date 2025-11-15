/**
 * Distribution Validation Tests: Deno Binary
 *
 * Tests that the Deno standalone binary works correctly for all commands
 * (init, build, mcp) with no runtime dependencies required.
 *
 * Phase 7 (User Story 5): T058
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";
import { join } from "jsr:@std/path@^1.0.0";

const DIST_DIR = join(Deno.cwd(), "dist");
const BINARY_PATH = join(DIST_DIR, Deno.build.os === "windows" ? "tamamo-x.exe" : "tamamo-x");

Deno.test("Deno binary - exists after compilation", async () => {
  try {
    const stat = await Deno.stat(BINARY_PATH);
    assertExists(stat);
    assertEquals(stat.isFile, true);
  } catch (error) {
    throw new Error(`Binary not found at ${BINARY_PATH}. Run 'deno task compile' first. ${error}`);
  }
});

Deno.test("Deno binary - shows version with --version flag", async () => {
  const command = new Deno.Command(BINARY_PATH, {
    args: ["--version"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout } = await command.output();
  const output = new TextDecoder().decode(stdout);

  assertEquals(code, 0, "Binary should exit with code 0 for --version");
  assertEquals(output.includes("tamamo-x"), true, "Version output should include 'tamamo-x'");
});

Deno.test("Deno binary - shows help with --help flag", async () => {
  const command = new Deno.Command(BINARY_PATH, {
    args: ["--help"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout } = await command.output();
  const output = new TextDecoder().decode(stdout);

  assertEquals(code, 0, "Binary should exit with code 0 for --help");
  assertEquals(output.includes("init"), true, "Help should mention 'init' command");
  assertEquals(output.includes("build"), true, "Help should mention 'build' command");
  assertEquals(output.includes("mcp"), true, "Help should mention 'mcp' command");
});

Deno.test("Deno binary - init command can be invoked", async () => {
  // Create temp directory for test
  const tempDir = await Deno.makeTempDir();

  try {
    const command = new Deno.Command(BINARY_PATH, {
      args: ["init", "--help"],
      cwd: tempDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();
    const output = new TextDecoder().decode(stdout);

    assertEquals(code, 0, "Binary init command should be invokable");
    assertEquals(output.includes("init") || output.includes("Initialize"), true, "Init help should be shown");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("Deno binary - build command can be invoked", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const command = new Deno.Command(BINARY_PATH, {
      args: ["build", "--help"],
      cwd: tempDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();
    const output = new TextDecoder().decode(stdout);

    assertEquals(code, 0, "Binary build command should be invokable");
    assertEquals(output.includes("build") || output.includes("Build"), true, "Build help should be shown");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("Deno binary - mcp command can be invoked", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const command = new Deno.Command(BINARY_PATH, {
      args: ["mcp", "--help"],
      cwd: tempDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();
    const output = new TextDecoder().decode(stdout);

    assertEquals(code, 0, "Binary mcp command should be invokable");
    assertEquals(output.includes("mcp") || output.includes("MCP"), true, "MCP help should be shown");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("Deno binary - runs with no external dependencies", async () => {
  // Run binary in isolated environment with minimal PATH
  const tempDir = await Deno.makeTempDir();

  try {
    const command = new Deno.Command(BINARY_PATH, {
      args: ["--version"],
      cwd: tempDir,
      env: {
        "PATH": "", // Empty PATH to ensure no external dependencies
        "HOME": tempDir,
      },
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await command.output();
    assertEquals(code, 0, "Binary should run with no external dependencies (empty PATH)");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
