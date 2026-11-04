// Vytvorenie novej hry a pomocné funkcie nad stavom hry

import { LEAGUES } from '../data/clubs';
import { generateSquad } from './generator';
import { fairWage, LEAGUE_PRICE_FACTOR } from './ratings';
import { Rng } from './rng';
import type { Club, GameState, League, Manager, Player } from './types';

export const SAVE_VERSION = 1;
export const START_SEASON = 2026;
/** Hra začína v lete počas prestupového obdobia */
export const START_DATE = '2026-06-20';

/** Počiatočný zostatok na účte podľa reputácie a krajiny */
export function startingBalance(reputation: number, country: string): number {
  const base = 200_000 * Math.exp(0.12 * (reputation - 50));
  const f = country === 'CZ' ? 1.3 : 1;
  return Math.round((base * f) / 10_000) * 10_000;
}

export interface NewGameOptions {
  manager: Omit<Manager, 'clubId'>;
  clubId: string;
  seed?: number;
}

/** Zoznam všetkých klubov (pre výber klubu pred začiatkom hry) */
export function allClubSeeds() {
  return LEAGUES.flatMap((l) => l.clubs.map((c) => ({ ...c, leagueId: l.id, leagueName: l.name, country: l.country, tier: l.tier })));
}

export function newGame(opts: NewGameOptions): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = new Rng(seed);
  let nextId = 1;
  const newId = () => `p${nextId++}`;

  const clubs: Record<string, Club> = {};
  const leagues: Record<string, League> = {};
  const players: Record<string, Player> = {};

  for (const l of LEAGUES) {
    leagues[l.id] = { id: l.id, name: l.name, country: l.country, tier: l.tier, clubIds: l.clubs.map((c) => c.id) };
    for (const c of l.clubs) {
      clubs[c.id] = {
        ...c,
        country: l.country,
        leagueId: l.id,
        balance: startingBalance(c.reputation, l.country),
      };
      const squad = generateSquad(rng, {
        clubId: c.id,
        country: l.country,
        reputation: c.reputation,
        season: START_SEASON,
        priceFactor: LEAGUE_PRICE_FACTOR[l.id],
        young: !!c.reserveOf,
        newId,
      });
      for (const p of squad) {
        p.wage = fairWage(p, START_DATE, START_SEASON, l.id);
        players[p.id] = p;
      }
    }
  }

  if (!clubs[opts.clubId]) throw new Error(`Neznámy klub: ${opts.clubId}`);

  return {
    version: SAVE_VERSION,
    date: START_DATE,
    season: START_SEASON,
    manager: { ...opts.manager, clubId: opts.clubId },
    clubs,
    leagues,
    players,
    news: [
      {
        date: START_DATE,
        text: `${opts.manager.name} sa stal novým trénerom klubu ${clubs[opts.clubId].name}.`,
      },
    ],
    rngState: rng.state,
    nextId,
  };
}

export function squadOf(state: GameState, clubId: string): Player[] {
  return Object.values(state.players).filter((p) => p.clubId === clubId);
}

export function leagueOf(state: GameState, club: Club): League | null {
  return club.leagueId ? state.leagues[club.leagueId] : null;
}

/** Celkový mesačný objem platov klubu */
export function wageBill(state: GameState, clubId: string): number {
  return squadOf(state, clubId).reduce((s, p) => s + p.wage, 0);
}

export function seasonLabel(season: number): string {
  return `${season}/${String((season + 1) % 100).padStart(2, '0')}`;
}
