import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayInfo, yahrzeitThisWeek, nextReadingDate } from '../core/day.ts';

test('an ordinary Thursday: 3 aliyot, parasha of the coming Shabbat', () => {
  const d = dayInfo('2026-10-22');
  assert.equal(d.reading, true);
  assert.equal(d.defaultCount, 3);
  assert.equal(d.banner, null);
  assert.equal(d.parasha, 'לך־לך');
  assert.equal(d.hebrew, 'י״א בחשון');
  assert.equal(d.weekday, 'יום חמישי');
  assert.equal(d.hasMincha, false);
});

test('Rosh Chodesh (both days): 4 aliyot with a banner', () => {
  for (const date of ['2026-11-10', '2026-11-11']) {
    const d = dayInfo(date);
    assert.equal(d.reading, true, date);
    assert.equal(d.defaultCount, 4, date);
    assert.equal(d.banner, 'ראש חודש כסלו', date);
  }
});

test('Shabbat and an ordinary Wednesday have no weekday reading', () => {
  assert.equal(dayInfo('2026-10-24').reading, false);
  assert.equal(dayInfo('2026-10-21').reading, false);
});

test('Chol HaMoed: 4 aliyot', () => {
  const d = dayInfo('2026-10-01');
  assert.equal(d.defaultCount, 4);
  assert.match(d.banner ?? '', /סוכות/);
});

test('Chanukah: 3, with Rosh Chodesh Tevet: 4, after Chanukah: plain Monday', () => {
  const a = dayInfo('2026-12-08');
  assert.deepEqual([a.reading, a.defaultCount, a.banner], [true, 3, 'חנוכה']);
  const b = dayInfo('2026-12-10');
  assert.deepEqual([b.defaultCount, b.banner], [4, 'ראש חודש טבת · חנוכה']);
  const c = dayInfo('2026-12-14');
  assert.deepEqual([c.reading, c.defaultCount, c.banner], [true, 3, null]);
});

test('fast days read at Shacharit and Mincha', () => {
  const d = dayInfo('2025-03-13');
  assert.deepEqual([d.reading, d.defaultCount, d.hasMincha, d.banner], [true, 3, true, 'תענית אסתר']);
  const av = dayInfo('2026-07-23');
  assert.deepEqual([av.reading, av.hasMincha, av.banner], [true, true, 'תשעה באב']);
});

test('Purim reads; Shushan Purim and Taanit Bechorot do not', () => {
  assert.equal(dayInfo('2026-03-03').banner, 'פורים');
  assert.equal(dayInfo('2026-03-03').reading, true);
  assert.equal(dayInfo('2026-03-04').reading, false);
  assert.equal(dayInfo('2026-04-01').reading, false);
});

test('a yahrzeit counts when it falls within the coming week', () => {
  const y = { day: 13, month: 8, note: '' }; // 13 Cheshvan = 2026-10-24
  assert.equal(yahrzeitThisWeek(y, '2026-10-22'), true);
  assert.equal(yahrzeitThisWeek(y, '2026-10-25'), false);
});

test('review: Yom Kippur Katan and Erev Tisha B\'Av have no reading', () => {
  assert.equal(dayInfo('2025-01-29').reading, false); // Yom Kippur Katan Sh'vat, Wednesday
  assert.equal(dayInfo('2026-07-22').reading, false); // Erev Tisha B'Av, Wednesday
});

test('review: Rosh Chodesh on Shabbat reads only on its weekday, a fast moved by Shabbat reads twice', () => {
  assert.equal(dayInfo('2025-07-26').reading, false);
  assert.equal(dayInfo('2025-12-21').defaultCount, 4);
  const av = dayInfo('2025-08-03');
  assert.deepEqual([av.reading, av.hasMincha], [true, true]);
});

test('nextReadingDate is today on a reading day, else the next reading day', () => {
  assert.equal(nextReadingDate('2026-10-22'), '2026-10-22'); // Thursday
  assert.equal(nextReadingDate('2026-10-23'), '2026-10-26'); // Friday → Monday
  assert.equal(nextReadingDate('2026-10-24'), '2026-10-26'); // Shabbat → Monday
  assert.equal(nextReadingDate('2026-11-08'), '2026-11-09'); // Sunday → Monday
  assert.equal(nextReadingDate('2026-11-10'), '2026-11-10'); // Tuesday, 30 Cheshvan: Rosh Chodesh
});
