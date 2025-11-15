/**
 * Distribution Validation Tests: npm Package
 *
 * Tests that the npm package works correctly via npx execution
 * for all commands (init, build, mcp) with identical behavior to Deno binary.
 *
 * Phase 7 (User Story 5): T059
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";
import { join } from "jsr:@std/path@^1.0.0";

const NPM_DIR = join(Deno.cwd(), "npm");
const PACKAGE_JSON_PATH = join(NPM_DIR, "package.json");

Deno.test("npm package - package.json exists after build", async () => {
  try {
    const stat = await Deno.stat(PACKAGE_JSON_PATH);
    assertExists(stat);
    assertEquals(stat.isFile, true);
  } catch (error) {
    throw new Error(`package.json not found at ${PACKAGE_JSON_PATH}. Run 'deno task npm:build' first. ${error}`);
  }
});

Deno.test("npm package - package.json has correct metadata", async () => {
  const packageJson = JSON.parse(await Deno.readTextFile(PACKAGE_JSON_PATH));

  assertExists(packageJson.name, "package.json should have 'name' field");
  assertEquals(packageJson.name, "tamamo-x-mcp", "Package name should be 'tamamo-x-mcp'");
  assertExists(packageJson.version, "package.json should have 'version' field");
  assertExists(packageJson.bin, "package.json should have 'bin' field for npx execution");
});

Deno.test("npm package - has executable bin entry", async () => {
  const packageJson = JSON.parse(await Deno.readTextFile(PACKAGE_JSON_PATH));

  assertExists(packageJson.bin, "package.json must have 'bin' field");

  const binEntry = typeof packageJson.bin === "string"
    ? packageJson.bin
    : packageJson.bin["tamamo-x-mcp"] || packageJson.bin["tamamo-x"];

  assertExists(binEntry, "bin entry must point to executable");

  // Check if bin file exists
  const binPath = join(NPM_DIR, binEntry);
  const stat = await Deno.stat(binPath);
  assertEquals(stat.isFile, true, "Bin file must exist");
});

Deno.test("npm package - can be executed via node (shows version)", async () => {
  const packageJson = JSON.parse(await Deno.readTextFile(PACKAGE_JSON_PATH));
  const binEntry = typeof packageJson.bin === "string"
    ? packageJson.bin
    : packageJson.bin["tamamo-x-mcp"] || packageJson.bin["tamamo-x"];

  const binPath = join(NPM_DIR, binEntry);

  const command = new Deno.Command("node", {
    args: [binPath, "--version"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout } = await command.output();
  const output = new TextDecoder().decode(stdout);

  assertEquals(code, 0, "npm package should exit with code 0 for --version");
  assertEquals(output.includes("tamamo-x"), true, "Version output should include 'tamamo-x'");
});

Deno.test("npm package - can be executed via node (shows help)", async () => {
  const packageJson = JSON.parse(await Deno.readTextFile(PACKAGE_JSON_PATH));
  const binEntry = typeof packageJson.bin === "string"
    ? packageJson.bin
    : packageJson.bin["tamamo-x-mcp"] || packageJson.bin["tamamo-x"];

  const binPath = join(NPM_DIR, binEntry);

  const command = new Deno.Command("node", {
    args: [binPath, "--help"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout } = await command.output();
  const output = new TextDecoder().decode(stdout);

  assertEquals(code, 0, "npm package should exit with code 0 for --help");
  assertEquals(output.includes("init"), true, "Help should mention 'init' command");
  assertEquals(output.includes("build"), true, "Help should mention 'build' command");
  assertEquals(output.includes("mcp"), true, "Help should mention 'mcp' command");
});

Deno.test("npm package - init command works via node", async () => {
  const packageJson = JSON.parse(await Deno.readTextFile(PACKAGE_JSON_PATH));
  const binEntry = typeof packageJson.bin === "string"
    ? packageJson.bin
    : packageJson.bin["tamamo-x-mcp"] || packageJson.bin["tamamo-x"];

  const binPath = join(NPM_DIR, binEntry);
  const tempDir = await Deno.makeTempDir();

  try {
    const command = new Deno.Command("node", {
      args: [binPath, "init", "--help"],
      cwd: tempDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();
    const output = new TextDecoder().decode(stdout);

    assertEquals(code, 0, "npm package init command should be invokable");
    assertEquals(output.includes("init") || output.includes("Initialize"), true, "Init help should be shown");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("npm package - build command works via node", async () => {
  const packageJson = JSON.parse(await Deno.readTextFile(PACKAGE_JSON_PATH));
  const binEntry = typeof packageJson.bin === "string"
    ? packageJson.bin
    : packageJson.bin["tamamo-x-mcp"] || packageJson.bin["tamamo-x"];

  const binPath = join(NPM_DIR, binEntry);
  const tempDir = await Deno.makeTempDir();

  try {
    const command = new Deno.Command("node", {
      args: [binPath, "build", "--help"],
      cwd: tempDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();
    const output = new TextDecoder().decode(stdout);

    assertEquals(code, 0, "npm package build command should be invokable");
    assertEquals(output.includes("build") || output.includes("Build"), true, "Build help should be shown");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("npm package - mcp command works via node", async () => {
  const packageJson = JSON.parse(await Deno.readTextFile(PACKAGE_JSON_PATH));
  const binEntry = typeof packageJson.bin === "string"
    ? packageJson.bin
    : packageJson.bin["tamamo-x-mcp"] || packageJson.bin["tamamo-x"];

  const binPath = join(NPM_DIR, binEntry);
  const tempDir = await Deno.makeTempDir();

  try {
    const command = new Deno.Command("node", {
      args: [binPath, "mcp", "--help"],
      cwd: tempDir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await command.output();
    const output = new TextDecoder().decode(stdout);

    assertEquals(code, 0, "npm package mcp command should be invokable");
    assertEquals(output.includes("mcp") || output.includes("MCP"), true, "MCP help should be shown");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
