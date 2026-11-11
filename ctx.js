// What every screen gets, and helpers for "the reading being worked on".
import { dayInfo, nextReadingDate } from './core/day.js';
                                                                
                                        

                      
               
                 
                                            
                                                                                        
                                                                                
                                                           
 

                                                                                           

const mOf = (x                     ) => x.minyan ?? 1;
const same = (a            , b            ) => a.date === b.date && a.service === b.service && mOf(a) === mOf(b);
const slotKey = (k            ) => k.date + '.' + k.service;

// The minyan picked on the main page for a day, kept while the app is open.
const picked = new Map                ();
export function pickMinyan(k            )       {
  picked.set(slotKey(k), mOf(k));
}

// On a fast day the afternoon reading is mincha.
export function currentKey(today         , hour = new Date().getHours())             {
  return withPicked({ date: today, service: dayInfo(today).hasMincha && hour >= 12 ? 'mincha' : 'shacharit' });
}

// A day's key with the minyan picked for it (only one that exists).
export function withPicked(k                                                , state        )             {
  const m = picked.get(slotKey(k)) ?? 1;
  return m > 1 && (!state || state.readings.some((r) => same(r, { ...k, minyan: m }))) ? { ...k, minyan: m } : { ...k };
}

// The reading the main page works on: today's, or on a day with no reading (and none opened by hand)
// the next reading day's, so the gabbai can prepare it.
export function activeKey(state       , today         )             {
  const now = currentKey(today);
  if (dayInfo(today).reading || findReading(state, now)) return withPicked(now, state);
  return withPicked({ date: nextReadingDate(today), service: 'shacharit' }, state);
}

export function sameKey(a            , b            )          {
  return same(a, b);
}

// The minyanim of a day and service: always 1, and any other saved.
export function minyanim(state       , k            )           {
  const ms = state.readings.filter((r) => r.date === k.date && r.service === k.service).map(mOf);
  return [...new Set([1, ...ms])].sort((a, b) => a - b);
}

export function keyText(k            )         {
  return slotKey(k) + (mOf(k) > 1 ? '.' + mOf(k) : '');
}

export function parseKey(s                    )                    {
  const m = /^(\d{4}-\d\d-\d\d)\.(shacharit|mincha)(?:\.(\d))?$/.exec(s ?? '');
  return m ? { date: m[1], service: m[2]                      , minyan: m[3] ? Number(m[3]) : 1 } : null;
}

export function findReading(state       , k            )                 {
  return state.readings.find((r) => same(r, k)) ?? null;
}

export function withReading(state       , r         )        {
  const others = state.readings.filter((x) => !same(x, r));
  return { ...state, readings: [...others, r].sort((a, b) => a.date.localeCompare(b.date) || a.service.localeCompare(b.service) || mOf(a) - mOf(b)) };
}

export function withoutReading(state       , k            )        {
  return { ...state, readings: state.readings.filter((x) => !same(x, k)) };
}

export function personById(state       , id               ) {
  return id ? state.people.find((p) => p.id === id) ?? null : null;
}

export const GROUP_WORD = { K: 'כהן', L: 'לוי', Y: 'ישראל' }         ;
export const GROUP_PLURAL = { K: 'כהנים', L: 'לויים', Y: 'ישראלים' }         ;
export const GROUP_CLASS = { K: 'k', L: 'l', Y: 'y' }         ;
