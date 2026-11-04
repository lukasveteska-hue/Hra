// Rozpis zápasov: každý s každým doma a vonku + nadstavba

import { roundDates } from './calendar';
import type { Rng } from './rng';
import { standings } from './standings';
import type { Fixture, GameState, League, SeasonData } from './types';

/** Každý s každým (kruhová metóda), vráti kolá s dvojicami [domáci, hostia] */
export function roundRobin(teams: string[], double: boolean): Array<Array<[string, string]>> {
  const list = [...teams];
  if (list.length % 2) list.push('__volno__');
  const n = list.length;
  const rounds: Array<Array<[string, string]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a === '__volno__' || b === '__volno__') continue;
      // Striedanie domáceho prostredia
      pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    // Rotácia všetkých okrem prvého
    list.splice(1, 0, list.pop()!);
  }
  if (!double) return rounds;
  return [...rounds, ...rounds.map((rd) => rd.map(([h, a]) => [a, h] as [string, string]))];
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Počet kôl ligy vrátane nadstavby */
export function totalRounds(league: League): number {
  const base = (league.clubIds.length - 1) * 2;
  const split = league.split?.length ? Math.max(...league.split.map((g) => (g.to - g.from) * 2)) : 0;
  return base + split;
}

/** Začiatok ligy */
function leagueStart(league: League, season: number): string {
  // Slovenská liga začína o týždeň skôr
  return league.country === 'SK' && league.tier === 1 ? `${season}-07-18` : `${season}-07-25`;
}

export function createSeason(state: Pick<GameState, 'leagues' | 'season'>, rng: Rng): SeasonData {
  const fixtures: Fixture[] = [];
  const dates: Record<string, string[]> = {};
  const splitDone: Record<string, boolean> = {};
  for (const league of Object.values(state.leagues)) {
    const rd = roundDates(state.season, leagueStart(league, state.season), totalRounds(league));
    dates[league.id] = rd;
    splitDone[league.id] = !league.split?.length;
    const rounds = roundRobin(shuffle(rng, league.clubIds), true);
    rounds.forEach((pairs, r) => {
      for (const [h, a] of pairs) {
        fixtures.push(newFixture(league.id, r + 1, 'zakladna', rd[r], h, a));
      }
    });
  }
  fixtures.sort((a, b) => a.date.localeCompare(b.date));
  return { fixtures, roundDates: dates, splitDone, stats: {} };
}

function newFixture(leagueId: string, round: number, phase: string, date: string, homeId: string, awayId: string): Fixture {
  return {
    id: `${leagueId}-${phase}-${round}-${homeId}-${awayId}`,
    leagueId,
    round,
    phase,
    date,
    homeId,
    awayId,
    played: false,
    homeGoals: 0,
    awayGoals: 0,
    goals: [],
  };
}

/** Ak je základná časť dohraná, vytvorí zápasy nadstavby. Vráti true, ak niečo vytvorila. */
export function createSplitIfReady(state: GameState, leagueId: string): boolean {
  const sd = state.seasonData;
  const league = state.leagues[leagueId];
  if (sd.splitDone[leagueId] || !league.split?.length) return false;
  const base = sd.fixtures.filter((f) => f.leagueId === leagueId && f.phase === 'zakladna');
  if (base.some((f) => !f.played)) return false;

  const table = standings(state, leagueId);
  const baseRounds = (league.clubIds.length - 1) * 2;
  const dates = sd.roundDates[leagueId];
  league.split.forEach((g, gi) => {
    const teams = table.slice(g.from - 1, g.to).map((r) => r.clubId);
    // Lepšie umiestnení majú viac domácich zápasov – poradie podľa tabuľky
    const rounds = roundRobin(teams, true);
    rounds.forEach((pairs, r) => {
      for (const [h, a] of pairs) {
        sd.fixtures.push(newFixture(leagueId, baseRounds + r + 1, `s${gi}`, dates[baseRounds + r], h, a));
      }
    });
  });
  sd.fixtures.sort((a, b) => a.date.localeCompare(b.date));
  sd.splitDone[leagueId] = true;
  return true;
}
