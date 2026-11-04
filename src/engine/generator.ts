// Generátor hráčov – pre kluby bez reálnych súpisiek, mládežníkov a voľných hráčov

import { FOREIGN_MIX, NAMES } from '../data/names';
import { ovr } from './ratings';
import type { Rng } from './rng';
import type { DevType, Personality, Player, Position } from './types';

const clamp = (v: number, min = 1, max = 99) => Math.max(min, Math.min(max, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

export interface GenOptions {
  id: string;
  position: Position;
  age: number;
  /** Cieľové celkové hodnotenie */
  targetOvr: number;
  nationality: string;
  /** Rok začiatku sezóny */
  season: number;
  clubId: string | null;
  priceFactor: number;
}

function pickWeighted(rng: Rng, items: Array<[string, number]>): string {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rng.next() * total;
  for (const [k, w] of items) {
    x -= w;
    if (x <= 0) return k;
  }
  return items[items.length - 1][0];
}

/** Národnosť hráča pre klub z danej krajiny */
export function pickNationality(rng: Rng, clubCountry: string): string {
  const homeShare = clubCountry === 'CZ' ? 0.72 : clubCountry === 'SK' ? 0.7 : 0.75;
  if (rng.chance(homeShare) || !FOREIGN_MIX[clubCountry]) {
    return NAMES[clubCountry] ? clubCountry : 'EN';
  }
  return pickWeighted(rng, FOREIGN_MIX[clubCountry]);
}

export function randomName(rng: Rng, nationality: string): { firstName: string; lastName: string } {
  const pool = NAMES[nationality] ?? NAMES.EN;
  return { firstName: rng.pick(pool.first), lastName: rng.pick(pool.last) };
}

function randomDevType(rng: Rng): DevType {
  const x = rng.next();
  if (x < 0.6) return 'normal';
  if (x < 0.75) return 'early';
  if (x < 0.9) return 'late';
  return 'bust';
}

/** Dĺžka zmluvy: väčšina 2–3 roky, niektoré len rok (aby bol trh živý) */
function contractYears(rng: Rng): number {
  const x = rng.next();
  return x < 0.14 ? 1 : x < 0.44 ? 2 : x < 0.76 ? 3 : x < 0.94 ? 4 : 5;
}

export function randomPersonality(rng: Rng): Personality {
  const x = rng.next();
  if (x < 0.25) return 'ambiciozny';
  if (x < 0.45) return 'zoldnier';
  if (x < 0.6) return 'lojalny';
  return 'pohodar';
}

function birthDateFor(rng: Rng, age: number, season: number): string {
  // Vek k 1. júlu roku začiatku sezóny
  const month = rng.int(1, 12);
  const day = rng.int(1, 28);
  const year = month >= 7 ? season - age - 1 : season - age;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Vytvorí atribúty tak, aby celkové hodnotenie bolo približne cieľové */
function buildAttributes(rng: Rng, pos: Position, target: number) {
  let fyz = target + rng.normal(0, 6);
  let tech = target + rng.normal(0, 6);
  let obr: number;
  let uto: number;
  let bra = rng.range(5, 20);

  if (pos === 'B') {
    bra = target + rng.normal(3, 3);
    fyz = target + rng.normal(-5, 5);
    tech = target + rng.normal(-12, 5);
    obr = 0;
    uto = 0;
  } else {
    // Orientácia hráča v rámci pozície: -1 = defenzívny, +1 = ofenzívny
    const t = Math.max(-1, Math.min(1, rng.normal(0, 0.5)));
    if (pos === 'O') {
      obr = target + 6 + rng.normal(0, 3);
      uto = target - 18 + t * 12 + rng.normal(0, 4);
    } else if (pos === 'Z') {
      obr = target - t * 12 + rng.normal(0, 3);
      uto = target + t * 12 + rng.normal(0, 3);
    } else {
      uto = target + 6 + rng.normal(0, 3);
      obr = target - 22 + (t + 1) * 10 + rng.normal(0, 4);
    }
  }

  const tmp = { fyz, tech, obr, uto, bra, position: pos } as Player;
  const shift = target - ovr(tmp);
  const fix = (v: number) => r1(clamp(v + shift));
  if (pos === 'B') {
    return { fyz: fix(fyz), tech: fix(tech), obr: 0, uto: 0, bra: fix(bra) };
  }
  return { fyz: fix(fyz), tech: fix(tech), obr: fix(obr), uto: fix(uto), bra: r1(clamp(bra)) };
}

/** Potenciál – mladší hráči majú väčší priestor na rast */
function potentialFor(rng: Rng, age: number, current: number): number {
  let gap = 0;
  if (age < 28) {
    const years = 27 - age;
    gap = Math.max(0, rng.normal(years * 1.6, years * 0.9 + 1));
  }
  // Občas supertalent
  if (age <= 19 && rng.chance(0.02)) gap += rng.range(10, 20);
  return Math.round(clamp(current + gap, current, 99));
}

export function generatePlayer(rng: Rng, o: GenOptions): Player {
  const attrs = buildAttributes(rng, o.position, o.targetOvr);
  const tmp = { ...attrs, position: o.position } as Player;
  const current = ovr(tmp);
  const { firstName, lastName } = randomName(rng, o.nationality);
  const yearsInFootball = Math.max(0, o.age - 18);
  return {
    id: o.id,
    firstName,
    lastName,
    nationality: o.nationality,
    birthDate: birthDateFor(rng, o.age, o.season),
    position: o.position,
    ...attrs,
    potential: potentialFor(rng, o.age, current),
    devType: randomDevType(rng),
    personality: randomPersonality(rng),
    energy: 100,
    form: clamp(Math.round(rng.normal(10, 3)), 0, 20),
    morale: 70,
    careerMatches: Math.round(yearsInFootball * rng.range(10, 32)),
    injuryDays: 0,
    suspension: 0,
    yellowCards: 0,
    clubId: o.clubId,
    contractUntil: o.season + contractYears(rng),
    wage: 0,
    priceFactor: o.priceFactor,
    listed: false,
    askingPrice: null,
  };
}

/** Zloženie kádra: 3 B, 8 O, 8 Z, 6 Ú */
const SQUAD_TEMPLATE: Position[] = [
  'B', 'B', 'B',
  'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O',
  'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z',
  'U', 'U', 'U', 'U', 'U', 'U',
];

function randomAge(rng: Rng, young: boolean): number {
  if (young) return rng.int(17, 23);
  // Väčšina hráčov 20–31
  if (rng.chance(0.04)) return rng.int(34, 38);
  return Math.round(clamp(rng.normal(25.5, 4.2), 17, 36));
}

export interface SquadOptions {
  clubId: string;
  country: string;
  reputation: number;
  season: number;
  priceFactor: number;
  /** B-tím: mladší hráči */
  young?: boolean;
  newId: () => string;
}

/** Vygeneruje celý káder klubu */
export function generateSquad(rng: Rng, s: SquadOptions): Player[] {
  const counts: Record<Position, number> = { B: 0, O: 0, Z: 0, U: 0 };
  return SQUAD_TEMPLATE.map((pos) => {
    const idx = counts[pos]++;
    // Prví hráči na pozícii sú základ, ďalší slabší náhradníci
    const starters = pos === 'B' ? 1 : pos === 'U' ? 2 : 4;
    const drop = idx < starters ? 0 : (idx - starters + 1) * 2.5;
    const age = randomAge(rng, !!s.young);
    // Mladí hráči sú zatiaľ slabší
    const youthPenalty = age < 21 ? (21 - age) * 2.2 : 0;
    const target = clamp(s.reputation + rng.normal(0, 4) - drop - youthPenalty, 25, 95);
    const nationality = pickNationality(rng, s.country);
    return generatePlayer(rng, {
      id: s.newId(),
      position: pos,
      age,
      targetOvr: target,
      nationality,
      season: s.season,
      clubId: s.clubId,
      priceFactor: s.priceFactor,
    });
  });
}
