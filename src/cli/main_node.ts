/**
 * Node.js Entry Point for npm package
 *
 * This file is the entry point for the npm package distribution.
 * It sets up the Deno shim before loading the main CLI.
 */

// This file is Node.js-specific and requires process global
// deno-lint-ignore-file no-process-global

// Import Deno shims for full API compatibility
import * as DenoShim from "npm:@deno/shim-deno@^0.19.2";

// Set up globalThis.Deno with proper args from process.argv and build info
// @ts-ignore: DenoShim.Deno does not have all properties of the native Deno type
globalThis.Deno = {
  ...DenoShim.Deno,
  args: typeof process !== "undefined" ? process.argv.slice(2) : [],
  build: {
    ...(globalThis.Deno?.build || {}), // Keep banner's corrected build info
    standalone: false,
  },
};

// Import and run the main CLI
import { main } from "./main.ts";

// Run main function
await main(globalThis.Deno.args);
