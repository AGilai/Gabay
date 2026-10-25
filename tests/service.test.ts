import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLOSING, OPENING, callFor } from '../core/service.ts';
import { defaultPrayers, sickBlessings } from '../core/prayers.ts';
import type { SickEntry } from '../core/types.ts';

test('the Kohen is called after the opening, with הכהן added only when his line lacks it', () => {
  assert.deepEqual(callFor('K', 'גמליאל בן נריה הכהן'), { lead: 'כֹּהֵן קְרָב, יַעֲמֹד', line: 'גמליאל בן נריה הכהן', added: '' });
  assert.equal(callFor('K', 'גמליאל בן נריה').added, 'הכהן');
  assert.ok(OPENING.startsWith('וְיַעֲזֹר וְיָגֵן'));
  assert.ok(OPENING.includes('הַכֹּל הָבוּ גֹדֶל'));
  assert.equal(CLOSING, 'יַעַמְדוּ הַמַּגְבִּיהַּ וְהַגּוֹלֵל');
});

test('the Levi gets הלוי when his line lacks it', () => {
  assert.deepEqual(callFor('L', 'משה בן עמרם'), { lead: 'יַעֲמֹד', line: 'משה בן עמרם', added: 'הלוי' });
  assert.equal(callFor('L', 'משה בן עמרם הלוי').added, '');
  assert.equal(callFor('L', 'משה בן עמרם הלוי ').added, '');
});

test('the Israel olim get the aliyah word after the calling line', () => {
  assert.equal(callFor('Y3', 'דוד בן ישי').added, 'שלישי');
  assert.equal(callFor('Y4', 'שלמה בן דוד').added, 'רביעי');
  assert.equal(callFor('Y3', 'דוד בן ישי שלישי').added, '');
});

test('with no Kohen, an Israel is called in his place and the next is שני', () => {
  assert.deepEqual(callFor('Y_FOR_K', 'דוד בן ישי'), { lead: 'אֵין כָּאן כֹּהֵן, יַעֲמֹד', line: 'דוד בן ישי', added: 'בִּמְקוֹם כֹּהֵן' });
  assert.equal(callFor('Y2', 'שלמה בן דוד').added, 'שני');
});

test('with no Levi, the Kohen is called again in the Levi\'s place', () => {
  assert.equal(callFor('K_FOR_L', 'גמליאל בן נריה הכהן').added, 'בִּמְקוֹם לֵוִי');
  assert.equal(callFor('K_FOR_L', 'גמליאל בן נריה').added, 'הכהן בִּמְקוֹם לֵוִי');
});

const sick = (text: string, gender: 'm' | 'f'): SickEntry => ({ id: text, text, gender, addedOn: '2026-10-01', askedOn: null });

test('each sick person gets the blessing for a man or for a woman', () => {
  const p = defaultPrayers();
  const list = [sick('רפאל בן שרה', 'm'), sick('חנה בת רבקה', 'f')];
  assert.deepEqual(sickBlessings(p, list, false), [
    { template: p.sickM, name: 'רפאל בן שרה' },
    { template: p.sickF, name: 'חנה בת רבקה' },
  ]);
});

test('all the sick together use one plural blessing; one person always gets his own', () => {
  const p = defaultPrayers();
  const list = [sick('רפאל בן שרה', 'm'), sick('חנה בת רבקה', 'f')];
  assert.deepEqual(sickBlessings(p, list, true), [{ template: p.sickPlural, name: 'רפאל בן שרה וחנה בת רבקה' }]);
  assert.deepEqual(sickBlessings(p, [sick('חנה בת רבקה', 'f')], true), [{ template: p.sickF, name: 'חנה בת רבקה' }]);
  assert.deepEqual(sickBlessings(p, [], false), [{ template: p.sickM, name: '' }]);
});

test('the blessing follows בן / בת in the name, even when the saved switch says otherwise', () => {
  const p = defaultPrayers();
  assert.deepEqual(sickBlessings(p, [sick('חנה בת רבקה', 'm'), sick('רפאל בן שרה', 'f'), sick('יוסי', 'f')], false).map((b) => b.template),
    [p.sickF, p.sickM, p.sickF]);
});

test('with no names chosen, the switch picks the man\'s or the woman\'s blessing', () => {
  const p = defaultPrayers();
  assert.deepEqual(sickBlessings(p, [], false, 'f'), [{ template: p.sickF, name: '' }]);
  assert.deepEqual(sickBlessings(p, [], false, 'm'), [{ template: p.sickM, name: '' }]);
});

test('with no names chosen, several people asking at once get the plural blessing', () => {
  const p = defaultPrayers();
  assert.deepEqual(sickBlessings(p, [], false, 'many'), [{ template: p.sickPlural, name: '' }]);
});
