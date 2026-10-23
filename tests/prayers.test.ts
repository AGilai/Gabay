import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DONOR, defaultPrayers, render, joinNames, sickTemplate, upgradePrayers } from '../core/prayers.ts';
import type { SickEntry } from '../core/types.ts';

const sick = (text: string, gender: 'm' | 'f'): SickEntry => ({ id: text, text, gender, addedOn: '2026-10-01', askedOn: null });

test('joinNames attaches ו to the last name', () => {
  assert.equal(joinNames(['רפאל בן שרה', 'מרים בת לאה', 'חיים בן אסתר']), 'רפאל בן שרה, מרים בת לאה וחיים בן אסתר');
  assert.equal(joinNames(['רפאל בן שרה', 'מרים בת לאה']), 'רפאל בן שרה ומרים בת לאה');
  assert.equal(joinNames(['א']), 'א');
  assert.equal(joinNames([]), '');
});

test('render splits a template into text and name parts', () => {
  assert.deepEqual(render('הוא יברך את {name} היום', { name: 'יוסף' }), [
    { text: 'הוא יברך את ', name: false }, { text: 'יוסף', name: true }, { text: ' היום', name: false },
  ]);
});

test('an empty name shows the placeholder, so the gap is visible', () => {
  assert.deepEqual(render('{name}', { name: '' }), [{ text: 'פלוני בן פלוני', name: true }]);
});

test('the sick prayer picks the male, female or plural wording', () => {
  const p = defaultPrayers();
  assert.equal(sickTemplate(p, [sick('א', 'm')]), p.sickM);
  assert.equal(sickTemplate(p, [sick('ב', 'f')]), p.sickF);
  assert.equal(sickTemplate(p, [sick('א', 'm'), sick('ב', 'f')]), p.sickPlural);
});

test('the shipped texts are the Sfard wording (Torat Emet), weekday form, with no placeholder mark', () => {
  const p = defaultPrayers();
  for (const t of Object.values(p)) assert.ok(!t.includes('נוסח זמני'), t);
  assert.ok(p.oleh.includes('לִכְבוֹד הַמָּקוֹם וְלִכְבוֹד הַתּוֹרָה'));
  assert.ok(!p.oleh.includes('הַשַּׁבָּת'));
  assert.ok(p.sickM.includes('לְרַמַ"ח אֵבָרָיו'));
  assert.ok(!p.sickM.includes('מִלִזְּעוֹק'));
  assert.ok(p.yoledetBat.includes('{baby}'));
  for (const k of ['oleh', 'sickM', 'sickF', 'barMitzvah', 'yoledetBen', 'yoledetBat', 'azkaraM', 'azkaraF'] as const) assert.ok(p[k].includes('{name}'), k);
  assert.ok(p.sickPlural.includes('{names}'));
});

test('upgradePrayers replaces the old placeholders and keeps texts the gabbai edited', () => {
  const old = { ...defaultPrayers(), oleh: 'מי שברך… {name}… (נוסח זמני)', sickM: 'הנוסח שלי {name}' };
  const up = upgradePrayers(old);
  assert.equal(up.oleh, defaultPrayers().oleh);
  assert.equal(up.sickM, 'הנוסח שלי {name}');
});

test('the yoledet texts take the donor clause as {donor}; only names are marked', () => {
  const p = defaultPrayers();
  assert.ok(p.yoledetBen.includes('{donor}') && p.yoledetBat.includes('{donor}'));
  const parts = render('בַּעֲבוּר {donor} את {name}', { donor: DONOR.father.ben, name: 'שרה' });
  assert.deepEqual(parts.map((x) => x.name), [false, false, false, true]);
  assert.equal(DONOR.grandfather.ben, 'שֶׁהַסַּבָּא יִתֵּן צְדָקָה בַּעֲבוּרָם');
  assert.equal(DONOR.grandfather.bat, 'שֶׁהַסַּבָּא יִתֵּן צְדָקָה בַּעֲבוּרָם');
});

test('upgradePrayers turns the husband clause of an earlier yoledet text into {donor}, keeping the rest', () => {
  const earlier = 'הנוסח שלי {name}, בַּעֲבוּר שֶׁבַּעְלָהּ יִתֵּן לִצְדָקָה בַּעֲדָהּ, סוף';
  assert.equal(upgradePrayers({ ...defaultPrayers(), yoledetBat: earlier }).yoledetBat, 'הנוסח שלי {name}, בַּעֲבוּר {donor}, סוף');
});

test("an empty baby girl's name shows פלונית", () => {
  assert.deepEqual(render('{baby}', { baby: '' }), [{ text: 'פלונית', name: true }]);
});
