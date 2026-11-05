// Databáza hry: ligy, kluby, hráči a zamestnanci.
// Dá sa stiahnuť a nahrať ako jeden súbor JSON alebo ako tabuľky CSV (napr. na úpravu v Exceli).
// Nová hra sa vždy vytvára z aktívnej databázy.

import { LEAGUES } from '../data/clubs';
import { EURO_CLUBS } from '../data/euroClubs';
import { NAMES } from '../data/names';
import { parseCsv, toCsv } from './csv';
import { generateSquad, pickNationality, randomName } from './generator';
import { Rng } from './rng';
import type { Position, SplitGroup, StaffRole } from './types';

export const DB_FORMAT = 'futbalovy-manazer-databaza';
export const DB_VERSION = 1;

export interface DbLeague {
  id: string;
  name: string;
  country: 'CZ' | 'SK';
  tier: 1 | 2;
  /** Nadstavba po základnej časti */
  split?: SplitGroup[];
}

export interface DbClub {
  id: string;
  name: string;
  shortName: string;
  abbr: string;
  country: string;
  /** Liga (len CZ/SK kluby), inak prázdne */
  leagueId: string | null;
  city: string;
  stadium: string;
  capacity: number;
  colors: [string, string];
  /** Sila klubu 1–99 */
  reputation: number;
  /** Počiatočný zostatok na účte; ak chýba, vypočíta sa zo sily */
  balance: number | null;
  reserveOf: string | null;
  logo: string | null;
}

/** Hráč v databáze – atribúty môžu chýbať, hra ich potom odhadne podľa sily klubu */
export interface DbPlayer {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate: string;
  position: Position;
  clubId: string | null;
  fyz: number | null;
  tech: number | null;
  obr: number | null;
  uto: number | null;
  bra: number | null;
  potential: number | null;
  contractUntil: number | null;
  wage: number | null;
}

export interface DbStaff {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate: string;
  role: StaffRole;
  clubId: string | null;
  quality: number;
}

export interface Database {
  format: typeof DB_FORMAT;
  version: number;
  name: string;
  /** Rok začiatku sezóny, napr. 2026 */
  season: number;
  leagues: DbLeague[];
  clubs: DbClub[];
  players: DbPlayer[];
  staff: DbStaff[];
}

export const STAFF_ROLES: Record<StaffRole, string> = {
  trener: 'Hlavný tréner',
  asistent: 'Asistent trénera',
  brankar_trener: 'Tréner brankárov',
  kondicny_trener: 'Kondičný tréner',
  lekar: 'Lekár',
};

/** Kluby, pre ktoré sa nepodarilo nájsť logo */
const MISSING_LOGOS = new Set<string>();
const NO_LOGO = new Set(['rijeka']);

// ---------- Predvolená databáza ----------

/** Predvolená databáza: reálne kluby, zatiaľ vygenerovaní hráči a zamestnanci (vždy rovnakí) */
export function buildDefaultDatabase(): Database {
  const season = 2026;
  const rng = new Rng(20262027);
  let n = 1;
  const leagues: DbLeague[] = [];
  const clubs: DbClub[] = [];
  const players: DbPlayer[] = [];
  const staff: DbStaff[] = [];

  for (const l of LEAGUES) {
    leagues.push({ id: l.id, name: l.name, country: l.country, tier: l.tier, ...(l.split ? { split: l.split } : {}) });
    for (const c of l.clubs) {
      clubs.push({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        abbr: c.abbr,
        country: l.country,
        leagueId: l.id,
        city: c.city,
        stadium: c.stadium,
        capacity: c.capacity,
        colors: c.colors,
        reputation: c.reputation,
        balance: null,
        reserveOf: c.reserveOf ?? null,
        logo: MISSING_LOGOS.has(c.id) ? null : `logos/${c.id}.png`,
      });
      const squad = generateSquad(rng, {
        clubId: c.id,
        country: l.country,
        reputation: c.reputation,
        season,
        priceFactor: 1,
        young: !!c.reserveOf,
        newId: () => `h${n++}`,
      });
      for (const p of squad) {
        players.push({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          nationality: p.nationality,
          birthDate: p.birthDate,
          position: p.position,
          clubId: c.id,
          fyz: p.fyz,
          tech: p.tech,
          obr: p.obr,
          uto: p.uto,
          bra: p.bra,
          potential: p.potential,
          contractUntil: p.contractUntil,
          wage: null,
        });
      }
      for (const role of ['trener', 'asistent'] as StaffRole[]) {
        staff.push(generateStaff(rng, `z${n++}`, role, c.id, l.country, c.reputation, season));
      }
    }
  }

  // Zahraničné kluby (európske poháre) – zatiaľ s vygenerovanými hráčmi
  for (const [id, name, shortName, abbr, country, reputation, c1, c2] of EURO_CLUBS) {
    clubs.push({
      id,
      name,
      shortName,
      abbr,
      country,
      leagueId: null,
      city: '',
      stadium: '',
      capacity: Math.round((15_000 + (reputation - 60) * 1_500) / 500) * 500,
      colors: [c1, c2],
      reputation,
      balance: Math.round(5_000_000 * Math.exp(0.1 * (reputation - 60))),
      reserveOf: null,
      logo: NO_LOGO.has(id) ? null : `logos/${id}.png`,
    });
    const squad = generateSquad(rng, { clubId: id, country, reputation, season, priceFactor: 1, newId: () => `h${n++}` });
    for (const p of squad) {
      players.push({
        id: p.id, firstName: p.firstName, lastName: p.lastName, nationality: p.nationality, birthDate: p.birthDate, position: p.position, clubId: id,
        fyz: p.fyz, tech: p.tech, obr: p.obr, uto: p.uto, bra: p.bra, potential: p.potential, contractUntil: p.contractUntil, wage: null,
      });
    }
    staff.push(generateStaff(rng, `z${n++}`, 'trener', id, country, reputation, season));
  }

  return { format: DB_FORMAT, version: DB_VERSION, name: 'Predvolená databáza 2026/27', season, leagues, clubs, players, staff };
}

