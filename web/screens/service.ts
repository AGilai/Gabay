// S11 reading mode: the whole call-up as one scroll, from "ותגלה… כהן קרב, יעמוד" to "יעמדו המגביה
// והגולל". The gabbai's own words in full, the Torah text of each aliyah after its call, and the additions
// (Mi Sheberach and the rest) as chips at the end, each opening its own screen. Nothing for the ציבור.
import { render } from '../../core/prayers.ts';
import { AFTER_FIRST, CLOSING, OPENING, callFor } from '../../core/service.ts';
import { ROLE_LABEL, focusIndex, groupOf, newReading } from '../../core/slots.ts';
import { dayInfo } from '../../core/day.ts';
import { GROUP_WORD, activeKey, findReading, keyText, parseKey, personById, withReading, type Ctx } from '../ctx.ts';
import { h, icon } from '../ui.ts';
import { done } from './reading.ts';
import { loadTorah, torahFor, verseNodes } from './torah.ts';

const SIZE_KEY = 'gabay.prayerSize';
const MODE_KEY = 'gabay.torahMode';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* keep for this session */ } };

// Where the gabbai was, so leaving for a prayer or the choosing page and coming back keeps the place.
let place: { key: string; top: number } | null = null;
let jumpNext: number | null = null; // after "עלה ✓": scroll to this aliyah's call

