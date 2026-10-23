// Small DOM kit: h() builder, icons, app bar, bottom nav, snackbar, bottom sheet, in-page confirm.
import { nav } from './nav.ts';

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | null | undefined>;

export function h(tag: string, attrs: Attrs = {}, ...children: (Child | Child[])[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') (el as HTMLInputElement).value = String(v);
    else if (k === 'checked') (el as HTMLInputElement).checked = Boolean(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function icon(name: string, size = 24): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}

export function appBar(title: string, sub: string | null, opts: { back?: string; close?: string; end?: Node[] } = {}): HTMLElement {
  const target = opts.back ?? opts.close;
  const label = opts.back ? 'חזרה' : 'סגור';
  const ic = icon(opts.back ? 'back' : 'close');
  // 'history' goes back to wherever the screen was opened from.
  const navEl = !target ? null : target === 'history'
    ? h('button', { class: 'icon', 'aria-label': label, onclick: () => nav().back() }, ic)
    : h('a', { class: 'icon', href: target, 'aria-label': label }, ic);
  return h('header', { class: 'appbar' },
    navEl,
    h('div', { class: 't' }, h('h1', {}, title), sub ? h('small', {}, sub) : null),
    ...(opts.end ?? []));
}

export type Tab = 'reading' | 'choose' | 'sick' | 'more';

export function bottomNav(active: Tab, moreDot = false): HTMLElement {
  const item = (tab: Tab, ic: string, label: string, dot = false) =>
    h('a', { href: '#' + tab, class: tab === active ? 'on' : '', onclick: (e: Event) => { e.preventDefault(); nav().tab('#' + tab); } },
      h('span', { class: dot ? 'dot' : '' }, icon(ic)), label);
  return h('nav', { class: 'nav' },
    item('reading', 'book', 'קריאה'), item('choose', 'people', 'בחירה'),
    item('sick', 'heart', 'חולים'), item('more', 'more', 'עוד', moreDot));
}

let snackTimer = 0;

export function snackbar(text: string, actionText?: string, onAction?: () => void): void {
  document.querySelector('.snack')?.remove();
  clearTimeout(snackTimer);
  const el = h('div', { class: 'snack', role: 'status' }, h('span', {}, text),
    actionText ? h('button', { onclick: () => { el.remove(); onAction?.(); } }, actionText) : null);
  document.body.append(el);
  snackTimer = window.setTimeout(() => el.remove(), 6000);
}

export function sheet(content: Node): { close(): void } {
  const scrim = h('div', { class: 'scrim' });
  const panel = h('div', { class: 'bsheet', role: 'dialog' }, h('div', { class: 'sheet-top' }), content);
  const close = () => { scrim.remove(); panel.remove(); window.removeEventListener('hashchange', close); };
  scrim.addEventListener('click', close);
  window.addEventListener('hashchange', close);
  document.body.append(scrim, panel);
  return { close };
}

// window.confirm() is not reliable in an installed app; this asks inside the page.
export function confirmSheet(question: string, yes: string, onYes: () => void): void {
  const s = sheet(h('div', { class: 'confirm' },
    h('p', {}, question),
    h('div', { class: 'row-btns' },
      h('button', { class: 'btn tonal', onclick: () => s.close() }, 'ביטול'),
      h('button', { class: 'btn fill', onclick: () => { s.close(); onYes(); } }, yes))));
}

export function nowHHMM(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
