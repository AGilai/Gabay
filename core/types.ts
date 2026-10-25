// Shared data model. One State object holds everything; it is saved as one JSON record.
import type { Area } from './area.ts';

export type Group = 'K' | 'L' | 'Y';
export type ISODate = string; // 'YYYY-MM-DD', local day
export type SlotRole = 'K' | 'L' | 'Y3' | 'Y4' | 'Y_FOR_K' | 'Y2' | 'K_FOR_L';

export interface Yahrzeit { day: number; month: number; note: string } // hebcal month numbers

export interface Person {
  id: string;
  name: string;          // display name, shown on the main page
  group: Group;
  callLine: string;      // read out exactly as written
  hint: string;          // private: choosing page and person card only
  regular: boolean;
  stopped: boolean;      // "stop suggesting": only search finds him
  seat: string;          // unused (the first version's free text); the place is `area`
  area?: Area | null;    // where he sits, roughly (core/area.ts)
  yahrzeits: Yahrzeit[];
  addedOn: ISODate;
  hiyuv: { date: ISODate; reason: string } | null;
}

export interface Slot { role: SlotRole; personId: string | null; doneAt: string | null } // doneAt 'HH:MM'

export interface Reading {
  date: ISODate;
  service: 'shacharit' | 'mincha';
  count: number;
  noKohen: boolean;
  noLevi: boolean;
  slots: Slot[];
  source: 'app' | 'whatsapp';
}

export interface SickEntry { id: string; text: string; gender: 'm' | 'f'; addedOn: ISODate; askedOn: ISODate | null }

// Templates use {name} or {names}.
export interface Prayers {
  oleh: string; sickM: string; sickF: string; sickPlural: string; barMitzvah: string;
  yoledetBen: string; yoledetBat: string; azkaraM: string; azkaraF: string;
}

export interface Settings {
  inactiveDays: number; prayers: Prayers; lastBackupOn: ISODate | null;
  olehInService?: boolean; // reading mode shows Mi Sheberach after each aliyah (default off)
}

export interface State { version: 1; people: Person[]; readings: Reading[]; sick: SickEntry[]; settings: Settings }
