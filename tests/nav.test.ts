import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Nav, type Browser } from '../web/nav.ts';

// A fake browser history: a list of entries and a position; every change fires the app's hash listener.
function browser(start = '') {
  const entries = [start];
  let at = 0;
  let nav: Nav;
  const b: Browser & { systemBack(): void; entries: string[]; at(): number } = {
    entries,
    at: () => at,
    current: () => entries[at],
    push(h) { entries.splice(at + 1); entries.push(h); at++; nav.changed(); },
    go(n) { at = Math.max(0, at + n); nav.changed(); },
    replace(h) { entries[at] = h; nav.changed(); },
    systemBack() { if (at > 0) { at--; nav.changed(); } else at = -1; },
  };
  nav = new Nav(b);
  return { b, nav };
}

test('main → history → a day → back → back is the main page, and the system back then leaves the app', () => {
  const { b, nav } = browser();
  nav.go('#history');
  nav.go('#day/2026-10-22.shacharit');
  nav.back();
  assert.equal(b.current(), '#history');
  nav.back();
  assert.equal(b.current(), '');
  b.systemBack();
  assert.equal(b.at(), -1); // out of the app, no loop
});

test('the system back gesture walks the same way as the in-app back', () => {
  const { b, nav } = browser();
  nav.go('#history');
  nav.go('#day/2026-10-22.shacharit');
  b.systemBack();
  b.systemBack();
  assert.equal(b.current(), '');
  assert.equal(nav.depth(), 1);
});

test('a bottom-bar tab already open earlier is returned to, not stacked again', () => {
  const { b, nav } = browser();
  nav.go('#history');
  nav.go('#day/2026-10-22.shacharit');
  nav.tab('#reading');
  assert.equal(b.current(), '');
  assert.equal(b.at(), 0);
});

test('picking from the choosing page returns to the main page without leaving the choosing page behind', () => {
  const { b, nav } = browser('#reading');
  nav.go('#choose/Y/2');
  nav.home('#reading');
  assert.equal(b.current(), '#reading');
  assert.equal(b.at(), 0);
});

test('back with nothing behind goes to the main page', () => {
  const { b, nav } = browser('#history');
  nav.back();
  assert.equal(b.current(), '#reading');
});
