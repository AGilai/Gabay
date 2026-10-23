// S1 (main page) and S3 (slot sheet). Never shows a person's hint.
import { dayInfo } from '../../core/day.ts';
import { ROLE_LABEL, clearSlot, focusIndex, groupOf, markDone, newReading, place, relayout, undoDone } from '../../core/slots.ts';
import type { Reading, SlotRole, State } from '../../core/types.ts';
import { daysBetween } from '../../core/dates.ts';
import { aliyotOf, shouldOfferRegular, suggest } from '../../core/queue.ts';
import { GROUP_CLASS, GROUP_WORD, activeKey, currentKey, findReading, keyText, personById, sameKey, withReading, type Ctx, type ReadingKey } from '../ctx.ts';
import { appBar, bottomNav, h, icon, nowHHMM, sheet, snackbar } from '../ui.ts';
import { torahFor } from './torah.ts';

const SERVICE_WORD = { shacharit: 'שחרית', mincha: 'מנחה' };

function tags(r: Reading, i: number, role: SlotRole): HTMLElement[] {
  const tag = (text: string, cls: string, crossed = false) => h('span', { class: `tag ${cls}${crossed ? ' x' : ''}` }, text);
  const own = tag(ROLE_LABEL[role], GROUP_CLASS[groupOf(role)]);
  if (r.noKohen && i === 0) return [tag('כהן', 'k', true), own];
  if (r.noKohen && i === 1) return [tag('לוי', 'l', true), own];
  if (r.noLevi && i === 1) return [tag('לוי', 'l', true), own];
  return [own];
}

