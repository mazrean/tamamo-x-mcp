/**
 * Configuration loader for tamamo-x-mcp
 * Loads and saves configuration files
 */

import { ensureDir } from "jsr:@std/fs@^1.0.0/ensure-dir";
import { dirname } from "jsr:@std/path@^1.0.0";
import type { Configuration } from "../types/index.ts";

/**
 * Load configuration from a JSON file
 * @param filePath - Path to the configuration file
 * @returns Parsed configuration object
 * @throws Error if file doesn't exist or contains invalid JSON
 */
export async function loadConfig(filePath: string): Promise<Configuration> {
  try {
    const content = await Deno.readTextFile(filePath);

    try {
      const config = JSON.parse(content) as Configuration;
      return config;
    } catch (parseError) {
      throw new Error(
        `Invalid JSON in configuration file: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`,
      );
    }
  } catch (readError) {
    if (readError instanceof Deno.errors.NotFound) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }
    throw readError;
  }
}

/**
 * Save configuration to a JSON file
 * Creates parent directories if they don't exist
 * @param filePath - Path to save the configuration file
 * @param config - Configuration object to save
 */
export async function saveConfig(
  filePath: string,
  config: Configuration,
): Promise<void> {
  // Ensure parent directory exists
  const dir = dirname(filePath);
  await ensureDir(dir);

  // Write configuration with proper formatting
  const content = JSON.stringify(config, null, 2);
  await Deno.writeTextFile(filePath, content + "\n");
}
