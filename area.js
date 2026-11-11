// The hall as a 5 x 2 grid of areas, ark on top (core/area.ts). Used by the person card, the search filter
// and the seating screen. Column 1 is on the left whatever the text direction.
import { COLS, HALF_WORD, areaTag,                                       } from './core/area.js';
import { h, sheet } from './ui.js';

const HALVES         = ['F', 'R'];

                           
                                             
                                            
                                                                        
                                                               
                                                                                                                                           
 

export function areaGrid(o          )              {
  const head = (on         , text        , cls        , onclick             ) => o.heads
    ? h('button', { type: 'button', class: cls + (on ? ' on' : ''), 'aria-pressed': String(on), onclick }, text)
    : h('span', { class: cls }, text);
  const grid = h('div', { class: 'agrid' }, h('span', {}),
    ...COLS.map((c) => head(!!o.heads?.colOn(c), 'טור ' + c, 'ch', () => o.heads .onCol(c))));
  for (const half of HALVES) {
    grid.append(head(!!o.heads?.halfOn(half), HALF_WORD[half], 'rh', () => o.heads .onHalf(half)));
    for (const c of COLS) {
      const on = o.isOn(c, half);
      grid.append(h('button', { type: 'button', class: 'acell' + (on ? ' on' : ''), 'aria-pressed': String(on),
        'aria-label': `טור ${c} ${HALF_WORD[half]}`, onclick: () => o.onCell(c, half) },
        areaTag({ col: c, half }), o.sub ? h('small', {}, o.sub(c, half)) : null));
    }
  }
  return h('div', { class: 'hall' }, h('div', { class: 'ark' }, 'ארון הקודש'), grid);
}

// Person card: pick one area (saves and closes) or "בלי מקום".
export function pickAreaSheet(current                         , onPick                          )       {
  const s = sheet(h('div', { class: 'asheet' },
    h('div', { class: 'hdr' }, h('b', {}, 'מקום בבית הכנסת')),
    areaGrid({
      isOn: (c, half) => current?.col === c && current.half === half,
      onCell: (c, half) => { s.close(); onPick({ col: c, half }); },
    }),
    h('div', { class: 'row-btns' },
      h('button', { type: 'button', class: 'btn tonal', onclick: () => { s.close(); onPick(null); } }, 'בלי מקום'),
      h('span', { class: 'note' }, 'לחיצה על אזור שומרת'))));
}

// Search: one area, a whole column or a whole half. A second tap on the same choice clears it.
export function filterAreaSheet(current            , onChange                         )       {
  let f = { ...current };
  const body = h('div', {});
  const set = (next            ) => { f = next; onChange(f); draw(); };
  const draw = () => body.replaceChildren(areaGrid({
    isOn: (c, half) => (f.col !== null || f.half !== null) && (f.col === null || f.col === c) && (f.half === null || f.half === half),
    onCell: (c, half) => set(f.col === c && f.half === half ? { col: null, half: null } : { col: c, half }),
    heads: {
      colOn: (c) => f.col === c && f.half === null, halfOn: (half) => f.half === half && f.col === null,
      onCol: (c) => set(f.col === c && f.half === null ? { col: null, half: null } : { col: c, half: null }),
      onHalf: (half) => set(f.half === half && f.col === null ? { col: null, half: null } : { col: null, half }),
    },
  }));
  draw();
  const s = sheet(h('div', { class: 'asheet' },
    h('div', { class: 'hdr' }, h('b', {}, 'איפה יושב?')),
    body,
    h('div', { class: 'row-btns' },
      h('button', { type: 'button', class: 'btn tonal', onclick: () => set({ col: null, half: null }) }, 'בכל מקום'),
      h('button', { type: 'button', class: 'btn fill', onclick: () => s.close() }, 'הצג')),
    h('p', { class: 'note' }, 'תא: אזור אחד. "טור 3": כל הטור. "קדימה" / "אחורה": כל החצי.')));
}

export const areaBadge = (a                         )                     => (a ? h('span', { class: 'areatag' }, areaTag(a)) : null);