export function renderService(ctx: Ctx, args: string[]): HTMLElement {
  const state = ctx.store.get();
  const key = parseKey(args[0]) ?? activeKey(state, ctx.today);
  const kt = keyText(key);
  const info = dayInfo(key.date);
  const r = findReading(state, key) ?? (info.reading ? newReading(key.date, key.service, info.defaultCount) : null);
  const t = torahFor(key);
  if (!t) loadTorah().then(() => { if (torahFor(key)) ctx.refresh(); }, () => {});
  let size = Number(read(SIZE_KEY)) || 24;
  const scroll = read(MODE_KEY) === 'scroll';

  const resize = (d: number) => {
    size = Math.min(40, Math.max(18, size + d));
    write(SIZE_KEY, String(size));
    page.style.setProperty('--torah-size', size + 'px');
    page.style.setProperty('--prayer-size', size + 'px');
  };
  const bar = h('header', { class: 'rbar' },
    h('button', { class: 'exit', onclick: () => ctx.home() }, icon('back', 20), 'ראשי'),
    h('div', { class: 't' }, h('b', {}, 'קריאה' + (t ? ' · ' + t.name : '')),
      h('small', {}, t?.aliyot.length ? `${t.aliyot[0].label.split(' ')[0]} · ${t.aliyot.length} עליות` : info.weekday + ' · ' + info.hebrew)),
    h('button', { class: 'icon', 'aria-label': 'הקטן', onclick: () => resize(-2) }, 'A−'),
    h('button', { class: 'icon', 'aria-label': 'הגדל', onclick: () => resize(2) }, icon('text')));
  const page = h('main', { class: 'svc', style: `--torah-size:${size}px;--prayer-size:${size}px` });

  if (!r) {
    page.append(h('div', { class: 'empty-day' }, h('b', {}, 'אין קריאה ביום הזה')));
    return h('div', { class: 'screen' }, bar, page);
  }
  const save = (next: typeof r, label?: string) => ctx.store.set(withReading(ctx.store.get(), next), label);
  const focus = focusIndex(r);
  const choose = (i: number) => ctx.go(`#choose/${groupOf(r.slots[i].role)}/${i}/${kt}/svc`);

  const sections = r.slots.map((s, i) => {
    const p = personById(state, s.personId);
    const g = groupOf(s.role);
    const say = h('div', { class: 'say' }, h('div', { class: 'who' }, 'גבאי'));
    if (i === 0) say.append(h('p', {}, OPENING));
    if (p) {
      const c = callFor(s.role, p.callLine);
      say.append(h('p', {}, c.lead),
        h('div', { class: 'callrow' },
          h('div', { class: 'callname' }, c.line, c.added ? h('span', { class: 'auto' }, ' ' + c.added) : null),
          s.doneAt ? null : h('button', { class: 'swap', onclick: () => choose(i) }, icon('swap', 18), 'החלף')));
    } else if (s.role === 'K_FOR_L') {
      say.append(h('p', {}, 'יַעֲמֹד'), h('div', { class: 'callname muted' }, 'הכהן, בִּמְקוֹם לֵוִי'));
    } else {
      say.append(h('p', {}, callFor(s.role, '').lead),
        h('button', { class: 'btn tonal', onclick: () => choose(i) }, '+ בחר ' + GROUP_WORD[g]));
    }
    if (i === 0) say.append(h('p', {}, AFTER_FIRST));

    const a = t?.aliyot[i];
    const text = a ? [
      h('div', { class: 'ahd' }, h('span', { class: 'tag ' + ({ K: 'k', L: 'l', Y: 'y' })[g] }, ROLE_LABEL[s.role]), a.label),
      h('p', { class: 'tt' + (scroll ? ' bk' : '') }, ...a.verses.flatMap((v) => [scroll ? '' : h('sup', {}, v.n), ...verseNodes(v.text, scroll), ' '])),
    ] : [];
    const oleh = s.doneAt && p && state.settings.olehInService
      ? h('div', { class: 'say' }, h('div', { class: 'who' }, 'מי שברך לעולה'),
        h('p', {}, ...render(state.settings.prayers.oleh, { name: p.callLine }).map((x) => (x.name ? h('mark', {}, x.text) : x.text))))
      : null;
    return h('section', { class: 'sv' + (i === focus ? ' cur' : '') + (s.doneAt ? ' dn' : ''), id: 'sv-' + i },
      say, ...text,
      s.doneAt && p ? h('div', { class: 'doneline' }, icon('check', 18), `${p.callLine} עלה · ${s.doneAt}`) : null,
      oleh);
  });

  const end = h('section', { class: 'sv' + (focus < 0 ? ' cur' : ''), id: 'sv-end' },
    h('div', { class: 'sec' }, 'סיום'),
    h('a', { class: 'pickf fold', href: '#prayer/kaddish' }, h('span', { class: 'v' }, 'חצי קדיש'), h('span', { class: 'open' }, 'פתח ›')),
    h('div', { class: 'say' }, h('div', { class: 'who' }, 'גבאי'), h('div', { class: 'callname' }, CLOSING)));
  const chip = (kind: string, text: string, dot = false) => h('a', { class: 'chip' + (dot ? ' dot' : ''), href: '#prayer/' + kind }, text);
  const extras = h('section', { class: 'sv', id: 'sv-extra' },
    h('div', { class: 'sec' }, 'תוספות'),
    h('div', { class: 'chips wrap' },
      chip('oleh', 'מי שברך לעולה'), chip('sick', `לחולים (${state.sick.length})`, state.sick.length > 0),
      chip('yoledet', 'יולדת'), chip('barMitzvah', 'בר מצווה'), chip('azkara', 'אזכרה'),
      chip('gomel', 'הגומל'), chip('brachot', 'ברכות התורה')));
  page.append(...sections, end, extras, t ? h('div', { class: 'credit' }, 'נוסח ספרד · ' + 'מקרא על פי המסורה (CC-BY-SA, ספריא)') : null);

  const labels = r.slots.map((s) => ROLE_LABEL[s.role].replace('ישראל במקום כהן', 'במקום כהן').replace('כהן במקום לוי', 'במקום לוי'));
  const targets = [...sections, end, extras];
  const stripBtns = [...labels.map((l, i) => (r.slots[i].doneAt ? '✓ ' : '') + l), 'סיום', 'תוספות ↓'].map((text, i) =>
    h('button', { class: (i === targets.length - 1 ? 'add' : '') + (i < r.slots.length && r.slots[i].doneAt ? ' dn' : ''),
      onclick: () => jump(i, true) }, text));
  const strip = h('nav', { class: 'strip' }, ...stripBtns);

  const cur = focus >= 0 ? r.slots[focus] : null;
  const curP = cur ? personById(state, cur.personId) : null;
  const fab = curP
    ? h('button', { class: 'nextA', onclick: () => { jumpNext = focus + 1; done(ctx, r, focus, save); } },
      icon('check', 20), ` עלה · ${labels[focus]}`)
    : focus < 0 ? h('button', { class: 'nextA tonal', onclick: () => { place = null; ctx.home(); } }, 'סיום הקריאה · חזרה לראשי') : null;

  let auto = 0;
  function jump(i: number, smooth: boolean): void {
    const el = targets[Math.min(i, targets.length - 1)];
    auto = Date.now() + (smooth ? 700 : 150);
    page.scrollTo({ top: Math.max(el.offsetTop - 8, 0), behavior: smooth ? 'smooth' : 'auto' });
    mark(Math.min(i, targets.length - 1));
  }
  function mark(i: number): void {
    stripBtns.forEach((b, k) => b.classList.toggle('on', k === i));
    stripBtns[i]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  page.addEventListener('scroll', () => {
    place = { key: kt, top: page.scrollTop };
    if (Date.now() < auto) return;
    const y = page.scrollTop + 60;
    let i = 0;
    targets.forEach((b, k) => { if (b.offsetTop <= y) i = k; });
    mark(i);
  }, { passive: true });

  const settle = () => {
    if (jumpNext !== null) jump(jumpNext < r.slots.length ? jumpNext : r.slots.length, true);
    else if (place?.key === kt) { page.scrollTop = place.top; }
    else jump(focus < 0 ? r.slots.length : focus, false);
  };
  requestAnimationFrame(() => { settle(); jumpNext = null; });
  // The Torah font changes the text's height once it loads; put the place back.
  // (Not while the app itself is scrolling: that would cancel the jump to the next call.)
  document.fonts?.ready.then(() => requestAnimationFrame(() => {
    if (Date.now() >= auto && place?.key === kt) page.scrollTop = place.top;
  }));
  return h('div', { class: 'screen service' }, bar, strip, page, fab);
}
