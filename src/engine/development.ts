// Vývoj hráčov (rast, starnutie), koniec kariéry, mládež

import { generatePlayer, pickNationality } from './generator';
import { ageOn, LEAGUE_PRICE_FACTOR, OVR_WEIGHTS, ovr } from './ratings';
import type { Rng } from './rng';
import type { GameState, Player, Position } from './types';

const clamp = (v: number, min = 1, max = 99) => Math.max(min, Math.min(max, v));

/** Úroveň tréningového centra klubu (počítačové kluby podľa sily) */
export function trainingLevel(state: GameState, clubId: string | null): number {
  if (!clubId) return 1;
  if (clubId === state.manager.clubId) return state.management.training;
  return Math.max(1, Math.min(5, Math.round((state.clubs[clubId].reputation - 35) / 10)));
}

export function youthLevel(state: GameState, clubId: string): number {
  if (clubId === state.manager.clubId) return state.management.youth;
  return Math.max(1, Math.min(5, Math.round((state.clubs[clubId].reputation - 35) / 10)));
}

/** Skutočný strop hráča – pri neúspešnom talente nižší ako zobrazený potenciál */
function ceilingOf(p: Player, rng: Rng): number {
  if (p.ceiling === undefined) {
    const o = ovr(p);
    p.ceiling = p.devType === 'bust' ? o + (p.potential - o) * rng.range(0.2, 0.5) : p.potential;
  }
  return p.ceiling;
}

/** Ročný podiel zostávajúceho rozdielu do stropu, ktorý hráč dobehne */
function growthShare(age: number, devType: Player['devType']): number {
  let g = age <= 19 ? 0.34 : age <= 21 ? 0.3 : age <= 23 ? 0.25 : age <= 25 ? 0.2 : age <= 27 ? 0.14 : age <= 29 ? 0.05 : 0;
  if (devType === 'early') g *= age <= 21 ? 1.5 : age >= 24 ? 0.5 : 1;
  if (devType === 'late') g = age <= 22 ? g * 0.5 : age <= 29 ? Math.max(g, 0.12) * 1.6 : g;
  return g;
}

/** Ročný pokles hodnotenia podľa veku (brankári starnú pomalšie) */
function yearlyDecline(age: number, pos: Position): number {
  const a = pos === 'B' ? age - 2 : age;
  if (a < 30) return 0;
  if (a < 35) return 0.5 + (a - 30) * 0.5;
  return 3 + (a - 35) * 0.7;
}

/** Zmení hodnotenie hráča o delta (rozdelí sa medzi atribúty podľa pozície) */
function applyDelta(p: Player, delta: number, rng: Rng, declining: boolean): void {
  const w = OVR_WEIGHTS[p.position];
  const keys = (['fyz', 'tech', 'obr', 'uto', 'bra'] as const).filter((k) => w[k] > 0);
  // Pri starnutí klesá viac fyzička, pri raste sa zlepšuje všetko
  const weights = keys.map((k) => {
    let x = w[k] * rng.range(0.6, 1.4);
    if (declining && k === 'fyz') x *= 1.8;
    if (declining && k === 'tech') x *= 0.6;
    return x;
  });
  const sumW = keys.reduce((s, k, i) => s + w[k] * weights[i], 0) || 1;
  keys.forEach((k, i) => {
    const change = (delta * weights[i]) / sumW;
    p[k] = Math.round(clamp(p[k] + change) * 10) / 10;
  });
}

/**
 * Mesačný vývoj (1. deň v mesiaci počas sezóny, 10× za rok).
 * Rast závisí od veku, stropu, typu vývoja, hracieho času a tréningového centra.
 */
