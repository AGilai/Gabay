import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseChat, personKey, groupFromLine, buildDraft, applyDraft } from '../core/whatsapp.ts';
import type { Answer } from '../core/whatsapp.ts';
import { readZipEntry } from '../core/unzip.ts';
import { aliyotOf, search } from '../core/queue.ts';
import type { State } from '../core/types.ts';

const TXT = readFileSync(new URL('./fixtures/chat-sample.txt', import.meta.url), 'utf8');
const ZIP = new Uint8Array(readFileSync(new URL('./fixtures/chat-sample.zip', import.meta.url)));
const TODAY = '2026-09-22';
const empty = (): State => ({ version: 1, people: [], readings: [], sick: [],
  settings: { inactiveDays: 182, prayers: {} as any, lastBackupOn: null } });

test('parseChat keeps the aliyot and skips the noise', () => {
  const { entries, skipped } = parseChat(TXT);
  assert.equal(entries.length, 15);
  assert.equal(skipped.length, 4);
  assert.deepEqual(entries[4], { date: '2026-09-07', time: '07:04', text: 'אליעזר בן עמרם הלוי' });
  // a line without a timestamp belongs to the message above it
  assert.deepEqual(entries[12], { date: '2026-09-14', time: '07:04', text: 'דן בן יעקב' });
  // a forwarded block: its header is skipped, the name under it is kept
  assert.deepEqual(entries[13], { date: '2026-09-17', time: '07:05', text: 'אהרן בן משה הכהן' });
  assert.equal(entries.at(-1)!.time, '13:22');
});

test('personKey ignores titles, notes, בר׳ and spacing; groupFromLine reads the suffix', () => {
  assert.equal(personKey("הרב דוד בר' אלקנה (ברקוביץ)"), personKey('דוד בן אלקנה'));
  assert.equal(personKey('שמעון  בן ראובן (תמר בת לאה)'), 'שמעון בן ראובן');
  assert.equal(personKey('נחמיה בן ברוך הכהן'), 'נחמיה בן ברוך');
  assert.equal(groupFromLine('נחמיה בן ברוך הכהן'), 'K');
  assert.equal(groupFromLine('יונה בן דן הלוי'), 'L');
  assert.equal(groupFromLine('גד בן אשר (בית חולים)'), 'Y');
});

test('the draft groups people and asks only the unclear questions', () => {
  const draft = buildDraft(parseChat(TXT).entries, TODAY);
  assert.equal(draft.people.length, 8);
  const aaron = draft.people.find((p) => p.key === 'אהרן בן משה')!;
  assert.equal(aaron.group, 'K');                 // הכהן missing once does not ask
  assert.equal(aaron.callLine, 'אהרן בן משה הכהן'); // latest spelling of his group
  assert.equal(aaron.regular, true);              // 5 aliyot in 90 days
  assert.deepEqual(draft.people.find((p) => p.key === 'גד בן אשר')!.hints, ['בית חולים']);
  const kinds = draft.questions.map((q) => q.kind).sort();
  assert.deepEqual(kinds, ['hint', 'same']);
  const same = draft.questions.find((q) => q.kind === 'same')!;
  assert.deepEqual([same.a, same.b].sort(), ['אליעזר בן עמרם', 'אליעעזר בן עמרם']);
});

test('applyDraft creates people and history from the answers', () => {
  const draft = buildDraft(parseChat(TXT).entries, TODAY);
  const answers: Answer[] = draft.questions.map((q) => (q.kind === 'same' ? 'merge' : q.kind === 'hint' ? 'drop' : 'keep'));
  const s = applyDraft(empty(), draft, answers);
  assert.equal(s.people.length, 7);
  assert.ok(s.people.every((p) => !p.hint.includes('בת לאה')));
  const eliezer = s.people.filter((p) => p.name.includes('עמרם'));
  assert.equal(eliezer.length, 1);
  const aaron = s.people.find((p) => p.name === 'אהרן בן משה')!;
  assert.equal(aliyotOf(s).get(aaron.id)!.at(-1), '2026-09-17');
  assert.equal(aaron.addedOn, '2026-09-03');
  const mincha = s.readings.find((r) => r.service === 'mincha')!;
  assert.equal(mincha.date, '2026-09-21');
  const fourth = s.readings.find((r) => r.date === '2026-09-14')!;
  assert.deepEqual(fourth.slots.map((x) => x.role), ['K', 'L', 'Y3', 'Y4']);
  assert.ok(s.readings.every((r) => r.source === 'whatsapp' && r.slots.every((x) => x.doneAt)));
});

test('readZipEntry returns the chat text from the exported zip', async () => {
  assert.equal(await readZipEntry(ZIP, '.txt'), TXT);
  assert.equal(await readZipEntry(ZIP, '.jpg'), null);
});

