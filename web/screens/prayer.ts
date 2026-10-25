// S4: prayer text in large type, names filled in. Olim are named by their calling line.
import { DONOR, render, sickBlessings, withoutNaming } from '../../core/prayers.ts';
import { GOMEL, SIDDUR_CREDIT, TORAH_BLESSINGS, type Said } from '../../core/service.ts';
import type { State } from '../../core/types.ts';
import { currentKey, findReading, personById, type Ctx } from '../ctx.ts';
import { appBar, h, icon } from '../ui.ts';

export type PrayerKind = 'oleh' | 'sick' | 'barMitzvah' | 'yoledet' | 'azkara' | 'brachot' | 'gomel';
const TITLE: Record<PrayerKind, string> = {
  oleh: 'מי שברך לעולה', sick: 'מי שברך לחולים', barMitzvah: 'מי שברך לבר מצווה', yoledet: 'מי שברך ליולדת', azkara: 'אזכרה',
  brachot: 'ברכות התורה', gomel: 'ברכת הגומל',
};
const SIZE_KEY = 'gabay.prayerSize';

// Kept while the app is open, so going back and forth keeps the choice.
let olehId: string | null = null;
const sickOff = new Set<string>();
let typed = '';
let baby = '';
let grandfather = false; // yoledet: the oleh is the baby's grandfather
let naming = true; // yoledet bat: the girl is named now (off: grandfather, or the parents postpone)
let female = false;
let sickBlank: 'm' | 'f' | 'many' = 'm'; // sick, no names chosen: whose wording
let sickTogether = false; // several sick: one plural blessing instead of one per person
const FIXED: Partial<Record<PrayerKind, Said[]>> = { brachot: TORAH_BLESSINGS, gomel: GOMEL };

function readSize(): number {
  try { return Number(localStorage.getItem(SIZE_KEY)) || 24; } catch { return 24; }
}

function writeSize(n: number): void {
  try { localStorage.setItem(SIZE_KEY, String(n)); } catch { /* private mode: keep for this session only */ }
}

type Text = { template: string; vars: Record<string, string> };
function textOf(state: State, kind: PrayerKind, names: { name?: string; names?: string }): Text[] {
  const p = state.settings.prayers;
  const donor = DONOR[grandfather ? 'grandfather' : 'father'][female ? 'bat' : 'ben'];
  const vars = { name: names.name ?? '', names: names.names ?? '', baby, donor };
  if (kind === 'oleh') return [{ template: p.oleh, vars }];
  if (kind === 'barMitzvah') return [{ template: p.barMitzvah, vars }];
  if (kind === 'yoledet') return [{ template: female ? (naming ? p.yoledetBat : withoutNaming(p.yoledetBat)) : p.yoledetBen, vars }];
  if (kind === 'azkara') return [{ template: female ? p.azkaraF : p.azkaraM, vars }];
  const chosen = state.sick.filter((s) => !sickOff.has(s.id));
  return sickBlessings(p, chosen, sickTogether, sickBlank).map((b) => ({ template: b.template, vars: { ...vars, name: b.name, names: b.name } }));
}

