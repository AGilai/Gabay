// Where someone sits, roughly: one of 10 areas. 5 columns from left to right facing the ark, and two
// halves, קדימה (next to the ark) and אחורה (next to the entrance). Written "3-ק".
export type Half = 'F' | 'R';
export interface Area { col: number; half: Half } // col 1–5
export interface AreaFilter { col: number | null; half: Half | null } // both null: anywhere

export const COLS = [1, 2, 3, 4, 5];
export const HALF_LETTER: Record<Half, string> = { F: 'ק', R: 'א' };
export const HALF_WORD: Record<Half, string> = { F: 'קדימה', R: 'אחורה' };
export const ANYWHERE: AreaFilter = { col: null, half: null };

export function areaTag(a: Area | null | undefined): string {
  return a ? `${a.col}-${HALF_LETTER[a.half]}` : '';
}

export function filterText(f: AreaFilter): string {
  if (f.col && f.half) return areaTag({ col: f.col, half: f.half });
  if (f.col) return 'טור ' + f.col;
  return f.half ? HALF_WORD[f.half] : 'הכל';
}

export const isAnywhere = (f: AreaFilter) => f.col === null && f.half === null;

// Someone with no area is found only when the filter is empty.
export function inArea(a: Area | null | undefined, f: AreaFilter): boolean {
  if (isAnywhere(f)) return true;
  return !!a && (f.col === null || a.col === f.col) && (f.half === null || a.half === f.half);
}
