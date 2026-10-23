// Generates web/data/torah.json: for every weekday reading day (as the app's own calendar decides),
// the verses of each aliyah, and the text of those verses with niqqud and ta'amim.
// Run once in a while (needs network and @hebcal/leyning, which the app itself does not depend on):
//   npm i --prefix /tmp/ley @hebcal/leyning@10.1.0
//   LEYNING=/tmp/ley/node_modules CACHE=/tmp/ley/cache node scripts/torah-data.ts
// Text: "Miqra according to the Masorah" (CC-BY-SA) via the Sefaria API. Schedule: Israel.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { addDays, fromISODate } from '../core/dates.ts';
import { dayInfo } from '../core/day.ts';
import { hebcal } from '../core/hebcal.ts';

const FROM = '2026-09-01', TO = '2036-12-31';
const VERSION = 'Miqra_according_to_the_Masorah';
const mods = process.env.LEYNING ?? '';
const cacheDir = process.env.CACHE ?? '/tmp/gabay-sefaria-cache';
const core = await import(pathToFileURL(join(mods, '@hebcal/core/dist/esm/index.js')).href);
const ley = await import(pathToFileURL(join(mods, '@hebcal/leyning/dist/esm/index.js')).href);

type Ref = [string, number, number, number, number]; // book, chapter, verse, end chapter, end verse
interface ReadingOut { name: string; aliyot: Ref[] }

const toRef = (a: { k: string; b: string; e: string }): Ref => {
  const [c1, v1] = a.b.split(':').map(Number), [c2, v2] = a.e.split(':').map(Number);
  return [a.k, c1, v1, c2, v2];
};
// Names come from the app's own calendar (core/day.ts), so they read the same as on the main page.
const he = (s: string) => hebcal.Locale.gettext(s, 'he-x-NoNikud');
function specialName(banner: string, en: string): string {
  const day = /Chanukah/.test(en) ? /Day (\d)/.exec(en)?.[1] : undefined;
  return banner + (day ? ' · יום ' + hebcal.gematriya(Number(day)) : '');
}

// Fast-day mincha (and Tisha B'Av mincha): ויחל.
const VAYECHAL: Ref[] = [['Exodus', 32, 11, 32, 14], ['Exodus', 34, 1, 34, 3], ['Exodus', 34, 4, 34, 10]];

function nextParsha(date: string): string[] {
  // The parasha of the next Shabbat that has one (skips a Yom Tov Shabbat), Israel schedule.
  let d = date;
  for (let i = 0; i < 30; i++) {
    d = addDays(d, 1);
    if (fromISODate(d).getDay() !== 6) continue;
    const hd = new core.HDate(fromISODate(d));
    const s = core.HebrewCalendar.getSedra(hd.getFullYear(), true).lookup(hd);
    if (!s.chag) return s.parsha;
  }
  throw new Error('no parasha after ' + date);
}

// The same verses are read on many days; a day keeps its own name and points at a shared verse list.
const readings = new Map<string, Ref[]>();
const days: Record<string, [string, string]> = {};
const mincha: Record<string, [string, string]> = {};
const idOf = (aliyot: Ref[]) => {
  const id = JSON.stringify(aliyot);
  if (!readings.has(id)) readings.set(id, aliyot);
  return id;
};

for (let date = FROM; date <= TO; date = addDays(date, 1)) {
  const info = dayInfo(date);
  if (!info.reading) continue;
  let out: ReadingOut;
  if (!info.banner) {
    // A plain Monday / Thursday (also Yom HaAtzma'ut / Yom Yerushalayim: the shul reads the parasha).
    const parsha = nextParsha(date);
    const w = ley.getWeekdayReading(parsha.join('-'));
    out = { name: parsha.map(he).join('־'), aliyot: [1, 2, 3].map((i) => toRef(w[i])) };
  } else {
    const l = ley.getLeyningOnDate(new core.HDate(fromISODate(date)), true);
    const x = (Array.isArray(l) ? l : [l]).find((y: any) => y?.fullkriyah || y?.weekday);
    if (!x) throw new Error('no leyning for ' + date + ' ' + info.banner);
    const a = x.fullkriyah ?? x.weekday;
    let aliyot = Object.keys(a).filter((k) => /^\d$/.test(k)).sort().map((k) => toRef(a[k]));
    // Chol HaMoed Sukkot and Hoshana Rabba (the shul's custom, Israel): all four olim read the day's three
    // verses. Sukkot day n (Tishrei 14 + n) reads Numbers 29:17+3(n−2) and the next two verses; computed
    // here, because Hebcal's first aliyah is not the day's section on Hoshana Rabba.
    if (/Sukkot/.test(x.name.en) && /Chol ha-Moed|Hoshana/.test(x.name.en)) {
      const n = new core.HDate(fromISODate(date)).getDate() - 14;
      if (n < 2 || n > 7) throw new Error('unexpected Sukkot day ' + n + ' on ' + date);
      const start = 17 + 3 * (n - 2);
      aliyot = [0, 1, 2, 3].map((): Ref => ['Numbers', 29, start, 29, start + 2]);
    }
    // Chanukah days 2–7 with 3 aliyot (the shul's custom, Israel): the third oleh repeats the day's nasi in
    // full (from the first aliyah's start to the second's end), not the next day's nasi.
    const chanukahDay = /Chanukah/.test(x.name.en) ? Number(/Day (\d)/.exec(x.name.en)?.[1]) : 0;
    if (chanukahDay >= 2 && chanukahDay <= 7 && aliyot.length === 3) {
      const [first, second] = aliyot;
      aliyot = [first, second, [first[0], first[1], first[2], second[3], second[4]]];
    }
    out = { name: specialName(info.banner, x.name.en), aliyot };
  }
  days[date] = [idOf(out.aliyot), out.name];
  if (info.hasMincha) mincha[date] = [idOf(VAYECHAL), info.banner + ' · מנחה'];
}

