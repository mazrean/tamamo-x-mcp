/**
 * Basic tests for configuration loader
 */

import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { loadMcpConfig } from '../src/config/loader.ts';

Deno.test('loadMcpConfig - should load valid config', async () => {
  const config = await loadMcpConfig('.mcp.json');
  assertEquals(typeof config, 'object');
  assertEquals(typeof config.mcpServers, 'object');
});

Deno.test('loadMcpConfig - should reject invalid file', async () => {
  await assertRejects(
    async () => {
      await loadMcpConfig('nonexistent.json');
    },
    Error,
    'not found',
  );
});
