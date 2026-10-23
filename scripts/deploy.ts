// Build and publish dist/ to the gh-pages branch of `origin` (GitHub Pages). One commit, force-pushed.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from './build.ts';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const ROOT = join(import.meta.dirname, '..');

const remote = git(ROOT, 'remote', 'get-url', 'origin');
const name = git(ROOT, 'config', 'user.name');
const email = git(ROOT, 'config', 'user.email');
const head = git(ROOT, 'rev-parse', '--short', 'HEAD');

await build('dist');
const tmp = mkdtempSync(join(tmpdir(), 'gabay-pages-'));
try {
  cpSync(join(ROOT, 'dist'), tmp, { recursive: true });
  writeFileSync(join(tmp, '.nojekyll'), '');
  git(tmp, 'init', '-q', '-b', 'gh-pages');
  git(tmp, 'add', '-A');
  git(tmp, '-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', `deploy ${head}`);
  git(tmp, 'push', '-q', '-f', remote, 'gh-pages');
  console.log(`deployed ${head} to gh-pages of ${remote}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
