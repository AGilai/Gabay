// S8: one-time import of the WhatsApp log. One question card at a time, then a summary.
import { emptyState } from '../core/backup.js';
import { unlock } from '../core/lock.js';
import { readZipEntry } from '../core/unzip.js';
import { applyDraft, buildDraft, parseChat,                                        } from '../core/whatsapp.js';
                                                 
import { GROUP_WORD,          } from '../ctx.js';
import { appBar, bottomNav, confirmSheet, h, snackbar } from '../ui.js';

                                                                                             
let session                 = null;

const SHARE_CACHE = 'gabay-share';
const SHARE_URL = 'shared-file';

async function textOf(bytes            , name        )                  {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) return new TextDecoder().decode(bytes);
  const text = await readZipEntry(bytes, '.txt');
  if (text === null) throw new Error(`לא נמצא קובץ שיחה בתוך ${name}`);
  return text;
}

function start(ctx     , text        )       {
  const { entries, skipped } = parseChat(text);
  if (!entries.length) return snackbar('לא נמצאו עליות בקובץ');
  const draft = buildDraft(entries, ctx.today);
  session = { draft, answers: draft.questions.map(() => null), at: 0, skipped };
  ctx.refresh();
}

// A file shared from WhatsApp lands in the service worker's cache (see sw.js).
export async function takeSharedFile()                                                      {
  if (!('caches' in window)) return null;
  const cache = await caches.open(SHARE_CACHE);
  const res = await cache.match(SHARE_URL);
  if (!res) return null;
  await cache.delete(SHARE_URL);
  return { bytes: new Uint8Array(await res.arrayBuffer()), name: decodeURIComponent(res.headers.get('X-File-Name') ?? 'export.zip') };
}

const countsText = (c                       ) =>
  [c.K ? `${c.K}× הכהן` : '', c.L ? `${c.L}× הלוי` : '', c.Y ? `${c.Y}× בלי` : ''].filter(Boolean).join(' · ');

function questionCard(ctx     , s         , q          )              {
  const answer = (a        ) => { s.answers[s.at] = a; s.at++; ctx.refresh(); };
  const btn = (a        , text        , main = false) =>
    h('button', { class: 'btn ' + (main ? 'fill' : 'tonal') + (s.answers[s.at] === a ? ' sel' : ''), onclick: () => answer(a) }, text);
  const people = new Map(s.draft.people.map((p) => [p.key, p]));
  const line = (key        ) => {
    const p = people.get(key);
    return h('div', { class: 'list-item' }, h('div', { class: 'who' }, h('b', {}, key),
      h('small', {}, p ? `${p.dates.length} עליות · אחרונה ${p.dates.map((d) => d.date).sort().at(-1)?.split('-').reverse().join('.')}` : '')));
  };
  if (q.kind === 'same') {
    return h('div', { class: 'card' }, h('h2', {}, 'אותו אדם?'), h('p', { class: 'muted' }, 'שני כתיבים דומים מאוד.'),
      line(q.a), line(q.b), h('div', { class: 'row-btns' }, btn('separate', 'שניים שונים'), btn('merge', 'אותו אדם', true)));
  }
  if (q.kind === 'group') {
    const best = (['K', 'L', 'Y']           ).reduce((a, b) => (q.counts[b] > q.counts[a] ? b : a));
    return h('div', { class: 'card' }, h('h2', {}, 'איזו קבוצה?'), line(q.key), h('p', {}, countsText(q.counts)),
      h('div', { class: 'row-btns' }, ...(['K', 'L', 'Y']           ).map((g) => btn(g, GROUP_WORD[g], g === best))));
  }
  return h('div', { class: 'card' }, h('h2', {}, 'זה רמז?'), line(q.key),
    h('p', {}, 'בסוגריים: ', h('b', {}, q.hint)),
    h('p', { class: 'note' }, 'רמז נשמר בכרטיס האישי ובמסך הבחירה, אף פעם לא במסך הראשי.'),
    h('div', { class: 'row-btns' }, btn('drop', 'למחוק'), btn('keep', 'לשמור כרמז', true)));
}

