import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../web/store.ts';

test('undo restores the previous state exactly, once', async () => {
  const store = await openStore('2026-10-22', true);
  const before = structuredClone(store.get());
  const next = structuredClone(before);
  next.sick.push({ id: 's1', text: 'מרים בת לאה', gender: 'f', addedOn: '2026-10-22', askedOn: null });
  store.set(next, 'סומן');
  assert.equal(store.get().sick.length, before.sick.length + 1);
  store.undo();
  assert.deepEqual(store.get(), before);
  store.undo();
  assert.deepEqual(store.get(), before);
});

test('subscribers hear every change and can unsubscribe', async () => {
  const store = await openStore('2026-10-22', true);
  let n = 0;
  const off = store.subscribe(() => n++);
  store.set(structuredClone(store.get()));
  off();
  store.set(structuredClone(store.get()));
  assert.equal(n, 1);
});
