// Prayer templates with name slots ({name} / {names}). The shipped texts are placeholders: the
// gabbai pastes his synagogue's nusach Sfard wording in settings.
import type { Prayers, SickEntry } from './types.ts';

export interface Part { text: string; name: boolean }

const PLACEHOLDER_NAME = 'פלוני בן פלוני';
const MARK = ' (נוסח זמני)';

export function defaultPrayers(): Prayers {
  const msb = 'מי שברך אבותינו אברהם יצחק ויעקב';
  return {
    oleh: `${msb}, הוא יברך את {name} בעבור שעלה לכבוד המקום ולכבוד התורה…${MARK}`,
    sickM: `${msb}, משה ואהרן, דוד ושלמה, הוא יברך וירפא את החולה {names}…${MARK}`,
    sickF: `${msb}, משה ואהרן, דוד ושלמה, הוא יברך וירפא את החולה {names}…${MARK}`,
    sickPlural: `${msb}, משה ואהרן, דוד ושלמה, הוא יברך וירפא את החולים {names}…${MARK}`,
    barMitzvah: `${msb}, הוא יברך את {name} שמלאו לו שלוש עשרה שנה…${MARK}`,
    yoledetBen: `${msb}, הוא יברך את האשה היולדת {name} ואת בנה שנולד לה במזל טוב…${MARK}`,
    yoledetBat: `${msb}, הוא יברך את האשה היולדת {name} ואת בתה שנולדה לה במזל טוב, ויקרא שמה בישראל…${MARK}`,
    azkaraM: `אל מלא רחמים… את נשמת {name}…${MARK}`,
    azkaraF: `אל מלא רחמים… את נשמת {name}…${MARK}`,
  };
}

export function joinNames(names: string[]): string {
  if (names.length < 2) return names[0] ?? '';
  return names.slice(0, -1).join(', ') + ' ו' + names[names.length - 1];
}

export function render(template: string, vars: Record<string, string>): Part[] {
  const parts: Part[] = [];
  let rest = template;
  for (let m = /\{(\w+)\}/.exec(rest); m; m = /\{(\w+)\}/.exec(rest)) {
    if (m.index > 0) parts.push({ text: rest.slice(0, m.index), name: false });
    parts.push({ text: vars[m[1]] || PLACEHOLDER_NAME, name: true });
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) parts.push({ text: rest, name: false });
  return parts;
}

export function sickTemplate(p: Prayers, chosen: SickEntry[]): string {
  if (chosen.length === 1) return chosen[0].gender === 'f' ? p.sickF : p.sickM;
  return p.sickPlural;
}
