import { daysBetween } from './dates.ts';
import { yahrzeitThisWeek } from './day.ts';
import type { Group, ISODate, Person, Reading, State } from './types.ts';

export interface Row { person: Person; last: ISODate | null; days: number | null; count12m: number; reason: string | null }
export interface Queue { inReading: Row[]; hiyuv: Row[]; line: Row[]; inactive: Row[] }

const NEW_PERSON_DAYS = 30;

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
  const q: Queue = { inReading: [], hiyuv: [], line: [], inactive: [] };

  for (const person of state.people) {
    if (person.group !== group || person.stopped) continue;
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
    else if (!person.regular && (last === null
      ? daysBetween(person.addedOn, today) > NEW_PERSON_DAYS
      : row.days! > state.settings.inactiveDays)) q.inactive.push(row);
    else q.line.push(row);
  }
  q.line.sort(byWait);
  q.hiyuv.sort(byWait);
  q.inactive.sort(byWait);
  return q;
}

export function suggest(state: State, group: Group, today: ISODate, reading: Reading | null): Person | null {
  const q = buildQueue(state, group, today, reading);
  return (q.hiyuv[0] ?? q.line[0])?.person ?? null;
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
export function search(state: State, q: string, opts: { group?: Group | null; field?: SearchField } = {}): Person[] {
  const needle = normalize(q);
  if (!needle) return [];
  const field = opts.field ?? 'all';
  return state.people.filter((p) => {
    if (opts.group && p.group !== opts.group) return false;
    if (field === 'all') return [p.name, p.callLine, p.hint].some((f) => normalize(f).includes(needle));
    return (' ' + splitCallLine(p.callLine)[field]).includes(' ' + needle);
  });
}

export function shouldOfferRegular(state: State, personId: string, today: ISODate): boolean {
  const p = state.people.find((x) => x.id === personId);
  if (!p || p.regular) return false;
  const recent = (aliyotOf(state).get(personId) ?? []).filter((d) => daysBetween(d, today) <= 90);
  return recent.length >= 3;
}
