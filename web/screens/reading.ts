// S1 (main page) and S3 (slot sheet). Never shows a person's hint.
import { dayInfo, stepReadingDay } from '../../core/day.ts';
import { ROLE_LABEL, clearSlot, focusIndex, groupOf, markDone, newReading, place, relayout, undoDone } from '../../core/slots.ts';
import type { Person, Reading, SlotRole, State } from '../../core/types.ts';
import { daysBetween, newId } from '../../core/dates.ts';
import { aliyotOf, search, suggest } from '../../core/queue.ts';
import { GROUP_CLASS, GROUP_WORD, activeKey, currentKey, findReading, keyText, minyanim, personById, pickMinyan, sameKey, withPicked, withReading, type Ctx, type ReadingKey } from '../ctx.ts';
import { appBar, bottomNav, h, icon, nowHHMM, personBadge, sheet, snackbar } from '../ui.ts';
import { torahFor } from './torah.ts';

const SERVICE_WORD = { shacharit: 'שחרית', mincha: 'מנחה' };
// Past days open locked; "תקן" unlocks one while the app is open.
const unlocked = new Set<string>();

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
  let key = keyArg ?? home;
  // A minyan that is gone (undone) falls back to the first.
  if ((key.minyan ?? 1) > 1 && !findReading(state, key)) key = { date: key.date, service: key.service };
  const info = dayInfo(key.date);
  // The main page: today's reading, or the next one prepared ahead on a day without a reading.
  const isToday = sameKey(key, home);
  const ahead = isToday && key.date !== ctx.today;
  const past = key.date < ctx.today;
  const future = key.date > ctx.today;
  const locked = past && !unlocked.has(keyText(key));
  const saved = findReading(state, key);
  const r = saved ?? (info.reading ? newReading(key.date, key.service, info.defaultCount, key.minyan) : null);
  const save = (next: Reading, label?: string, base: State = store.get()) => store.set(withReading(base, next), label);

  // The minyanim of the day (and on a fast day, mincha), as a switch when there is more than one.
  const services: Reading['service'][] = info.hasMincha ? ['shacharit', 'mincha'] : [key.service];
  const keys: ReadingKey[] = services.flatMap((service) =>
    minyanim(state, { date: key.date, service }).map((minyan) => ({ date: key.date, service, minyan })));
  const many = minyanim(state, key).length > 1;
  const sub = [info.weekday, info.hebrew, info.parasha, key.service === 'mincha' ? SERVICE_WORD.mincha : null,
    many ? 'מניין ' + (key.minyan ?? 1) : null].filter(Boolean).join(' · ');
  const nextDay = stepReadingDay(ctx.today, 1, new Set(state.readings.map((x) => x.date)));
  const title = key.date === ctx.today ? 'קריאת התורה' : past ? 'קריאה שעברה' : ahead || key.date === nextDay ? 'הקריאה הבאה' : 'קריאה עתידית';
  const bar = appBar(title, sub, { end: [
    h('a', { class: 'icon', href: `#torah/${r ? Math.max(focusIndex(r), 0) : 0}/${keyText(key)}`, 'aria-label': 'הטקסט בתורה' }, icon('open')),
    h('a', { class: 'icon', href: '#history', 'aria-label': 'היסטוריה' }, icon('cal'))] });
  const goKey = (k: ReadingKey) => {
    pickMinyan(k);
    if (k.date === home.date && k.service === home.service) {
      if (location.hash === '' || location.hash === '#reading') ctx.refresh(); else ctx.replace('#reading');
    } else ctx.replace('#day/' + keyText(k));
  };
  const goDay = (d: string) => goKey(d === home.date ? home : withPicked({ date: d, service: 'shacharit' }, store.get()));
  const days = dayRow(ctx, key.date, home.date, goDay);
  const addMinyan = () => {
    const s0 = store.get();
    const n = Math.max(...minyanim(s0, key)) + 1;
    const k2 = { date: key.date, service: key.service, minyan: n };
    store.set(withReading(s0, newReading(key.date, key.service, info.defaultCount, n)), `נפתח מניין ${n}`);
    goKey(k2);
  };
  const doneMark = (k: ReadingKey) => { const x = findReading(state, k); return !!x && focusIndex(x) < 0; };
  const seg = keys.length > 1
    ? h('div', { class: 'mseg', role: 'group', 'aria-label': 'מניין' }, ...keys.map((k) => h('button', {
      class: sameKey(k, key) ? 'on' : '', onclick: () => goKey(k) },
      (services.length > 1 ? SERVICE_WORD[k.service] + ((k.minyan ?? 1) > 1 ? ' ' + k.minyan : '') : 'מניין ' + k.minyan),
      doneMark(k) ? h('small', {}, ' ✓') : null)))
    : null;
  const lockNote = past
    ? h('div', { class: 'pastnote' + (locked ? '' : ' open') },
      h('span', {}, locked ? 'יום שעבר · נעול' : 'פתוח לתיקון'),
      h('button', { class: 'btn out', onclick: () => { if (locked) unlocked.add(keyText(key)); else unlocked.delete(keyText(key)); ctx.refresh(); } },
        locked ? 'תקן' : 'נעל'))
    : null;
  const moreMinyan = past ? null : h('button', { class: 'linkish', onclick: addMinyan }, '+ מניין נוסף');

  if (!r) {
    return h('div', { class: 'screen' }, bar, days,
      h('main', { class: 'body' },
        seg,
        h('div', { class: 'empty-day' }, h('b', {}, key.date === ctx.today ? 'אין קריאה היום' : 'אין קריאה ביום הזה'),
          h('span', {}, info.weekday + ' · ' + info.hebrew),
          h('button', { class: 'btn tonal', onclick: () => { unlocked.add(keyText(key)); save(newReading(key.date, key.service, 3)); } }, 'פתח קריאה בכל זאת')),
        prayerChips(state)),
      bottomNav('reading', backupDue(ctx)));
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

  const torah = torahFor(key);
  const slots = r.slots.map((s, i) => {
    const p = personById(state, s.personId);
    const g = groupOf(s.role);
    // The aliyah's verses, right on the slot: a tap opens the Torah text there.
    const aliyah = torah?.aliyot[i];
    const lab = h('div', { class: 'lab' }, ...tags(r, i, s.role),
      aliyah ? h('a', { class: 'vref', href: `#torah/${i}/${keyText(key)}`, onclick: (e: Event) => e.stopPropagation() },
        icon('open', 16), aliyah.label) : null);
    if (!p) {
      if (s.role === 'K_FOR_L') {
        return h('div', { class: 'slot empty' }, lab, h('div', { class: 'add muted' }, 'יתמלא מהכהן'));
      }
      if (locked) return h('div', { class: 'slot empty' }, lab, h('div', { class: 'add none' }, 'לא נרשם'));
      const sug = firstEmptyOfGroup.has(i) ? suggest(state, g, key.date, r) : null;
      const last = sug ? aliyot.get(sug.id)?.at(-1) : undefined;
      const card: HTMLElement = h('div', {
        class: 'slot empty' + (i === focus ? ' next' : ''), role: 'button',
        onclick: () => { if (!card.classList.contains('typing')) ctx.go(chooseHash(g, i)); },
      },
        lab, h('div', { class: 'add' }, '+ בחר ' + GROUP_WORD[g]),
        h('button', { class: 'typein', 'aria-label': 'הקלד שם', onclick: (e: Event) => { e.stopPropagation(); typeIn(ctx, r, i, card, lab); } }, '✎ הקלד'),
        sug ? h('button', {
          class: 'suggest',
          onclick: (e: Event) => { e.stopPropagation(); placeAt(ctx, r, sug.id, i); },
        }, h('span', {}, 'הבא בתור:'), h('b', {}, sug.name), personBadge(sug), h('span', {}, last ? daysBetween(last, key.date) + ' יום' : 'עוד לא עלה')) : null);
      return card;
    }
    // The calling line, as read out, is the big text; the name he is known by is small underneath
    // (never the hint: the screen may be seen by others).
    const who = h('div', { class: 'who' }, h('div', { class: 'callname' }, p.callLine), h('div', { class: 'known' }, personBadge(p), p.name));
    if (locked) {
      return h('div', { class: 'slot' + (s.doneAt ? ' done' : '') }, lab, who,
        s.doneAt ? h('div', { class: 'donemark' }, icon('check', 20), 'עלה ' + s.doneAt) : h('div', {}));
    }
    if (s.doneAt) {
      return h('div', { class: 'slot done', role: 'button', onclick: () => slotSheet(ctx, r, i, save) },
        lab, who, h('div', { class: 'donemark' }, icon('check', 20), 'עלה ' + s.doneAt));
    }
    return h('div', { class: 'slot' + (i === focus ? ' next' : ''), role: 'button', onclick: () => slotSheet(ctx, r, i, save) },
      lab, who,
      future ? h('div', {}) : h('button', {
        class: 'btn ' + (i === focus ? 'fill' : 'tonal'),
        onclick: (e: Event) => { e.stopPropagation(); done(ctx, r, i, save); },
      }, icon('check', 20), 'עלה'));
  });

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

  // After the last oleh today: on to the next reading, or another minyan.
  const finished = saved && key.date === ctx.today && focusIndex(r) < 0
    ? h('div', { class: 'fin' },
      h('div', { class: 'h' }, icon('check', 22), `הקריאה הסתיימה · ${r.slots.filter((s) => s.doneAt).length} עלו`),
      h('button', { class: 'btn fill wide', onclick: () => goDay(nextDay) },
        `לקריאה הבאה · ${dayInfo(nextDay).weekday} ${dayInfo(nextDay).hebrew}`, icon('chl', 20)),
      h('button', { class: 'btn tonal wide', onclick: addMinyan }, '+ מניין נוסף היום'))
    : null;

  return h('div', { class: 'screen' }, bar, days,
    h('main', { class: 'body' + (r.slots.length === 4 ? ' compact' : '') },
      aheadNote,
      banner,
      seg,
      lockNote,
      locked ? null : h('div', { class: 'ctrl' },
        toggle('אין כהן', r.noKohen, { noKohen: !r.noKohen }),
        r.noKohen ? null : toggle('אין לוי', r.noLevi, { noLevi: !r.noLevi }),
        future ? null : h('a', { class: 'go', href: '#service/' + keyText(key) }, icon('play', 18), 'התחל קריאה')),
      ...slots,
      finished,
      finished ? null : moreMinyan,
      r.slots.length === 4 || finished ? null : h('div', { class: 'sechead' }, 'תפילות'),
      prayerChips(state)),
    bottomNav('reading', backupDue(ctx)));
}

