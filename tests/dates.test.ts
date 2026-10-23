import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toISODate, fromISODate, daysBetween, addDays, newId } from '../core/dates.ts';
import { hebcal } from '../core/hebcal.ts';

test('toISODate uses the local day, not UTC', () => {
  assert.equal(toISODate(new Date(2026, 9, 22, 23, 30)), '2026-10-22');
});

test('daysBetween counts whole days, also across the DST change', () => {
  assert.equal(daysBetween('2026-10-12', '2026-10-22'), 10);
  assert.equal(daysBetween('2026-03-26', '2026-03-28'), 2);
  assert.equal(daysBetween('2026-10-22', '2026-10-12'), -10);
});

test('addDays crosses month ends', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('newId returns distinct ids', () => {
  assert.notEqual(newId(), newId());
});

test('hebcal loads in Node and converts dates', () => {
  assert.equal(new hebcal.HDate(fromISODate('2026-10-22')).getDate(), 11);
});
