import { daysBetween } from './dates.ts';
import { yahrzeitThisWeek } from './day.ts';
import { inArea, type AreaFilter } from './area.ts';
import type { Group, ISODate, Person, Reading, State } from './types.ts';

export interface Row { person: Person; last: ISODate | null; days: number | null; count12m: number; reason: string | null }
export interface Queue { inReading: Row[]; hiyuv: Row[]; line: Row[] }

// Done slots only, dates ascending.
export function aliyotOf(state: State): Map<string, ISODate[]> {
  const out = new Map<string, ISODate[]>();
  for (const r of state.readings) {
    for (const s of r.slots) {
      if (!s.personId || !s.doneAt) continue;
      const list = out.get(s.personId) ?? [];
      list.push(r.date);
      out.set(s.personId, list);
    }
  }
  for (const list of out.values()) list.sort();
  return out;
}

function hiyuvReason(p: Person, today: ISODate): string | null {
  if (p.hiyuv?.date === today) return p.hiyuv.reason;
  const y = p.yahrzeits.find((y) => yahrzeitThisWeek(y, today));
  return y ? 'יארצייט · ' + y.note : null;
}

function byWait(a: Row, b: Row): number {
  if (a.last === null || b.last === null) {
    if (a.last !== b.last) return a.last === null ? -1 : 1;
    return a.person.addedOn.localeCompare(b.person.addedOn) || a.person.name.localeCompare(b.person.name);
  }
  return (b.days! - a.days!) || (a.count12m - b.count12m) || a.person.name.localeCompare(b.person.name);
}

export function buildQueue(state: State, group: Group, today: ISODate, reading: Reading | null): Queue {
  const aliyot = aliyotOf(state);
  const inToday = new Set(reading?.slots.map((s) => s.personId).filter(Boolean));
  const q: Queue = { inReading: [], hiyuv: [], line: [] };

  for (const person of state.people) {
    if (person.group !== group || person.stopped || person.deleted) continue;
    const dates = aliyot.get(person.id) ?? [];
    const last = dates.length ? dates[dates.length - 1] : null;
    const row: Row = {
      person, last,
      days: last === null ? null : daysBetween(last, today),
      count12m: dates.filter((d) => daysBetween(d, today) <= 365).length,
      reason: hiyuvReason(person, today),
    };
    if (inToday.has(person.id)) q.inReading.push(row);
    else if (row.reason) q.hiyuv.push(row);
    else q.line.push(row);
  }
  q.line.sort(byWait);
  q.hiyuv.sort(byWait);
  return q;
}

// One-time cleanup (2026-11-11), when the automatic drop-out went away: anyone whose last aliyah is over
// `days` ago, or never called and added that long ago, becomes "stop suggesting".
export function pauseAbsent(state: State, today: ISODate, days: number): { state: State; count: number } {
  const aliyot = aliyotOf(state);
  let count = 0;
  const people = state.people.map((p) => {
    if (p.stopped || p.deleted) return p;
    const since = aliyot.get(p.id)?.at(-1) ?? p.addedOn;
    if (daysBetween(since, today) <= days) return p;
    count++;
    return { ...p, stopped: true };
  });
  return { state: { ...state, people }, count };
}

export function suggest(state: State, group: Group, today: ISODate, reading: Reading | null): Person | null {
  const q = buildQueue(state, group, today, reading);
  // Not someone who already went up today (in another minyan); he can still be picked from the list.
  return [...q.hiyuv, ...q.line].find((x) => x.last !== today)?.person ?? null;
}

const NIQQUD = /[֑-ׇ]/g;

export function normalize(s: string): string {
  return s.replace(/[\u05BE-]/g, ' ').replace(NIQQUD, '').replace(/["'״׳]/g, '')
    .split(/\s+/).filter((w) => w && w !== 'הרב' && w !== 'ר').join(' ');
}

// "יוסף חיים בן אליהו הכהן" → own "יוסף חיים", father "אליהו". The first "בן" (or "בר") that is not the
// line's first word splits it, so "בן ציון בן משה" keeps "בן ציון". No "בן": the whole line is his own name.
export function splitCallLine(line: string): { own: string; father: string } {
  const words = normalize(line).split(' ').filter(Boolean);
  while (words.length > 1 && /^ה?(כהן|לוי)$/.test(words[words.length - 1])) words.pop();
  const i = words.findIndex((w, k) => k > 0 && k < words.length - 1 && (w === 'בן' || w === 'בר'));
  return i < 0 ? { own: words.join(' '), father: '' } : { own: words.slice(0, i).join(' '), father: words.slice(i + 1).join(' ') };
}

export type SearchField = 'all' | 'own' | 'father';

// 'all' matches anywhere in the name, calling line or hint; 'own' and 'father' match from the start of a word.
// No text: everyone in the group, by name.
export function search(state: State, q: string, opts: { group?: Group | null; field?: SearchField; area?: AreaFilter } = {}): Person[] {
  const needle = normalize(q);
  if (!needle) {
    const order: Group[] = ['K', 'L', 'Y'];
    return state.people.filter((p) => !p.deleted && (!opts.group || p.group === opts.group) && (!opts.area || inArea(p.area, opts.area)))
      .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.name.localeCompare(b.name, 'he'));
  }
  const field = opts.field ?? 'all';
  return state.people.filter((p) => {
    if (p.deleted) return false;
    if (opts.group && p.group !== opts.group) return false;
    if (opts.area && !inArea(p.area, opts.area)) return false;
    if (field === 'all') return [p.name, p.callLine, p.hint].some((f) => normalize(f).includes(needle));
    return (' ' + splitCallLine(p.callLine)[field]).includes(' ' + needle);
  });
}
