// Example data for ?demo=1 (screenshots and trying the app). Every name here is invented.
// Kept in memory only; nothing is saved.
import { emptyState } from '../core/backup.ts';
import { addDays, fromISODate } from '../core/dates.ts';
import { hebcal } from '../core/hebcal.ts';
import { layout } from '../core/slots.ts';
import type { Group, ISODate, Person, Reading, State } from '../core/types.ts';

const PEOPLE: [Group, string, string, string][] = [
  ['K', 'משה כ״ץ', 'משה בן אברהם הכהן', 'ליד החלון'],
  ['K', 'שמעון כהנא', 'שמעון בן מאיר הכהן', 'בעל התקיעות · ליד הארון'],
  ['K', 'אליהו כ״ץ', 'אליהו בן אברהם הכהן', 'האח של משה · שורה 2'],
  ['K', 'רפאל אזולאי', 'רפאל בן מסעוד הכהן', 'שורה 4, ליד העמוד'],
  ['K', 'בני כהן', 'בנימין בן יצחק הכהן', 'מזדמן · בא עם הבן'],
  ['L', 'יוסי לוי', 'יוסף בן יעקב הלוי', 'משקפיים עגולות'],
  ['L', 'נחום הלוי', 'נחום בן שלמה הלוי', 'שורה 3'],
  ['L', 'עמרם לוי', 'עמרם בן חיים הלוי', 'מגיע מאוחר'],
  ['L', 'צבי סגל', 'צבי הירש בן דוד הלוי', 'יושב מאחור'],
  ['Y', 'דוד פרץ', 'דוד בן מנוח', 'שורה 1'],
  ['Y', 'אבי רוזן', 'אברהם בן שלמה', 'הגבאי של שבת'],
  ['Y', 'נתנאל עזרא', 'נתנאל בן יוסף', 'חייל, בא בחופשות'],
  ['Y', 'אריה גולן', 'אריה ליב בן מנחם', 'מאחורי הבימה'],
  ['Y', 'חיים ברק', 'חיים בן אליהו', 'ליד הדלת'],
  ['Y', 'יעקב מזרחי', 'יעקב בן רחמים', 'שורה 5'],
  ['Y', 'אלון שגיא', 'אלון בן רפאל', 'כיפה לבנה'],
  ['Y', 'מאיר טל', 'מאיר בן ישראל', 'השכן של אבי'],
  ['Y', 'עוזיאל נוי', 'עוזיאל בן שמואל', 'בעל קורא'],
  ['Y', 'גדעון פז', 'גדעון בן אהרן', 'שורה 2'],
  ['Y', 'שאול רביב', 'שאול בן יהודה', 'אורח מירושלים'],
  ['Y', 'תומר בר', 'תומר בן ניסים', 'מזדמן'],
];

export function demoState(today: ISODate): State {
  const s = emptyState(today);
  s.people = PEOPLE.map(([group, name, callLine, hint], i): Person => ({
    id: 'd' + i, name, group, callLine, hint, regular: i % 5 !== 4, stopped: false, seat: '',
    // Most have a seat area; every fourth has none yet.
    area: i % 4 === 3 ? null : { col: (i * 2) % 5 + 1, half: i % 3 === 0 ? 'R' : 'F' },
    yahrzeits: [], addedOn: addDays(today, -400), hiyuv: null,
  }));
  // A newcomer who has not been called yet, and a yahrzeit two days from now.
  s.people.push({ id: 'dnew', name: 'יצחק רפפורט', group: 'K', callLine: 'יצחק בן נתן הכהן', hint: 'חדש · שורה אחרונה',
    regular: false, stopped: false, seat: '', yahrzeits: [], addedOn: addDays(today, -3), hiyuv: null });
  const hd = new hebcal.HDate(fromISODate(addDays(today, 2)));
  s.people.push({ id: 'dyz', name: 'אהרן כהן', group: 'K', callLine: 'אהרן בן יוסף הכהן', hint: 'יושב ליד הגבאי',
    regular: true, stopped: false, seat: '', yahrzeits: [{ day: hd.getDate(), month: hd.getMonth(), note: 'לאביו' }],
    addedOn: addDays(today, -400), hiyuv: null });

  const byGroup = (g: Group) => s.people.filter((p) => p.group === g && !p.id.startsWith('dnew'));
  const K = byGroup('K'), L = byGroup('L'), Y = byGroup('Y');
  let n = 0;
  for (let d = addDays(today, -200); d < today; d = addDays(d, 1)) {
    const dow = fromISODate(d).getDay();
    if (dow !== 1 && dow !== 4) continue;
    // The occasional people (every fifth) were last seen long ago.
    const pick = (list: Person[], k: number) => {
      const active = d > addDays(today, -150) ? list.filter((p) => p.regular) : list;
      return active[k % active.length];
    };
    const roles = layout(3, false, false);
    const ids = [pick(K, n).id, pick(L, n).id, pick(Y, 2 * n).id];
    const reading: Reading = { date: d, service: 'shacharit', count: 3, noKohen: false, noLevi: false, source: 'app',
      slots: roles.map((role, i) => ({ role, personId: ids[i], doneAt: '07:' + String(10 + i * 6) })) };
    s.readings.push(reading);
    n++;
  }
  s.sick = [
    { id: 's1', text: 'רפאל בן שרה', gender: 'm', addedOn: addDays(today, -12), askedOn: null },
    { id: 's2', text: 'מרים בת לאה', gender: 'f', addedOn: addDays(today, -5), askedOn: null },
    { id: 's3', text: 'חיים בן אסתר', gender: 'm', addedOn: addDays(today, -40), askedOn: null },
  ];
  s.settings.lastBackupOn = addDays(today, -3);
  return s;
}