export function generateStaff(
  rng: Rng,
  id: string,
  role: StaffRole,
  clubId: string | null,
  country: string,
  reputation: number,
  season: number,
): DbStaff {
  const nat = rng.chance(0.85) && NAMES[country] ? country : pickNationality(rng, country);
  const { firstName, lastName } = randomName(rng, nat);
  const age = rng.int(role === 'trener' ? 38 : 30, role === 'trener' ? 66 : 60);
  return {
    id,
    firstName,
    lastName,
    nationality: nat,
    birthDate: `${season - age}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`,
    role,
    clubId,
    quality: Math.round(Math.max(20, Math.min(95, reputation + rng.normal(0, 6)))),
  };
}

// ---------- Kontrola ----------

/** Skontroluje databázu; vráti zoznam chýb (prázdny = v poriadku) */
export function validateDatabase(db: Database): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.length < 50 && errors.push(m);
  if (!db.leagues?.length) err('Databáza neobsahuje žiadne ligy.');
  if (!db.clubs?.length) err('Databáza neobsahuje žiadne kluby.');

  const leagueIds = new Set<string>();
  for (const l of db.leagues ?? []) {
    if (leagueIds.has(l.id)) err(`Liga „${l.id}“ je v databáze dvakrát.`);
    leagueIds.add(l.id);
    if (l.country !== 'CZ' && l.country !== 'SK') err(`Liga „${l.id}“: krajina musí byť CZ alebo SK.`);
    if (l.tier !== 1 && l.tier !== 2) err(`Liga „${l.id}“: úroveň musí byť 1 alebo 2.`);
  }
  const clubIds = new Set<string>();
  for (const c of db.clubs ?? []) {
    if (clubIds.has(c.id)) err(`Klub „${c.id}“ je v databáze dvakrát.`);
    clubIds.add(c.id);
    if (c.leagueId && !leagueIds.has(c.leagueId)) err(`Klub „${c.id}“: neznáma liga „${c.leagueId}“.`);
    if (!c.name) err(`Klub „${c.id}“: chýba názov.`);
  }
  for (const l of db.leagues ?? []) {
    const count = (db.clubs ?? []).filter((c) => c.leagueId === l.id).length;
    if (count < 4 || count % 2 !== 0) err(`Liga „${l.name}“ má ${count} klubov – potrebný je párny počet, aspoň 4.`);
    for (const g of l.split ?? []) {
      if (g.from < 1 || g.to > count || g.to - g.from < 1) err(`Liga „${l.name}“: nadstavba ${g.from}–${g.to} nesedí s počtom klubov.`);
    }
  }
  const playerIds = new Set<string>();
  for (const p of db.players ?? []) {
    const who = `Hráč „${p.firstName} ${p.lastName}“ (${p.id})`;
    if (playerIds.has(p.id)) err(`${who}: id je v databáze dvakrát.`);
    playerIds.add(p.id);
    if (!['B', 'O', 'Z', 'U'].includes(p.position)) err(`${who}: neplatná pozícia „${p.position}“.`);
    if (p.clubId && !clubIds.has(p.clubId)) err(`${who}: neznámy klub „${p.clubId}“.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) err(`${who}: neplatný dátum narodenia „${p.birthDate}“.`);
    for (const k of ['fyz', 'tech', 'obr', 'uto', 'bra', 'potential'] as const) {
      const v = p[k];
      if (v !== null && (v < 0 || v > 99)) err(`${who}: hodnota ${k} musí byť 0–99.`);
    }
  }
  for (const s of db.staff ?? []) {
    if (s.clubId && !clubIds.has(s.clubId)) err(`Zamestnanec „${s.firstName} ${s.lastName}“: neznámy klub „${s.clubId}“.`);
    if (!(s.role in STAFF_ROLES)) err(`Zamestnanec „${s.firstName} ${s.lastName}“: neznáma funkcia „${s.role}“.`);
  }
  return errors;
}

export function parseDatabaseJson(text: string): Database {
  let db: Database;
  try {
    db = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('Súbor nie je platný JSON.');
  }
  if (db?.format !== DB_FORMAT) throw new Error('Súbor nie je databáza tejto hry.');
  db.staff ??= [];
  db.players ??= [];
  return db;
}

// ---------- CSV ----------

export type DbTable = 'ligy' | 'kluby' | 'hraci' | 'zamestnanci';

const HEADERS: Record<DbTable, string[]> = {
  ligy: ['id', 'nazov', 'krajina', 'uroven', 'nadstavba'],
  kluby: ['id', 'nazov', 'kratky_nazov', 'skratka', 'krajina', 'liga', 'mesto', 'stadion', 'kapacita', 'farba1', 'farba2', 'sila', 'rozpocet', 'b_tim_klubu', 'logo'],
  hraci: ['id', 'meno', 'priezvisko', 'narodnost', 'datum_narodenia', 'pozicia', 'klub', 'fyzicke', 'technicke', 'obranne', 'utocne', 'brankarske', 'potencial', 'zmluva_do', 'plat'],
  zamestnanci: ['id', 'meno', 'priezvisko', 'narodnost', 'datum_narodenia', 'funkcia', 'klub', 'kvalita'],
};

const posOut = (p: Position) => (p === 'U' ? 'Ú' : p);

/** Prevedie databázu na tabuľky CSV (názov súboru → obsah) */
export function databaseToCsv(db: Database): Record<DbTable, string> {
  return {
    ligy: toCsv(HEADERS.ligy, db.leagues.map((l) => [l.id, l.name, l.country, l.tier, splitToText(l.split)])),
    kluby: toCsv(
      HEADERS.kluby,
      db.clubs.map((c) => [c.id, c.name, c.shortName, c.abbr, c.country, c.leagueId, c.city, c.stadium, c.capacity, c.colors[0], c.colors[1], c.reputation, c.balance, c.reserveOf, c.logo]),
    ),
    hraci: toCsv(
      HEADERS.hraci,
      db.players.map((p) => [
        p.id, p.firstName, p.lastName, p.nationality, p.birthDate, posOut(p.position), p.clubId,
        num(p.fyz), num(p.tech), p.position === 'B' ? '' : num(p.obr), p.position === 'B' ? '' : num(p.uto),
        p.position === 'B' ? num(p.bra) : '', p.potential, p.contractUntil, p.wage,
      ]),
    ),
    zamestnanci: toCsv(
      HEADERS.zamestnanci,
      db.staff.map((s) => [s.id, s.firstName, s.lastName, s.nationality, s.birthDate, s.role, s.clubId, s.quality]),
    ),
  };
}

const num = (v: number | null) => (v === null ? '' : Math.round(v));

/** Nadstavba v CSV: "1-6 Skupina o titul | 11-16 Skupina o záchranu" */
function splitToText(split?: SplitGroup[]): string {
  return (split ?? []).map((g) => `${g.from}-${g.to} ${g.name}`).join(' | ');
}

function splitFromText(text: string): SplitGroup[] {
  return text
    .split('|')
    .map((part) => part.trim().match(/^(\d+)\s*-\s*(\d+)\s*(.*)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ from: Number(m[1]), to: Number(m[2]), name: m[3].trim() || 'Skupina' }));
}

/** Rozpozná, ktorá tabuľka je v CSV podľa hlavičky */
function detectTable(rows: Array<Record<string, string>>, fileName: string): DbTable | null {
  const keys = rows[0] ? Object.keys(rows[0]) : [];
  if (keys.includes('pozicia')) return 'hraci';
  if (keys.includes('funkcia')) return 'zamestnanci';
  if (keys.includes('stadion') || keys.includes('kapacita')) return 'kluby';
  if (keys.includes('uroven')) return 'ligy';
  const n = fileName.toLowerCase();
  for (const t of Object.keys(HEADERS) as DbTable[]) if (n.includes(t)) return t;
  return null;
}

function toNum(v: string | undefined): number | null {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toDate(v: string): string {
  const s = v.trim();
  const m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
}

function toPos(v: string): Position {
  const s = v.trim().toUpperCase();
  if (s === 'Ú' || s === 'U' || s.startsWith('UT')) return 'U';
  if (s.startsWith('B') || s === 'GK') return 'B';
  if (s.startsWith('O') || s === 'DF') return 'O';
  if (s.startsWith('Z') || s === 'MF') return 'Z';
  if (s === 'FW') return 'U';
  return s as Position;
}

/**
 * Nahrá tabuľky CSV do databázy. Nahraté tabuľky nahradia tie isté tabuľky v pôvodnej databáze,
 * ostatné ostanú. Takto sa dá napr. aktualizovať len súbor s hráčmi.
 */
export function mergeCsvIntoDatabase(base: Database, files: Array<{ name: string; text: string }>): { db: Database; tables: DbTable[] } {
  const db: Database = { ...base, name: base.name.endsWith('(upravená)') ? base.name : `${base.name} (upravená)` };
  const tables: DbTable[] = [];
  for (const f of files) {
    const rows = parseCsv(f.text);
    const t = detectTable(rows, f.name);
    if (!t) throw new Error(`Nepodarilo sa rozpoznať tabuľku v súbore „${f.name}“.`);
    tables.push(t);
    const get = (r: Record<string, string>, k: string) => r[k] ?? '';
    if (t === 'ligy') {
      db.leagues = rows.map((r) => {
        const split = splitFromText(get(r, 'nadstavba'));
        return {
          id: get(r, 'id'),
          name: get(r, 'nazov'),
          country: get(r, 'krajina').toUpperCase() as 'CZ' | 'SK',
          tier: (toNum(get(r, 'uroven')) ?? 1) as 1 | 2,
          ...(split.length ? { split } : {}),
        };
      });
    } else if (t === 'kluby') {
      db.clubs = rows.map((r) => ({
        id: get(r, 'id'),
        name: get(r, 'nazov'),
        shortName: get(r, 'kratky_nazov') || get(r, 'nazov'),
        abbr: (get(r, 'skratka') || get(r, 'nazov').slice(0, 3)).toUpperCase(),
        country: get(r, 'krajina').toUpperCase(),
        leagueId: get(r, 'liga') || null,
        city: get(r, 'mesto'),
        stadium: get(r, 'stadion'),
        capacity: toNum(get(r, 'kapacita')) ?? 3000,
        colors: [get(r, 'farba1') || '#888888', get(r, 'farba2') || '#ffffff'],
        reputation: toNum(get(r, 'sila')) ?? 50,
        balance: toNum(get(r, 'rozpocet')),
        reserveOf: get(r, 'b_tim_klubu') || null,
        logo: get(r, 'logo') || null,
      }));
    } else if (t === 'hraci') {
      db.players = rows.map((r, i) => ({
        id: get(r, 'id') || `csv${i + 1}`,
        firstName: get(r, 'meno'),
        lastName: get(r, 'priezvisko'),
        nationality: get(r, 'narodnost').toUpperCase(),
        birthDate: toDate(get(r, 'datum_narodenia')),
        position: toPos(get(r, 'pozicia')),
        clubId: get(r, 'klub') || null,
        fyz: toNum(get(r, 'fyzicke')),
        tech: toNum(get(r, 'technicke')),
        obr: toNum(get(r, 'obranne')),
        uto: toNum(get(r, 'utocne')),
        bra: toNum(get(r, 'brankarske')),
        potential: toNum(get(r, 'potencial')),
        contractUntil: toNum(get(r, 'zmluva_do')),
        wage: toNum(get(r, 'plat')),
      }));
    } else {
      db.staff = rows.map((r, i) => ({
        id: get(r, 'id') || `csvz${i + 1}`,
        firstName: get(r, 'meno'),
        lastName: get(r, 'priezvisko'),
        nationality: get(r, 'narodnost').toUpperCase(),
        birthDate: toDate(get(r, 'datum_narodenia')),
        role: (get(r, 'funkcia') || 'trener') as StaffRole,
        clubId: get(r, 'klub') || null,
        quality: toNum(get(r, 'kvalita')) ?? 50,
      }));
    }
  }
  return { db, tables };
}

/** Súhrn databázy na zobrazenie */
export function databaseSummary(db: Database) {
  const withAttrs = db.players.filter((p) => p.fyz !== null && p.tech !== null).length;
  return {
    leagues: db.leagues.length,
    clubs: db.clubs.length,
    players: db.players.length,
    playersWithAttrs: withAttrs,
    staff: db.staff.length,
  };
}
