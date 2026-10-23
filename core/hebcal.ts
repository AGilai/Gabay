// The hebcal namespace. In the browser, vendor/hebcal.min.js is loaded by a <script> tag first and
// defines globalThis.hebcal. In Node (tests, scripts) the same file is evaluated here, in the main
// realm: a vm context would break `instanceof Date` inside the library.

async function loadForNode(): Promise<any> {
  const { readFileSync } = await import('node:fs');
  const code = readFileSync(new URL('../vendor/hebcal.min.js', import.meta.url), 'utf8');
  (0, eval)(code);
  return (globalThis as any).hebcal;
}

export const hebcal: any = (globalThis as any).hebcal ?? await loadForNode();
