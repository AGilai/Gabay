// S10: the Torah text of the reading, one tab per aliyah, with ta'amim or "as in the scroll".
import { pieces, readingFor, scrollText, type TorahData, type TorahReading } from '../../core/torah.ts';
import { ROLE_LABEL, focusIndex } from '../../core/slots.ts';
import type { Reading } from '../../core/types.ts';
import { activeKey, findReading, parseKey, type Ctx, type ReadingKey } from '../ctx.ts';
import { appBar, h, icon } from '../ui.ts';

let data: TorahData | null = null;
let loading: Promise<TorahData> | null = null;

export function loadTorah(): Promise<TorahData> {
  loading ??= fetch('data/torah.json').then((r) => r.json()).then((d: TorahData) => (data = d));
  return loading;
}

export function torahFor(key: ReadingKey): TorahReading | null {
  return data ? readingFor(data, key.date, key.service) : null;
}

const MODE_KEY = 'gabay.torahMode';
const SIZE_KEY = 'gabay.prayerSize';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* keep for this session */ } };

const DEFAULT_LABELS = ['כהן', 'לוי', 'שלישי', 'רביעי'];

export function verseNodes(text: string, scroll: boolean): (Node | string)[] {
  if (scroll) {
    const brk = /\{([פס])\}\s*$/.exec(text)?.[1];
    return [scrollText(text), brk === 'פ' ? h('br') : brk === 'ס' ? h('span', { class: 'gap' }) : ' '];
  }
  return pieces(text).map((p) => {
    if (p.t === 'text') return p.s;
    if (p.t === 'kq') return h('span', {}, p.q, h('span', { class: 'ktiv' }, ` (${p.k}) `));
    if (p.t === 'note') return h('span', { class: 'snote' }, ` [${p.s}] `);
    return h('span', { class: 'brk' }, p.s);
  });
}

export function renderTorah(ctx: Ctx, args: string[]): HTMLElement {
  const state = ctx.store.get();
  const key = parseKey(args[1]) ?? activeKey(state, ctx.today);
  const r: Reading | null = findReading(state, key);
  const back = appBar('קריאה בתורה', null, { back: 'history' });
  if (!data) {
    loadTorah().then(ctx.refresh, () => {});
    return h('div', { class: 'screen' }, back, h('main', { class: 'body' }, h('p', { class: 'note' }, 'טוען…')));
  }
  const t = torahFor(key);
  if (!t) {
    return h('div', { class: 'screen' }, back,
      h('main', { class: 'body' }, h('div', { class: 'empty-day' }, h('b', {}, 'אין קריאה בתורה ביום הזה'))));
  }

  const scroll = read(MODE_KEY) === 'scroll';
  let size = Number(read(SIZE_KEY)) || 24;
  const labels = t.aliyot.map((_, i) => (r?.slots[i] ? ROLE_LABEL[r.slots[i].role] : DEFAULT_LABELS[i] ?? String(i + 1)));
  const doneAt = (i: number) => Boolean(r?.slots[i]?.doneAt);
  const asked = args[0] !== undefined && /^\d$/.test(args[0]) ? Number(args[0]) : r ? focusIndex(r) : 0;
  let current = Math.min(Math.max(asked, 0), t.aliyot.length - 1);

  const blocks = t.aliyot.map((a, i) => h('section', { class: 'ablock', id: 'al-' + i },
    h('div', { class: 'ahd' }, h('span', { class: 'tag y' }, labels[i]), a.label),
    h('p', { class: 'tt' + (scroll ? ' bk' : '') },
      ...a.verses.flatMap((v) => [scroll ? '' : h('sup', {}, v.n), ...verseNodes(v.text, scroll), ' ']))));
  const tabs = t.aliyot.map((_, i) => h('button', { onclick: () => select(i, true) }, (doneAt(i) ? '✓ ' : '') + labels[i]));
  const next = h('button', { class: 'nextA', onclick: () => select(current + 1, true) }) as HTMLButtonElement;
  const reader = h('main', { class: 'tread', style: `--torah-size:${size}px` }, ...blocks, h('div', { class: 'credit' }, data.credit));

  let auto = 0; // until this time, scroll events come from the app, not the hand
  const jumpTo = (i: number, smooth: boolean) => {
    auto = Date.now() + (smooth ? 700 : 150);
    reader.scrollTo({ top: blocks[i].offsetTop - 8, behavior: smooth ? 'smooth' : 'auto' });
  };
  function select(i: number, jump: boolean): void {
    if (i < 0 || i >= t!.aliyot.length) return;
    current = i;
    tabs.forEach((b, k) => { b.className = (k === i ? 'on' : '') + (doneAt(k) ? ' dn' : ''); });
    blocks.forEach((b, k) => b.classList.toggle('cur', k === i));
    next.hidden = i === t!.aliyot.length - 1;
    next.textContent = `לעלייה הבאה: ${labels[i + 1] ?? ''} ←`;
    if (jump) jumpTo(i, true);
  }
  // Scrolling by hand moves the selected tab along.
  reader.addEventListener('scroll', () => {
    if (Date.now() < auto) return;
    const y = reader.scrollTop + 40;
    let i = 0;
    blocks.forEach((b, k) => { if (b.offsetTop <= y) i = k; });
    if (i !== current) select(i, false);
  }, { passive: true });

  const mode = (m: 'teamim' | 'scroll', text: string) => h('button', {
    class: (m === 'scroll') === scroll ? 'on' : '', 'aria-pressed': String((m === 'scroll') === scroll),
    onclick: () => { write(MODE_KEY, m); ctx.replace(`#torah/${current}/${key.date}.${key.service}`); ctx.refresh(); },
  }, text);
  const resize = (d: number) => {
    size = Math.min(40, Math.max(18, size + d));
    write(SIZE_KEY, String(size));
    reader.style.setProperty('--torah-size', size + 'px');
  };
  const who = r?.slots[current]?.personId ? state.people.find((p) => p.id === r!.slots[current].personId)?.name : null;

  const view = h('div', { class: 'screen' },
    appBar(t.name, t.aliyot.length ? `${t.aliyot[0].label.split(' ')[0]} · ${t.aliyot.length} עליות` : null, { back: 'history', end: [
      h('button', { class: 'icon', 'aria-label': 'הקטן', onclick: () => resize(-2) }, 'A−'),
      h('button', { class: 'icon', 'aria-label': 'הגדל', onclick: () => resize(2) }, icon('text')),
    ] }),
    h('nav', { class: 'tabsA' }, ...tabs),
    h('div', { class: 'modes' },
      h('div', { class: 'segc', role: 'group', 'aria-label': 'תצוגה' }, mode('teamim', 'טעמים'), mode('scroll', 'כמו בספר')),
      who ? h('span', { class: 'note' }, 'עכשיו: ' + who) : null),
    reader, next);
  select(current, false);
  // Scroll to the aliyah now, and again once the Torah font has loaded and the text has its final height.
  requestAnimationFrame(() => jumpTo(current, false));
  document.fonts?.ready.then(() => requestAnimationFrame(() => jumpTo(current, false)));
  return view;
}
