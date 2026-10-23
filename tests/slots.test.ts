import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_LABEL, groupOf, layout, newReading, relayout, place, markDone, undoDone, clearSlot, focusIndex } from '../core/slots.ts';
import type { Person, Reading, Group } from '../core/types.ts';

function p(id: string, group: Group): Person {
  return { id, name: id, group, callLine: id, hint: '', regular: true, stopped: false, seat: '',
    yahrzeits: [], addedOn: '2025-01-01', hiyuv: null };
}
const ok = (res: ReturnType<typeof place>) => {
  if ('error' in res) throw new Error('unexpected ' + res.error);
  return res;
};
const people = (r: Reading) => r.slots.map((s) => s.personId);

test('layouts: normal, no Kohen (wins over no Levi), no Levi', () => {
  assert.deepEqual(layout(3, false, false), ['K', 'L', 'Y3']);
  assert.deepEqual(layout(4, false, false), ['K', 'L', 'Y3', 'Y4']);
  assert.deepEqual(layout(3, true, false), ['Y_FOR_K', 'Y2', 'Y3']);
  assert.deepEqual(layout(4, true, true), ['Y_FOR_K', 'Y2', 'Y3', 'Y4']);
  assert.deepEqual(layout(3, false, true), ['K', 'K_FOR_L', 'Y3']);
  assert.equal(ROLE_LABEL.Y_FOR_K, 'ישראל במקום כהן');
  assert.equal(ROLE_LABEL.K_FOR_L, 'כהן במקום לוי');
  assert.deepEqual(['K', 'K_FOR_L', 'L', 'Y2', 'Y_FOR_K'].map((r) => groupOf(r as any)), ['K', 'K', 'L', 'Y', 'Y']);
});

test('place without a slot goes to the first free slot of his group', () => {
  let r = newReading('2026-11-11', 'shacharit', 4);
  r = ok(place(r, p('k', 'K'))).reading;
  r = ok(place(r, p('y1', 'Y'))).reading;
  r = markDone(r, 2, '07:20');
  r = ok(place(r, p('y2', 'Y'))).reading;
  assert.deepEqual(people(r), ['k', null, 'y1', 'y2']);
});

test('a person cannot be placed twice', () => {
  const r = ok(place(newReading('2026-10-22', 'shacharit', 3), p('y1', 'Y'))).reading;
  assert.deepEqual(place(r, p('y1', 'Y')), { error: 'already' });
});

test('placing over a slot that is not done replaces its person', () => {
  const r = ok(place(newReading('2026-10-22', 'shacharit', 3), p('a', 'K'))).reading;
  const res = ok(place(r, p('b', 'K')));
  assert.equal(res.replaced, 'a');
  assert.deepEqual(people(res.reading), ['b', null, null]);
});

test('full when every slot of the group is done; group mismatch on a named slot', () => {
  let r = ok(place(newReading('2026-10-22', 'shacharit', 3), p('y1', 'Y'))).reading;
  r = markDone(r, 2, '07:20');
  assert.deepEqual(place(r, p('y2', 'Y')), { error: 'full' });
  assert.deepEqual(place(r, p('y2', 'Y'), 0), { error: 'group' });
});

test('no Kohen: Kohen and Levi are removed, Israel stays', () => {
  let r = newReading('2026-10-22', 'shacharit', 3);
  for (const x of [p('k', 'K'), p('l', 'L'), p('y', 'Y')]) r = ok(place(r, x)).reading;
  const res = relayout(r, { noKohen: true });
  assert.deepEqual(res.removed.sort(), ['k', 'l']);
  assert.deepEqual(people(res.reading), [null, null, 'y']);
  assert.deepEqual(res.reading.slots.map((s) => s.role), ['Y_FOR_K', 'Y2', 'Y3']);
  const back = relayout(res.reading, { noKohen: false });
  assert.deepEqual(people(back.reading), [null, null, 'y']);
  assert.equal(back.blocked, false);
});

test('no Levi: the Kohen also takes the Levi slot, and follows changes of slot 0', () => {
  let r = ok(place(newReading('2026-10-22', 'shacharit', 3), p('k1', 'K'))).reading;
  r = relayout(r, { noLevi: true }).reading;
  assert.deepEqual(people(r), ['k1', 'k1', null]);
  r = ok(place(r, p('k2', 'K'))).reading;
  assert.deepEqual(people(r), ['k2', 'k2', null]);
  const off = relayout(r, { noLevi: false });
  assert.deepEqual(people(off.reading), ['k2', null, null]);
  assert.deepEqual(off.removed, []);
});

test('dropping to 3 is blocked when the fourth aliyah is done', () => {
  let r = ok(place(newReading('2026-11-11', 'shacharit', 4), p('y1', 'Y'), 3)).reading;
  r = markDone(r, 3, '07:30');
  const res = relayout(r, { count: 3 });
  assert.equal(res.blocked, true);
  assert.equal(res.reading, r);
});

test('dropping to 3 removes a fourth person who is not done', () => {
  const r = ok(place(newReading('2026-11-11', 'shacharit', 4), p('y1', 'Y'), 3)).reading;
  const res = relayout(r, { count: 3 });
  assert.deepEqual(res.removed, ['y1']);
  assert.equal(res.reading.slots.length, 3);
  assert.equal(res.reading.count, 3);
});

test('mark done, undo, clear; actions never mutate the input', () => {
  const r0 = ok(place(newReading('2026-10-22', 'shacharit', 3), p('k', 'K'))).reading;
  const r1 = markDone(r0, 0, '07:05');
  assert.equal(r1.slots[0].doneAt, '07:05');
  assert.equal(r0.slots[0].doneAt, null);
  assert.equal(undoDone(r1, 0).slots[0].doneAt, null);
  assert.equal(clearSlot(r0, 0).slots[0].personId, null);
});

test('focus: first assigned-not-done, else first empty, else none', () => {
  let r = newReading('2026-10-22', 'shacharit', 3);
  assert.equal(focusIndex(r), 0);
  r = ok(place(r, p('y', 'Y'))).reading;
  assert.equal(focusIndex(r), 2);
  r = markDone(r, 2, '07:00');
  assert.equal(focusIndex(r), 0);
  r = ok(place(r, p('k', 'K'))).reading;
  r = ok(place(r, p('l', 'L'))).reading;
  r = markDone(markDone(r, 0, '07:01'), 1, '07:02');
  assert.equal(focusIndex(r), -1);
});

test('review: 3 → 4 still works after the "Kohen in place of Levi" aliyah is done', () => {
  let r = relayout(newReading('2026-12-10', 'shacharit', 3), { noLevi: true }).reading;
  r = ok(place(r, p('k', 'K'))).reading;
  r = markDone(markDone(r, 0, '07:01'), 1, '07:03');
  const res = relayout(r, { count: 4 });
  assert.equal(res.blocked, false);
  assert.deepEqual(people(res.reading), ['k', 'k', null, null]);
  assert.equal(res.reading.slots[1].doneAt, '07:03');
});
