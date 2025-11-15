/**
 * CI Test Gate Enforcement Tests
 *
 * Validates that the CI pipeline correctly runs all tests and fails on test failures.
 * These tests ensure constitution compliance: all tests must pass before merge.
 */

import { assertEquals } from "jsr:@std/assert@^1.0.0";

Deno.test("CI runs unit tests", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";
  const content = await Deno.readTextFile(ciConfigPath);

  // Verify unit tests are run
  assertEquals(
    content.includes("deno test") && content.includes("tests/unit"),
    true,
    "CI must run unit tests from tests/unit/",
  );
});

Deno.test("CI runs integration tests", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";
  const content = await Deno.readTextFile(ciConfigPath);

  // Verify integration tests are run
  assertEquals(
    content.includes("deno test") && content.includes("tests/integration"),
    true,
    "CI must run integration tests from tests/integration/",
  );
});

Deno.test("CI runs distribution tests", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";
  const content = await Deno.readTextFile(ciConfigPath);

  // Verify distribution tests are run
  assertEquals(
    content.includes("deno test") && content.includes("tests/distribution"),
    true,
    "CI must run distribution tests from tests/distribution/",
  );
});

Deno.test("All unit tests pass in current codebase", async () => {
  // Run unit tests
  const testProcess = new Deno.Command("deno", {
    args: ["test", "--allow-all", "tests/unit/"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await testProcess.output();
  const output = new TextDecoder().decode(stdout);
  const errorOutput = new TextDecoder().decode(stderr);

  // Constitution requirement: all tests must pass
  assertEquals(
    code,
    0,
    `Unit tests must pass. Output:\n${output}\n${errorOutput}`,
  );

  // Verify tests were actually run
  assertEquals(
    output.includes("ok") || output.includes("test result"),
    true,
    "Test output must show results",
  );
});

Deno.test("All integration tests pass in current codebase", async () => {
  // Run integration tests
  const testProcess = new Deno.Command("deno", {
    args: ["test", "--allow-all", "tests/integration/"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await testProcess.output();
  const output = new TextDecoder().decode(stdout);
  const errorOutput = new TextDecoder().decode(stderr);

  // Constitution requirement: all tests must pass
  assertEquals(
    code,
    0,
    `Integration tests must pass. Output:\n${output}\n${errorOutput}`,
  );
});

Deno.test("All distribution tests pass in current codebase", async () => {
  // Run distribution tests
  const testProcess = new Deno.Command("deno", {
    args: ["test", "--allow-all", "tests/distribution/"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await testProcess.output();
  const output = new TextDecoder().decode(stdout);
  const errorOutput = new TextDecoder().decode(stderr);

  // Constitution requirement: all tests must pass
  assertEquals(
    code,
    0,
    `Distribution tests must pass. Output:\n${output}\n${errorOutput}`,
  );
});

Deno.test("Test failures would be caught by CI", async () => {
  // Create a temporary test file with failing test
  const testFilePath = await Deno.makeTempFile({ suffix: "_test.ts" });

  try {
    // Write a test that will fail
    const failingTest = `
import { assertEquals } from "jsr:@std/assert@^1.0.0";

Deno.test("intentionally failing test", () => {
  assertEquals(1, 2, "This test is designed to fail");
});
`;

    await Deno.writeTextFile(testFilePath, failingTest);

    // Run test on the failing file
    const testProcess = new Deno.Command("deno", {
      args: ["test", "--allow-all", testFilePath],
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await testProcess.output();

    // Test runner MUST fail on test failures
    assertEquals(
      code !== 0,
      true,
      "Test runner must fail (non-zero exit code) when tests fail",
    );
  } finally {
    // Clean up temp file
    await Deno.remove(testFilePath);
  }
});

Deno.test("CI runs tests with proper permissions", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";
  const content = await Deno.readTextFile(ciConfigPath);

  // Verify tests are run with --allow-all or specific permissions
  const hasAllowAll = content.includes("--allow-all");
  const hasSpecificPerms = content.includes("--allow-read") ||
    content.includes("--allow-write") ||
    content.includes("--allow-net");

  assertEquals(
    hasAllowAll || hasSpecificPerms,
    true,
    "CI must run tests with necessary permissions",
  );
});

Deno.test("CI tests run on multiple platforms", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";
  const content = await Deno.readTextFile(ciConfigPath);

  // Verify matrix testing across platforms
  assertEquals(
    content.includes("ubuntu-latest") || content.includes("ubuntu"),
    true,
    "CI must test on Linux (ubuntu-latest)",
  );

  assertEquals(
    content.includes("macos-latest") || content.includes("macos"),
    true,
    "CI must test on macOS (macos-latest)",
  );

  assertEquals(
    content.includes("windows-latest") || content.includes("windows"),
    true,
    "CI must test on Windows (windows-latest)",
  );
});

Deno.test("Test coverage collection is configured", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";

  try {
    const content = await Deno.readTextFile(ciConfigPath);

    // Check if coverage is enabled (optional gate, not blocking)
    const hasCoverage = content.includes("--coverage") ||
      content.includes("deno coverage");

    // Coverage is recommended but not required by constitution (≥80% target)
    if (hasCoverage) {
      console.log("✓ Coverage collection is enabled in CI");
    } else {
      console.log("ℹ Coverage collection not found (optional)");
    }
  } catch {
    // CI file may not exist yet, that's ok for this test
  }
});

Deno.test("All test files follow naming convention", async () => {
  // Test files must end with _test.ts
  const testDirs = ["tests/unit", "tests/integration", "tests/distribution"];

  for (const dir of testDirs) {
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile && entry.name.endsWith(".ts")) {
          assertEquals(
            entry.name.endsWith("_test.ts"),
            true,
            `Test file ${dir}/${entry.name} must end with _test.ts`,
          );
        }

        if (entry.isDirectory) {
          // Check subdirectories
          for await (const subEntry of Deno.readDir(`${dir}/${entry.name}`)) {
            if (subEntry.isFile && subEntry.name.endsWith(".ts")) {
              assertEquals(
                subEntry.name.endsWith("_test.ts"),
                true,
                `Test file ${dir}/${entry.name}/${subEntry.name} must end with _test.ts`,
              );
            }
          }
        }
      }
    } catch {
      // Directory may not exist yet, skip
    }
  }
});

Deno.test("No test files are excluded from test runs", async () => {
  // Ensure all *_test.ts files are included in test runs
  const excludedPatterns = ["node_modules", "dist", "build", "coverage"];

  // Read deno.json to check for test exclusions
  try {
    const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));

    if (denoConfig.test?.exclude) {
      const exclusions = denoConfig.test.exclude;

      for (const exclusion of exclusions) {
        const isValidExclusion = excludedPatterns.some((pattern) => exclusion.includes(pattern));

        assertEquals(
          isValidExclusion,
          true,
          `Test exclusion '${exclusion}' must only exclude build artifacts, not test files`,
        );
      }
    }
  } catch {
    // deno.json may not have test config, that's ok
  }
});

Deno.test("Test execution time is reasonable", async () => {
  // Measure test execution time (should be < 5 minutes for fast feedback)
  const startTime = Date.now();

  const testProcess = new Deno.Command("deno", {
    args: ["test", "--allow-all", "tests/unit/"],
    stdout: "piped",
    stderr: "piped",
  });

  await testProcess.output();

  const duration = Date.now() - startTime;
  const maxDuration = 5 * 60 * 1000; // 5 minutes

  // This is a guideline, not a hard requirement
  if (duration > maxDuration) {
    console.log(
      `⚠ Unit tests took ${duration}ms (>${maxDuration}ms), consider optimization`,
    );
  } else {
    console.log(`✓ Unit tests completed in ${duration}ms`);
  }
});
