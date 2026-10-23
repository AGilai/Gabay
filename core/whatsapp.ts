// One-time import of the gabbai's WhatsApp log: one message per aliyah, the calling line as he
// said it, optional notes in parentheses. See spec S8.
import { newId } from './dates.ts';
import { normalize } from './queue.ts';
import type { Group, ISODate, Person, Reading, SlotRole, State } from './types.ts';

export interface RawEntry { date: ISODate; time: string; text: string }
export interface DraftPerson {
  key: string; name: string; callLine: string; group: Group; groupCounts: Record<Group, number>;
  hints: string[]; dates: { date: ISODate; time: string; text: string }[]; regular: boolean;
}
export type Question =
  | { kind: 'same'; a: string; b: string }
  | { kind: 'group'; key: string; counts: Record<Group, number> }
  | { kind: 'hint'; key: string; hint: string };
export interface Draft { people: DraftPerson[]; questions: Question[] }
export type Answer = 'merge' | 'separate' | Group | 'keep' | 'drop';

const LINE = /^‎?\[(\d\d)\/(\d\d)\/(\d{4}), (\d{1,2}):(\d\d)(?::\d\d)?\] [^:]+: (.*)$/;
const FORWARDED = /^\[\d+\/\d+, [\d:]+\] [^:]+: /;
const STAMPED = /^\u200e?\[\d\d\/\d\d\/\d{4}, /; // a timestamped line LINE does not match is a system line
const SAME_SIMILARITY = 0.88;
// The log is sparse (not every reading was written down), so the import judges a year, not 90 days.
const REGULAR_DAYS = 365;
const REGULAR_MIN = 3;

function isNoise(t: string): boolean {
  return !t || !/[א-ת]/.test(t) || /deleted|pinned|omitted/i.test(t) || t.endsWith(':') || t.endsWith('שניתנו');
}

export function parseChat(text: string): { entries: RawEntry[]; skipped: string[] } {
  const entries: RawEntry[] = [];
  const skipped: string[] = [];
  let date = '', time = '';
  for (const line of text.split(/\r?\n/)) {
    const m = LINE.exec(line);
    if (!m && STAMPED.test(line)) { skipped.push(line); continue; }
    let t = m ? m[6] : line;
    if (m) {
      date = `${m[3]}-${m[2]}-${m[1]}`;
      time = `${m[4].padStart(2, '0')}:${m[5]}`;
    }
    t = t.replace(/‎/g, '').replace('<This message was edited>', '').replace(FORWARDED, '').trim();
    if (!date || !t && !m) continue;
    if (isNoise(t)) { skipped.push(line); continue; }
    entries.push({ date, time, text: t });
  }
  return { entries, skipped };
}

const stripNotes = (line: string) => line.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

export function groupFromLine(line: string): Group {
  const t = stripNotes(line);
  return t.endsWith('הכהן') ? 'K' : t.endsWith('הלוי') ? 'L' : 'Y';
}

// The name shown on the main page: the calling line without notes, title and group suffix.
function displayName(callLine: string): string {
  return stripNotes(callLine).replace(/^הרב /, '').replace(/ (הכהן|הלוי)$/, '');
}

export function personKey(line: string): string {
  // ר' in the middle of a name means "son of" ("דוד ר' אלקנה" = "דוד בן אלקנה"); at the start it is a title.
  const t = stripNotes(line).replace(/\s(?:בן\s+)?ר['׳]\s/g, ' בן ');
  return normalize(t)
    .split(' ').map((w) => (w === 'בר' ? 'בן' : w)).join(' ')
    .replace(/ (הכהן|הלוי)$/, '');
}

function similarity(a: string, b: string): number {
  const d: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length, 1);
}

function majority(c: Record<Group, number>): Group {
  return (['K', 'L', 'Y'] as Group[]).reduce((best, g) => (c[g] > c[best] ? g : best), 'Y');
}

function daysBefore(today: ISODate, date: ISODate): number {
  return (Date.parse(today) - Date.parse(date)) / 86_400_000;
}

export function buildDraft(entries: RawEntry[], today: ISODate): Draft {
  const byKey = new Map<string, { draft: DraftPerson }>();
  for (const e of entries) {
    const key = personKey(e.text);
    if (!key) continue;
    let item = byKey.get(key);
    if (!item) {
      item = { draft: { key, name: key, callLine: '', group: 'Y', groupCounts: { K: 0, L: 0, Y: 0 }, hints: [], dates: [], regular: false } };
      byKey.set(key, item);
    }
    item.draft.groupCounts[groupFromLine(e.text)]++;
    item.draft.dates.push({ date: e.date, time: e.time, text: e.text });
    for (const h of e.text.match(/\(([^)]*)\)/g) ?? []) {
      const hint = h.slice(1, -1).replace(/\s+/g, ' ').trim();
      if (hint && !item.draft.hints.includes(hint)) item.draft.hints.push(hint);
    }
  }

  const people: DraftPerson[] = [];
  const questions: Question[] = [];
  for (const { draft } of byKey.values()) {
    draft.group = majority(draft.groupCounts);
    draft.callLine = callLineOf(draft.dates, draft.group);
    draft.name = displayName(draft.callLine);
    draft.regular = draft.dates.filter((d) => daysBefore(today, d.date) >= 0 && daysBefore(today, d.date) <= REGULAR_DAYS).length >= REGULAR_MIN;
    people.push(draft);
    // A missing הכהן / הלוי is a slip. Ask only when Kohen and Levi conflict, or when an Israel majority
    // also has Kohen / Levi lines.
    const { K, L } = draft.groupCounts;
    if ((K > 0 && L > 0) || (draft.group === 'Y' && K + L > 0)) questions.push({ kind: 'group', key: draft.key, counts: draft.groupCounts });
    for (const hint of draft.hints) {
      if (/(^|\s)(בן|בת)\s/.test(hint)) questions.push({ kind: 'hint', key: draft.key, hint });
    }
  }
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      if (similarity(people[i].key, people[j].key) >= SAME_SIMILARITY) questions.push({ kind: 'same', a: people[i].key, b: people[j].key });
    }
  }
  return { people, questions };
}

