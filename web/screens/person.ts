// S5: the person card and quick add. The hint is shown here (private screens only).
import { daysBetween, fromISODate, newId } from '../../core/dates.ts';
import { hebcal } from '../../core/hebcal.ts';
import { aliyotOf } from '../../core/queue.ts';
import { ROLE_LABEL, groupOf, newReading, place } from '../../core/slots.ts';
import { dayInfo } from '../../core/day.ts';
import type { Group, Person, Reading, SlotRole, State } from '../../core/types.ts';
import { GROUP_WORD, activeKey, findReading, keyText, sameKey, withReading, type Ctx, type ReadingKey } from '../ctx.ts';
import { appBar, h, snackbar } from '../ui.ts';

const REASONS = ['בר מצווה', 'חתן', 'אבי הבן', 'אבי הבת', 'הגומל', 'יארצייט'];
// hebcal month numbers in the order of the Hebrew year.
const MONTHS: [number, string][] = [[7, 'תשרי'], [8, 'חשון'], [9, 'כסלו'], [10, 'טבת'], [11, 'שבט'], [12, 'אדר / אדר א׳'],
  [13, 'אדר ב׳'], [1, 'ניסן'], [2, 'אייר'], [3, 'סיון'], [4, 'תמוז'], [5, 'אב'], [6, 'אלול']];

function groupSeg(value: Group, onPick: (g: Group) => void): HTMLElement {
  return h('div', { class: 'seg', role: 'group', 'aria-label': 'קבוצה' }, ...(['K', 'L', 'Y'] as Group[]).map((g) =>
    h('button', { type: 'button', class: g + (g === value ? ' on' : ''), 'aria-pressed': String(g === value), onclick: () => onPick(g) }, GROUP_WORD[g])));
}

function field(label: string, value: string, onChange: (v: string) => void, attrs: Record<string, string> = {}): HTMLElement {
  return h('div', { class: 'field' }, h('label', {}, label),
    h('input', { value, ...attrs, onchange: (e: Event) => onChange((e.target as HTMLInputElement).value.trim()) }));
}

function hebrewDate(date: string): string {
  const hd = new hebcal.HDate(fromISODate(date));
  return hebcal.gematriya(hd.getDate()) + ' ב' + hebcal.Locale.gettext(hd.getMonthName(), 'he-x-NoNikud');
}

