// Priateľské zápasy môjho klubu (leto a zima): peniaze a forma, bez trestov a zranení

import { addDays } from './calendar';
import { addMoney } from './finance';
import type { MatchResult } from './match';
import type { Rng } from './rng';
import type { Fixture, GameState } from './types';

export const FRIENDLY = 'PRIATELSKY';

function freeDay(state: GameState, clubs: string[], date: string): string {
  let d = date;
  for (let i = 0; i < 5; i++) {
    const busy = state.seasonData.fixtures.some((f) => clubs.some((c) => f.homeId === c || f.awayId === c) && Math.abs(Date.parse(f.date) - Date.parse(d)) < 2 * 86_400_000);
    if (!busy) return d;
    d = addDays(d, 1);
  }
  return d;
}

/** Naplánuje priateľské zápasy na sezónu: 3 v lete, 2 v zime */
export function scheduleFriendlies(state: GameState, rng: Rng): void {
  const me = state.manager.clubId;
  const myRep = state.clubs[me].reputation;
  const foreign = Object.values(state.clubs).filter((c) => !c.leagueId);
  const domestic = Object.values(state.clubs).filter((c) => c.leagueId && c.id !== me && !c.reserveOf);
  const pick = <T,>(list: T[]) => list[Math.floor(rng.next() * list.length)];
  const big = foreign.filter((c) => c.reputation >= myRep + 5);
  const similar = foreign.filter((c) => Math.abs(c.reputation - myRep) <= 8);
  const weaker = domestic.filter((c) => c.reputation < myRep - 3);
  const plan: Array<[string, string | undefined, boolean]> = [
    [`${state.season}-06-27`, pick(weaker.length ? weaker : domestic)?.id, true],
    [`${state.season}-07-04`, pick(similar.length ? similar : foreign)?.id, rng.chance(0.5)],
    [`${state.season}-07-11`, pick(big.length ? big : foreign)?.id, false],
    [`${state.season + 1}-01-23`, pick(similar.length ? similar : foreign)?.id, false],
    [`${state.season + 1}-01-30`, pick(foreign)?.id, false],
  ];
  plan.forEach(([date, opp, home], i) => {
    if (!opp) return;
    const d = freeDay(state, [me, opp], date);
    const f: Fixture = {
      id: `${FRIENDLY}-${state.season}-${i + 1}`,
      leagueId: FRIENDLY,
      round: i + 1,
      phase: 'priatelsky',
      date: d,
      homeId: home ? me : opp,
      awayId: home ? opp : me,
      played: false,
      homeGoals: 0,
      awayGoals: 0,
      goals: [],
    };
    state.seasonData.fixtures.push(f);
  });
  state.seasonData.fixtures.sort((a, b) => a.date.localeCompare(b.date));
}

/** Zapíše priateľský zápas: forma, energia, peniaze; bez kariet, zranení a štatistík */
export function applyFriendly(state: GameState, f: Fixture, r: MatchResult, rng: Rng): void {
  f.played = true;
  f.homeGoals = r.homeGoals;
  f.awayGoals = r.awayGoals;
  f.goals = r.goals;
  for (const id of r.appeared) {
    const p = state.players[id];
    if (!p) continue;
    p.energy = Math.round(Math.max(p.energy - 10, r.energy[id] ?? p.energy));
    // V priateľských zápasoch sa forma zlepšuje (najviac u hráčov v slabej forme)
    p.form = Math.max(0, Math.min(20, p.form + 1 + (20 - p.form) * 0.08 + ((r.ratings[id] ?? 6) - 6) * 0.6 + rng.normal(0, 0.6)));
  }
  const me = state.manager.clubId;
  const opp = state.clubs[f.homeId === me ? f.awayId : f.homeId];
  const home = f.homeId === me;
  // Štartovné od organizátora + vstupné pri zápase doma
  const fee = Math.round((opp.leagueId ? 8_000 : 20_000) + Math.max(0, opp.reputation - 50) * (opp.leagueId ? 600 : 2_500));
  const gate = home ? Math.round(state.clubs[me].capacity * 0.35 * 5) : 0;
  addMoney(state, me, 'priatelsky', fee + gate, `Priateľský zápas proti ${opp.shortName}`);
  state.news.push({
    date: state.date,
    text: `Priateľský zápas: ${state.clubs[f.homeId].shortName} – ${state.clubs[f.awayId].shortName} ${f.homeGoals}:${f.awayGoals} (príjem ${(fee + gate).toLocaleString('sk-SK')} €)`,
  });
}
