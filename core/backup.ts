// A backup is the whole State in one JSON file, which the gabbai keeps outside the phone.
import { defaultPrayers, upgradePrayers } from './prayers.ts';
import type { ISODate, State } from './types.ts';

const BAD = 'קובץ הגיבוי לא תקין';

export function emptyState(_today: ISODate): State {
  return { version: 1, people: [], readings: [], sick: [],
    settings: { inactiveDays: 182, prayers: defaultPrayers(), lastBackupOn: null } };
}

export function exportBackup(state: State, exportedAt: string): string {
  return JSON.stringify({ app: 'gabay', version: 1, exportedAt, state });
}

export function parseBackup(text: string): State {
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error(BAD); }
  const s = data?.state;
  const ok = data?.app === 'gabay' && data.version === 1 && s?.version === 1
    && Array.isArray(s.people) && Array.isArray(s.readings) && Array.isArray(s.sick)
    && typeof s.settings?.inactiveDays === 'number' && typeof s.settings?.prayers === 'object';
  if (!ok) throw new Error(BAD);
  return upgradeState(s as State);
}

// Brings a saved state up to the current app version (today: the prayer texts).
export function upgradeState(s: State): State {
  return { ...s, settings: { ...s.settings, prayers: upgradePrayers(s.settings.prayers) } };
}
