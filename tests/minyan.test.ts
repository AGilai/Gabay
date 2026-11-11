import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepReadingDay } from '../core/day.ts';
import { newReading } from '../core/slots.ts';
import { findReading, keyText, minyanim, parseKey, withReading } from '../web/ctx.ts';
import type { State } from '../core/types.ts';

const empty = (): State => ({ version: 1, people: [], readings: [], sick: [],
  settings: { inactiveDays: 180, prayers: {} as State['settings']['prayers'], lastBackupOn: null } });

test('the day arrows skip days with no reading', () => {
  assert.equal(stepReadingDay('2026-11-12', 1, new Set()), '2026-11-16'); // Thu → Mon
  assert.equal(stepReadingDay('2026-11-16', -1, new Set()), '2026-11-12');
  assert.equal(stepReadingDay('2026-11-11', -1, new Set()), '2026-11-10'); // Rosh Chodesh day 1
});

test('a day with a reading opened by hand is a stop too', () => {
  assert.equal(stepReadingDay('2026-11-12', 1, new Set(['2026-11-15'])), '2026-11-15');
});

test('a key carries its minyan; minyan 1 keeps the old form', () => {
  assert.equal(keyText({ date: '2026-11-11', service: 'shacharit' }), '2026-11-11.shacharit');
  assert.equal(keyText({ date: '2026-11-11', service: 'shacharit', minyan: 2 }), '2026-11-11.shacharit.2');
  assert.deepEqual(parseKey('2026-11-11.shacharit.2'), { date: '2026-11-11', service: 'shacharit', minyan: 2 });
  assert.deepEqual(parseKey('2026-11-11.mincha'), { date: '2026-11-11', service: 'mincha', minyan: 1 });
});

test('two minyanim on the same day are kept apart', () => {
  const one = newReading('2026-11-11', 'shacharit', 4);
  const two = { ...newReading('2026-11-11', 'shacharit', 4), minyan: 2 };
  let s = withReading(withReading(empty(), one), two);
  assert.equal(s.readings.length, 2);
  assert.equal(findReading(s, { date: '2026-11-11', service: 'shacharit', minyan: 2 }), two);
  assert.equal(findReading(s, { date: '2026-11-11', service: 'shacharit' }), one);
  s = withReading(s, { ...one, count: 3 });
  assert.equal(s.readings.length, 2);
  assert.deepEqual(minyanim(s, { date: '2026-11-11', service: 'shacharit' }), [1, 2]);
  assert.deepEqual(minyanim(empty(), { date: '2026-11-11', service: 'shacharit' }), [1]);
});

test('a new reading for minyan 2 is saved as minyan 2', () => {
  assert.equal(newReading('2026-11-11', 'shacharit', 4, 2).minyan, 2);
  assert.equal('minyan' in newReading('2026-11-11', 'shacharit', 4), false);
});
