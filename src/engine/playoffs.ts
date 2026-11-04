// Postupy, zostupy a baráž medzi 1. a 2. ligou

import { addDays } from './calendar';
import type { Rng } from './rng';
import { standings } from './standings';
import type { Fixture, GameState, League, LeagueMove } from './types';

interface CountryRules {
  top: string;
  second: string;
  /** Miesta v 1. lige, ktoré priamo zostupujú (od konca: 1 = posledný) */
  directDown: number;
  /** Dvojice baráže: [miesto v 1. lige, miesto medzi postupujúcimi kandidátmi 2. ligy] */
  pairs: Array<[number, number]>;
}

export const RULES: Record<'CZ' | 'SK', CountryRules> = {
  // 16. zostupuje, 14. a 15. hrajú baráž s 3. a 2. tímom 2. ligy, víťaz 2. ligy postupuje
  CZ: { top: 'CZ1', second: 'CZ2', directDown: 1, pairs: [[14, 3], [15, 2]] },
  // 12. zostupuje, 11. hrá baráž s 2. tímom 2. ligy
  SK: { top: 'SK1', second: 'SK2', directDown: 1, pairs: [[11, 2]] },
};

const PO = (country: string) => `PO-${country}`;

export function isPlayoffLeague(leagueId: string): boolean {
  return leagueId.startsWith('PO-');
}

export function playoffName(leagueId: string): string {
  return leagueId === 'PO-CZ' ? 'Baráž o Chance Ligu' : 'Baráž o Niké ligu';
}

function leagueDone(state: GameState, league: League): boolean {
  return state.seasonData.splitDone[league.id] && !state.seasonData.fixtures.some((f) => f.leagueId === league.id && !f.played);
}

/** Kluby 2. ligy, ktoré môžu postúpiť (bez B-tímov), v poradí tabuľky */
function eligibleSecond(state: GameState, leagueId: string): string[] {
  return standings(state, leagueId)
    .map((r) => r.clubId)
    .filter((id) => !state.clubs[id].reserveOf);
}

function newFixture(country: string, round: number, date: string, homeId: string, awayId: string): Fixture {
  return {
    id: `${PO(country)}-${round}-${homeId}-${awayId}`,
    leagueId: PO(country),
    round,
    phase: 'baraz',
    date,
    homeId,
    awayId,
    played: false,
    homeGoals: 0,
    awayGoals: 0,
    goals: [],
  };
}

/** Po dohraní oboch líg krajiny vytvorí zápasy baráže. */
export function createPlayoffsIfReady(state: GameState): void {
  const sd = state.seasonData;
  sd.playoffsCreated ??= {};
  for (const country of ['CZ', 'SK'] as const) {
    if (sd.playoffsCreated[country]) continue;
    const rules = RULES[country];
    const top = state.leagues[rules.top];
    const second = state.leagues[rules.second];
    if (!top || !second || !leagueDone(state, top) || !leagueDone(state, second)) continue;
    const t1 = standings(state, top.id).map((r) => r.clubId);
    const t2 = eligibleSecond(state, second.id);
    const last = sd.fixtures.filter((f) => f.leagueId === top.id || f.leagueId === second.id).reduce((m, f) => (f.date > m ? f.date : m), '');
    const leg1 = addDays(last, 5);
    const leg2 = addDays(last, 8);
    for (const [p1, p2] of rules.pairs) {
      const a = t1[p1 - 1];
      const b = t2[p2 - 1];
      if (!a || !b) continue;
      // Prvý zápas doma tím 2. ligy, odveta doma tím 1. ligy
      sd.fixtures.push(newFixture(country, 1, leg1, b, a));
      sd.fixtures.push(newFixture(country, 2, leg2, a, b));
    }
    sd.fixtures.sort((x, y) => x.date.localeCompare(y.date));
    sd.playoffsCreated[country] = true;
    state.news.push({ date: state.date, text: `${playoffName(PO(country))}: zápasy sa hrajú ${leg1.slice(8)}. a ${leg2.slice(8)}. ${Number(leg2.slice(5, 7))}.` });
  }
}

/** Po dohraní baráže určí postupy a zostupy. */
export function resolvePlayoffsIfReady(state: GameState, rng: Rng): void {
  const sd = state.seasonData;
  sd.playoffsResolved ??= {};
  sd.moves ??= [];
  for (const country of ['CZ', 'SK'] as const) {
    if (!sd.playoffsCreated?.[country] || sd.playoffsResolved[country]) continue;
    const fx = sd.fixtures.filter((f) => f.leagueId === PO(country));
    if (fx.some((f) => !f.played)) continue;
    const rules = RULES[country];
    const t1 = standings(state, rules.top).map((r) => r.clubId);
    const t2 = eligibleSecond(state, rules.second);
    const moves: LeagueMove[] = [];
    // Priamy zostup a postup
    for (let i = 0; i < rules.directDown; i++) {
      moves.push({ clubId: t1[t1.length - 1 - i], from: rules.top, to: rules.second, reason: 'zostup' });
      if (t2[i]) moves.push({ clubId: t2[i], from: rules.second, to: rules.top, reason: 'postup' });
    }
    // Baráž
    for (const [p1, p2] of rules.pairs) {
      const a = t1[p1 - 1];
      const b = t2[p2 - 1];
      const legs = fx.filter((f) => (f.homeId === a && f.awayId === b) || (f.homeId === b && f.awayId === a));
      if (legs.length < 2) continue;
      const goalsA = legs.reduce((s, f) => s + (f.homeId === a ? f.homeGoals : f.awayGoals), 0);
      const goalsB = legs.reduce((s, f) => s + (f.homeId === b ? f.homeGoals : f.awayGoals), 0);
      let winner = goalsA > goalsB ? a : goalsB > goalsA ? b : null;
      let pens = '';
      if (!winner) {
        const pa = 0.5 + (state.clubs[a].reputation - state.clubs[b].reputation) / 100;
        winner = rng.chance(pa) ? a : b;
        pens = ' po penaltách';
      }
      const loser = winner === a ? b : a;
      if (winner === b) {
        moves.push({ clubId: b, from: rules.second, to: rules.top, reason: 'baraz-postup' });
        moves.push({ clubId: a, from: rules.top, to: rules.second, reason: 'baraz-zostup' });
      }
      state.news.push({
        date: state.date,
        text: `${playoffName(PO(country))}: ${state.clubs[winner].shortName} prekonal ${state.clubs[loser].shortName} (${goalsA}:${goalsB} celkovo)${pens}${winner === b ? ' a postupuje!' : ' a udržal sa.'}`,
      });
    }
    sd.moves.push(...moves);
    sd.playoffsResolved[country] = true;
  }
}

/** Je všetko v sezóne dohrané vrátane baráže? */
export function playoffsDone(state: GameState): boolean {
  const sd = state.seasonData;
  return (['CZ', 'SK'] as const).every((c) => !state.leagues[RULES[c].top] || !!sd.playoffsResolved?.[c]);
}
