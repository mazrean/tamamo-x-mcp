/**
 * Shared utilities for distribution tests
 */

import { join } from "jsr:@std/path@^1.0.0";

const NPM_DIR = join(Deno.cwd(), "npm");
const NODE_MODULES_PATH = join(NPM_DIR, "node_modules");

/**
 * Ensures npm package dependencies are installed before running tests.
 * Only installs if node_modules directory doesn't exist.
 * This is cached across tests to avoid redundant installations.
 */
export async function ensureDependenciesInstalled(): Promise<void> {
  try {
    await Deno.stat(NODE_MODULES_PATH);
    // node_modules exists, dependencies already installed
  } catch {
    // node_modules doesn't exist, install dependencies
    console.log("Installing npm package dependencies...");
    const command = new Deno.Command("npm", {
      args: ["install"],
      cwd: NPM_DIR,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stderr } = await command.output();
    if (code !== 0) {
      const errorOutput = new TextDecoder().decode(stderr);
      throw new Error(`Failed to install npm dependencies: ${errorOutput}`);
    }
  }
}
