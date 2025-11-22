/**
 * Distribution Validation Tests: Feature Parity
 *
 * Compares outputs from Deno binary and npm package to ensure identical behavior.
 * This test enforces FR-015: Feature parity between distributions.
 *
 * Phase 7 (User Story 5): T060
 */

import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { join } from "jsr:@std/path@^1.0.0";
import { ensureDependenciesInstalled } from "./utils.ts";

const DIST_DIR = join(Deno.cwd(), "dist");
const NPM_DIR = join(Deno.cwd(), "npm");
const DENO_BINARY = join(DIST_DIR, Deno.build.os === "windows" ? "tamamo-x.exe" : "tamamo-x");

async function getNpmBinPath(): Promise<string> {
  const packageJsonPath = join(NPM_DIR, "package.json");
  const packageJson = JSON.parse(await Deno.readTextFile(packageJsonPath));

  const binEntry = typeof packageJson.bin === "string"
    ? packageJson.bin
    : packageJson.bin["tamamo-x-mcp"] || packageJson.bin["tamamo-x"];

  return join(NPM_DIR, binEntry);
}

async function runDenoBinary(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const command = new Deno.Command(DENO_BINARY, {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  return {
    code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  };
}

async function runNpmPackage(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  await ensureDependenciesInstalled();
  const npmBinPath = await getNpmBinPath();

  const command = new Deno.Command("node", {
    args: [npmBinPath, ...args],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  return {
    code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  };
}

Deno.test("Parity - version output matches", async () => {
  const denoResult = await runDenoBinary(["--version"]);
  const npmResult = await runNpmPackage(["--version"]);

  if (denoResult.code !== npmResult.code || denoResult.stdout !== npmResult.stdout) {
    console.error("Deno binary result:");
    console.error("  Exit code:", denoResult.code);
    console.error("  STDOUT:", denoResult.stdout);
    console.error("  STDERR:", denoResult.stderr);
    console.error("npm package result:");
    console.error("  Exit code:", npmResult.code);
    console.error("  STDOUT:", npmResult.stdout);
    console.error("  STDERR:", npmResult.stderr);
  }

  assertEquals(denoResult.code, npmResult.code, "Exit codes should match for --version");

  // Normalize outputs (remove platform-specific differences)
  const normalizeOutput = (output: string) => output.trim().replace(/\r\n/g, "\n");

  assertEquals(
    normalizeOutput(denoResult.stdout),
    normalizeOutput(npmResult.stdout),
    "Version output should be identical between Deno binary and npm package",
  );
});

Deno.test("Parity - help output matches", async () => {
  const denoResult = await runDenoBinary(["--help"]);
  const npmResult = await runNpmPackage(["--help"]);

  if (denoResult.code !== npmResult.code || denoResult.stdout !== npmResult.stdout) {
    console.error("Deno binary result:");
    console.error("  Exit code:", denoResult.code);
    console.error("  STDOUT:", denoResult.stdout);
    console.error("  STDERR:", denoResult.stderr);
    console.error("npm package result:");
    console.error("  Exit code:", npmResult.code);
    console.error("  STDOUT:", npmResult.stdout);
    console.error("  STDERR:", npmResult.stderr);
  }

  assertEquals(denoResult.code, npmResult.code, "Exit codes should match for --help");

  // Normalize outputs
  const normalizeOutput = (output: string) => output.trim().replace(/\r\n/g, "\n");

  assertEquals(
    normalizeOutput(denoResult.stdout),
    normalizeOutput(npmResult.stdout),
    "Help output should be identical between Deno binary and npm package",
  );
});

Deno.test("Parity - init command help matches", async () => {
  const denoResult = await runDenoBinary(["init", "--help"]);
  const npmResult = await runNpmPackage(["init", "--help"]);

  assertEquals(denoResult.code, npmResult.code, "Exit codes should match for init --help");

  const normalizeOutput = (output: string) => output.trim().replace(/\r\n/g, "\n");

  assertEquals(
    normalizeOutput(denoResult.stdout),
    normalizeOutput(npmResult.stdout),
    "Init help output should be identical",
  );
});

Deno.test("Parity - build command help matches", async () => {
  const denoResult = await runDenoBinary(["build", "--help"]);
  const npmResult = await runNpmPackage(["build", "--help"]);

  assertEquals(denoResult.code, npmResult.code, "Exit codes should match for build --help");

  const normalizeOutput = (output: string) => output.trim().replace(/\r\n/g, "\n");

  assertEquals(
    normalizeOutput(denoResult.stdout),
    normalizeOutput(npmResult.stdout),
    "Build help output should be identical",
  );
});

Deno.test("Parity - mcp command help matches", async () => {
  const denoResult = await runDenoBinary(["mcp", "--help"]);
  const npmResult = await runNpmPackage(["mcp", "--help"]);

  assertEquals(denoResult.code, npmResult.code, "Exit codes should match for mcp --help");

  const normalizeOutput = (output: string) => output.trim().replace(/\r\n/g, "\n");

  assertEquals(
    normalizeOutput(denoResult.stdout),
    normalizeOutput(npmResult.stdout),
    "MCP help output should be identical",
  );
});

Deno.test("Parity - invalid command error matches", async () => {
  const denoResult = await runDenoBinary(["invalid-command"]);
  const npmResult = await runNpmPackage(["invalid-command"]);

  assertEquals(denoResult.code, npmResult.code, "Exit codes should match for invalid command");

  // Both should fail with same error message pattern (not exact match due to platform differences)
  const hasErrorMessage = (output: string) =>
    output.includes("Unknown command") || output.includes("invalid") || output.includes("error");

  assertEquals(
    hasErrorMessage(denoResult.stderr) || hasErrorMessage(denoResult.stdout),
    true,
    "Deno binary should show error for invalid command",
  );

  assertEquals(
    hasErrorMessage(npmResult.stderr) || hasErrorMessage(npmResult.stdout),
    true,
    "npm package should show error for invalid command",
  );
});

Deno.test("Parity - exit codes match for missing required arguments", async () => {
  // Test that both distributions handle missing arguments the same way
  const commands = [
    ["init"], // May require user input or flags
    ["build"], // Requires config file
    ["mcp"], // Requires groups file
  ];

  for (const args of commands) {
    const tempDir = await Deno.makeTempDir();

    try {
      // Run in temp directory with no config files
      const denoCommand = new Deno.Command(DENO_BINARY, {
        args,
        cwd: tempDir,
        stdout: "piped",
        stderr: "piped",
      });

      await ensureDependenciesInstalled();
      const npmBinPath = await getNpmBinPath();
      const npmCommand = new Deno.Command("node", {
        args: [npmBinPath, ...args],
        cwd: tempDir,
        stdout: "piped",
        stderr: "piped",
      });

      const denoResult = await denoCommand.output();
      const npmResult = await npmCommand.output();

      // Exit codes should match (whether success or error)
      assertEquals(
        denoResult.code,
        npmResult.code,
        `Exit codes should match for command: ${args.join(" ")}`,
      );
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  }
});