export function monthlyDevelopment(state: GameState, rng: Rng): void {
  const played = new Map<string, number>();
  for (const f of state.seasonData.fixtures) {
    if (!f.played) continue;
    played.set(f.homeId, (played.get(f.homeId) ?? 0) + 1);
    played.set(f.awayId, (played.get(f.awayId) ?? 0) + 1);
  }
  for (const p of Object.values(state.players)) {
    if (p.abroad) continue;
    const age = ageOn(p.birthDate, state.date);
    const o = ovr(p);
    const decline = yearlyDecline(age, p.position);
    if (decline > 0) {
      applyDelta(p, -(decline / 10) * rng.range(0.4, 1.6), rng, true);
    }
    const ceil = ceilingOf(p, rng);
    const share = growthShare(age, p.devType);
    if (share > 0 && o < ceil) {
      const teamGames = p.clubId ? played.get(p.clubId) ?? 0 : 0;
      const apps = state.seasonData.stats[p.id]?.apps ?? 0;
      // Hráči, ktorí hrajú, rastú rýchlejšie
      const playing = teamGames >= 3 ? 0.6 + 0.6 * Math.min(1, apps / teamGames) : 0.9;
      const training = 0.85 + 0.075 * trainingLevel(state, p.clubId);
      const yearly = (ceil - o) * share * playing * training;
      // Nerovnomerný rast – niektoré mesiace nič, inokedy skok
      const month = (yearly / 10) * (rng.chance(0.25) ? 0 : rng.range(0.3, 2));
      if (month > 0) applyDelta(p, Math.min(month, ceil - o), rng, false);
    }
    // Zobrazený potenciál nikdy pod aktuálnym hodnotením; u starších sa potenciál zníži na súčasný stav
    const now = ovr(p);
    if (now > p.potential) p.potential = Math.round(now);
    if (age >= 30 && p.potential > now + 1) p.potential = Math.max(Math.round(now), p.potential - 1);
  }
}

/** Koniec kariéry na konci sezóny. Vráti ukončených hráčov. */
export function retirements(state: GameState, rng: Rng): Player[] {
  const out: Player[] = [];
  for (const p of Object.values(state.players)) {
    const age = ageOn(p.birthDate, state.date);
    const keeper = p.position === 'B' ? 2 : p.position === 'U' ? -1 : 0;
    const a = age - keeper;
    if (a < 33 && !(p.abroad && a >= 31)) continue;
    let chance = (a - 32) * 0.17 + (ovr(p) < 50 ? 0.15 : 0) + (p.clubId ? 0 : 0.25);
    if (p.clubId === state.manager.clubId) chance -= 0.1;
    if (a >= 40) chance = 1;
    if (rng.chance(Math.max(0, Math.min(1, chance)))) out.push(p);
  }
  for (const p of out) {
    if (p.clubId === state.manager.clubId) {
      state.news.push({ date: state.date, text: `${p.firstName} ${p.lastName} (${ageOn(p.birthDate, state.date)} r.) ukončil kariéru.` });
    }
    delete state.players[p.id];
  }
  return out;
}

/** Noví mládežníci v každom klube (leto). Vráti mládežníkov môjho klubu. */
export function youthIntake(state: GameState, rng: Rng): Player[] {
  const mine: Player[] = [];
  for (const c of Object.values(state.clubs)) {
    if (!c.leagueId) continue;
    const level = youthLevel(state, c.id);
    const count = rng.int(2, 3) + (level >= 4 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const age = rng.int(16, 18);
      const pos = rng.pick<Position>(['B', 'O', 'O', 'Z', 'Z', 'Z', 'U', 'U']);
      const target = clamp(c.reputation - 24 + level * 2 + (age - 16) * 2 + rng.normal(0, 5), 25, 70);
      const p = generatePlayer(rng, {
        id: `m${state.nextId++}`,
        position: pos,
        age,
        targetOvr: target,
        nationality: rng.chance(0.85) ? c.country : pickNationality(rng, c.country),
        season: state.season,
        clubId: c.id,
        priceFactor: LEAGUE_PRICE_FACTOR[c.leagueId] ?? 0.2,
      });
      // Lepšia akadémia = vyšší potenciál, občas supertalent
      p.potential = Math.round(clamp(p.potential + level * 1.5 + (rng.chance(0.01 + level * 0.006) ? rng.range(10, 18) : 0), Math.round(ovr(p)), 95));
      p.contractUntil = state.season + 3;
      p.wage = 0;
      state.players[p.id] = p;
      if (c.id === state.manager.clubId) mine.push(p);
    }
  }
  return mine;
}
