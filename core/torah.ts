// The weekday Torah reading: which verses each aliyah reads (web/data/torah.json, made by
// scripts/torah-data.ts) and how a verse is drawn. Verse text: "Miqra according to the Masorah" (CC-BY-SA).
import { hebcal } from './hebcal.ts';
import type { ISODate, Reading } from './types.ts';

export type Ref = [string, number, number, number, number]; // book, chapter, verse, end chapter, end verse

export interface TorahData {
  credit: string;
  readings: Ref[][];
  days: Record<ISODate, [number, string]>;
  mincha: Record<ISODate, [number, string]>;
  verses: Record<string, string>; // 'Genesis 18:1' → text with {{ketiv|qere}}, [[note]], trailing {פ} / {ס}
}

export interface Verse { key: string; n: string; text: string }
export interface Aliyah { ref: Ref; label: string; verses: Verse[] }
export interface TorahReading { name: string; aliyot: Aliyah[] }

const BOOK_HE: Record<string, string> = { Genesis: 'בראשית', Exodus: 'שמות', Leviticus: 'ויקרא', Numbers: 'במדבר', Deuteronomy: 'דברים' };

// Hebrew numerals without geresh / gershayim for verse numbers (ו, יח), with them for chapters (י״ח).
const num = (n: number) => hebcal.gematriya(n).replace(/[׳״]/g, '');

export function refLabel([book, c1, v1, c2, v2]: Ref): string {
  const ch = (c: number) => hebcal.gematriya(c);
  return c1 === c2
    ? `${BOOK_HE[book]} ${ch(c1)} ${num(v1)}–${num(v2)}`
    : `${BOOK_HE[book]} ${ch(c1)} ${num(v1)} – ${ch(c2)} ${num(v2)}`;
}

function versesOf(data: TorahData, [book, c1, v1, c2, v2]: Ref): Verse[] {
  const out: Verse[] = [];
  for (let c = c1; c <= c2; c++) {
    for (let v = c === c1 ? v1 : 1; c < c2 || v <= v2; v++) {
      const key = `${book} ${c}:${v}`;
      const text = data.verses[key];
      if (text === undefined) break; // past the last verse of the chapter
      out.push({ key, n: num(v), text });
    }
  }
  return out;
}

export function readingFor(data: TorahData, date: ISODate, service: Reading['service']): TorahReading | null {
  const entry = (service === 'mincha' ? data.mincha : data.days)[date];
  if (!entry) return null;
  const [i, name] = entry;
  return { name, aliyot: data.readings[i].map((ref) => ({ ref, label: refLabel(ref), verses: versesOf(data, ref) })) };
}

export type Piece =
  | { t: 'text'; s: string }
  | { t: 'kq'; k: string; q: string }
  | { t: 'note'; s: string }
  | { t: 'break'; s: 'פ' | 'ס' };

export function pieces(verse: string): Piece[] {
  const out: Piece[] = [];
  const re = /\{\{([^|}]*)\|([^}]*)\}\}|\[\[([^\]]*)\]\]|\s*\{([פס])\}\s*$/g;
  let at = 0;
  for (const m of verse.matchAll(re)) {
    if (m.index! > at) out.push({ t: 'text', s: verse.slice(at, m.index) });
    if (m[1] !== undefined) out.push({ t: 'kq', k: m[1], q: m[2] });
    else if (m[3] !== undefined) out.push({ t: 'note', s: m[3] });
    else out.push({ t: 'break', s: m[4] as 'פ' | 'ס' });
    at = m.index! + m[0].length;
  }
  if (at < verse.length) out.push({ t: 'text', s: verse.slice(at) });
  return out;
}

// As written in the scroll: letters only, the ketiv, words split at the maqaf.
export function scrollText(verse: string): string {
  return verse
    .replace(/\{\{([^|}]*)\|[^}]*\}\}/g, '$1')
    .replace(/\[\[[^\]]*\]\]|\{[פס]\}/g, '')
    .replace(/[־]/g, ' ')
    .replace(/[^א-ת\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