export function renderPrayer(ctx: Ctx, kindArg: string): HTMLElement {
  const kind: PrayerKind = kindArg in TITLE ? (kindArg as PrayerKind) : 'oleh';
  // The yoledet is named like a sick person, by her mother's name.
  const blanks: Record<string, string> = kind === 'yoledet' || (kind === 'sick' && sickBlank === 'f') ? { name: 'פלונית בת פלונית' }
    : kind === 'sick' && sickBlank === 'many' ? { names: 'פלוני בן פלוני ופלונית בת פלונית' } : {};
  const state = ctx.store.get();
  let size = readSize();
  const para = h('div', { class: 'texts' });
  const reader = h('main', { class: 'reader', style: `--prayer-size:${size}px` });
  const picks = h('div', { class: 'picks' });
  let sub = 'נוסח ספרד';

  const draw = () => {
    let names: { name?: string; names?: string } = {};
    picks.replaceChildren();
    if (kind === 'oleh') {
      const r = findReading(state, currentKey(ctx.today));
      const olim = (r?.slots ?? []).filter((s) => s.personId && s.role !== 'K_FOR_L')
        .map((s) => ({ slot: s, p: personById(state, s.personId)! })).filter((x) => x.p);
      const done = olim.filter((x) => x.slot.doneAt).sort((a, b) => a.slot.doneAt!.localeCompare(b.slot.doneAt!));
      if (!olim.some((x) => x.p.id === olehId)) olehId = (done.at(-1) ?? olim[0])?.p.id ?? null;
      for (const x of olim) {
        picks.append(h('button', { class: 'chip' + (x.p.id === olehId ? ' sel' : ''), onclick: () => { olehId = x.p.id; draw(); } }, x.p.name));
      }
      if (!olim.length) picks.append(h('span', { class: 'note' }, 'אין עולים בקריאה של היום. אפשר להקליד שם:'), nameInput());
      names = { name: olim.find((x) => x.p.id === olehId)?.p.callLine ?? typed };
    } else if (kind === 'sick') {
      for (const s of state.sick) {
        const on = !sickOff.has(s.id);
        picks.append(h('button', { class: 'pk' + (on ? '' : ' off'), 'aria-pressed': String(on),
          onclick: () => { on ? sickOff.add(s.id) : sickOff.delete(s.id); draw(); } }, h('span', { class: 'cb' }, on ? '✓' : ''), s.text));
      }
      picks.append(h('a', { class: 'pk off', href: '#sick' }, h('span', { class: 'cb' }), 'הוסף…'));
      // No one chosen (asked for out loud): the gabbai says the names himself and picks the wording.
      if (!state.sick.some((s) => !sickOff.has(s.id))) {
        const opt = (v: typeof sickBlank, text: string) =>
          h('button', { class: sickBlank === v ? 'on' : '', onclick: () => { sickBlank = v; ctx.refresh(); } }, text);
        picks.append(h('div', { class: 'seg', style: 'width:100%', role: 'group', 'aria-label': 'נוסח' },
          opt('m', 'גבר'), opt('f', 'אישה'), opt('many', 'כמה חולים')));
      }
      if (state.sick.filter((s) => !sickOff.has(s.id)).length > 1) {
        picks.append(h('div', { class: 'seg', style: 'width:100%', role: 'group', 'aria-label': 'נוסח' },
          h('button', { class: sickTogether ? '' : 'on', onclick: () => { sickTogether = false; draw(); } }, 'לכל אחד בנפרד'),
          h('button', { class: sickTogether ? 'on' : '', onclick: () => { sickTogether = true; draw(); } }, 'כולם יחד')));
      }
      sub = `${state.sick.filter((s) => !sickOff.has(s.id)).length} שמות · נוסח ספרד`;
    } else if (FIXED[kind]) {
      sub = 'נוסח ספרד';
    } else {
      picks.append(nameInput());
      if (kind !== 'barMitzvah') {
        const [a, b] = kind === 'yoledet' ? ['בן', 'בת'] : ['זכר', 'נקבה'];
        picks.append(h('div', { class: 'seg', style: 'width:100%' },
          h('button', { class: female ? '' : 'on', onclick: () => { female = false; draw(); } }, a),
          h('button', { class: female ? 'on' : '', onclick: () => { female = true; draw(); } }, b)));
        if (kind === 'yoledet') {
          picks.append(h('div', { class: 'seg', style: 'width:100%', role: 'group', 'aria-label': 'מי עולה' },
            h('button', { class: grandfather ? '' : 'on', onclick: () => { grandfather = false; naming = true; draw(); } }, 'האבא עולה'),
            h('button', { class: grandfather ? 'on' : '', onclick: () => { grandfather = true; naming = false; draw(); } }, 'הסבא עולה')));
        }
        // The grandfather never names the baby, so the naming switch is only there when the father is up.
        if (kind === 'yoledet' && female && !grandfather) {
          picks.append(h('div', { class: 'seg', style: 'width:100%', role: 'group', 'aria-label': 'קריאת שם לבת' },
            h('button', { class: naming ? 'on' : '', onclick: () => { naming = true; draw(); } }, 'קריאת שם עכשיו'),
            h('button', { class: naming ? '' : 'on', onclick: () => { naming = false; draw(); } }, 'בלי שם')));
        }
        if (kind === 'yoledet' && female && naming) {
          picks.append(h('div', { class: 'field', style: 'width:100%' }, h('label', {}, 'שם הבת'),
            h('input', { value: baby, placeholder: 'פלונית בת פלוני', oninput: (e: Event) => { baby = (e.target as HTMLInputElement).value.trim(); redraw(); } })));
        }
      }
      names = { name: typed };
    }
    paint(names);
    const small = document.querySelector('.appbar small');
    if (small) small.textContent = sub;
  };

  function nameInput(): HTMLElement {
    return h('div', { class: 'field', style: 'width:100%' }, h('label', {}, kind === 'yoledet' ? 'שם היולדת' : 'שם'),
      h('input', { value: typed, placeholder: blanks.name ?? 'פלוני בן פלוני', oninput: (e: Event) => {
        typed = (e.target as HTMLInputElement).value.trim();
        redraw();
      } }));
  }

  // Redraw only the text, so the field being typed in keeps focus.
  function redraw(): void {
    paint({ name: typed });
  }

  function paint(names: { name?: string; names?: string }): void {
    const fixed = FIXED[kind];
    if (fixed) {
      para.replaceChildren(...fixed.flatMap((x) => [h('div', { class: 'who-says' }, x.who), h('p', { class: 'text' }, x.text)]));
      return;
    }
    para.replaceChildren(...textOf(state, kind, names).map(({ template, vars }) =>
      h('p', { class: 'text' }, ...render(template, vars, blanks).map((part) => (part.name ? h('mark', {}, part.text) : part.text)))));
  }

  const resize = (d: number) => {
    size = Math.min(36, Math.max(18, size + d));
    writeSize(size);
    reader.style.setProperty('--prayer-size', size + 'px');
  };
  draw();
  reader.append(picks, para, h('div', { class: 'note' }, FIXED[kind] ? SIDDUR_CREDIT : 'נוסח ספרד (סידור תורת אמת). אפשר לשנות בהגדרות.'));
  return h('div', { class: 'screen' },
    appBar(TITLE[kind], sub, { back: 'history', end: [
      h('button', { class: 'icon', 'aria-label': 'הקטן', onclick: () => resize(-2) }, 'A−'),
      h('button', { class: 'icon', 'aria-label': 'הגדל', onclick: () => resize(2) }, icon('text')),
    ] }),
    reader);
}