// The day row under the title: → the previous day with a reading, ← the next one, and the way back to today.
function dayRow(ctx: Ctx, date: string, homeDate: string, goDay: (d: string) => void): HTMLElement {
  const opened = new Set(ctx.store.get().readings.map((x) => x.date));
  const prev = stepReadingDay(date, -1, opened);
  const next = stepReadingDay(date, 1, opened);
  const short = (d: string) => dayInfo(d).hebrew.replace(/ ב(?=\S+$)/, ' ');
  return h('nav', { class: 'dayrow', 'aria-label': 'ימים' },
    h('button', { class: 'arr', 'aria-label': 'הקריאה הקודמת', onclick: () => goDay(prev) }, icon('chr', 18), short(prev)),
    date === homeDate
      ? h('div', { class: 'mid' }, date === ctx.today ? 'היום' : 'הקריאה הבאה')
      : h('div', { class: 'mid' }, h('button', { class: 'today', onclick: () => goDay(homeDate) }, 'חזרה להיום')),
    h('button', { class: 'arr', 'aria-label': 'הקריאה הבאה', onclick: () => goDay(next) }, short(next), icon('chl', 18)));
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

export function done(ctx: Ctx, r: Reading, i: number, save: (r: Reading, label?: string) => void): void {
  save(markDone(r, i, nowHHMM()));
}

// Someone marked "stop suggesting" was put in a slot (found by search): offer to put him back in the line.
export function offerResume(ctx: Ctx, personId: string): void {
  const p = personById(ctx.store.get(), personId);
  if (!p?.stopped) return;
  snackbar(`${p.name} מסומן "לא להציע". להחזיר להצעות?`, 'החזר', () => {
    const s = ctx.store.get();
    ctx.store.set({ ...s, people: s.people.map((x) => (x.id === personId ? { ...x, stopped: false } : x)) });
  });
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
    h('div', { class: 'hdr' }, h('b', {}, p.callLine, ' ', personBadge(p)), h('small', {}, [p.name, ROLE_LABEL[s.role], s.doneAt ? 'עלה ' + s.doneAt : ''].filter(Boolean).join(' · '))),
    s.doneAt
      ? item('undo', 'בטל סימון', () => save(undoDone(r, i)))
      : item('check', 'סמן שעלה', () => done(ctx, r, i, save)),
    item('open', 'הצג בתורה' + (torah ? ' · ' + torah.label : ''), () => ctx.go(`#torah/${i}/${keyText(r)}`)),
    auto ? null : item('swap', 'החלף', () => ctx.go(chooseHash)),
    auto ? null : item('clear', 'פנה מקום', () => save(clearSlot(r, i), `${p.name} הוצא מהקריאה`), true),
    h('div', { class: 'divider' }),
    item('user', 'כרטיס אישי', () => ctx.go('#person/' + p.id))));
}

