// web/ + core/ + vendor/ → dist/: strips TypeScript types, rewrites .ts imports to .js, and stamps
// the service worker with a content hash and the list of files to precache.
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile()).map((e) => relative(ROOT, join(e.parentPath, e.name)));
}

function toJs(code: string): string {
  return stripTypeScriptTypes(code, { mode: 'strip' })
    .replace(/((?:from|import)\s*\(?\s*['"][^'"]+)\.ts(['"])/g, '$1.js$2');
}

export async function build(outDir = 'dist'): Promise<void> {
  const out = isAbsolute(outDir) ? outDir : join(ROOT, outDir);
  rmSync(out, { recursive: true, force: true });
  const written = new Map<string, string | Buffer>();

  for (const f of [...files('core'), ...files('web')]) {
    const target = f.startsWith('web/') ? f.slice(4) : f;
    if (f.endsWith('.ts')) written.set(target.replace(/\.ts$/, '.js'), toJs(readFileSync(join(ROOT, f), 'utf8')));
    else written.set(target, readFileSync(join(ROOT, f)));
  }
  for (const f of files('vendor')) written.set(f, readFileSync(join(ROOT, f)));
  // Synthetic sample export (invented names) for the demo's import button.
  written.set('demo/chat-sample.zip', readFileSync(join(ROOT, 'tests/fixtures/chat-sample.zip')));

  const hash = createHash('sha256');
  for (const [k, v] of [...written].sort(([a], [b]) => a.localeCompare(b))) hash.update(k).update(v);
  const version = hash.digest('hex').slice(0, 10);
  const precache = ['./', ...[...written.keys()].filter((k) => !k.startsWith('demo/') && k !== 'sw.js').sort()];

  for (const [k, v] of written) {
    let body = v;
    if (k.endsWith('.js') && !k.startsWith('vendor/')) {
      body = String(v).replaceAll('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache));
    }
    mkdirSync(dirname(join(out, k)), { recursive: true });
    writeFileSync(join(out, k), body);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await build(process.argv[2] ?? 'dist');
  console.log('built dist/');
}
