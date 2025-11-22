#!/usr/bin/env -S deno run --allow-all
/**
 * npm Package Build Script
 *
 * Uses esbuild with denoPlugins to transpile Deno code to Node.js ESM.
 * Does not bundle dependencies - they remain as imports in package.json.
 *
 * Phase 7 (User Story 5): T063
 *
 * Usage: deno run -A scripts/build_npm.ts
 */

import * as esbuild from "npm:esbuild@^0.24.2";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.11.0";
import { copy, emptyDir, ensureDir } from "jsr:@std/fs@^1.0.0";
import { join } from "jsr:@std/path@^1.0.0";

const NPM_DIR = join(Deno.cwd(), "npm");

console.log("🔨 Building npm package with esbuild...\n");

// Read version from deno.json
const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));
const version = denoConfig.version || "0.1.0";

console.log(`Version: ${version}`);

// Clean npm directory
await emptyDir(NPM_DIR);
await ensureDir(join(NPM_DIR, "dist"));

// Bundle with esbuild - don't bundle npm packages, only transpile Deno code
console.log("\n📦 Transpiling with esbuild...");

const result = await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ["./src/cli/main.ts"],
  outfile: join(NPM_DIR, "dist", "main.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  banner: {
    js: `#!/usr/bin/env node
// Import Deno shims for full API compatibility
import * as DenoShim from "@deno/shim-deno";
// Set up globalThis.Deno with proper args from process.argv
globalThis.Deno = {
  ...DenoShim.Deno,
  args: process.argv.slice(2),
};
`,
  },
  external: [
    // Keep all npm packages external (not bundled)
    "@deno/shim-deno",
    "@anthropic-ai/*",
    "@ai-sdk/*",
    "@aws-sdk/*",
    "@google/*",
    "@modelcontextprotocol/*",
    "@mastra/*",
    "@openrouter/ai-sdk-provider-v5",
    "ai",
    "ai-v5",
    "openai",
    "zod",
    "zod-from-json-schema-v3",
    // Node.js built-ins
    "node:*",
    "fs",
    "path",
    "url",
    "stream",
    "util",
    "events",
    "buffer",
    "crypto",
    "http",
    "https",
    "net",
    "tls",
    "zlib",
    "child_process",
    "os",
    "process",
    "encoding",
  ],
  minify: false,
  sourcemap: true,
  treeShaking: true,
});

if (result.errors.length > 0) {
  console.error("Build errors:", result.errors);
  Deno.exit(1);
}

console.log("  ✓ Transpilation complete");

esbuild.stop();

// Make the output executable
await Deno.chmod(join(NPM_DIR, "dist", "main.js"), 0o755);

// Create package.json with all npm dependencies
console.log("\n📄 Creating package.json...");
const packageJson = {
  name: "tamamo-x-mcp",
  version,
  description:
    "MCP server that intelligently groups tools from configured MCP servers into specialized sub-agents",
  license: "MIT",
  type: "module",
  main: "./dist/main.js",
  bin: {
    "tamamo-x-mcp": "./dist/main.js",
    "tamamo-x": "./dist/main.js",
  },
  engines: {
    node: ">=20.0.0",
  },
  dependencies: {
    "@deno/shim-deno": "^0.19.2",
    "@ai-sdk/openai": "^2.0.68",
    "@anthropic-ai/claude-agent-sdk": "^0.1.42",
    "@anthropic-ai/sdk": "^0.69.0",
    "@aws-sdk/client-bedrock-runtime": "^3.933.0",
    "@google/genai": "^1.30.0",
    "@mastra/core": "^0.24.1",
    "@modelcontextprotocol/sdk": "^1.22.0",
    "ai": "^5.0.94",
    "openai": "^6.9.1",
    "zod": "^3.24.1",
  },
  keywords: [
    "mcp",
    "model-context-protocol",
    "agents",
    "ai",
    "llm",
    "tools",
    "anthropic",
    "openai",
    "gemini",
  ],
  repository: {
    type: "git",
    url: "git+https://github.com/mazrean/tamamo-x-mcp.git",
  },
  bugs: {
    url: "https://github.com/mazrean/tamamo-x-mcp/issues",
  },
};

await Deno.writeTextFile(
  join(NPM_DIR, "package.json"),
  JSON.stringify(packageJson, null, 2),
);
console.log("  ✓ package.json created");

// Copy README (if exists)
try {
  await copy("README.md", join(NPM_DIR, "README.md"));
  console.log("  ✓ README.md copied");
} catch {
  console.log("  ⚠ README.md not found (skipped)");
}

// Copy LICENSE (if exists)
try {
  await copy("LICENSE", join(NPM_DIR, "LICENSE"));
  console.log("  ✓ LICENSE copied");
} catch {
  console.log("  ⚠ LICENSE not found (skipped)");
}

// Create .npmignore
console.log("\n📄 Creating .npmignore...");
const npmIgnore = `
# Source files (only ship dist)
src/
*.ts
!*.d.ts

# Test files
*.test.ts
*.test.js
__tests__/
tests/

# Development files
.env
.env.local
*.log
.DS_Store

# Build artifacts
.deno/
`.trim();

await Deno.writeTextFile(join(NPM_DIR, ".npmignore"), npmIgnore);
console.log("  ✓ .npmignore created");

console.log("\n✅ npm package built successfully!");
console.log(`\n📦 Package location: ${NPM_DIR}`);
console.log("\nTo test locally:");
console.log(`  cd ${NPM_DIR}`);
console.log("  npm install");
console.log("  npm link");
console.log("  tamamo-x-mcp --version");
console.log("\nTo publish:");
console.log(`  cd ${NPM_DIR}`);
console.log("  npm publish");
console.log("\nNote: This package requires Node.js 20+.");
