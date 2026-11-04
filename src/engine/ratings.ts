// Výpočty hodnotenia, ceny a platu hráča

import type { Player, Position } from './types';

type Weights = { fyz: number; tech: number; obr: number; uto: number; bra: number };

/** Váhy atribútov pre celkové hodnotenie (OVR) podľa pozície */
export const OVR_WEIGHTS: Record<Position, Weights> = {
  B: { fyz: 0.2, tech: 0.2, obr: 0, uto: 0, bra: 0.6 },
  O: { fyz: 0.3, tech: 0.2, obr: 0.4, uto: 0.1, bra: 0 },
  Z: { fyz: 0.15, tech: 0.35, obr: 0.25, uto: 0.25, bra: 0 },
  U: { fyz: 0.2, tech: 0.3, obr: 0.1, uto: 0.4, bra: 0 },
};

export function ovrAt(p: Player, pos: Position): number {
  const w = OVR_WEIGHTS[pos];
  return p.fyz * w.fyz + p.tech * w.tech + p.obr * w.obr + p.uto * w.uto + p.bra * w.bra;
}

/** Celkové hodnotenie na vlastnej pozícii */
export function ovr(p: Player): number {
  return ovrAt(p, p.position);
}

export function ageOn(birthDate: string, date: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age--;
  return age;
}

/** Cenový koeficient ligy (top európske ligy = 1) */
export const LEAGUE_PRICE_FACTOR: Record<string, number> = {
  CZ1: 0.3,
  CZ2: 0.12,
  SK1: 0.2,
  SK2: 0.07,
};

/** Cenový koeficient podľa krajiny pre zahraničné kluby */
export const COUNTRY_PRICE_FACTOR: Record<string, number> = {
  EN: 1.6,
  ES: 1.1,
  DE: 1.0,
  IT: 1.0,
  FR: 0.9,
  PT: 0.7,
  NL: 0.6,
  BE: 0.5,
  TR: 0.5,
  AT: 0.4,
  CH: 0.4,
  SC: 0.4,
  GR: 0.4,
  DK: 0.35,
  HR: 0.3,
  RS: 0.3,
  PL: 0.3,
  UA: 0.3,
  NO: 0.3,
  SE: 0.3,
  HU: 0.25,
  RO: 0.2,
  CY: 0.25,
  IL: 0.2,
  BG: 0.15,
};

/** Trhová hodnota v € */
export function marketValue(p: Player, date: string, season: number): number {
  const o = ovr(p);
  const age = ageOn(p.birthDate, date);
  // Základ: 85 OVR v top lige ≈ 60 mil. €
  let v = 60_000_000 * Math.exp(0.139 * (o - 85));
  // Mladí s vysokým potenciálom sú drahší
  if (age <= 23) {
    const gap = Math.max(0, p.potential - o);
    v *= 1 + (gap / 15) * ((24 - age) / 6);
  }
  // Starší hráči strácajú hodnotu
  if (age >= 29) v *= Math.pow(0.82, age - 28);
  // Končiaca zmluva
  const yearsLeft = p.contractUntil - season - 1;
  if (yearsLeft <= 0) v *= 0.55;
  else if (yearsLeft === 1) v *= 0.85;
  v *= p.priceFactor;
  return roundMoney(Math.max(v, 10_000));
}

/** Minimálny mesačný plat podľa ligy */
const MIN_WAGE: Record<string, number> = { CZ1: 3000, CZ2: 1000, SK1: 1500, SK2: 600 };

/** Odporúčaný mesačný plat v € */
export function fairWage(p: Player, date: string, season: number, leagueKey: string): number {
  const value = marketValue(p, date, season);
  const yearly = value * 0.12;
  const min = MIN_WAGE[leagueKey] ?? 5000;
  return roundMoney(Math.max(yearly / 12, min), 100);
}

export function roundMoney(v: number, step?: number): number {
  const s = step ?? (v >= 1_000_000 ? 50_000 : v >= 100_000 ? 5_000 : 1_000);
  return Math.round(v / s) * s;
}

/** Forma 0–20 → 1–5 šípok */
export function formLevel(form: number): 1 | 2 | 3 | 4 | 5 {
  if (form < 4) return 1;
  if (form < 8) return 2;
  if (form < 13) return 3;
  if (form < 17) return 4;
  return 5;
}