// Typing a name straight into an empty slot: matching people of the slot's group (names only, never the
// hint), or a new person with that name as both display name and calling line.
function typeIn(ctx: Ctx, r: Reading, i: number, card: HTMLElement, lab: HTMLElement): void {
  const g = groupOf(r.slots[i].role);
  const state = ctx.store.get();
  const input = h('input', { class: 'typein-input', placeholder: 'שם (כפי שייקרא)', enterkeyhint: 'done', autocomplete: 'off', 'aria-label': 'שם' }) as HTMLInputElement;
  const list = h('div', { class: 'typein-list' });
  const save = (s: State, p: Person, label?: string) => {
    const res = place(findReading(s, r) ?? r, p, i);
    if ('error' in res) return snackbar(res.error === 'already' ? `${p.name} כבר בקריאה` : 'לא ניתן להציב כאן');
    input.blur();
    ctx.store.set(withReading(s, res.reading), label);
    offerResume(ctx, p.id);
  };
  const addNew = (name: string) => {
    const p: Person = { id: newId(), name, group: g, callLine: name, hint: '', stopped: false, seat: '',
      yahrzeits: [], addedOn: ctx.today, hiyuv: null };
    save({ ...ctx.store.get(), people: [...ctx.store.get().people, p] }, p, `${name} נוסף כאדם חדש`);
  };
  const matches = (q: string) => search(state, q).filter((p) => p.group === g && !r.slots.some((s) => s.personId === p.id)).slice(0, 3);
  const draw = () => {
    const q = input.value.trim();
    list.replaceChildren(...(q ? [
      ...matches(q).map((p) => h('button', { class: 'chip', onclick: () => save(ctx.store.get(), p) }, p.name, personBadge(p))),
      h('button', { class: 'chip sel', onclick: () => addNew(q) }, `+ חדש: ${q}`),
    ] : []), h('button', { class: 'chip', onclick: () => { input.blur(); ctx.refresh(); } }, 'ביטול'));
  };
  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    const q = input.value.trim();
    if (e.key === 'Escape') { input.blur(); ctx.refresh(); }
    if (e.key !== 'Enter' || !q) return;
    const exact = matches(q).find((p) => p.name === q || p.callLine === q);
    if (exact) save(ctx.store.get(), exact); else addNew(q);
  });
  card.removeAttribute('role');
  card.classList.add('typing');
  card.replaceChildren(lab, input, list);
  draw();
  input.focus();
}
