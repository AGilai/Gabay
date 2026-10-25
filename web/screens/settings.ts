// "עוד" menu and S9 settings: inactivity threshold, theme, prayer texts, backup and restore.
import { exportBackup, parseBackup } from '../../core/backup.ts';
import { daysBetween } from '../../core/dates.ts';
import { defaultPrayers } from '../../core/prayers.ts';
import type { Prayers } from '../../core/types.ts';
import type { Ctx } from '../ctx.ts';
import { appBar, bottomNav, confirmSheet, h, icon, snackbar } from '../ui.ts';
import { backupDue } from './reading.ts';

const PRAYER_LABEL: Record<keyof Prayers, string> = {
  oleh: 'מי שברך לעולה', sickM: 'לחולה', sickF: 'לחולה (נקבה)', sickPlural: 'לחולים (כמה שמות)', barMitzvah: 'בר מצווה',
  yoledetBen: 'יולדת בן', yoledetBat: 'יולדת בת', azkaraM: 'אזכרה (זכר)', azkaraF: 'אזכרה (נקבה)',
};
const THEME_KEY = 'gabay.theme';

export function applyTheme(): void {
  let t = '';
  try { t = localStorage.getItem(THEME_KEY) ?? ''; } catch { /* default: follow the phone */ }
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

export function renderMore(ctx: Ctx): HTMLElement {
  const due = backupDue(ctx);
  const item = (href: string, ic: string, text: string, badge?: string) =>
    h('a', { href }, icon(ic), text, badge ? h('span', { class: 'badge' }, badge) : null);
  return h('div', { class: 'screen' },
    appBar('עוד', ctx.store.demo ? 'מצב הדגמה: שום דבר לא נשמר' : null),
    h('main', { class: 'body menu', style: 'gap:0' },
      item('#history', 'history', 'היסטוריה'),
      item('#seats', 'people', 'סידור מקומות'),
      item('#import', 'import', 'ייבוא מוואטסאפ'),
      item('#settings', 'settings', 'הגדרות וגיבוי', due ? 'הגיע הזמן לגבות' : undefined)),
    bottomNav('more', due));
}

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function renderSettingsInner(ctx: Ctx): HTMLElement {
  const state = ctx.store.get();
  const set = (patch: Partial<typeof state.settings>) => {
    const s = ctx.store.get();
    ctx.store.set({ ...s, settings: { ...s.settings, ...patch } });
  };
  let theme = '';
  try { theme = localStorage.getItem(THEME_KEY) ?? ''; } catch { /* ignore */ }
  const themeBtn = (value: string, text: string) => h('button', { type: 'button', class: theme === value ? 'on' : '',
    onclick: () => { try { localStorage.setItem(THEME_KEY, value); } catch { /* ignore */ } applyTheme(); ctx.refresh(); } }, text);

  const backup = () => {
    const s = ctx.store.get();
    download(`gabay-backup-${ctx.today}.json`, exportBackup(s, new Date().toISOString()));
    set({ lastBackupOn: ctx.today });
    snackbar('הגיבוי נשמר בהורדות. כדאי לשלוח אותו לעצמך בוואטסאפ או במייל.');
  };
  const restore = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const next = parseBackup(await file.text());
      confirmSheet('להחליף את כל הנתונים בגיבוי?', 'החלף', () => ctx.store.set(next, 'הנתונים שוחזרו מהגיבוי'));
    } catch (err) {
      snackbar((err as Error).message);
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
          onchange: (e: Event) => { const n = Number((e.target as HTMLInputElement).value); if (n >= 30) set({ inactiveDays: n }); } })),
      h('div', { class: 'sechead' }, 'ערכת צבעים'),
      h('div', { class: 'seg' }, themeBtn('', 'כמו הטלפון'), themeBtn('light', 'בהיר'), themeBtn('dark', 'כהה')),
      h('div', { class: 'sechead' }, 'מצב קריאה: מי שברך לעולה אחרי כל עלייה'),
      h('div', { class: 'seg' },
        h('button', { type: 'button', class: state.settings.olehInService ? '' : 'on', onclick: () => set({ olehInService: false }) }, 'לא'),
        h('button', { type: 'button', class: state.settings.olehInService ? 'on' : '', onclick: () => set({ olehInService: true }) }, 'כן')),
      h('div', { class: 'sechead' }, 'נוסח התפילות'),
      h('p', { class: 'note', style: 'margin:0' }, 'השם נכנס במקום {name}, רשימת החולים במקום {names}, שם הבת שנולדה במקום {baby}, ו״שבעלה יתן לצדקה / שהסבא יתן צדקה״ במקום {donor}.'),
      ...(Object.keys(PRAYER_LABEL) as (keyof Prayers)[]).map((k) => h('div', { class: 'field' }, h('label', {}, PRAYER_LABEL[k]),
        h('textarea', { rows: 4, onchange: (e: Event) => {
          const v = (e.target as HTMLTextAreaElement).value.trim() || defaults[k];
          set({ prayers: { ...ctx.store.get().settings.prayers, [k]: v } });
        } }, state.settings.prayers[k]))),
      h('p', { class: 'note' }, 'גבאי · גרסה __VERSION__ · קוד פתוח (GPL)')));
}

// A screen reached from the "עוד" menu keeps the bottom bar, so the main page is always one tap away.
export function renderSettings(ctx: Ctx): HTMLElement {
  const el = renderSettingsInner(ctx);
  el.append(bottomNav('more'));
  return el;
}
