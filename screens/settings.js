// "עוד" menu and S9 settings: inactivity threshold, theme, prayer texts, backup and restore.
import { exportBackup, parseBackup } from '../core/backup.js';
import { daysBetween } from '../core/dates.js';
import { defaultPrayers } from '../core/prayers.js';
                                                   
                                     
import { appBar, bottomNav, confirmSheet, h, icon, snackbar } from '../ui.js';
import { backupDue } from './reading.js';

const PRAYER_LABEL                                = {
  oleh: 'מי שברך לעולה', sickM: 'לחולה', sickF: 'לחולה (נקבה)', sickPlural: 'לחולים (כמה שמות)', barMitzvah: 'בר מצווה',
  yoledetBen: 'יולדת בן', yoledetBat: 'יולדת בת', azkaraM: 'אזכרה (זכר)', azkaraF: 'אזכרה (נקבה)',
};
const THEME_KEY = 'gabay.theme';

export function applyTheme()       {
  let t = '';
  try { t = localStorage.getItem(THEME_KEY) ?? ''; } catch { /* default: follow the phone */ }
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

export function renderMore(ctx     )              {
  const due = backupDue(ctx);
  const item = (href        , ic        , text        , badge         ) =>
    h('a', { href }, icon(ic), text, badge ? h('span', { class: 'badge' }, badge) : null);
  return h('div', { class: 'screen' },
    appBar('עוד', ctx.store.demo ? 'מצב הדגמה: שום דבר לא נשמר' : null),
    h('main', { class: 'body menu', style: 'gap:0' },
      item('#history', 'history', 'היסטוריה'),
      item('#import', 'import', 'ייבוא מוואטסאפ'),
      item('#settings', 'settings', 'הגדרות וגיבוי', due ? 'הגיע הזמן לגבות' : undefined)),
    bottomNav('more', due));
}

function download(name        , text        )       {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function renderSettingsInner(ctx     )              {
  const state = ctx.store.get();
  const set = (patch                                ) => {
    const s = ctx.store.get();
    ctx.store.set({ ...s, settings: { ...s.settings, ...patch } });
  };
  let theme = '';
  try { theme = localStorage.getItem(THEME_KEY) ?? ''; } catch { /* ignore */ }
  const themeBtn = (value        , text        ) => h('button', { type: 'button', class: theme === value ? 'on' : '',
    onclick: () => { try { localStorage.setItem(THEME_KEY, value); } catch { /* ignore */ } applyTheme(); ctx.refresh(); } }, text);

  const backup = () => {
    const s = ctx.store.get();
    download(`gabay-backup-${ctx.today}.json`, exportBackup(s, new Date().toISOString()));
    set({ lastBackupOn: ctx.today });
    snackbar('הגיבוי נשמר בהורדות. כדאי לשלוח אותו לעצמך בוואטסאפ או במייל.');
  };
  const restore = async (e       ) => {
    const file = (e.target                    ).files?.[0];
    if (!file) return;
    try {
      const next = parseBackup(await file.text());
      confirmSheet('להחליף את כל הנתונים בגיבוי?', 'החלף', () => ctx.store.set(next, 'הנתונים שוחזרו מהגיבוי'));
    } catch (err) {
      snackbar((err         ).message);
    }
  };
  const last = state.settings.lastBackupOn;
  const defaults = defaultPrayers();

  return h('div', { class: 'screen' },
    appBar('הגדרות', null, { back: 'history' }),
    h('main', { class: 'body', style: 'gap:16px;padding-top:12px' },
      backupDue(ctx) ? h('div', { class: 'paused' }, last ? `הגיבוי האחרון לפני ${daysBetween(last, ctx.today)} יום` : 'עוד לא נשמר גיבוי') : null,
      h('div', { class: 'card' }, h('h2', {}, 'גיבוי'),
        h('p', { class: 'muted' }, 'הנתונים נשמרים רק בטלפון. קובץ גיבוי מחזיר אותם בטלפון חדש או אחרי ניקוי.' +
          (last ? ` גיבוי אחרון: ${last.split('-').reverse().join('.')}.` : '')),
        h('button', { class: 'btn fill wide', onclick: backup }, icon('save', 20), 'שמור גיבוי'),
        h('label', { class: 'btn out wide' }, 'שחזר מגיבוי…',
          h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: restore }))),
      h('div', { class: 'field' }, h('label', {}, 'מזדמן יוצא מהתור אחרי (ימים)'),
        h('input', { type: 'number', min: 30, max: 1000, inputmode: 'numeric', value: state.settings.inactiveDays,
          onchange: (e       ) => { const n = Number((e.target                    ).value); if (n >= 30) set({ inactiveDays: n }); } })),
      h('div', { class: 'sechead' }, 'ערכת צבעים'),
      h('div', { class: 'seg' }, themeBtn('', 'כמו הטלפון'), themeBtn('light', 'בהיר'), themeBtn('dark', 'כהה')),
      h('div', { class: 'sechead' }, 'נוסח התפילות'),
      h('p', { class: 'note', style: 'margin:0' }, 'השם נכנס במקום {name}, רשימת החולים במקום {names}, שם הבת שנולדה במקום {baby}, ו״שבעלה יתן לצדקה / שהסבא יתן צדקה״ במקום {donor}.'),
      ...(Object.keys(PRAYER_LABEL)                     ).map((k) => h('div', { class: 'field' }, h('label', {}, PRAYER_LABEL[k]),
        h('textarea', { rows: 4, onchange: (e       ) => {
          const v = (e.target                       ).value.trim() || defaults[k];
          set({ prayers: { ...ctx.store.get().settings.prayers, [k]: v } });
        } }, state.settings.prayers[k]))),
      h('p', { class: 'note' }, 'גבאי · גרסה b912e901df · קוד פתוח (GPL)')));
}

// A screen reached from the "עוד" menu keeps the bottom bar, so the main page is always one tap away.
export function renderSettings(ctx     )              {
  const el = renderSettingsInner(ctx);
  el.append(bottomNav('more'));
  return el;
}
