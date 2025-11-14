/**
 * Runtime detection and cross-platform utilities
 */

/**
 * Detect the current runtime environment
 */
export function getRuntime(): 'deno' | 'node' {
  // @ts-ignore: Deno global may not exist
  if (typeof Deno !== 'undefined') {
    return 'deno';
  }
  return 'node';
}

/**
 * Check if running in Deno
 */
export function isDeno(): boolean {
  return getRuntime() === 'deno';
}

/**
 * Check if running in Node.js
 */
export function isNode(): boolean {
  return getRuntime() === 'node';
}

/**
 * Get the platform-specific process object
 */
export function getProcess(): typeof process {
  if (isDeno()) {
    // @ts-ignore: Deno global
    return Deno.process || process;
  }
  return process;
}

/**
 * Exit the process
 */
export function exit(code: number): void {
  if (isDeno()) {
    // @ts-ignore: Deno global
    Deno.exit(code);
  } else {
    process.exit(code);
  }
}

/**
 * Add signal listener (cross-platform)
 */
export function addSignalListener(signal: 'SIGINT' | 'SIGTERM', handler: () => void): void {
  if (isDeno()) {
    // @ts-ignore: Deno global
    Deno.addSignalListener(signal, handler);
  } else {
    process.on(signal, handler);
  }
}
