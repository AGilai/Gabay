// Where someone sits, roughly: one of 10 areas. 5 columns from left to right facing the ark, and two
// halves, קדימה (next to the ark) and אחורה (next to the entrance). Written "3-ק".
                             
                                                  // col 1–5
                                                                      // both null: anywhere

export const COLS = [1, 2, 3, 4, 5];
export const HALF_LETTER                       = { F: 'ק', R: 'א' };
export const HALF_WORD                       = { F: 'קדימה', R: 'אחורה' };
export const ANYWHERE             = { col: null, half: null };

export function areaTag(a                         )         {
  return a ? `${a.col}-${HALF_LETTER[a.half]}` : '';
}

export function filterText(f            )         {
  if (f.col && f.half) return areaTag({ col: f.col, half: f.half });
  if (f.col) return 'טור ' + f.col;
  return f.half ? HALF_WORD[f.half] : 'הכל';
}

export const isAnywhere = (f            ) => f.col === null && f.half === null;

// Someone with no area is found only when the filter is empty.
export function inArea(a                         , f            )          {
  if (isAnywhere(f)) return true;
  return !!a && (f.col === null || a.col === f.col) && (f.half === null || a.half === f.half);
}