// Fetch the verses (cached), keeping the parasha breaks and ketiv/qere marks.
mkdirSync(cacheDir, { recursive: true });
const classes = new Set<string>();
async function fetchRange(r: Ref): Promise<{ ref: string; html: string }[]> {
  const [book, c1, v1, c2, v2] = r;
  const tref = `${book}.${c1}.${v1}-${c2 === c1 ? '' : c2 + '.'}${v2}`;
  const file = join(cacheDir, tref + '.json');
  if (!existsSync(file)) {
    const res = await fetch(`https://www.sefaria.org/api/v3/texts/${tref}?version=hebrew|${VERSION}`);
    if (!res.ok) throw new Error(`${tref}: ${res.status}`);
    writeFileSync(file, await res.text());
  }
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const v = data.versions?.[0];
  if (v?.versionTitle !== 'Miqra according to the Masorah') throw new Error(`${tref}: wrong version ${v?.versionTitle}`);
  const chapters: string[][] = c1 === c2 ? [v.text] : v.text;
  const out: { ref: string; html: string }[] = [];
  chapters.forEach((ch, i) => ch.forEach((html, j) => {
    const c = c1 + i, n = (i === 0 ? v1 : 1) + j;
    for (const m of html.matchAll(/class="([^"]+)"/g)) classes.add(m[1]);
    out.push({ ref: `${book} ${c}:${n}`, html });
  }));
  return out;
}

// Sefaria HTML → the app's compact form: plain text, {{ketiv|qere}}, and a trailing {פ} / {ס}.
// Notes on Sfard / Ashkenaz scrolls become [[note]]; other footnotes (Yemenite, Aleppo) are dropped.
// Big / small letters become plain letters; the paseq ׀ stays.
function compact(html: string): string {
  return html
    // Keep the notes about how Sfard / Ashkenaz scrolls are written (the gabbai checks against the scroll).
    .replace(/<sup class="footnote-marker">[^<]*<\/sup><i class="footnote">(.*?)<\/i>/g,
      (_, note: string) => (/ספרד ואשכנז/.test(note) ? ` [[${note.replace(/<[^>]+>/g, '').replace(/^\(|\)$/g, '')}]]` : ''))
    .replace(/&thinsp;/g, ' ')
    .replace(/<span class="mam-kq"><span class="mam-kq-k">\(([^)]*)\)<\/span>\s*<span class="mam-kq-q">\[([^\]]*)\]<\/span><\/span>/g, '{{$1|$2}}')
    .replace(/<span class="mam-spi-(pe|samekh)">\{([פס])\}<\/span>/g, ' {$2}')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const verses: Record<string, string> = {};
for (const r of readings.values()) for (const a of r) for (const v of await fetchRange(a)) verses[v.ref] = compact(v.html);
const leftover = Object.entries(verses).filter(([, v]) => /[<>&]|\{\{[^}]*$/.test(v));
if (leftover.length) throw new Error('unconverted markup in ' + leftover.map(([k]) => k).join(', '));

const ids = [...readings.keys()];
const json = {
  credit: 'מקרא על פי המסורה · CC-BY-SA · ספריא (sefaria.org) · חלוקת העליות: Hebcal (מנהג ארץ ישראל)',
  readings: ids.map((id) => readings.get(id)),
  days: Object.fromEntries(Object.entries(days).map(([d, [id, name]]) => [d, [ids.indexOf(id), name]])),
  mincha: Object.fromEntries(Object.entries(mincha).map(([d, [id, name]]) => [d, [ids.indexOf(id), name]])),
  verses,
};
writeFileSync('web/data/torah.json', JSON.stringify(json));
console.log(`days ${Object.keys(days).length}, mincha ${Object.keys(mincha).length}, readings ${ids.length}, verses ${Object.keys(verses).length}`);
console.log('markup classes:', [...classes].join(' '));
