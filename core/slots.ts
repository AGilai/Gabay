import type { Group, ISODate, Person, Reading, Slot, SlotRole } from './types.ts';

export const ROLE_LABEL: Record<SlotRole, string> = {
  K: 'כהן', L: 'לוי', Y3: 'שלישי', Y4: 'רביעי', Y_FOR_K: 'ישראל במקום כהן', Y2: 'שני', K_FOR_L: 'כהן במקום לוי',
};

export function groupOf(role: SlotRole): Group {
  if (role === 'K' || role === 'K_FOR_L') return 'K';
  return role === 'L' ? 'L' : 'Y';
}

export function layout(count: number, noKohen: boolean, noLevi: boolean): SlotRole[] {
  const head: SlotRole[] = noKohen ? ['Y_FOR_K', 'Y2'] : noLevi ? ['K', 'K_FOR_L'] : ['K', 'L'];
  return count === 4 ? [...head, 'Y3', 'Y4'] : [...head, 'Y3'];
}

const empty = (role: SlotRole): Slot => ({ role, personId: null, doneAt: null });

export function newReading(date: ISODate, service: 'shacharit' | 'mincha', count: 3 | 4): Reading {
  return { date, service, count, noKohen: false, noLevi: false, source: 'app', slots: layout(count, false, false).map(empty) };
}

// The "Kohen in place of Levi" slot always holds the Kohen of slot 0 (until it is marked done).
function syncKohenForLevi(slots: Slot[]): Slot[] {
  return slots.map((s, i) => (s.role === 'K_FOR_L' && !s.doneAt && i > 0 ? { ...s, personId: slots[0].personId } : s));
}

export function relayout(r: Reading, change: { count?: 3 | 4; noKohen?: boolean; noLevi?: boolean }):
  { reading: Reading; removed: string[]; blocked: boolean } {
  const count = change.count ?? r.count;
  const noKohen = change.noKohen ?? r.noKohen;
  const noLevi = change.noLevi ?? r.noLevi;
  const roles = layout(count, noKohen, noLevi);
  const removed: string[] = [];
  const slots: Slot[] = roles.map(empty);

  for (let i = 0; i < Math.max(roles.length, r.slots.length); i++) {
    const old = r.slots[i];
    if (!old?.personId) continue;
    const sameRole = roles[i] === old.role;
    const sameGroup = groupOf(roles[i]) === groupOf(old.role) && roles[i] !== 'K_FOR_L' && old.role !== 'K_FOR_L';
    if (i < roles.length && (sameRole || sameGroup)) {
      slots[i] = { ...old, role: roles[i] };
    } else if (old.doneAt) {
      return { reading: r, removed: [], blocked: true };
    } else {
      removed.push(old.personId);
    }
  }
  const synced = syncKohenForLevi(slots);
  const still = new Set(synced.map((s) => s.personId));
  return {
    reading: { ...r, count, noKohen, noLevi, slots: synced },
    removed: [...new Set(removed)].filter((id) => !still.has(id)),
    blocked: false,
  };
}

export function place(r: Reading, p: Person, slotIndex?: number):
  { reading: Reading; replaced: string | null } | { error: 'already' | 'full' | 'group' } {
  if (r.slots.some((s) => s.personId === p.id)) return { error: 'already' };
  const fits = (s: Slot) => groupOf(s.role) === p.group && s.role !== 'K_FOR_L';

  let i: number;
  if (slotIndex !== undefined) {
    if (!r.slots[slotIndex] || !fits(r.slots[slotIndex])) return { error: 'group' };
    i = slotIndex;
  } else {
    const candidates = r.slots.map((s, k) => k).filter((k) => fits(r.slots[k]));
    if (!candidates.length) return { error: 'group' };
    i = candidates.find((k) => !r.slots[k].personId) ?? candidates.find((k) => !r.slots[k].doneAt) ?? -1;
  }
  if (i < 0 || r.slots[i].doneAt) return { error: 'full' };

  const replaced = r.slots[i].personId;
  const slots = r.slots.map((s, k) => (k === i ? { ...s, personId: p.id, doneAt: null } : s));
  return { reading: { ...r, slots: syncKohenForLevi(slots) }, replaced };
}

function update(r: Reading, i: number, patch: Partial<Slot>): Reading {
  return { ...r, slots: syncKohenForLevi(r.slots.map((s, k) => (k === i ? { ...s, ...patch } : s))) };
}

export function markDone(r: Reading, i: number, time: string): Reading {
  return r.slots[i]?.personId ? update(r, i, { doneAt: time }) : r;
}

export function undoDone(r: Reading, i: number): Reading {
  return update(r, i, { doneAt: null });
}

export function clearSlot(r: Reading, i: number): Reading {
  return update(r, i, { personId: null, doneAt: null });
}

export function focusIndex(r: Reading): number {
  const waiting = r.slots.findIndex((s) => s.personId && !s.doneAt);
  return waiting >= 0 ? waiting : r.slots.findIndex((s) => !s.personId);
}
