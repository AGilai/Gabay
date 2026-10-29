import { hebcal } from './hebcal.js';
import { addDays, fromISODate } from './dates.js';
                                                    

                          
                
                  
                 
                   
                      
                        
                         
                     
 

const HE = 'he-x-NoNikud';
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const NO_PUBLIC_READING = ["Ta'anit Bechorot"];

function hdate(date         )      {
  return new hebcal.HDate(fromISODate(date));
}

// 1–10 Tishrei: half kaddish says לְעֵלָּא וּלְעֵלָּא.
export function isTenDays(date         )          {
  const hd = hdate(date);
  return hd.getMonth() === hebcal.months.TISHREI && hd.getDate() <= 10;
}

function isChanukah(hd     )          {
  const start = new hebcal.HDate(25, hebcal.months.KISLEV, hd.getFullYear());
  const n = hd.deltaDays(start);
  return n >= 0 && n <= 7;
}

function parashaOfComingShabbat(date         )                {
  const dow = fromISODate(date).getDay();
  const sat = hdate(addDays(date, dow === 6 ? 0 : 6 - dow));
  const sedra = hebcal.getSedra(sat.getFullYear(), true).lookup(sat);
  if (sedra.chag) return null;
  return sedra.parsha.map((p        ) => hebcal.Locale.gettext(p, HE)).join('־');
}

export function dayInfo(date         )          {
  const { flags } = hebcal;
  const hd = hdate(date);
  const dow = fromISODate(date).getDay();
  const events        = hebcal.HebrewCalendar.getHolidaysOnDate(hd, true) ?? [];
  const has = (flag        ) => events.filter((e) => e.getFlags() & flag);

  const roshChodesh = has(flags.ROSH_CHODESH);
  const cholHamoed = has(flags.CHOL_HAMOED);
  // Erev Tisha B'Av and Yom Kippur Katan carry fast flags but have no public Torah reading.
  const fasts = has(flags.MINOR_FAST | flags.MAJOR_FAST)
    .filter((e) => !(e.getFlags() & (flags.EREV | flags.YOM_KIPPUR_KATAN)) && !NO_PUBLIC_READING.includes(e.getDesc()));
  const purim = events.filter((e) => e.getDesc() === 'Purim');
  const chanukah = isChanukah(hd);
  const chag = has(flags.CHAG).length > 0;

  const banner = [
    ...roshChodesh.map((e) => e.render(HE)),
    ...cholHamoed.map((e) => e.render(HE)),
    ...(chanukah ? ['חנוכה'] : []),
    ...purim.map((e) => e.render(HE)),
    ...fasts.map((e) => e.render(HE)),
  ];
  const special = banner.length > 0;
  const reading = dow !== 6 && !chag && (dow === 1 || dow === 4 || special);

  return {
    date,
    weekday: 'יום ' + WEEKDAYS[dow],
    hebrew: hebcal.gematriya(hd.getDate()) + ' ב' + hebcal.Locale.gettext(hd.getMonthName(), HE),
    reading,
    defaultCount: roshChodesh.length || cholHamoed.length ? 4 : 3,
    banner: reading && special ? banner.join(' · ') : null,
    parasha: parashaOfComingShabbat(date),
    hasMincha: reading && fasts.length > 0,
  };
}

export function yahrzeitThisWeek(y          , date         )          {
  for (let i = 0; i < 7; i++) {
    const hd = hdate(addDays(date, i));
    if (hd.getDate() === y.day && hd.getMonth() === y.month) return true;
  }
  return false;
}

// Today when today has a reading, else the next day that has one (at most a few days ahead,
// e.g. Friday → Monday, or a three-day Yom Tov).
export function nextReadingDate(from         )          {
  let d = from;
  for (let i = 0; i < 30 && !dayInfo(d).reading; i++) d = addDays(d, 1);
  return d;
}
