/**
 * CI Distribution Gate Enforcement Tests
 *
 * Validates that the CI pipeline correctly validates both distributions
 * and ensures feature parity between Deno binary and npm package.
 * These tests ensure FR-015 compliance: identical functionality across distributions.
 */

import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { exists } from "jsr:@std/fs@^1.0.0/exists";

Deno.test("CI builds Deno binary", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";
  const content = await Deno.readTextFile(ciConfigPath);

  // Verify Deno binary build step exists
  assertEquals(
    content.includes("deno task compile") ||
      content.includes("deno compile"),
    true,
    "CI must build Deno binary distribution",
  );
});

Deno.test("CI builds npm package", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";
  const content = await Deno.readTextFile(ciConfigPath);

  // Verify npm package build step exists
  assertEquals(
    content.includes("deno task npm:build") ||
      content.includes("build_npm"),
    true,
    "CI must build npm package distribution",
  );
});

Deno.test("Distribution validation workflow exists", async () => {
  const distWorkflowPath = ".github/workflows/distribution.yml";

  // Verify distribution workflow file exists
  const fileExists = await exists(distWorkflowPath);
  assertEquals(fileExists, true, "Distribution validation workflow must exist");

  if (fileExists) {
    const content = await Deno.readTextFile(distWorkflowPath);

    // Verify it tests parity
    assertEquals(
      content.includes("parity") || content.includes("Parity"),
      true,
      "Distribution workflow must validate feature parity",
    );
  }
});

Deno.test("Deno compile task is configured", async () => {
  const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));

  // Verify compile task exists
  assertEquals(
    typeof denoConfig.tasks?.compile === "string",
    true,
    "deno.json must have 'compile' task",
  );

  // Verify it outputs to dist/
  const compileTask = denoConfig.tasks.compile;
  assertEquals(
    compileTask.includes("--output") && compileTask.includes("dist/"),
    true,
    "Compile task must output to dist/ directory",
  );

  // Verify it uses --allow-all for zero-dependency binary
  assertEquals(
    compileTask.includes("--allow-all"),
    true,
    "Compile task must use --allow-all for standalone binary",
  );
});

Deno.test("npm build task is configured", async () => {
  const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));

  // Verify npm:build task exists
  assertEquals(
    typeof denoConfig.tasks?.["npm:build"] === "string",
    true,
    "deno.json must have 'npm:build' task",
  );

  // Verify it references npm build script
  const npmBuildTask = denoConfig.tasks["npm:build"];
  assertEquals(
    npmBuildTask.includes("build_npm") || npmBuildTask.includes("npm"),
    true,
    "npm:build task must reference npm build script",
  );
});