function renderImportInner(ctx     )              {
  const bar = (sub               ) => appBar('ייבוא מוואטסאפ', sub, { back: 'history' });
  const load = async (bytes            , name        ) => {
    try {
      const text = await textOf(bytes, name);
      if (ctx.store.get().people.length) confirmSheet('הייבוא יוסיף לנתונים הקיימים. להמשיך?', 'המשך', () => start(ctx, text));
      else start(ctx, text);
    } catch (e) {
      snackbar((e         ).message || 'הקובץ לא נקרא');
    }
  };

  if (!session) {
    takeSharedFile().then((f) => f && load(f.bytes, f.name)).catch(() => {});
    return h('div', { class: 'screen' }, bar(null),
      h('main', { class: 'body', style: 'gap:16px;padding-top:12px' },
        lockedCard(load),
        h('div', { class: 'card' }, h('h2', {}, 'איך מייצאים'),
          h('p', {}, 'בוואטסאפ: פותחים את הקבוצה ← ⋮ ← עוד ← ייצוא צ׳אט ← בלי מדיה. בתפריט השיתוף בוחרים "גבאי", או שומרים את הקובץ ובוחרים אותו כאן.')),
        h('label', { class: 'btn fill wide' }, 'בחר קובץ ייצוא (zip / txt)',
          h('input', { type: 'file', accept: '.zip,.txt,application/zip,text/plain', hidden: true, onchange: async (e       ) => {
            const f = (e.target                    ).files?.[0];
            if (f) load(new Uint8Array(await f.arrayBuffer()), f.name);
          } })),
        ctx.store.demo ? h('button', { class: 'btn tonal wide', onclick: async () => {
          const res = await fetch('demo/chat-sample.zip');
          load(new Uint8Array(await res.arrayBuffer()), 'chat-sample.zip');
        } }, 'קובץ לדוגמה') : null,
        h('p', { class: 'note' }, 'הקובץ נקרא רק בטלפון. שום דבר לא נשלח לשום מקום.')));
  }

  const s = session;
  const total = s.draft.questions.length;
  if (s.at < total) {
    return h('div', { class: 'screen' }, bar(`שאלה ${s.at + 1} מתוך ${total}`),
      h('main', { class: 'body', style: 'gap:16px;padding-top:12px' },
        questionCard(ctx, s, s.draft.questions[s.at]),
        h('div', { class: 'row-btns' },
          s.at > 0 ? h('button', { class: 'btn tonal', onclick: () => { s.at--; ctx.refresh(); } }, 'הקודם') : null,
          h('button', { class: 'btn tonal', onclick: () => { session = null; ctx.refresh(); } }, 'ביטול'))));
  }

  const answers = s.draft.questions.map((q, i) => s.answers[i] ?? (q.kind === 'same' ? 'separate' : q.kind === 'hint' ? 'keep' : 'Y'));
  // Count what will really be saved: chained merges (a=b, b=c, a=c) collapse further than the answers suggest.
  const preview = applyDraft(emptyState(ctx.today), s.draft, answers);
  const aliyot = s.draft.people.reduce((n, p) => n + p.dates.length, 0);
  const people = preview.people.length;
  const doImport = () => {
    ctx.store.set(applyDraft(ctx.store.get(), s.draft, answers));
    session = null;
    snackbar(`יובאו ${people} אנשים`);
    ctx.go('#choose');
  };
  return h('div', { class: 'screen' }, bar('סיכום'),
    h('main', { class: 'body', style: 'gap:16px;padding-top:12px' },
      h('div', { class: 'card' }, h('h2', {}, `ייבא ${people} אנשים, ${aliyot} עליות`),
        h('p', { class: 'muted' }, `קבועים: ${preview.people.filter((p) => p.regular).length} (3 עליות ומעלה ב־12 חודשים).` +
          (s.skipped.length ? ` ${s.skipped.length} שורות דולגו.` : '')),
        h('button', { class: 'btn fill wide', onclick: doImport }, 'ייבא')),
      s.skipped.length ? h('details', { class: 'note' }, h('summary', {}, 'שורות שדולגו'), ...s.skipped.map((t) => h('div', {}, t))) : null,
      h('div', { class: 'row-btns' },
        total ? h('button', { class: 'btn tonal', onclick: () => { s.at = total - 1; ctx.refresh(); } }, 'הקודם') : null,
        h('button', { class: 'btn tonal', onclick: () => { session = null; ctx.refresh(); } }, 'ביטול'))));
}

// The gabbai's own export, locked with his passphrase and published with the app (see scripts/lock.ts).
const LOCKED_URL = 'locked/list.gabay';

function lockedCard(load                                           )              {
  const card = h('div', { class: 'card', hidden: true });
  let pass = '';
  const status = h('p', { class: 'note' });
  const open = async (e       ) => {
    e.preventDefault();
    status.textContent = 'פותח…';
    try {
      const res = await fetch(LOCKED_URL);
      const bytes = await unlock(new Uint8Array(await res.arrayBuffer()), pass);
      status.textContent = '';
      load(bytes, 'list.zip');
    } catch (err) {
      status.textContent = (err         ).message;
    }
  };
  card.append(h('h2', {}, 'הרשימה שלך (נעולה)'),
    h('p', { class: 'muted' }, 'קובץ הייצוא המקורי, נעול בסיסמה שרק לך יש.'),
    h('form', { style: 'display:grid;gap:12px', onsubmit: open },
      h('div', { class: 'field' }, h('label', {}, 'סיסמה'),
        h('input', { type: 'password', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', dir: 'ltr',
          oninput: (e       ) => { pass = (e.target                    ).value.trim(); } })),
      h('button', { class: 'btn fill wide', type: 'submit' }, 'פתח וייבא')),
    status);
  fetch(LOCKED_URL, { method: 'HEAD' }).then((r) => { card.hidden = !r.ok; }).catch(() => {});
  return card;
}

// A screen reached from the "עוד" menu keeps the bottom bar, so the main page is always one tap away.
export function renderImport(ctx     )              {
  const el = renderImportInner(ctx);
  el.append(bottomNav('more'));
  return el;
}
