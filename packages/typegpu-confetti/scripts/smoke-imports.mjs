import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const esm = await import('../dist/index.mjs');
const cjs = createRequire(import.meta.url)('../dist/index.cjs');

for (const entry of [esm, cjs]) {
  assert.ok(entry.SpawnContext);
  assert.ok(entry.ParticleInit);
  assert.equal(entry.MAX_PALETTE_COLORS, 256);
  assert.equal(typeof entry.defaultGravity, 'function');
  assert.equal(typeof entry.defaultSpawn, 'function');
}

console.log('ESM and CJS package imports are valid.');
