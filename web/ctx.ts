// What every screen gets, and helpers for "the reading being worked on".
import { dayInfo, nextReadingDate } from '../core/day.ts';
import type { ISODate, Reading, State } from '../core/types.ts';
import type { Store } from './store.ts';

export interface Ctx {
  store: Store;
  today: ISODate;
  go(hash: string): void;   // open a screen
  home(hash?: string): void; // back to a screen opened earlier (default: the main page)
  replace(hash: string): void; // swap the current screen (no new history entry)
  refresh(): void;          // re-render the current screen
}

export interface ReadingKey { date: ISODate; service: Reading['service']; minyan?: number }

const mOf = (x: { minyan?: number }) => x.minyan ?? 1;
const same = (a: ReadingKey, b: ReadingKey) => a.date === b.date && a.service === b.service && mOf(a) === mOf(b);
const slotKey = (k: ReadingKey) => k.date + '.' + k.service;

// The minyan picked on the main page for a day, kept while the app is open.
const picked = new Map<string, number>();
export function pickMinyan(k: ReadingKey): void {
  picked.set(slotKey(k), mOf(k));
}

// On a fast day the afternoon reading is mincha.
export function currentKey(today: ISODate, hour = new Date().getHours()): ReadingKey {
  return withPicked({ date: today, service: dayInfo(today).hasMincha && hour >= 12 ? 'mincha' : 'shacharit' });
}

// A day's key with the minyan picked for it (only one that exists).
export function withPicked(k: { date: ISODate; service: Reading['service'] }, state?: State): ReadingKey {
  const m = picked.get(slotKey(k)) ?? 1;
  return m > 1 && (!state || state.readings.some((r) => same(r, { ...k, minyan: m }))) ? { ...k, minyan: m } : { ...k };
}

// The reading the main page works on: today's, or on a day with no reading (and none opened by hand)
// the next reading day's, so the gabbai can prepare it.
export function activeKey(state: State, today: ISODate): ReadingKey {
  const now = currentKey(today);
  if (dayInfo(today).reading || findReading(state, now)) return withPicked(now, state);
  return withPicked({ date: nextReadingDate(today), service: 'shacharit' }, state);
}

export function sameKey(a: ReadingKey, b: ReadingKey): boolean {
  return same(a, b);
}

// The minyanim of a day and service: always 1, and any other saved.
export function minyanim(state: State, k: ReadingKey): number[] {
  const ms = state.readings.filter((r) => r.date === k.date && r.service === k.service).map(mOf);
  return [...new Set([1, ...ms])].sort((a, b) => a - b);
}

export function keyText(k: ReadingKey): string {
  return slotKey(k) + (mOf(k) > 1 ? '.' + mOf(k) : '');
}

export function parseKey(s: string | undefined): ReadingKey | null {
  const m = /^(\d{4}-\d\d-\d\d)\.(shacharit|mincha)(?:\.(\d))?$/.exec(s ?? '');
  return m ? { date: m[1], service: m[2] as Reading['service'], minyan: m[3] ? Number(m[3]) : 1 } : null;
}

export function findReading(state: State, k: ReadingKey): Reading | null {
  return state.readings.find((r) => same(r, k)) ?? null;
}

export function withReading(state: State, r: Reading): State {
  const others = state.readings.filter((x) => !same(x, r));
  return { ...state, readings: [...others, r].sort((a, b) => a.date.localeCompare(b.date) || a.service.localeCompare(b.service) || mOf(a) - mOf(b)) };
}

export function withoutReading(state: State, k: ReadingKey): State {
  return { ...state, readings: state.readings.filter((x) => !same(x, k)) };
}

export function personById(state: State, id: string | null) {
  return id ? state.people.find((p) => p.id === id) ?? null : null;
}

export const GROUP_WORD = { K: 'כהן', L: 'לוי', Y: 'ישראל' } as const;
export const GROUP_PLURAL = { K: 'כהנים', L: 'לויים', Y: 'ישראלים' } as const;
export const GROUP_CLASS = { K: 'k', L: 'l', Y: 'y' } as const;