const e = (date: string, text: string) => ({ date, time: '07:05', text });

test('import marks as regular anyone with 3+ aliyot in the last 12 months (the log is sparse)', () => {
  const d = buildDraft([e('2026-01-05', 'זאב בן חיים'), e('2026-05-11', 'זאב בן חיים'), e('2026-09-10', 'זאב בן חיים'),
    e('2025-06-01', 'עוז בן טל'), e('2025-07-01', 'עוז בן טל'), e('2026-09-01', 'עוז בן טל')], TODAY);
  assert.equal(d.people.find((p) => p.key === 'זאב בן חיים')!.regular, true);
  assert.equal(d.people.find((p) => p.key === 'עוז בן טל')!.regular, false);
});

test('a missing הכהן / הלוי is a slip, not a group question; a real conflict asks', () => {
  const slip = buildDraft([e('2026-09-01', 'רם בן נח הכהן'), e('2026-09-03', 'רם בן נח הכהן'), e('2026-09-07', 'רם בן נח הכהן'),
    e('2026-09-10', 'רם בן נח'), e('2026-09-14', 'רם בן נח')], TODAY);
  assert.deepEqual(slip.questions, []);
  const mixed = buildDraft([e('2026-09-01', 'עמי בן שי'), e('2026-09-03', 'עמי בן שי'), e('2026-09-07', 'עמי בן שי הלוי')], TODAY);
  assert.deepEqual(mixed.questions.map((q) => q.kind), ['group']);
  const kl = buildDraft([e('2026-09-01', 'בועז בן עדי הלוי'), e('2026-09-03', 'בועז בן עדי הלוי'), e('2026-09-07', 'בועז בן עדי הכהן')], TODAY);
  assert.deepEqual(kl.questions.map((q) => q.kind), ['group']);
});

test('review: WhatsApp system lines never become people', () => {
  const text = [
    '[30/01/2025, 06:58:00] עליות: ‎Messages and calls are end-to-end encrypted. Only people in this chat can read them.',
    '‎[30/01/2025, 06:59:00] ‎Asaf created group "עליות"',
    '[30/01/2025, 07:00:00] Asaf: ‎<attached: 0000-PHOTO-2025-01-30.jpg>',
    '[30/01/2025, 07:01:00] Asaf: ‎Missed voice call',
    '[30/01/2025, 07:02:00] Asaf: רם בן נח הכהן',
  ].join('\n');
  const { entries, skipped } = parseChat(text);
  assert.deepEqual(entries.map((x) => x.text), ['רם בן נח הכהן']);
  assert.equal(skipped.length, 4);
});

test("review: ר' without בן is the same person as בן", () => {
  assert.equal(personKey("דוד ר' אלקנה"), personKey('דוד בן אלקנה'));
  assert.equal(personKey("דוד בן ר' אלקנה"), personKey('דוד בן אלקנה'));
});

test('review: the group answer survives a merge, and the calling line follows it', () => {
  const draft = buildDraft([
    e('2026-08-01', 'שמעיה בן אלישע'), e('2026-08-03', 'שמעיה בן אלישע'), e('2026-08-06', 'שמעיה בן אלישע'),
    e('2026-08-10', 'שמעיה בן אלישע'), e('2026-08-13', 'שמעיה בן אלישע הלוי'), e('2026-08-17', 'שמעיה בן אלישע הלוי'),
    e('2026-09-01', 'שמעיה בן אלישאע'),
  ], TODAY);
  const answers: Answer[] = draft.questions.map((q) => (q.kind === 'group' ? 'L' : q.kind === 'same' ? 'merge' : 'keep'));
  assert.deepEqual(draft.questions.map((q) => q.kind).sort(), ['group', 'same']);
  const s = applyDraft(empty(), draft, answers);
  assert.equal(s.people.length, 1);
  assert.equal(s.people[0].group, 'L');
  assert.equal(s.people[0].callLine, 'שמעיה בן אלישע הלוי');
});

test('review: the display name keeps geresh and maqaf; search treats maqaf as a space', () => {
  const draft = buildDraft([e('2026-09-01', "הרב ז'ק בן־עמי בן ג'ורג' הכהן (טייב)")], TODAY);
  const s = applyDraft(empty(), draft, draft.questions.map(() => 'keep'));
  assert.equal(s.people[0].name, "ז'ק בן־עמי בן ג'ורג'");
  assert.equal(s.people[0].callLine, "הרב ז'ק בן־עמי בן ג'ורג' הכהן");
  assert.deepEqual(search(s, 'בן עמי').map((x) => x.name), [s.people[0].name]);
});
