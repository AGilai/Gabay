import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, exportBackup, parseBackup } from '../core/backup.ts';
import type { State } from '../core/types.ts';

function full(): State {
  const s = emptyState('2026-10-22');
  s.people.push({ id: 'p1', name: 'אהרן בן משה', group: 'K', callLine: 'אהרן בן משה הכהן', hint: 'ליד החלון',
    regular: true, stopped: false, seat: '', yahrzeits: [{ day: 13, month: 8, note: 'לאביו' }], addedOn: '2025-01-30', hiyuv: null });
  s.readings.push({ date: '2026-10-22', service: 'shacharit', count: 3, noKohen: false, noLevi: false, source: 'app',
    slots: [{ role: 'K', personId: 'p1', doneAt: '07:05' }, { role: 'L', personId: null, doneAt: null }, { role: 'Y3', personId: null, doneAt: null }] });
  s.sick.push({ id: 's1', text: 'מרים בת לאה', gender: 'f', addedOn: '2026-10-01', askedOn: null });
  s.settings.lastBackupOn = '2026-10-01';
  return s;
}

test('an empty state has the default settings', () => {
  const s = emptyState('2026-10-22');
  assert.equal(s.settings.inactiveDays, 182);
  assert.ok(s.settings.prayers.oleh.includes('{name}'));
  assert.deepEqual([s.people, s.readings, s.sick], [[], [], []]);
});

test('a backup round-trips the whole state', () => {
  const s = full();
  const text = exportBackup(s, '2026-10-22T21:00');
  assert.deepEqual(JSON.parse(text).app, 'gabay');
  assert.deepEqual(parseBackup(text), s);
});

test('a broken or foreign file is refused with a Hebrew message', () => {
  const text = exportBackup(full(), '2026-10-22T21:00');
  assert.throws(() => parseBackup(text.slice(0, -5)), { message: 'קובץ הגיבוי לא תקין' });
  assert.throws(() => parseBackup('{"app":"other"}'), { message: 'קובץ הגיבוי לא תקין' });
  assert.throws(() => parseBackup('{"app":"gabay","version":1,"state":{"version":1}}'), { message: 'קובץ הגיבוי לא תקין' });
});
