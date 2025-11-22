/**
 * CI Lint Enforcement Tests
 *
 * Validates that the CI pipeline correctly catches and fails on lint violations.
 * These tests ensure constitution compliance: zero lint errors required.
 */

import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { walk } from "jsr:@std/fs@^1.0.0/walk";

Deno.test("CI configuration exists and is valid", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";

  // Verify CI workflow file exists
  const fileInfo = await Deno.stat(ciConfigPath);
  assertEquals(fileInfo.isFile, true, "CI workflow file must exist");

  // Read CI workflow content
  const content = await Deno.readTextFile(ciConfigPath);

  // Verify lint job exists
  assertEquals(
    content.includes("deno lint"),
    true,
    "CI must include 'deno lint' command",
  );

  // Verify fmt check exists
  assertEquals(
    content.includes("deno fmt --check"),
    true,
    "CI must include 'deno fmt --check' command",
  );

  // Verify type check exists
  assertEquals(
    content.includes("deno check"),
    true,
    "CI must include 'deno check' command",
  );
});

Deno.test("Lint command runs successfully on current codebase", async () => {
  // Run lint command (should pass on clean codebase)
  const lintProcess = new Deno.Command("deno", {
    args: ["lint"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await lintProcess.output();
  const output = new TextDecoder().decode(stdout);
  const errorOutput = new TextDecoder().decode(stderr);

  // Constitution requirement: zero lint errors
  assertEquals(
    code,
    0,
    `Lint must pass with zero errors. Output:\n${output}\n${errorOutput}`,
  );

  // Verify output indicates success
  assertEquals(
    output.includes("Checked") || errorOutput.includes("Checked"),
    true,
    "Lint output must show files were checked",
  );
});

Deno.test("Format check runs successfully on current codebase", async () => {
  // Run format check (should pass on properly formatted code)
  const fmtProcess = new Deno.Command("deno", {
    args: ["fmt", "--check"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await fmtProcess.output();
  const output = new TextDecoder().decode(stdout);
  const errorOutput = new TextDecoder().decode(stderr);

  // Constitution requirement: code must be properly formatted
  assertEquals(
    code,
    0,
    `Format check must pass. Output:\n${output}\n${errorOutput}`,
  );

  // Verify output indicates success
  assertEquals(
    output.includes("Checked") || errorOutput.includes("Checked"),
    true,
    "Format check output must show files were checked",
  );
});

Deno.test("Type check runs successfully on current codebase", async () => {
  // Run type check on main entry point (checks all imported modules)
  const checkProcess = new Deno.Command("deno", {
    args: ["check", "src/cli/main.ts"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stderr } = await checkProcess.output();
  const errorOutput = new TextDecoder().decode(stderr);

  // Constitution requirement: strict TypeScript with zero errors
  assertEquals(
    code,
    0,
    `Type check must pass with strict mode. Errors:\n${errorOutput}`,
  );
});

Deno.test("Lint violations would be caught by CI", async () => {
  // Create a temporary file with lint violations
  const testFilePath = await Deno.makeTempFile({ suffix: ".ts" });

  try {
    // Write code with obvious lint violations
    const badCode = `
// Unused variable (lint violation)
const unusedVariable = 42;

// Inconsistent formatting
function badFormat(  )   {
    return   "bad"  ;
}

export { badFormat };
`;

    await Deno.writeTextFile(testFilePath, badCode);

    // Run lint on the bad file
    const lintProcess = new Deno.Command("deno", {
      args: ["lint", testFilePath],
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await lintProcess.output();

    // Lint MUST fail on violations
    assertEquals(
      code !== 0,
      true,
      "Lint must catch violations and fail (non-zero exit code)",
    );
  } finally {
    // Clean up temp file
    await Deno.remove(testFilePath);
  }
});

Deno.test("Format violations would be caught by CI", async () => {
  // Create a temporary file with format violations
  const testFilePath = await Deno.makeTempFile({ suffix: ".ts" });

  try {
    // Write poorly formatted code
    const badCode = `export   function   badFormat (  )   {
    return       "unformatted"  ;
      }`;

    await Deno.writeTextFile(testFilePath, badCode);

    // Run format check on the bad file
    const fmtProcess = new Deno.Command("deno", {
      args: ["fmt", "--check", testFilePath],
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await fmtProcess.output();

    // Format check MUST fail on violations
    assertEquals(
      code !== 0,
      true,
      "Format check must catch violations and fail (non-zero exit code)",
    );
  } finally {
    // Clean up temp file
    await Deno.remove(testFilePath);
  }
});

Deno.test("CI workflow uses fail-fast for quality gates", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";
  const content = await Deno.readTextFile(ciConfigPath);

  // Verify quality gates run before expensive tests
  // (Lint/fmt should be in separate job or early step)
  const lintIndex = content.indexOf("deno lint");
  const testIndex = content.indexOf("deno test");

  if (lintIndex !== -1 && testIndex !== -1) {
    assertEquals(
      lintIndex < testIndex,
      true,
      "Lint checks should run before tests for fast feedback",
    );
  }
});

Deno.test("All TypeScript files in src/ are covered by type checking", async () => {
  // Find all TypeScript files using walk (handles arbitrary nesting depth)
  const tsFiles: string[] = [];

  for await (const entry of walk("src", { exts: [".ts"] })) {
    if (entry.isFile) {
      tsFiles.push(entry.path);
    }
  }

  // Verify at least some TS files exist
  assertEquals(
    tsFiles.length > 0,
    true,
    "Project must have TypeScript files in src/",
  );

  // All files should type-check successfully
  for (const file of tsFiles) {
    const checkProcess = new Deno.Command("deno", {
      args: ["check", file],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await checkProcess.output();
    const errorOutput = new TextDecoder().decode(stderr);

    assertEquals(
      code,
      0,
      `${file} must type-check successfully. Errors:\n${errorOutput}`,
    );
  }
});
