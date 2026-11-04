// Štatistiky sezóny pre vyhodnotenie

import { standings, type TableRow } from './standings';
import type { Fixture, GameState, PlayerSeasonStats, Position } from './types';

export interface ClubRecord {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

const empty = (): ClubRecord => ({ played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });

function add(r: ClubRecord, gf: number, ga: number) {
  r.played++;
  r.gf += gf;
  r.ga += ga;
  if (gf > ga) {
    r.won++;
    r.points += 3;
  } else if (gf === ga) {
    r.drawn++;
    r.points++;
  } else r.lost++;
}

export function clubFixtures(state: GameState, clubId: string): Fixture[] {
  return state.seasonData.fixtures.filter((f) => f.played && (f.homeId === clubId || f.awayId === clubId));
}

export interface ClubSeason {
  home: ClubRecord;
  away: ClubRecord;
  total: ClubRecord;
  cleanSheets: number;
  failedToScore: number;
  biggestWin?: Fixture;
  biggestLoss?: Fixture;
  highestScoring?: Fixture;
  longestWin: number;
  longestUnbeaten: number;
  longestWinless: number;
  /** V/R/P po zápasoch */
  sequence: string[];
  /** Body po zápasoch (kumulatívne) */
  pointsCum: number[];
  goalsByMinute: number[];
  concededByMinute: number[];
  attendance: { avg: number; max: number; min: number; total: number; matches: number };
  firstHalfGoals: number;
  secondHalfGoals: number;
}

const forClub = (f: Fixture, clubId: string) => (f.homeId === clubId ? [f.homeGoals, f.awayGoals] : [f.awayGoals, f.homeGoals]);

export function clubSeason(state: GameState, clubId: string): ClubSeason {
  const list = clubFixtures(state, clubId);
  const home = empty();
  const away = empty();
  const total = empty();
  let cleanSheets = 0;
  let failedToScore = 0;
  let biggestWin: Fixture | undefined;
  let biggestLoss: Fixture | undefined;
  let highestScoring: Fixture | undefined;
  const sequence: string[] = [];
  const pointsCum: number[] = [];
  const goalsByMinute = Array(6).fill(0);
  const concededByMinute = Array(6).fill(0);
  let firstHalfGoals = 0;
  let secondHalfGoals = 0;
  const att: number[] = [];

  for (const f of list) {
    const [gf, ga] = forClub(f, clubId);
    add(f.homeId === clubId ? home : away, gf, ga);
    add(total, gf, ga);
    if (ga === 0) cleanSheets++;
    if (gf === 0) failedToScore++;
    const diff = gf - ga;
    if (diff > 0 && (!biggestWin || diff > forClub(biggestWin, clubId)[0] - forClub(biggestWin, clubId)[1])) biggestWin = f;
    if (diff < 0 && (!biggestLoss || diff < forClub(biggestLoss, clubId)[0] - forClub(biggestLoss, clubId)[1])) biggestLoss = f;
    if (!highestScoring || gf + ga > highestScoring.homeGoals + highestScoring.awayGoals) highestScoring = f;
    sequence.push(gf > ga ? 'V' : gf === ga ? 'R' : 'P');
    pointsCum.push(total.points);
    for (const [minute, , club] of f.goals) {
      const bucket = Math.min(5, Math.floor((minute - 1) / 15));
      if (club === clubId) {
        goalsByMinute[bucket]++;
        if (minute <= 45) firstHalfGoals++;
        else secondHalfGoals++;
      } else concededByMinute[bucket]++;
    }
    if (f.homeId === clubId && f.attendance) att.push(f.attendance);
  }

  const streak = (pred: (x: string) => boolean) => {
    let best = 0;
    let cur = 0;
    for (const x of sequence) {
      cur = pred(x) ? cur + 1 : 0;
      best = Math.max(best, cur);
    }
    return best;
  };

  return {
    home,
    away,
    total,
    cleanSheets,
    failedToScore,
    biggestWin,
    biggestLoss,
    highestScoring,
    longestWin: streak((x) => x === 'V'),
    longestUnbeaten: streak((x) => x !== 'P'),
    longestWinless: streak((x) => x !== 'V'),
    sequence,
    pointsCum,
    goalsByMinute,
    concededByMinute,
    attendance: {
      avg: att.length ? Math.round(att.reduce((a, b) => a + b, 0) / att.length) : 0,
      max: att.length ? Math.max(...att) : 0,
      min: att.length ? Math.min(...att) : 0,
      total: att.reduce((a, b) => a + b, 0),
      matches: att.length,
    },
    firstHalfGoals,
    secondHalfGoals,
  };
}

export interface LeagueFacts {
  matches: number;
  goals: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  biggestWin?: Fixture;
  highestScoring?: Fixture;
  bestAttack?: TableRow;
  bestDefense?: TableRow;
  worstDefense?: TableRow;
  mostDraws?: TableRow;
  avgAttendance: number;
  topAttendance?: { clubId: string; avg: number };
  attendanceByClub: Array<{ clubId: string; avg: number }>;
  goalsByRound: number[];
}

export function leagueFacts(state: GameState, leagueId: string): LeagueFacts {
  const fx = state.seasonData.fixtures.filter((f) => f.leagueId === leagueId && f.played);
  const table = standings(state, leagueId);
  let biggestWin: Fixture | undefined;
  let highestScoring: Fixture | undefined;
  const attByClub = new Map<string, number[]>();
  const goalsByRound = new Map<number, number>();
  for (const f of fx) {
    const d = Math.abs(f.homeGoals - f.awayGoals);
    if (!biggestWin || d > Math.abs(biggestWin.homeGoals - biggestWin.awayGoals)) biggestWin = f;
    if (!highestScoring || f.homeGoals + f.awayGoals > highestScoring.homeGoals + highestScoring.awayGoals) highestScoring = f;
    if (f.attendance) attByClub.set(f.homeId, [...(attByClub.get(f.homeId) ?? []), f.attendance]);
    goalsByRound.set(f.round, (goalsByRound.get(f.round) ?? 0) + f.homeGoals + f.awayGoals);
  }
  const attendanceByClub = [...attByClub.entries()]
    .map(([clubId, list]) => ({ clubId, avg: Math.round(list.reduce((a, b) => a + b, 0) / list.length) }))
    .sort((a, b) => b.avg - a.avg);
  const allAtt = [...attByClub.values()].flat();
  const by = (f: (r: TableRow) => number) => [...table].sort((a, b) => f(b) - f(a))[0];
  return {
    matches: fx.length,
    goals: fx.reduce((a, f) => a + f.homeGoals + f.awayGoals, 0),
    homeWins: fx.filter((f) => f.homeGoals > f.awayGoals).length,
    draws: fx.filter((f) => f.homeGoals === f.awayGoals).length,
    awayWins: fx.filter((f) => f.homeGoals < f.awayGoals).length,
    biggestWin,
    highestScoring,
    bestAttack: by((r) => r.gf),
    bestDefense: by((r) => -r.ga),
    worstDefense: by((r) => r.ga),
    mostDraws: by((r) => r.drawn),
    avgAttendance: allAtt.length ? Math.round(allAtt.reduce((a, b) => a + b, 0) / allAtt.length) : 0,
    topAttendance: attendanceByClub[0],
    attendanceByClub,
    goalsByRound: [...goalsByRound.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g),
  };
}

export interface PlayerLine {
  id: string;
  stats: PlayerSeasonStats;
  avg: number;
}

/** Hráči ligy s ich štatistikami */
export function leaguePlayers(state: GameState, leagueId: string): PlayerLine[] {
  const clubs = new Set(state.leagues[leagueId].clubIds);
  return Object.entries(state.seasonData.stats)
    .filter(([id]) => {
      const p = state.players[id];
      return p && p.clubId && clubs.has(p.clubId);
    })
    .map(([id, stats]) => ({ id, stats, avg: stats.ratingSum / Math.max(1, stats.apps) }));
}

/** Jedenástka sezóny (4-4-2) podľa priemernej známky */
export function teamOfSeason(state: GameState, leagueId: string): Array<{ id: string; avg: number; slot: Position }> {
  const lines = leaguePlayers(state, leagueId);
  const maxApps = Math.max(1, ...lines.map((l) => l.stats.apps));
  const eligible = lines.filter((l) => l.stats.apps >= Math.max(5, maxApps * 0.4));
  const pick = (pos: Position, n: number) =>
    eligible
      .filter((l) => state.players[l.id].position === pos)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, n)
      .map((l) => ({ id: l.id, avg: l.avg, slot: pos }));
  return [...pick('B', 1), ...pick('O', 4), ...pick('Z', 4), ...pick('U', 2)];
}