export function renderReading(ctx: Ctx, keyArg?: ReadingKey): HTMLElement {
  const { store } = ctx;
  const state = store.get();
  const home = activeKey(state, ctx.today);
  const key = keyArg ?? home;
  const info = dayInfo(key.date);
  // The main page: today's reading, or the next one prepared ahead on a day without a reading.
  const isToday = sameKey(key, home);
  const ahead = isToday && key.date !== ctx.today;
  const saved = findReading(state, key);
  const r = saved ?? (info.reading ? newReading(key.date, key.service, info.defaultCount) : null);
  const save = (next: Reading, label?: string, base: State = store.get()) => store.set(withReading(base, next), label);

  const sub = [info.weekday, info.hebrew, info.parasha, key.service === 'mincha' ? SERVICE_WORD.mincha : null]
    .filter(Boolean).join(' · ');
  const bar = isToday
    ? appBar(ahead ? 'הקריאה הבאה' : 'קריאת התורה', sub, { end: [
      h('a', { class: 'icon', href: `#torah/${r ? Math.max(focusIndex(r), 0) : 0}/${keyText(key)}`, 'aria-label': 'הטקסט בתורה' }, icon('open')),
      h('a', { class: 'icon', href: '#history', 'aria-label': 'היסטוריה' }, icon('cal'))] })
    : appBar(key.date.split('-').reverse().join('.'), sub, { back: '#history' });

  if (!r) {
    return h('div', { class: 'screen' }, bar,
      h('main', { class: 'body' },
        h('div', { class: 'empty-day' }, h('b', {}, 'אין קריאה היום'),
          h('span', {}, info.weekday + ' · ' + info.hebrew),
          h('button', { class: 'btn tonal', onclick: () => save(newReading(key.date, key.service, 3)) }, 'פתח קריאה בכל זאת')),
        prayerChips(state)),
      isToday ? bottomNav('reading', backupDue(ctx)) : null);
  }

  const change = (c: { count?: 3 | 4; noKohen?: boolean; noLevi?: boolean }) => {
    const res = relayout(r, c);
    if (res.blocked) return snackbar('לא ניתן: עולה כבר סומן');
    const names = res.removed.map((id) => personById(state, id)?.name ?? '').filter(Boolean);
    save(res.reading, names.length ? `${names.join(', ')} ${names.length > 1 ? 'הוצאו' : 'הוצא'} מהקריאה` : undefined);
  };

  const focus = focusIndex(r);
  const firstEmptyOfGroup = new Set<number>();
  const seen = new Set<string>();
  r.slots.forEach((s, i) => {
    const g = groupOf(s.role);
    if (!s.personId && s.role !== 'K_FOR_L' && !seen.has(g)) { seen.add(g); firstEmptyOfGroup.add(i); }
  });
  const aliyot = aliyotOf(state);
  const chooseHash = (g: string, i: number) => `#choose/${g}/${i}` + (isToday ? '' : '/' + keyText(key));

  const slots = r.slots.map((s, i) => {
    const p = personById(state, s.personId);
    const g = groupOf(s.role);
    const lab = h('div', { class: 'lab' }, ...tags(r, i, s.role));
    if (!p) {
      if (s.role === 'K_FOR_L') {
        return h('div', { class: 'slot empty' }, lab, h('div', { class: 'add muted' }, 'יתמלא מהכהן'));
      }
      const sug = firstEmptyOfGroup.has(i) ? suggest(state, g, key.date, r) : null;
      const last = sug ? aliyot.get(sug.id)?.at(-1) : undefined;
      return h('div', { class: 'slot empty' + (i === focus ? ' next' : ''), onclick: () => ctx.go(chooseHash(g, i)), role: 'button' },
        lab, h('div', { class: 'add' }, '+ בחר ' + GROUP_WORD[g]), h('div', {}),
        sug ? h('button', {
          class: 'suggest',
          onclick: (e: Event) => { e.stopPropagation(); placeAt(ctx, r, sug.id, i); },
        }, h('span', {}, 'הבא בתור:'), h('b', {}, sug.name), h('span', {}, last ? daysBetween(last, key.date) + ' יום' : 'עוד לא עלה')) : null);
    }
    if (s.doneAt) {
      return h('div', { class: 'slot done', role: 'button', onclick: () => slotSheet(ctx, r, i, save) },
        lab, h('div', { class: 'name' }, p.name),
        h('div', { class: 'donemark' }, icon('check', 20), 'עלה ' + s.doneAt));
    }
    return h('div', { class: 'slot' + (i === focus ? ' next' : ''), role: 'button', onclick: () => slotSheet(ctx, r, i, save) },
      lab, h('div', { class: 'name' }, p.name),
      ahead ? h('div', {}) : h('button', {
        class: 'btn ' + (i === focus ? 'fill' : 'tonal'),
        onclick: (e: Event) => { e.stopPropagation(); done(ctx, r, i, save); },
      }, icon('check', 20), 'עלה'),
      h('div', { class: 'call' }, p.callLine));
  });

  const seg = (n: 3 | 4) => h('button', { class: r.count === n ? 'on' : '', 'aria-pressed': String(r.count === n), onclick: () => change({ count: n }) }, String(n));
  const toggle = (label: string, on: boolean, c: { noKohen?: boolean; noLevi?: boolean }) =>
    h('button', { class: 'tg' + (on ? ' on' : ''), 'aria-pressed': String(on), onclick: () => change(c) }, (on ? '✓ ' : '') + label);

  const banner = info.banner
    ? h('div', { class: 'banner' }, info.banner, info.banner.includes('ראש חודש') ? h('small', {}, 'הלל · יעלה ויבוא') : null)
    : null;
  const today = dayInfo(ctx.today);
  const aheadNote = ahead
    ? h('div', { class: 'notice ahead' },
      h('b', {}, 'היום אין קריאה. '), `ההכנה היא ל${info.weekday}, ${info.hebrew}.`,
      h('button', { class: 'linkish', onclick: () => store.set(withReading(store.get(), newReading(ctx.today, currentKey(ctx.today).service, 3))) },
        `פתח קריאה היום (${today.weekday})`))
    : null;

  return h('div', { class: 'screen' }, bar,
    h('main', { class: 'body' + (r.slots.length === 4 ? ' compact' : '') },
      aheadNote,
      banner,
      h('div', { class: 'ctrl' }, h('div', { class: 'segc', role: 'group', 'aria-label': 'מספר עליות' }, seg(3), seg(4)),
        toggle('אין כהן', r.noKohen, { noKohen: !r.noKohen }),
        r.noKohen ? null : toggle('אין לוי', r.noLevi, { noLevi: !r.noLevi })),
      ...slots,
      r.slots.length === 4 ? null : h('div', { class: 'sechead' }, 'תפילות'),
      prayerChips(state)),
    isToday ? bottomNav('reading', backupDue(ctx)) : null);
}

