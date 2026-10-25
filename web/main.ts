// Boot, hash router, service worker and wake lock.
import { toISODate } from '../core/dates.ts';
import type { Ctx } from './ctx.ts';
import { openStore, requestPersist } from './store.ts';
import { snackbar } from './ui.ts';
import { nav } from './nav.ts';
import { renderReading } from './screens/reading.ts';
import { renderChoose } from './screens/choose.ts';
import { parseKey } from './ctx.ts';
import { renderNewPerson, renderPerson } from './screens/person.ts';
import { renderPrayer } from './screens/prayer.ts';
import { renderSick } from './screens/sick.ts';
import { renderHistory } from './screens/history.ts';
import { renderImport } from './screens/importer.ts';
import { applyTheme, renderMore, renderSettings } from './screens/settings.ts';
import { loadTorah, renderTorah } from './screens/torah.ts';
import { renderService } from './screens/service.ts';
import { renderSeats } from './screens/seats.ts';

const VERSION = '__VERSION__';
const params = new URLSearchParams(location.search);
const demo = params.get('demo') === '1';
const dateParam = params.get('date');
const today = dateParam && /^\d{4}-\d\d-\d\d$/.test(dateParam) ? dateParam : toISODate(new Date());

applyTheme();
const root = document.getElementById('app')!;
const store = await openStore(today, demo);

function render(): void {
  const [route, ...args] = (location.hash.slice(1) || 'reading').split('/');
  const ctx: Ctx = {
    store, today, refresh: render,
    go: (hash) => nav().go(hash), home: (hash) => nav().home(hash), replace: (hash) => nav().replace(hash),
  };
  let view: HTMLElement;
  switch (route) {
    case 'choose':
      view = renderChoose(ctx, args);
      break;
    case 'person':
      view = renderPerson(ctx, args[0] ?? '');
      break;
    case 'new':
      view = renderNewPerson(ctx, args);
      break;
    case 'prayer':
      view = renderPrayer(ctx, args[0] ?? 'oleh');
      break;
    case 'sick':
      view = renderSick(ctx);
      break;
    case 'torah':
      view = renderTorah(ctx, args);
      break;
    case 'service':
      view = renderService(ctx, args);
      break;
    case 'history':
      view = renderHistory(ctx);
      break;
    case 'seats':
      view = renderSeats(ctx);
      break;
    case 'import':
      view = renderImport(ctx);
      break;
    case 'more':
      view = renderMore(ctx);
      break;
    case 'settings':
      view = renderSettings(ctx);
      break;
    case 'day': {
      const key = parseKey(args[0]);
      view = key ? renderReading(ctx, key) : renderReading(ctx);
      break;
    }
    default:
      view = renderReading(ctx);
  }
  const scroller = root.querySelector('.body,.reader');
  const keep = scroller && root.dataset.route === location.hash ? scroller.scrollTop : 0;
  root.replaceChildren(view);
  root.dataset.route = location.hash;
  const next = root.querySelector('.body,.reader');
  if (next) next.scrollTop = keep;
}

nav(); // remember where the app was opened
window.addEventListener('hashchange', () => { nav().changed(); render(); });
window.addEventListener('hashchange', keepAwake);
document.addEventListener('visibilitychange', keepAwake);

// The screen stays on while the reading page, the Torah text or reading mode is open (the gabbai holds the phone at the bimah).
let wakeLock: { release(): Promise<void> } | null = null;
async function keepAwake(): Promise<void> {
  const want = document.visibilityState === 'visible' && /^(#reading|#torah.*|#service.*)?$/.test(location.hash);
  try {
    if (want && !wakeLock) {
      wakeLock = await (navigator as any).wakeLock?.request('screen') ?? null;
      (wakeLock as any)?.addEventListener?.('release', () => { wakeLock = null; });
    } else if (!want && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* not supported or refused: the phone's own timeout applies */ }
}

async function registerWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const reg = await navigator.serviceWorker.register('sw.js');
  const offer = (worker: ServiceWorker) => {
    document.querySelector('.update')?.remove();
    const btn = document.createElement('button');
    btn.className = 'update';
    btn.textContent = 'גרסה חדשה · רענן';
    btn.onclick = () => worker.postMessage('skip-waiting');
    document.body.prepend(btn);
  };
  if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w?.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
    });
  });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloaded) { reloaded = true; location.reload(); }
  });
}
store.subscribe((label) => {
  // Screens with open text fields re-render themselves; a store change must not steal focus.
  const a = document.activeElement;
  if (!(a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement) || !root.contains(a)) render();
  if (label) snackbar(label, 'בטל', () => store.undo());
});
render();
keepAwake();
// The verse references on the main page appear once the Torah data has loaded.
loadTorah().then(() => { if (!(document.activeElement instanceof HTMLInputElement)) render(); }, () => {});
registerWorker().catch((e) => console.warn('service worker', e));
if (!demo) requestPersist();
console.debug('gabay', VERSION, demo ? 'demo' : '');
