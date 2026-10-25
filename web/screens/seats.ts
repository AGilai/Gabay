// סידור מקומות: assign areas quickly. Pick an area on the grid, then tick the people sitting there.
// Ticking someone who sits elsewhere moves him; unticking clears his area.
import { HALF_WORD, areaTag, type Area } from '../../core/area.ts';
import { search } from '../../core/queue.ts';
import type { Person } from '../../core/types.ts';
import { GROUP_CLASS, type Ctx } from '../ctx.ts';
import { areaBadge, areaGrid } from '../area.ts';
import { appBar, bottomNav, h, icon } from '../ui.ts';

let pick: Area = { col: 1, half: 'F' };
let query = '';

export function renderSeats(ctx: Ctx): HTMLElement {
  const state = ctx.store.get();
  const here = (p: Person) => p.area?.col === pick.col && p.area.half === pick.half;
  const count = (col: number, half: string) => state.people.filter((p) => p.area?.col === col && p.area.half === half).length;
  const set = (p: Person, area: Area | null) => {
    const s = ctx.store.get();
    ctx.store.set({ ...s, people: s.people.map((x) => (x.id === p.id ? { ...x, area } : x)) });
  };

  const list = h('div', { class: 'list' });
  const fill = () => {
    // Here first, then people with no area yet, then the rest (with their own tag).
    const rank = (p: Person) => (here(p) ? 0 : p.area ? 2 : 1);
    const people = search(state, query).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'he'));
    list.replaceChildren(...people.map((p) => {
      const on = here(p);
      return h('button', { type: 'button', class: 'row seatrow' + (on ? ' on' : ''), 'aria-pressed': String(on),
        onclick: () => set(p, on ? null : { ...pick }) },
        h('span', { class: 'scb' }, on ? '✓' : ''),
        h('div', { class: 'av ' + GROUP_CLASS[p.group] }, p.name.trim()[0] ?? '?'),
        h('div', { class: 'who' }, h('b', {}, p.name), h('small', {}, on ? null : areaBadge(p.area), p.hint)));
    }));
    if (!people.length) list.append(h('div', { class: 'notice' }, 'לא נמצא.'));
  };
  fill();

  const placed = state.people.filter((p) => p.area).length;
  const input = h('input', { type: 'search', placeholder: 'חיפוש שם…', value: query, 'aria-label': 'חיפוש',
    oninput: (e: Event) => { query = (e.target as HTMLInputElement).value; fill(); } });
  return h('div', { class: 'screen' },
    appBar('סידור מקומות', `משבץ ל: ${areaTag(pick)} (טור ${pick.col} · ${HALF_WORD[pick.half]})`, { back: 'history' }),
    h('main', { class: 'body', style: 'gap:10px;padding-top:8px' },
      areaGrid({
        isOn: (c, half) => pick.col === c && pick.half === half,
        onCell: (c, half) => { pick = { col: c, half }; ctx.refresh(); },
        sub: (c, half) => String(count(c, half)),
      }),
      h('p', { class: 'note', style: 'margin:0' }, `${placed} מתוך ${state.people.length} שובצו. המספר בכל אזור: כמה יושבים בו.`),
      h('label', { class: 'search' }, icon('search', 20), input),
      list),
    bottomNav('more'));
}
