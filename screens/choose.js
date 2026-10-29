// S2: the choosing page. A tap puts the person straight into his slot; a long press opens his card.
// …/find opens the search over it (S2b), with the tab's group already picked as the filter.
import { dayInfo } from '../core/day.js';
import { buildQueue, search,                            } from '../core/queue.js';
import { ROLE_LABEL, groupOf, newReading, place } from '../core/slots.js';
                                                                  
import { aliyotOf } from '../core/queue.js';
import { daysBetween } from '../core/dates.js';
import { GROUP_CLASS, GROUP_PLURAL, GROUP_WORD, activeKey, findReading, keyText, personById, sameKey, withReading,                           } from '../ctx.js';
import { appBar, bottomNav, h, icon, snackbar } from '../ui.js';
import { ANYWHERE, filterText, isAnywhere,                 } from '../core/area.js';
import { areaBadge, filterAreaSheet } from '../area.js';

let query = '';
let findGroup               = null;
let findField              = 'all';
let findArea             = ANYWHERE;
let showInactive = false;

const LONG_PRESS_MS = 500;

// A tap calls onTap; holding for 500 ms calls onLong instead.
function pressable(el             , onTap            , onLong            )              {
  let timer = 0, fired = false, x = 0, y = 0;
  el.addEventListener('pointerdown', (e) => {
    fired = false; x = e.clientX; y = e.clientY;
    timer = window.setTimeout(() => { fired = true; onLong(); }, LONG_PRESS_MS);
  });
  el.addEventListener('pointermove', (e) => { if (Math.abs(e.clientX - x) + Math.abs(e.clientY - y) > 10) clearTimeout(timer); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => clearTimeout(timer));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('click', () => { if (!fired) onTap(); });
  return el;
}

export function renderChoose(ctx     , args          )              {
  const state = ctx.store.get();
  const key             = (() => {
    const k = args.find((a) => a.includes('.'));
    if (k) { const [date, service] = k.split('.'); return { date, service: service                       }; }
    return activeKey(state, ctx.today);
  })();
  const isToday = sameKey(key, activeKey(state, ctx.today));
  const info = dayInfo(key.date);
  const r = findReading(state, key) ?? (info.reading ? newReading(key.date, key.service, info.defaultCount) : null);
  const slotArg = args[1] !== undefined && /^\d$/.test(args[1]) ? Number(args[1]) : null;
  const nextEmpty = r?.slots.find((s) => !s.personId && s.role !== 'K_FOR_L');
  const fallbackGroup        = nextEmpty ? groupOf(nextEmpty.role) : 'Y';
  const group        = (['K', 'L', 'Y']           ).includes(args[0]         ) ? (args[0]         ) : fallbackGroup;
  const slot = slotArg !== null && r?.slots[slotArg] && groupOf(r.slots[slotArg].role) === group ? slotArg : null;
  // From reading mode (…/svc), a pick goes back there.
  const backTo = args.includes('svc') ? '#service/' + keyText(key) : isToday ? '#reading' : '#day/' + keyText(key);
  const aliyot = aliyotOf(state);
  const finding = args.includes('find');

  const pick = (p        ) => {
    if (!r) return snackbar('אין קריאה היום. אפשר לפתוח קריאה במסך הראשי');
    const res = place(r, p, slot !== null && groupOf(r.slots[slot].role) === p.group ? slot : undefined);
    if ('error' in res) {
      if (res.error === 'already') return snackbar(`${p.name} כבר בקריאה`);
      if (res.error === 'full') return snackbar(p.group === 'Y' ? 'כל מקומות ישראל כבר עלו' : 'המקום כבר סומן שעלה');
      return snackbar(r.noKohen ? 'אין כהן היום: כל המקומות לישראל' : `אין מקום ל${GROUP_WORD[p.group]} בקריאה`);
    }
    const replaced = personById(state, res.replaced);
    query = '';
    ctx.store.set(withReading(state, res.reading), replaced ? `הוחלף את ${replaced.name}` : undefined);
    ctx.home(backTo);
  };

  const days = (personId        ) => {
    const last = aliyot.get(personId)?.at(-1);
    return last
      ? h('div', { class: 'days' }, h('b', {}, String(daysBetween(last, key.date))), h('small', {}, 'יום'))
      : h('div', { class: 'days' }, h('b', { class: 'sm' }, 'עוד לא'), h('small', {}, 'עלה'));
  };
  const row = (p        , cls        , small               , side             ) =>
    pressable(h('div', { class: 'row ' + cls, role: 'button' },
      h('div', { class: 'av ' + GROUP_CLASS[p.group] }, p.name.trim()[0] ?? '?'),
      h('div', { class: 'who' }, h('b', {}, p.name), h('small', {}, areaBadge(p.area), small)),
      side,
      // A visible way to the person card (holding the row still works too).
      h('button', { class: 'icon edit', 'aria-label': 'עריכת ' + p.name,
        onclick: (e       ) => { e.stopPropagation(); ctx.go('#person/' + p.id); } }, icon('edit', 20))),
    () => pick(p), () => ctx.go('#person/' + p.id));
  // Someone already in this reading keeps his days number; the row is marked instead.
  const inSlot = (id        ) => r?.slots.find((s) => s.personId === id) ?? null;
  const inTag = (id        ) => {
    const s = inSlot(id) ;
    return h('span', { class: 'intag' }, icon('check', 14), (s.doneAt ? 'עלה · ' : 'בקריאה · ') + ROLE_LABEL[s.role]);
  };
  const queueRow = (x     , cls = '') => row(x.person, cls,
    x.reason ? h('span', { class: 'hytag' }, x.reason) : x.person.hint || (x.last ? '' : 'חדש'), days(x.person.id));

  const list = h('div', { class: 'list' });
  const fillList = () => {
    list.replaceChildren();
    if (finding) {
      const found = search(state, query, { group: findGroup, field: findField, area: findArea });
      if (!found.length) list.append(h('div', { class: 'notice' }, 'לא נמצא. אפשר להוסיף אדם חדש.'));
      for (const p of found) {
        const note = [GROUP_WORD[p.group], p.stopped ? 'מושהה' : '', p.hint].filter(Boolean).join(' · ');
        list.append(inSlot(p.id) ? row(p, 'inread', inTag(p.id), days(p.id)) : row(p, '', note, days(p.id)));
      }
      return;
    }
    if (r?.noKohen && group !== 'Y') {
      list.append(h('div', { class: 'notice' }, 'אין כהן היום. אפשר עדיין למצוא בחיפוש.'));
      return;
    }
    const q = buildQueue(state, group, key.date, r);
    if (q.inReading.length) {
      list.append(h('div', { class: 'sechead' }, 'בקריאה'));
      for (const x of q.inReading) list.append(row(x.person, 'inread', inTag(x.person.id), days(x.person.id)));
    }
    if (q.hiyuv.length) {
      list.append(h('div', { class: 'sechead' }, 'חיוב היום'));
      for (const x of q.hiyuv) list.append(queueRow(x, 'hy'));
    }
    list.append(h('div', { class: 'sechead' }, 'בתור'));
    for (const x of q.line) list.append(queueRow(x));
    if (!q.line.length) list.append(h('div', { class: 'notice' }, 'אין אנשים בתור. הוסף אדם חדש.'));
    if (q.inactive.length) {
      list.append(h('button', { class: 'collapsed', onclick: () => { showInactive = !showInactive; fillList(); } },
        h('span', {}, `מזדמנים שלא נראו חצי שנה (${q.inactive.length})`), h('span', {}, showInactive ? '▴' : '▾')));
      if (showInactive) for (const x of q.inactive) list.append(queueRow(x));
    }
  };
  if (!finding) fillList();

  const counts = (g       ) => { const q = buildQueue(state, g, key.date, r); return q.line.length + q.hiyuv.length; };
  const tail = (slot !== null ? '/' + slot : '') + (isToday && !args.includes('svc') ? '' : '/' + keyText(key)) + (args.includes('svc') ? '/svc' : '');
  const tabs = h('nav', { class: 'tabs' }, ...(['K', 'L', 'Y']           ).map((g) =>
    h('a', { href: `#choose/${g}` + (g === group ? tail : isToday ? '' : '//' + keyText(key)), class: g + (g === group ? ' on' : '') },
      `${GROUP_PLURAL[g]} ${counts(g)}`)));

  const sub = slot !== null && r ? 'ל' + ROLE_LABEL[r.slots[slot].role] : 'נכנס ישר למקומו בקריאה';
  if (finding) {
    const input = h('input', {
      type: 'search', placeholder: 'חיפוש שם, שם לקריאה, רמז…', value: query, 'aria-label': 'חיפוש', enterkeyhint: 'search',
      oninput: (e       ) => { query = (e.target                    ).value; fillList(); },
    })                    ;
    const seg =     (items               , get         , set                ) => {
      const bar = h('div', { class: 'chips' });
      const paint = () => bar.replaceChildren(...items.map(([v, text]) =>
        h('button', { class: 'chip' + (get() === v ? ' sel' : ''), 'aria-pressed': String(get() === v),
          onclick: () => { set(v); paint(); fillList(); input.focus(); } }, text)));
      paint();
      return bar;
    };
    // The place filter is one button; the 5 x 2 grid opens from below only when it is needed.
    const placeBtn = h('button', { type: 'button' });
    const paintPlace = () => {
      const any = isAnywhere(findArea);
      placeBtn.className = 'chip' + (any ? '' : ' sel');
      placeBtn.replaceChildren('מקום: ' + filterText(findArea), any ? ' ▾' : h('span', { class: 'x', role: 'button', 'aria-label': 'נקה מקום',
        onclick: (e       ) => { e.stopPropagation(); findArea = ANYWHERE; paintPlace(); fillList(); } }, '✕'));
    };
    placeBtn.addEventListener('click', () => filterAreaSheet(findArea, (f) => { findArea = f; paintPlace(); fillList(); }));
    paintPlace();
    const fieldRow = seg             ([['all', 'הכל'], ['own', 'שם העולה'], ['father', 'שם האב']], () => findField, (v) => { findField = v; });
    fieldRow.style.display = 'contents'; // its chips repaint; the place button sits beside them
    const filters = h('div', { class: 'filters' },
      seg              ([[null, 'הכל'], ['K', 'כהנים'], ['L', 'לויים'], ['Y', 'ישראל']], () => findGroup, (v) => { findGroup = v; }),
      h('div', { class: 'chips wrap' }, fieldRow, placeBtn));
    fillList();
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
    return h('div', { class: 'screen' },
      appBar('חיפוש', sub, { close: 'history' }),
      h('main', { class: 'body', style: 'gap:0' }, h('label', { class: 'search' }, icon('search', 20), input), filters, list, h('div', { class: 'pad-fab' })),
      h('a', { class: 'fab', href: `#new/${group}` + tail }, icon('plus'), 'אדם חדש'));
  }
  const openFind = () => {
    query = ''; findGroup = r?.noKohen && group !== 'Y' ? null : group; findField = 'all'; findArea = ANYWHERE;
    ctx.go(location.hash + '/find');
  };
  return h('div', { class: 'screen' },
    appBar('בחירה', sub, isToday && slot === null ? {} : { back: backTo }),
    tabs,
    h('main', { class: 'body', style: 'gap:0' }, h('button', { class: 'search', onclick: openFind }, icon('search', 20), h('span', {}, 'חיפוש שם, שם לקריאה, רמז…')), list, h('div', { class: 'pad-fab' })),
    h('a', { class: 'fab', href: `#new/${group}` + tail }, icon('plus'), 'אדם חדש'),
    isToday ? bottomNav('choose') : null);
}
