import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addDays } from '../core/dates.ts';
import { dayInfo } from '../core/day.ts';
import { readingFor, type TorahData } from '../core/torah.ts';

const data: TorahData = JSON.parse(readFileSync(new URL('../web/data/torah.json', import.meta.url), 'utf8'));

test('every reading day of the app calendar (2026-10 … 2036-12) has its Torah reading, mincha on fasts too', () => {
  const missing: string[] = [];
  for (let d = '2026-10-01'; d <= '2036-12-31'; d = addDays(d, 1)) {
    const info = dayInfo(d);
    if (!info.reading) continue;
    if (!readingFor(data, d, 'shacharit')) missing.push(d);
    if (info.hasMincha && !readingFor(data, d, 'mincha')) missing.push(d + ' mincha');
  }
  assert.deepEqual(missing, []);
});

test('every aliyah has all its verses, ending on the verse its reference names', () => {
  for (const [date] of Object.entries(data.days)) {
    const r = readingFor(data, date, 'shacharit')!;
    for (const a of r.aliyot) {
      const [book, , , c2, v2] = a.ref;
      assert.ok(a.verses.length > 0, `${date} ${a.label}`);
      assert.equal(a.verses.at(-1)!.key, `${book} ${c2}:${v2}`, `${date} ${a.label}`);
    }
  }
});

test('the shul customs: Sukkot all four read the day, Chanukah the 3rd repeats the day, Monday has 3 aliyot', () => {
  const hr = readingFor(data, '2026-10-02', 'shacharit')!; // Hoshana Rabba
  assert.deepEqual(hr.aliyot.map((a) => a.label), Array(4).fill('במדבר כ״ט לב–לד'));
  const ch2 = readingFor(data, '2026-12-06', 'shacharit')!;
  assert.equal(ch2.aliyot[2].label, 'במדבר ז׳ יח–כג');
  assert.equal(readingFor(data, '2026-10-26', 'shacharit')!.aliyot.length, 3);
});
