// What every screen gets, and helpers for "the reading being worked on".
import { dayInfo, nextReadingDate } from '../core/day.ts';
import type { ISODate, Reading, State } from '../core/types.ts';
import type { Store } from './store.ts';

export interface Ctx {
  store: Store;
  today: ISODate;
  go(hash: string): void;   // navigate
  refresh(): void;          // re-render the current screen
}

export interface ReadingKey { date: ISODate; service: Reading['service'] }

// On a fast day the afternoon reading is mincha.
export function currentKey(today: ISODate, hour = new Date().getHours()): ReadingKey {
  return { date: today, service: dayInfo(today).hasMincha && hour >= 12 ? 'mincha' : 'shacharit' };
}

// The reading the main page works on: today's, or on a day with no reading (and none opened by hand)
// the next reading day's, so the gabbai can prepare it.
export function activeKey(state: State, today: ISODate): ReadingKey {
  const now = currentKey(today);
  if (dayInfo(today).reading || findReading(state, now)) return now;
  return { date: nextReadingDate(today), service: 'shacharit' };
}

export function sameKey(a: ReadingKey, b: ReadingKey): boolean {
  return a.date === b.date && a.service === b.service;
}

export function keyText(k: ReadingKey): string {
  return k.date + '.' + k.service;
}

export function parseKey(s: string | undefined): ReadingKey | null {
  const m = /^(\d{4}-\d\d-\d\d)\.(shacharit|mincha)$/.exec(s ?? '');
  return m ? { date: m[1], service: m[2] as Reading['service'] } : null;
}

export function findReading(state: State, k: ReadingKey): Reading | null {
  return state.readings.find((r) => r.date === k.date && r.service === k.service) ?? null;
}

export function withReading(state: State, r: Reading): State {
  const others = state.readings.filter((x) => !(x.date === r.date && x.service === r.service));
  return { ...state, readings: [...others, r].sort((a, b) => a.date.localeCompare(b.date) || a.service.localeCompare(b.service)) };
}

export function withoutReading(state: State, k: ReadingKey): State {
  return { ...state, readings: state.readings.filter((x) => !(x.date === k.date && x.service === k.service)) };
}

export function personById(state: State, id: string | null) {
  return id ? state.people.find((p) => p.id === id) ?? null : null;
}

export const GROUP_WORD = { K: 'כהן', L: 'לוי', Y: 'ישראל' } as const;
export const GROUP_PLURAL = { K: 'כהנים', L: 'לויים', Y: 'ישראלים' } as const;
export const GROUP_CLASS = { K: 'k', L: 'l', Y: 'y' } as const;
