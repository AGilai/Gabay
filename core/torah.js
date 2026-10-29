// The weekday Torah reading: which verses each aliyah reads (web/data/torah.json, made by
// scripts/torah-data.ts) and how a verse is drawn. Verse text: "Miqra according to the Masorah" (CC-BY-SA).
import { hebcal } from './hebcal.js';
                                                   

                                                            // book, chapter, verse, end chapter, end verse

                            
                 
                    
                                          
                                            
                                                                                                            
 

                                                               
                                                                    
                                                                

const BOOK_HE                         = { Genesis: 'בראשית', Exodus: 'שמות', Leviticus: 'ויקרא', Numbers: 'במדבר', Deuteronomy: 'דברים' };

// Hebrew numerals without geresh / gershayim for verse numbers (ו, יח), with them for chapters (י״ח).
const num = (n        ) => hebcal.gematriya(n).replace(/[׳״]/g, '');

export function refLabel([book, c1, v1, c2, v2]     )         {
  const ch = (c        ) => hebcal.gematriya(c);
  return c1 === c2
    ? `${BOOK_HE[book]} ${ch(c1)} ${num(v1)}–${num(v2)}`
    : `${BOOK_HE[book]} ${ch(c1)} ${num(v1)} – ${ch(c2)} ${num(v2)}`;
}

function versesOf(data           , [book, c1, v1, c2, v2]     )          {
  const out          = [];
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

export function readingFor(data           , date         , service                    )                      {
  const entry = (service === 'mincha' ? data.mincha : data.days)[date];
  if (!entry) return null;
  const [i, name] = entry;
  return { name, aliyot: data.readings[i].map((ref) => ({ ref, label: refLabel(ref), verses: versesOf(data, ref) })) };
}

                   
                            
                                     
                            
                                 

export function pieces(verse        )          {
  const out          = [];
  const re = /\{\{([^|}]*)\|([^}]*)\}\}|\[\[([^\]]*)\]\]|\s*\{([פס])\}\s*$/g;
  let at = 0;
  for (const m of verse.matchAll(re)) {
    if (m.index  > at) out.push({ t: 'text', s: verse.slice(at, m.index) });
    if (m[1] !== undefined) out.push({ t: 'kq', k: m[1], q: m[2] });
    else if (m[3] !== undefined) out.push({ t: 'note', s: m[3] });
    else out.push({ t: 'break', s: m[4]              });
    at = m.index  + m[0].length;
  }
  if (at < verse.length) out.push({ t: 'text', s: verse.slice(at) });
  return out;
}

// As written in the scroll: letters only, the ketiv, words split at the maqaf.
export function scrollText(verse        )         {
  return verse
    .replace(/\{\{([^|}]*)\|[^}]*\}\}/g, '$1')
    .replace(/\[\[[^\]]*\]\]|\{[פס]\}/g, '')
    .replace(/[־]/g, ' ')
    .replace(/[^א-ת\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