export function renderPerson(ctx: Ctx, id: string): HTMLElement {
  const state = ctx.store.get();
  const p = state.people.find((x) => x.id === id);
  if (!p) return h('div', { class: 'screen' }, appBar('לא נמצא', null, { back: 'history' }));
  const update = (patch: Partial<Person>) => {
    const s = ctx.store.get();
    ctx.store.set({ ...s, people: s.people.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  };

  const dates = aliyotOf(state).get(id) ?? [];
  const last = dates.at(-1);
  const roles: { date: string; role: SlotRole }[] = [];
  for (const r of state.readings) for (const s of r.slots) if (s.personId === id && s.doneAt) roles.push({ date: r.date, role: s.role });
  roles.sort((a, b) => b.date.localeCompare(a.date));
  const yearCount = dates.filter((d) => daysBetween(d, ctx.today) <= 365).length;
  const hiyuvToday = p.hiyuv?.date === ctx.today ? p.hiyuv.reason : null;

  let yDay = 1, yMonth = 7, yNote = '';
  const yzAdd = h('div', { class: 'yz' },
    h('select', { 'aria-label': 'יום', onchange: (e: Event) => { yDay = Number((e.target as HTMLSelectElement).value); } },
      ...Array.from({ length: 30 }, (_, i) => h('option', { value: i + 1 }, hebcal.gematriya(i + 1)))),
    h('select', { 'aria-label': 'חודש', onchange: (e: Event) => { yMonth = Number((e.target as HTMLSelectElement).value); } },
      ...MONTHS.map(([n, name]) => h('option', { value: n }, name))),
    h('input', { placeholder: 'למי (לאביו…)', oninput: (e: Event) => { yNote = (e.target as HTMLInputElement).value.trim(); } }),
    h('button', { class: 'btn tonal', type: 'button', onclick: () => update({ yahrzeits: [...p.yahrzeits, { day: yDay, month: yMonth, note: yNote }] }) }, 'הוסף'));

  const sub = GROUP_WORD[p.group] + ' · ' + (p.regular ? 'קבוע' : 'מזדמן') + (p.stopped ? ' · מושהה' : '');
  return h('div', { class: 'screen' },
    appBar(p.name, sub, { back: 'history' }),
    h('main', { class: 'body', style: 'gap:14px;padding-top:12px' },
      p.stopped ? h('div', { class: 'paused' }, 'מושהה, נמצא רק בחיפוש') : null,
      field('שם (מוצג במסך הראשי)', p.name, (v) => v && update({ name: v })),
      groupSeg(p.group, (g) => update({ group: g })),
      field('שם לקריאה (כפי שנקרא)', p.callLine, (v) => update({ callLine: v || p.name })),
      field('רמז (פרטי)', p.hint, (v) => update({ hint: v })),
      field('מקום ישיבה', p.seat, (v) => update({ seat: v })),
      h('label', { class: 'swrow' }, h('span', {}, 'קבוע'),
        h('input', { type: 'checkbox', class: 'sw', role: 'switch', checked: p.regular, onchange: () => update({ regular: !p.regular }) })),
      h('div', { class: 'stats' },
        h('div', {}, h('b', {}, last ? String(daysBetween(last, ctx.today)) : '—'), h('small', {}, last ? 'ימים מאז שעלה' : 'עוד לא עלה')),
        h('div', {}, h('b', {}, String(yearCount)), h('small', {}, 'עליות השנה'))),
      h('div', { class: 'sechead' }, 'חיוב היום'),
      h('div', { class: 'reasons' }, ...REASONS.map((reason) => h('button', {
        type: 'button', class: 'chip' + (hiyuvToday === reason ? ' sel' : ''),
        onclick: () => update({ hiyuv: hiyuvToday === reason ? null : { date: ctx.today, reason } }),
      }, reason))),
      h('div', { class: 'sechead' }, 'יארצייט'),
      ...p.yahrzeits.map((y, i) => h('div', { class: 'swrow' },
        h('span', {}, `${hebcal.gematriya(y.day)} ב${MONTHS.find(([n]) => n === y.month)?.[1] ?? ''}${y.note ? ' · ' + y.note : ''}`),
        h('button', { class: 'btn tonal', type: 'button', onclick: () => update({ yahrzeits: p.yahrzeits.filter((_, k) => k !== i) }) }, 'מחק'))),
      yzAdd,
      h('div', { class: 'sechead' }, 'עליות אחרונות'),
      roles.length ? h('div', { class: 'hist' }, ...roles.slice(0, 10).map((x) =>
        h('div', {}, h('span', {}, hebrewDate(x.date) + ' · ' + ROLE_LABEL[x.role]), h('span', {}, x.date.slice(8) + '.' + x.date.slice(5, 7) + '.' + x.date.slice(2, 4)))))
        : h('div', { class: 'note' }, 'אין עליות רשומות'),
      h('div', { style: 'display:grid;gap:6px;padding-top:12px' },
        h('button', { class: 'btn out wide', type: 'button', onclick: () => update({ stopped: !p.stopped }) }, p.stopped ? 'חזור להציע' : 'הפסק להציע'),
        h('span', { class: 'note' }, p.stopped ? 'יחזור לתור לפי זמן ההמתנה.' : 'לא יופיע בתור ולא יוצע. החיפוש עדיין ימצא אותו.'))));
}

export function renderNewPerson(ctx: Ctx, args: string[]): HTMLElement {
  const group0: Group = (['K', 'L', 'Y'] as Group[]).includes(args[0] as Group) ? (args[0] as Group) : 'Y';
  const slot = args[1] && /^\d$/.test(args[1]) ? Number(args[1]) : null;
  const keyArg = args.find((a) => a.includes('.'));
  const key: ReadingKey = keyArg ? { date: keyArg.split('.')[0], service: keyArg.split('.')[1] as Reading['service'] } : activeKey(ctx.store.get(), ctx.today);
  const backTo = sameKey(key, activeKey(ctx.store.get(), ctx.today)) ? '#reading' : '#day/' + keyText(key);
  let group = group0, name = '', callLine = '', hint = '';

  const state0 = ctx.store.get();
  const info = dayInfo(key.date);
  const reading = findReading(state0, key) ?? (info.reading ? newReading(key.date, key.service, info.defaultCount) : null);
  const targetSlot = (g: Group): number | null => {
    if (!reading) return null;
    if (slot !== null && reading.slots[slot] && groupOf(reading.slots[slot].role) === g) return slot;
    const i = reading.slots.findIndex((s) => groupOf(s.role) === g && s.role !== 'K_FOR_L' && !s.doneAt && !s.personId);
    return i >= 0 ? i : null;
  };

  const save = h('button', { class: 'btn fill wide', type: 'submit', disabled: true }) as HTMLButtonElement;
  const callInput = h('input', { placeholder: 'כמו השם', oninput: (e: Event) => { callLine = (e.target as HTMLInputElement).value.trim(); } }) as HTMLInputElement;
  const refresh = () => {
    const t = targetSlot(group);
    save.textContent = t === null ? 'שמור' : 'שמור והצב ב' + (reading!.slots[t].role === 'Y_FOR_K' ? 'מקום כהן' : ROLE_LABEL[reading!.slots[t].role]);
    save.disabled = !name;
    callInput.placeholder = name || 'השם כפי שנקרא לתורה';
  };
  const seg = h('div', {});
  const drawSeg = () => seg.replaceChildren(groupSeg(group, (g) => { group = g; drawSeg(); refresh(); }));
  drawSeg();

  const submit = (e: Event) => {
    e.preventDefault();
    if (!name) return;
    const p: Person = { id: newId(), name, group, callLine: callLine || name, hint, regular: false, stopped: false, seat: '',
      yahrzeits: [], addedOn: ctx.today, hiyuv: null };
    let s: State = { ...ctx.store.get(), people: [...ctx.store.get().people, p] };
    const t = targetSlot(group);
    if (reading && t !== null) {
      const res = place(findReading(s, key) ?? reading, p, t);
      if (!('error' in res)) s = withReading(s, res.reading);
    }
    ctx.store.set(s);
    if (t === null) snackbar(`${name} נשמר`);
    ctx.go(t === null ? '#choose/' + group : backTo);
  };

  const form = h('form', { class: 'body form', onsubmit: submit },
    h('div', { class: 'field' }, h('label', {}, 'שם *'),
      h('input', { required: true, autofocus: true, autocomplete: 'off', oninput: (e: Event) => { name = (e.target as HTMLInputElement).value.trim(); refresh(); } })),
    seg,
    h('div', { class: 'field' }, h('label', {}, 'שם לקריאה'), callInput),
    h('div', { class: 'field' }, h('label', {}, 'רמז (פרטי)'),
      h('input', { placeholder: 'אורח, חולצה כחולה', oninput: (e: Event) => { hint = (e.target as HTMLInputElement).value.trim(); } })),
    save,
    h('span', { class: 'note' }, 'שם לקריאה נקרא בדיוק כפי שנכתב. אם ריק, ייקרא השם.'));
  refresh();
  return h('div', { class: 'screen' }, appBar('אדם חדש', null, { close: 'history' }), form);
}
