// Lock the original WhatsApp export for the app: GABAY_PASS='…' node scripts/lock.ts <export.zip> [out]
// The file is stored unchanged inside the lock; the app's own import reads it after unlocking.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { lock, unlock } from '../core/lock.ts';

const [src, out = 'web/locked/list.gabay'] = process.argv.slice(2);
const pass = process.env.GABAY_PASS;
if (!src || !pass) throw new Error("usage: GABAY_PASS='…' node scripts/lock.ts <export.zip> [out]");

const data = new Uint8Array(readFileSync(src));
const locked = await lock(data, pass);
const back = await unlock(locked, pass);
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
if (sha(back) !== sha(data)) throw new Error('round trip failed');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, locked);
console.log(`locked ${data.length} bytes → ${out} (${locked.length} bytes); original sha256 ${sha(data).slice(0, 16)}… verified`);