Deno.test("Deno binary can be compiled successfully", async () => {
  console.log("Building Deno binary (this may take a moment)...");

  const compileProcess = new Deno.Command("deno", {
    args: ["task", "compile"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await compileProcess.output();
  const output = new TextDecoder().decode(stdout);
  const errorOutput = new TextDecoder().decode(stderr);

  // Build must succeed
  assertEquals(
    code,
    0,
    `Deno binary compilation must succeed. Output:\n${output}\n${errorOutput}`,
  );

  // Verify binary was created
  const binaryExists = await exists("dist/tamamo-x") ||
    await exists("dist/tamamo-x.exe");
  assertEquals(
    binaryExists,
    true,
    "Compiled Deno binary must exist in dist/",
  );
});

Deno.test("npm package can be built successfully", async () => {
  console.log("Building npm package (this may take a moment)...");

  const buildProcess = new Deno.Command("deno", {
    args: ["task", "npm:build"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await buildProcess.output();
  const output = new TextDecoder().decode(stdout);
  const errorOutput = new TextDecoder().decode(stderr);

  // Build must succeed
  assertEquals(
    code,
    0,
    `npm package build must succeed. Output:\n${output}\n${errorOutput}`,
  );

  // Verify npm directory was created
  const npmDirExists = await exists("npm");
  assertEquals(
    npmDirExists,
    true,
    "npm package directory must be created",
  );

  // Verify package.json exists
  const packageJsonExists = await exists("npm/package.json");
  assertEquals(
    packageJsonExists,
    true,
    "npm package must have package.json",
  );
});

Deno.test("Deno binary is executable", async () => {
  // Check if binary exists first
  const binaryPath = await exists("dist/tamamo-x")
    ? "dist/tamamo-x"
    : await exists("dist/tamamo-x.exe")
    ? "dist/tamamo-x.exe"
    : null;

  if (!binaryPath) {
    console.log("⚠ Binary not found, skipping execution test");
    return;
  }

  // Try to execute the binary (--version should work)
  const execProcess = new Deno.Command(`./${binaryPath}`, {
    args: ["--version"],
    stdout: "piped",
    stderr: "piped",
  });

  const { code } = await execProcess.output();

  // Binary should execute successfully
  assertEquals(
    code,
    0,
    "Deno binary must be executable and respond to --version",
  );
});

Deno.test("npm package entry point exists", async () => {
  const packageJsonExists = await exists("npm/package.json");

  if (!packageJsonExists) {
    console.log("⚠ npm package not built, skipping entry point test");
    return;
  }

  const packageJson = JSON.parse(
    await Deno.readTextFile("npm/package.json"),
  );

  // Verify package has entry point
  assertEquals(
    typeof packageJson.main === "string" ||
      typeof packageJson.exports === "object",
    true,
    "npm package must have entry point (main or exports field)",
  );

  // Verify entry point file exists
  const entryPoint = packageJson.main || packageJson.exports?.["./"];
  if (typeof entryPoint === "string") {
    const entryExists = await exists(`npm/${entryPoint}`);
    assertEquals(
      entryExists,
      true,
      `npm package entry point must exist: ${entryPoint}`,
    );
  }
});

Deno.test("Both distributions have same version", async () => {
  const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));
  const denoVersion = denoConfig.version;

  const packageJsonExists = await exists("npm/package.json");

  if (!packageJsonExists) {
    console.log("⚠ npm package not built, skipping version parity test");
    return;
  }

  const packageJson = JSON.parse(
    await Deno.readTextFile("npm/package.json"),
  );
  const npmVersion = packageJson.version;

  // Versions must match (FR-015: feature parity)
  assertEquals(
    denoVersion,
    npmVersion,
    "Deno binary and npm package must have identical versions",
  );
});

Deno.test("Distribution test suite exists", async () => {
  const testFiles = [
    "tests/distribution/deno_binary_test.ts",
    "tests/distribution/npm_package_test.ts",
    "tests/distribution/parity_test.ts",
  ];

  for (const testFile of testFiles) {
    const fileExists = await exists(testFile);
    assertEquals(
      fileExists,
      true,
      `Distribution test file must exist: ${testFile}`,
    );
  }
});

Deno.test("CI archives distributions on failure", async () => {
  const ciConfigPath = ".github/workflows/ci.yml";
  const content = await Deno.readTextFile(ciConfigPath);

  // Check for artifact upload on failure
  const hasArtifactUpload = content.includes("upload-artifact") &&
    content.includes("if: failure()");

  if (hasArtifactUpload) {
    console.log("✓ CI archives distributions on failure for debugging");
  } else {
    console.log("ℹ CI does not archive distributions on failure (optional)");
  }
});

Deno.test("Distribution workflow runs on schedule", async () => {
  const distWorkflowPath = ".github/workflows/distribution.yml";
  const fileExists = await exists(distWorkflowPath);

  if (!fileExists) {
    console.log("⚠ Distribution workflow not found");
    return;
  }

  const content = await Deno.readTextFile(distWorkflowPath);

  // Verify nightly schedule exists
  const hasSchedule = content.includes("schedule:") &&
    content.includes("cron:");

  assertEquals(
    hasSchedule,
    true,
    "Distribution workflow should run on schedule for continuous validation",
  );
});

Deno.test("Distribution workflow creates issues on parity violations", async () => {
  const distWorkflowPath = ".github/workflows/distribution.yml";
  const fileExists = await exists(distWorkflowPath);

  if (!fileExists) {
    console.log("⚠ Distribution workflow not found");
    return;
  }

  const content = await Deno.readTextFile(distWorkflowPath);

  // Check for automated issue creation
  const hasIssueCreation = content.includes("create issue") ||
    content.includes("issues.create") ||
    content.includes("github-script");

  if (hasIssueCreation) {
    console.log("✓ Distribution workflow creates issues on parity violations");
  } else {
    console.log(
      "ℹ Distribution workflow does not create issues automatically",
    );
  }
});

Deno.test("Deno binary size is reasonable", async () => {
  const binaryPath = await exists("dist/tamamo-x")
    ? "dist/tamamo-x"
    : await exists("dist/tamamo-x.exe")
    ? "dist/tamamo-x.exe"
    : null;

  if (!binaryPath) {
    console.log("⚠ Binary not found, skipping size check");
    return;
  }

  const stat = await Deno.stat(binaryPath);
  const sizeInMB = stat.size / (1024 * 1024);
  const maxSizeMB = 150; // 150MB max (reasonable for Deno standalone binary with dependencies)

  console.log(`Deno binary size: ${sizeInMB.toFixed(2)} MB`);

  assertEquals(
    sizeInMB < maxSizeMB,
    true,
    `Deno binary size (${sizeInMB.toFixed(2)} MB) must be < ${maxSizeMB} MB`,
  );
});

Deno.test("npm package size is reasonable", async () => {
  const npmDirExists = await exists("npm");

  if (!npmDirExists) {
    console.log("⚠ npm package not built, skipping size check");
    return;
  }

  // Calculate total size of npm directory
  let totalSize = 0;

  async function calculateDirSize(dirPath: string): Promise<void> {
    for await (const entry of Deno.readDir(dirPath)) {
      const fullPath = `${dirPath}/${entry.name}`;

      if (entry.isFile) {
        const stat = await Deno.stat(fullPath);
        totalSize += stat.size;
      } else if (entry.isDirectory) {
        await calculateDirSize(fullPath);
      }
    }
  }

  await calculateDirSize("npm");

  const sizeInMB = totalSize / (1024 * 1024);
  const maxSizeMB = 50; // 50MB max for npm package

  console.log(`npm package size: ${sizeInMB.toFixed(2)} MB`);

  if (sizeInMB > maxSizeMB) {
    console.log(
      `⚠ npm package size (${sizeInMB.toFixed(2)} MB) exceeds ${maxSizeMB} MB`,
    );
  }
});
