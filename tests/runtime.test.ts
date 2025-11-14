/**
 * Tests for runtime utilities
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { isDeno, isNode, getRuntime } from '../src/utils/runtime.ts';

Deno.test('getRuntime - should detect Deno', () => {
  const runtime = getRuntime();
  assertEquals(runtime, 'deno');
});

Deno.test('isDeno - should return true in Deno', () => {
  assertEquals(isDeno(), true);
});

Deno.test('isNode - should return false in Deno', () => {
  assertEquals(isNode(), false);
});
