import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aliyotOf, buildQueue, suggest, search, shouldOfferRegular, normalize } from '../core/queue.ts';
import type { Person, Reading, SlotRole, State, Group } from '../core/types.ts';

const TODAY = '2026-10-22';

function mk(id: string, o: Partial<Person> = {}): Person {
  return { id, name: id, group: 'K', callLine: id, hint: '', regular: true, stopped: false, seat: '',
    yahrzeits: [], addedOn: '2025-01-01', hiyuv: null, ...o };
}
function readingOn(date: string, entries: [string, SlotRole][], done = true): Reading {
  return { date, service: 'shacharit', count: entries.length, noKohen: false, noLevi: false, source: 'app',
    slots: entries.map(([personId, role]) => ({ role, personId, doneAt: done ? '07:10' : null })) };
}
function st(people: Person[], readings: Reading[]): State {
  return { version: 1, people, readings, sick: [],
    settings: { inactiveDays: 182, prayers: {} as any, lastBackupOn: null } };
}
const ids = (rows: { person: Person }[]) => rows.map((r) => r.person.id);

test('the line: never called first, then longest wait; a recent one is last, not removed', () => {
  const s = st(
    [mk('A'), mk('B'), mk('C', { regular: false, addedOn: '2026-10-19' })],
    [readingOn('2026-08-20', [['A', 'K']]), readingOn('2026-10-16', [['B', 'K']])],
  );
  const q = buildQueue(s, 'K', TODAY, null);
  assert.deepEqual(ids(q.line), ['C', 'A', 'B']);
  assert.equal(q.line[1].days, 63);
  assert.equal(q.line[0].last, null);
});

test('only occasional people go inactive after the threshold; regulars stay', () => {
  const s = st(
    [mk('D', { group: 'Y', regular: false }), mk('E', { group: 'Y', regular: true })],
    [readingOn('2026-04-05', [['D', 'Y3']]), readingOn('2025-09-17', [['E', 'Y3']])],
  );
  const q = buildQueue(s, 'Y', TODAY, null);
  assert.deepEqual(ids(q.inactive), ['D']);
  assert.deepEqual(ids(q.line), ['E']);
});

test('an occasional person never called and added over 30 days ago is inactive', () => {
  const q = buildQueue(st([mk('N', { regular: false, addedOn: '2026-08-01' })], []), 'K', TODAY, null);
  assert.deepEqual(ids(q.inactive), ['N']);
});

test('a stopped person is in no list, but search finds him', () => {
  const s = st([mk('F', { name: 'פנחס גולד', stopped: true })], []);
  const q = buildQueue(s, 'K', TODAY, null);
  assert.equal(q.line.length + q.inactive.length + q.hiyuv.length + q.inReading.length, 0);
  assert.deepEqual(search(s, 'פנחס').map((p) => p.id), ['F']);
});

test('a hiyuv for today comes first, with its reason', () => {
  const s = st([mk('A'), mk('G', { hiyuv: { date: TODAY, reason: 'בר מצווה' } })], []);
  const q = buildQueue(s, 'K', TODAY, null);
  assert.deepEqual(ids(q.hiyuv), ['G']);
  assert.equal(q.hiyuv[0].reason, 'בר מצווה');
  assert.deepEqual(ids(q.line), ['A']);
});

test('a yahrzeit this week is a hiyuv', () => {
  const s = st([mk('Y1', { yahrzeits: [{ day: 13, month: 8, note: 'לאביו' }] })], []);
  const q = buildQueue(s, 'K', TODAY, null);
  assert.deepEqual(ids(q.hiyuv), ['Y1']);
  assert.equal(q.hiyuv[0].reason, 'יארצייט · לאביו');
});

test('people in today\'s reading are listed apart, and suggest skips them', () => {
  const s = st(
    [mk('A'), mk('B'), mk('C', { regular: false, addedOn: '2026-10-19' })],
    [readingOn('2026-08-20', [['A', 'K']]), readingOn('2026-10-16', [['B', 'K']])],
  );
  const today = readingOn(TODAY, [['C', 'K']], false);
  const q = buildQueue(s, 'K', TODAY, today);
  assert.deepEqual(ids(q.inReading), ['C']);
  assert.deepEqual(ids(q.line), ['A', 'B']);
  assert.equal(suggest(s, 'K', TODAY, today)?.id, 'A');
});

test('ties on waiting time go to the one with fewer aliyot this year', () => {
  const s = st(
    [mk('H', { group: 'Y' }), mk('I', { group: 'Y' })],
    [
      readingOn('2026-03-01', [['I', 'Y3']]), readingOn('2026-04-01', [['I', 'Y3']]),
      readingOn('2026-05-01', [['I', 'Y3'], ['H', 'Y4']]), readingOn('2026-06-01', [['I', 'Y3']]),
      readingOn('2026-07-01', [['I', 'Y3'], ['H', 'Y4']]),
    ],
  );
  assert.deepEqual(ids(buildQueue(s, 'Y', TODAY, null).line), ['H', 'I']);
});

test('only done slots count as aliyot', () => {
  const s = st([mk('A')], [readingOn('2026-10-01', [['A', 'K']], false)]);
  assert.equal(aliyotOf(s).get('A'), undefined);
});

test('search ignores titles and geresh styles', () => {
  const s = st([mk('R', { group: 'Y', callLine: "הרב דוד בר' אלקנה", name: 'דוד בן אלקנה' })], []);
  assert.deepEqual(search(s, 'הרב דוד בר׳ אלקנה').map((p) => p.id), ['R']);
  assert.equal(normalize('  ר\' משה  "הכהן" '), 'משה הכהן');
});

test('offer "regular" after 3 aliyot in 90 days, only to occasional people', () => {
  const r = [readingOn('2026-08-03', [['O', 'Y3']]), readingOn('2026-09-03', [['O', 'Y3']]), readingOn('2026-10-12', [['O', 'Y3']])];
  assert.equal(shouldOfferRegular(st([mk('O', { group: 'Y', regular: false })], r), 'O', TODAY), true);
  assert.equal(shouldOfferRegular(st([mk('O', { group: 'Y', regular: true })], r), 'O', TODAY), false);
  assert.equal(shouldOfferRegular(st([mk('O', { group: 'Y', regular: false })], r.slice(1)), 'O', TODAY), false);
});
