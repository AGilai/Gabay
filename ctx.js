// What every screen gets, and helpers for "the reading being worked on".
import { dayInfo, nextReadingDate } from './core/day.js';
                                                                
                                        

                      
               
                 
                                            
                                                                                        
                                                                                
                                                           
 

                                                                          

// On a fast day the afternoon reading is mincha.
export function currentKey(today         , hour = new Date().getHours())             {
  return { date: today, service: dayInfo(today).hasMincha && hour >= 12 ? 'mincha' : 'shacharit' };
}

// The reading the main page works on: today's, or on a day with no reading (and none opened by hand)
// the next reading day's, so the gabbai can prepare it.
export function activeKey(state       , today         )             {
  const now = currentKey(today);
  if (dayInfo(today).reading || findReading(state, now)) return now;
  return { date: nextReadingDate(today), service: 'shacharit' };
}

export function sameKey(a            , b            )          {
  return a.date === b.date && a.service === b.service;
}

export function keyText(k            )         {
  return k.date + '.' + k.service;
}

export function parseKey(s                    )                    {
  const m = /^(\d{4}-\d\d-\d\d)\.(shacharit|mincha)$/.exec(s ?? '');
  return m ? { date: m[1], service: m[2]                       } : null;
}

export function findReading(state       , k            )                 {
  return state.readings.find((r) => r.date === k.date && r.service === k.service) ?? null;
}

export function withReading(state       , r         )        {
  const others = state.readings.filter((x) => !(x.date === r.date && x.service === r.service));
  return { ...state, readings: [...others, r].sort((a, b) => a.date.localeCompare(b.date) || a.service.localeCompare(b.service)) };
}

export function withoutReading(state       , k            )        {
  return { ...state, readings: state.readings.filter((x) => !(x.date === k.date && x.service === k.service)) };
}

export function personById(state       , id               ) {
  return id ? state.people.find((p) => p.id === id) ?? null : null;
}

export const GROUP_WORD = { K: 'כהן', L: 'לוי', Y: 'ישראל' }         ;
export const GROUP_PLURAL = { K: 'כהנים', L: 'לויים', Y: 'ישראלים' }         ;
export const GROUP_CLASS = { K: 'k', L: 'l', Y: 'y' }         ;