export function backupDue(ctx: Ctx): boolean {
  const s = ctx.store.get();
  if (ctx.store.demo || !s.people.length) return false;
  return !s.settings.lastBackupOn || daysBetween(s.settings.lastBackupOn, ctx.today) > 30;
}

function prayerChips(state: State): HTMLElement {
  const chip = (kind: string, text: string, dot = false) => h('a', { class: 'chip' + (dot ? ' dot' : ''), href: '#prayer/' + kind }, text);
  return h('div', { class: 'chips' },
    chip('oleh', 'מי שברך לעולה'),
    chip('sick', `לחולים (${state.sick.length})`, state.sick.length > 0),
    chip('barMitzvah', 'בר מצווה'), chip('yoledet', 'יולדת'), chip('azkara', 'אזכרה'));
}

function placeAt(ctx: Ctx, r: Reading, personId: string, i: number): void {
  const state = ctx.store.get();
  const res = place(r, personById(state, personId)!, i);
  if ('error' in res) return snackbar('לא ניתן להציב כאן');
  ctx.store.set(withReading(state, res.reading));
}

function done(ctx: Ctx, r: Reading, i: number, save: (r: Reading, label?: string) => void): void {
  save(markDone(r, i, nowHHMM()));
  const id = r.slots[i].personId!;
  const state = ctx.store.get();
  if (shouldOfferRegular(state, id, r.date)) {
    const p = personById(state, id)!;
    snackbar(`${p.name} עלה 3 פעמים ב־90 יום`, 'סמן כקבוע', () => {
      const s = ctx.store.get();
      ctx.store.set({ ...s, people: s.people.map((x) => (x.id === id ? { ...x, regular: true } : x)) });
    });
  }
}

function slotSheet(ctx: Ctx, r: Reading, i: number, save: (r: Reading, label?: string) => void): void {
  const s = r.slots[i];
  const p = personById(ctx.store.get(), s.personId)!;
  const auto = s.role === 'K_FOR_L';
  const g = groupOf(s.role);
  const item = (ic: string, text: string, fn: () => void, warn = false) =>
    h('button', { class: 'item' + (warn ? ' warn' : ''), onclick: () => { sh.close(); fn(); } }, icon(ic), text);
  const chooseHash = `#choose/${g}/${i}` + (r.date === ctx.today ? '' : '/' + keyText(r));
  const torah = torahFor(r)?.aliyot[i];
  const sh = sheet(h('div', {},
    h('div', { class: 'hdr' }, h('b', {}, p.name), h('small', {}, ROLE_LABEL[s.role] + (s.doneAt ? ' · עלה ' + s.doneAt : ''))),
    s.doneAt
      ? item('undo', 'בטל סימון', () => save(undoDone(r, i)))
      : item('check', 'סמן שעלה', () => done(ctx, r, i, save)),
    item('open', 'הצג בתורה' + (torah ? ' · ' + torah.label : ''), () => ctx.go(`#torah/${i}/${keyText(r)}`)),
    auto ? null : item('swap', 'החלף', () => ctx.go(chooseHash)),
    auto ? null : item('clear', 'פנה מקום', () => save(clearSlot(r, i), `${p.name} הוצא מהקריאה`), true),
    h('div', { class: 'divider' }),
    item('user', 'כרטיס אישי', () => ctx.go('#person/' + p.id))));
}
