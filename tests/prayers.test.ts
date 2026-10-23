import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPrayers, render, joinNames, sickTemplate } from '../core/prayers.ts';
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

test('the default texts are marked as placeholders and carry their name slot', () => {
  const p = defaultPrayers();
  for (const [k, v] of Object.entries(p)) {
    assert.ok(v.endsWith(' (נוסח זמני)'), k);
    assert.ok(v.includes(k.startsWith('sick') ? '{names}' : '{name}'), k);
  }
});
