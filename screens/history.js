// S7: readings by date, newest first. Opening one shows it on the reading screen to fix it.
import { dayInfo } from '../core/day.js';
import { newReading } from '../core/slots.js';
import { findReading, keyText, personById, withReading,          } from '../ctx.js';
import { appBar, bottomNav, h, snackbar } from '../ui.js';

const PAGE = 60;
let shown = PAGE;

function renderHistoryInner(ctx     )              {
  const state = ctx.store.get();
  const readings = [...state.readings].sort((a, b) => b.date.localeCompare(a.date) || b.service.localeCompare(a.service));
  let date = '';
  const open = (e       ) => {
    e.preventDefault();
    if (!date || date > ctx.today) return snackbar('בחר תאריך שעבר');
    const key = { date, service: 'shacharit'          };
    if (!findReading(ctx.store.get(), key)) {
      ctx.store.set(withReading(ctx.store.get(), newReading(date, 'shacharit', dayInfo(date).defaultCount)));
    }
    ctx.go('#day/' + keyText(key));
  };
  return h('div', { class: 'screen' },
    appBar('היסטוריה', `${readings.length} קריאות`, { back: 'history' }),
    h('main', { class: 'body' },
      h('form', { class: 'yz', onsubmit: open },
        h('input', { type: 'date', max: ctx.today, 'aria-label': 'תאריך', onchange: (e       ) => { date = (e.target                    ).value; } }),
        h('button', { class: 'btn tonal', type: 'submit' }, 'פתח / הוסף קריאה')),
      ...readings.slice(0, shown).map((r) => {
        const info = dayInfo(r.date);
        const names = r.slots.filter((s) => s.personId && s.doneAt && s.role !== 'K_FOR_L')
          .map((s) => personById(state, s.personId)?.name ?? '?').join(' · ');
        return h('a', { class: 'list-item', href: '#day/' + keyText(r) },
          h('div', { class: 'who' },
            h('b', {}, `${info.weekday} · ${info.hebrew}${r.service === 'mincha' ? ' · מנחה' : ''}`),
            h('small', {}, names || 'לא סומנו עולים')),
          h('span', { class: 'muted mono' }, r.date.slice(8) + '.' + r.date.slice(5, 7) + '.' + r.date.slice(2, 4)));
      }),
      readings.length > shown ? h('button', { class: 'btn tonal wide', onclick: () => { shown += PAGE; ctx.refresh(); } }, 'עוד') : null));
}

// A screen reached from the "עוד" menu keeps the bottom bar, so the main page is always one tap away.
export function renderHistory(ctx     )              {
  const el = renderHistoryInner(ctx);
  el.append(bottomNav('more'));
  return el;
}