// The latest spelling written for his group (a line that forgot הכהן / הלוי loses to one that has it).
function callLineOf(dates: { date: ISODate; time: string; text: string }[], group: Group): string {
  const sorted = [...dates].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const ofGroup = sorted.filter((d) => groupFromLine(d.text) === group);
  return stripNotes((ofGroup.length ? ofGroup : sorted).at(-1)!.text);
}

function rolesFor(groups: Group[]): SlotRole[] {
  let israel = 0;
  return groups.map((g) => (g === 'K' ? 'K' : g === 'L' ? 'L' : israel++ === 0 ? 'Y3' : 'Y4'));
}

export function applyDraft(state: State, draft: Draft, answers: Answer[]): State {
  const people = new Map(draft.people.map((p) => [p.key, { ...p, dates: [...p.dates], hints: [...p.hints], groupCounts: { ...p.groupCounts } }]));
  const alias = new Map<string, string>(); // merged key → surviving key
  const resolve = (k: string) => { while (alias.has(k)) k = alias.get(k)!; return k; };

  // Merges first, so a group answer is applied to the merged person and not recomputed away.
  const order = draft.questions.map((q, i) => i).sort((x, y) => Number(draft.questions[x].kind !== 'same') - Number(draft.questions[y].kind !== 'same'));
  order.forEach((i) => {
    const q = draft.questions[i];
    const a = answers[i];
    if (q.kind === 'same' && a === 'merge') {
      const [ka, kb] = [resolve(q.a), resolve(q.b)];
      if (ka === kb) return;
      const [keep, gone] = people.get(ka)!.dates.length >= people.get(kb)!.dates.length ? [ka, kb] : [kb, ka];
      const k = people.get(keep)!, g = people.get(gone)!;
      k.dates.push(...g.dates);
      for (const h of g.hints) if (!k.hints.includes(h)) k.hints.push(h);
      for (const grp of ['K', 'L', 'Y'] as Group[]) k.groupCounts[grp] += g.groupCounts[grp];
      k.group = majority(k.groupCounts);
      k.regular = k.regular || g.regular;
      people.delete(gone);
      alias.set(gone, keep);
    } else if (q.kind === 'group' && (a === 'K' || a === 'L' || a === 'Y')) {
      people.get(resolve(q.key))!.group = a;
    } else if (q.kind === 'hint' && a === 'drop') {
      const p = people.get(resolve(q.key))!;
      p.hints = p.hints.filter((h) => h !== q.hint);
    }
  });

  const idOf = new Map<string, string>();
  const created: Person[] = [];
  for (const p of people.values()) {
    const id = newId();
    idOf.set(p.key, id);
    const first = p.dates.map((d) => d.date).sort()[0];
    const callLine = callLineOf(p.dates, p.group);
    created.push({ id, name: displayName(callLine), group: p.group, callLine, hint: p.hints.join(' · '),
      regular: p.regular, stopped: false, seat: '', yahrzeits: [], addedOn: first, hiyuv: null });
  }

  const sessions = new Map<string, { date: ISODate; service: 'shacharit' | 'mincha'; items: { id: string; group: Group; time: string }[] }>();
  for (const p of people.values()) {
    for (const d of p.dates) {
      const service = d.time >= '12:00' ? 'mincha' : 'shacharit';
      const k = d.date + service;
      const s = sessions.get(k) ?? { date: d.date, service, items: [] };
      s.items.push({ id: idOf.get(p.key)!, group: p.group, time: d.time });
      sessions.set(k, s);
    }
  }
  const readings: Reading[] = [...sessions.values()]
    .sort((a, b) => (a.date + a.service).localeCompare(b.date + b.service))
    .map((s) => {
      const items = s.items.sort((a, b) => a.time.localeCompare(b.time) || 'KLY'.indexOf(a.group) - 'KLY'.indexOf(b.group));
      const roles = rolesFor(items.map((x) => x.group));
      return { date: s.date, service: s.service, count: items.length, noKohen: false, noLevi: false, source: 'whatsapp',
        slots: items.map((x, i) => ({ role: roles[i], personId: x.id, doneAt: x.time })) };
    });

  return { ...state, people: [...state.people, ...created], readings: [...state.readings, ...readings] };
}
