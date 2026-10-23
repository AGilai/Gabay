import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pieces, readingFor, refLabel, scrollText, type TorahData } from '../core/torah.ts';

const data: TorahData = {
  credit: 'x',
  readings: [
    [['Genesis', 18, 1, 18, 2], ['Genesis', 18, 3, 18, 3], ['Genesis', 18, 1, 18, 3]],
    [['Exodus', 32, 11, 32, 11], ['Exodus', 34, 1, 34, 1], ['Exodus', 34, 4, 34, 4]],
  ],
  days: { '2026-10-26': [0, 'וירא'], '2027-07-22': [1, 'צום י״ז בתמוז'] },
  mincha: { '2027-07-22': [1, 'צום י״ז בתמוז · מנחה'] },
  verses: {
    'Genesis 18:1': 'וַיֵּרָ֤א אֵלָיו֙ יְהֹוָ֔ה׃', 'Genesis 18:2': 'וַיִּשָּׂ֤א עֵינָיו֙׃ {פ}', 'Genesis 18:3': 'וַיֹּאמַ֑ר׃',
    'Exodus 32:11': 'א׃', 'Exodus 34:1': 'ב׃', 'Exodus 34:4': 'ג׃',
  },
};

test('readingFor gives the aliyot of the day with their verses', () => {
  const r = readingFor(data, '2026-10-26', 'shacharit')!;
  assert.equal(r.name, 'וירא');
  assert.equal(r.aliyot.length, 3);
  assert.deepEqual(r.aliyot[0].verses.map((v) => v.key), ['Genesis 18:1', 'Genesis 18:2']);
  assert.deepEqual(r.aliyot[2].verses.map((v) => v.n), ['א', 'ב', 'ג']);
});

test('a fast day has its own mincha reading; a day without a reading has none', () => {
  assert.equal(readingFor(data, '2027-07-22', 'mincha')!.name, 'צום י״ז בתמוז · מנחה');
  assert.equal(readingFor(data, '2026-10-27', 'shacharit'), null);
  assert.equal(readingFor(data, '2026-10-26', 'mincha'), null);
});

test('refLabel writes the reference in Hebrew, across chapters too', () => {
  assert.equal(refLabel(['Genesis', 18, 6, 18, 8]), 'בראשית י״ח ו–ח');
  assert.equal(refLabel(['Exodus', 22, 24, 23, 5]), 'שמות כ״ב כד – כ״ג ה');
});

test('pieces splits ketiv/qere, scroll notes and the parasha break', () => {
  assert.deepEqual(pieces('אַדְמָ֣ה {{וצביים|וּצְבוֹיִ֔ם}} אֲשֶׁר֙ [[בספרי ספרד ואשכנז בְּע֗וֹר]] {פ}'), [
    { t: 'text', s: 'אַדְמָ֣ה ' }, { t: 'kq', k: 'וצביים', q: 'וּצְבוֹיִ֔ם' }, { t: 'text', s: ' אֲשֶׁר֙ ' },
    { t: 'note', s: 'בספרי ספרד ואשכנז בְּע֗וֹר' }, { t: 'break', s: 'פ' },
  ]);
});

test('scrollText keeps only the letters, as written in the scroll (ketiv, no maqaf, no sof pasuq)', () => {
  assert.equal(scrollText('בֶּן־שְׁבַֽע ׀ שָׁנָה֙ {{וצביים|וּצְבוֹיִ֔ם}} [[הערה]] הַיּֽוֹם׃ {ס}'), 'בן שבע שנה וצביים היום');
});
