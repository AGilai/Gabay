                                          

const pad = (n        ) => String(n).padStart(2, '0');

export function toISODate(d      )          {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Local noon, so a DST shift never moves the day.
export function fromISODate(s         )       {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function daysBetween(a         , b         )         {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000);
}

export function addDays(s         , n        )          {
  const d = fromISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function newId()         {
  return crypto.randomUUID();
}
