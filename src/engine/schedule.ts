// Rozpis zápasov: každý s každým doma a vonku + nadstavba

import { roundDates } from './calendar';
import type { Rng } from './rng';
import { standings } from './standings';
import type { Fixture, GameState, League, SeasonData } from './types';

/**
 * Každý s každým (kruhová metóda), vráti kolá s dvojicami [domáci, hostia].
 * Domáce prostredie sa striedá: kto hral naposledy vonku, hrá doma (najviac 2 zápasy za sebou na rovnakom mieste).
 */
export function roundRobin(teams: string[], double: boolean): Array<Array<[string, string]>> {
  const list = [...teams];
  if (list.length % 2) list.push('__volno__');
  const n = list.length;
  const raw: Array<Array<[string, string]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a === '__volno__' || b === '__volno__') continue;
      pairs.push([a, b]);
    }
    raw.push(pairs);
    // Rotácia všetkých okrem prvého
    list.splice(1, 0, list.pop()!);
  }
  const rounds = balanceVenues(raw);
  if (!double) return rounds;
  return [...rounds, ...rounds.map((rd) => rd.map(([h, a]) => [a, h] as [string, string]))];
}

/** Určí domáceho v každej dvojici tak, aby sa kluby striedali doma a vonku */
export function balanceVenues(rounds: Array<Array<[string, string]>>): Array<Array<[string, string]>> {
  const last = new Map<string, 'D' | 'V'>();
  const homes = new Map<string, number>();
  const games = new Map<string, number>();
  const need = (t: string) => {
    const l = last.get(t);
    return (games.get(t) ?? 0) - 2 * (homes.get(t) ?? 0) + (l === 'V' ? 3 : l === 'D' ? -3 : 0);
  };
  return rounds.map((pairs) =>
    pairs.map(([a, b]) => {
      const [h, w] = need(a) >= need(b) ? [a, b] : [b, a];
      last.set(h, 'D');
      last.set(w, 'V');
      homes.set(h, (homes.get(h) ?? 0) + 1);
      games.set(h, (games.get(h) ?? 0) + 1);
      games.set(w, (games.get(w) ?? 0) + 1);
      return [h, w] as [string, string];
    }),
  );
}

/**
 * Oprava rozpisu v rozohratej hre: pri ešte neodohraných ligových zápasoch prerozdelí domáce prostredie.
 * Odohrané zápasy sa nemenia; každá dvojica hrá stále raz doma a raz vonku.
 */
export function rebalanceUnplayed(fixtures: Fixture[], myClubId?: string): void {
  const groups = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    if (f.phase !== 'zakladna' && !/^s\d+$/.test(f.phase)) continue;
    const key = `${f.leagueId}|${f.phase}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.round - b.round || a.date.localeCompare(b.date));
    const pairOf = (f: Fixture) => [f.homeId, f.awayId].sort().join('|');
    const byPair = new Map<string, Fixture[]>();
    for (const f of list) byPair.set(pairOf(f), [...(byPair.get(pairOf(f)) ?? []), f]);
    const last = new Map<string, 'D' | 'V'>();
    const homes = new Map<string, number>();
    const games = new Map<string, number>();
    const need = (t: string) => {
      const l = last.get(t);
      return (games.get(t) ?? 0) - 2 * (homes.get(t) ?? 0) + (l === 'V' ? 3 : l === 'D' ? -3 : 0);
    };
    const decided = new Set<string>();
    for (const f of list) {
      const legs = byPair.get(pairOf(f)) ?? [f];
      const other = legs.find((x) => x !== f);
      if (!f.played && !decided.has(f.id)) {
        if (other && other.played) {
          // Druhý zápas dvojice: domáci je ten, kto bol v prvom vonku
          [f.homeId, f.awayId] = [other.awayId, other.homeId];
        } else {
          const [a, b] = [f.homeId, f.awayId];
          const [h, w] = need(a) >= need(b) ? [a, b] : [b, a];
          f.homeId = h;
          f.awayId = w;
          if (other && !other.played) {
            other.homeId = w;
            other.awayId = h;
            decided.add(other.id);
          }
        }
      }
      last.set(f.homeId, 'D');
      last.set(f.awayId, 'V');
      homes.set(f.homeId, (homes.get(f.homeId) ?? 0) + 1);
      games.set(f.homeId, (games.get(f.homeId) ?? 0) + 1);
      games.set(f.awayId, (games.get(f.awayId) ?? 0) + 1);
    }
    if (myClubId) reorderRoundsFor(list, myClubId);
  }
}

/**
 * Poprehadzuje poradie zostávajúcich (celých neodohraných) kôl tak, aby sa môj klub striedal doma a vonku.
 * Dátumy kôl ostávajú, mení sa len to, ktoré kolo sa hrá v ktorý termín.
 */
function reorderRoundsFor(list: Fixture[], me: string): void {
  if (!list.some((f) => f.homeId === me || f.awayId === me)) return;
  const byRound = new Map<number, Fixture[]>();
  for (const f of list) byRound.set(f.round, [...(byRound.get(f.round) ?? []), f]);
  const open = [...byRound.entries()].filter(([, fx]) => fx.every((f) => !f.played)).sort((a, b) => a[0] - b[0]);
  if (open.length < 3) return;
  const slots = open.map(([round, fx]) => ({ round, date: fx[0].date }));
  const venue = (fx: Fixture[]) => {
    const f = fx.find((x) => x.homeId === me || x.awayId === me);
    return f ? (f.homeId === me ? 'D' : 'V') : '-';
  };
  // Posledné miesto, kde môj klub hral pred zostávajúcimi kolami
  const playedMine = list.filter((f) => f.played && (f.homeId === me || f.awayId === me)).sort((a, b) => a.round - b.round);
  let prev = playedMine.length ? (playedMine[playedMine.length - 1].homeId === me ? 'D' : 'V') : '-';
  const pool = open.map(([, fx]) => fx);
  const order: Fixture[][] = [];
  while (pool.length) {
    const remD = pool.filter((fx) => venue(fx) === 'D').length;
    const remV = pool.filter((fx) => venue(fx) === 'V').length;
    // Chceme opačné miesto ako naposledy; ak ho už niet, čokoľvek
    const want = prev === 'D' ? 'V' : prev === 'V' ? 'D' : remD >= remV ? 'D' : 'V';
    let idx = pool.findIndex((fx) => venue(fx) === want);
    if (idx < 0) idx = 0;
    const [fx] = pool.splice(idx, 1);
    order.push(fx);
    prev = venue(fx) === '-' ? prev : venue(fx);
  }
  order.forEach((fx, i) => {
    for (const f of fx) {
      f.round = slots[i].round;
      f.date = slots[i].date;
    }
  });
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
