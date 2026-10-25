import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaTag, filterText, inArea } from '../core/area.ts';
import { search } from '../core/queue.ts';
import type { Person, State } from '../core/types.ts';

function mk(id: string, o: Partial<Person> = {}): Person {
  return { id, name: id, group: 'Y', callLine: id, hint: '', regular: true, stopped: false, seat: '',
    yahrzeits: [], addedOn: '2025-01-01', hiyuv: null, ...o };
}
const st = (people: Person[]): State => ({ version: 1, people, readings: [], sick: [],
  settings: { inactiveDays: 182, prayers: {} as any, lastBackupOn: null } });

test('an area is written as column-half: 3-ק in front, 2-א at the back', () => {
  assert.equal(areaTag({ col: 3, half: 'F' }), '3-ק');
  assert.equal(areaTag({ col: 2, half: 'R' }), '2-א');
  assert.equal(areaTag(null), '');
});

test('an area filter is one area, a whole column, or a whole half', () => {
  assert.equal(filterText({ col: 3, half: 'R' }), '3-א');
  assert.equal(filterText({ col: 3, half: null }), 'טור 3');
  assert.equal(filterText({ col: null, half: 'F' }), 'קדימה');
  assert.equal(filterText({ col: null, half: null }), 'הכל');
});

test('someone with no area matches only the empty filter', () => {
  assert.equal(inArea(undefined, { col: null, half: null }), true);
  assert.equal(inArea(null, { col: 3, half: null }), false);
  assert.equal(inArea({ col: 3, half: 'R' }, { col: 3, half: null }), true);
  assert.equal(inArea({ col: 3, half: 'R' }, { col: null, half: 'F' }), false);
  assert.equal(inArea({ col: 3, half: 'R' }, { col: 3, half: 'R' }), true);
});

test('search by area: with no text, everyone sitting there; with text, both must match', () => {
  const s = st([
    mk('A', { name: 'דוד', area: { col: 1, half: 'R' } }),
    mk('B', { name: 'דניאל', area: { col: 1, half: 'F' } }),
    mk('C', { name: 'דן' }),
  ]);
  assert.deepEqual(search(s, '', { area: { col: 1, half: null } }).map((p) => p.id).sort(), ['A', 'B']);
  assert.deepEqual(search(s, 'ד', { area: { col: null, half: 'R' } }).map((p) => p.id), ['A']);
  assert.deepEqual(search(s, 'ד').map((p) => p.id).sort(), ['A', 'B', 'C']);
});
