import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lock, unlock } from '../core/lock.ts';

const data = new TextEncoder().encode('[03/09/2026, 7:05:10] Asaf: אהרן בן משה הכהן');

test('a locked file opens with its passphrase and gives back the exact bytes', async () => {
  const locked = await lock(data, 'kq7m-3xtz-pa9w', 1000);
  assert.ok(!new TextDecoder().decode(locked).includes('אהרן'));
  assert.deepEqual(await unlock(locked, 'kq7m-3xtz-pa9w'), data);
});

test('a wrong passphrase is refused in Hebrew', async () => {
  const locked = await lock(data, 'right', 1000);
  await assert.rejects(unlock(locked, 'wrong'), { message: 'הסיסמה שגויה' });
});

test('a file that is not a locked file is refused', async () => {
  await assert.rejects(unlock(data, 'x'), { message: 'זה לא קובץ נעול של גבאי' });
});
