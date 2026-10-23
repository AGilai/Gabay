import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from '../scripts/build.ts';

function jsFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.js')).map((e) => join(e.parentPath, e.name));
}

const out = mkdtempSync(join(tmpdir(), 'gabay-build-'));
const built = build(out);

test('the build strips types and rewrites .ts imports', async () => {
  await built;
  const day = readFileSync(join(out, 'core/day.js'), 'utf8');
  assert.ok(!day.includes(': ISODate'));
  for (const f of jsFiles(out)) {
    if (f.includes('vendor')) continue;
    assert.ok(!/['"][^'"]+\.ts['"]/.test(readFileSync(f, 'utf8')), f);
  }
  assert.ok(existsSync(join(out, 'index.html')));
  assert.ok(existsSync(join(out, 'vendor/hebcal.min.js')));
});

test('the service worker is stamped with a version', async () => {
  await built;
  assert.ok(!readFileSync(join(out, 'sw.js'), 'utf8').includes('__VERSION__'));
});

test('the service worker precaches the app, the core and the calendar', async () => {
  await built;
  const sw = readFileSync(join(out, 'sw.js'), 'utf8');
  for (const f of ['core/day.js', 'vendor/hebcal.min.js', 'index.html', 'main.js', 'manifest.webmanifest']) assert.ok(sw.includes(`"${f}"`), f);
  assert.ok(!sw.includes('__PRECACHE__'));
});
