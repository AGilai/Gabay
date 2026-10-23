// Runs the WhatsApp import on a real export and prints a summary. Local use only: the output
// contains real names, so never commit it.
//   npm run check-import -- "<export.zip | _chat.txt>"
import { readFileSync } from 'node:fs';
import { readZipEntry } from '../core/unzip.ts';
import { parseChat, buildDraft } from '../core/whatsapp.ts';
import { toISODate } from '../core/dates.ts';

const path = process.argv[2];
if (!path) { console.error('usage: check-import <export.zip|_chat.txt>'); process.exit(1); }
const bytes = new Uint8Array(readFileSync(path));
const text = path.endsWith('.zip') ? await readZipEntry(bytes, '.txt') : new TextDecoder().decode(bytes);
if (text === null) { console.error('no .txt inside the zip'); process.exit(1); }

const today = toISODate(new Date());
const { entries, skipped } = parseChat(text);
const draft = buildDraft(entries, today);
const byGroup = { K: 0, L: 0, Y: 0 };
for (const p of draft.people) byGroup[p.group]++;
const last = (p: (typeof draft.people)[0]) => p.dates.map((d) => d.date).sort().at(-1)!;
const days = (d: string) => Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);

console.log(`entries: ${entries.length}   skipped: ${skipped.length}`);
for (const s of skipped) console.log('  skipped:', JSON.stringify(s));
console.log(`people: ${draft.people.length}  (K ${byGroup.K} / L ${byGroup.L} / Y ${byGroup.Y})`);
console.log(`regular (3+ in 12 months): ${draft.people.filter((p) => p.regular).length}`);
console.log(`called once: ${draft.people.filter((p) => p.dates.length === 1).length}`);
console.log(`last aliyah > 182 days: ${draft.people.filter((p) => days(last(p)) > 182).length}`);
console.log(`questions: ${draft.questions.length}`);
for (const q of draft.questions) {
  if (q.kind === 'same') console.log(`  same?  ${q.a}  |  ${q.b}`);
  if (q.kind === 'group') console.log(`  group? ${q.key}  ${JSON.stringify(q.counts)}`);
  if (q.kind === 'hint') console.log(`  hint?  ${q.key}  (${q.hint})`);
}
