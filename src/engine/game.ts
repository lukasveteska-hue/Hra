// Vytvorenie novej hry z databázy a pomocné funkcie nad stavom hry

import type { Database, DbClub, DbPlayer } from './database';
import { generatePlayer, generateSquad } from './generator';
import { ageOn, fairWage, LEAGUE_PRICE_FACTOR, ovr } from './ratings';
import { Rng } from './rng';
import { createSeason } from './schedule';
import { defaultTactic } from './tactics';
import type { Club, GameState, League, Manager, Player, Position, Staff } from './types';

export const SAVE_VERSION = 3;

/** Hra začína v lete počas prestupového obdobia */
export function startDate(season: number): string {
  return `${season}-06-20`;
}

/** Počiatočný zostatok na účte podľa sily a krajiny */
export function startingBalance(reputation: number, country: string): number {
  const base = 200_000 * Math.exp(0.12 * (reputation - 50));
  const f = country === 'CZ' ? 1.3 : 1;
  return Math.round((base * f) / 10_000) * 10_000;
}

export function clubBalance(c: DbClub): number {
  return c.balance ?? startingBalance(c.reputation, c.country);
}

export interface NewGameOptions {
  manager: Omit<Manager, 'clubId'>;
  clubId: string;
  seed?: number;
}

/** Minimálny počet hráčov v kádri – chýbajúcich hra doplní vygenerovanými */
const MIN_SQUAD: Record<Position, number> = { B: 3, O: 7, Z: 7, U: 5 };

export function newGame(db: Database, opts: NewGameOptions): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const rng = new Rng(seed);
  const season = db.season;
  const date = startDate(season);
  let nextId = 1;
  const newId = () => `g${nextId++}`;

  const leagues: Record<string, League> = {};
  for (const l of db.leagues) {
    leagues[l.id] = { ...l, clubIds: db.clubs.filter((c) => c.leagueId === l.id).map((c) => c.id) };
  }

  const clubs: Record<string, Club> = {};
  for (const c of db.clubs) {
    clubs[c.id] = {
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      abbr: c.abbr,
      country: c.country,
      city: c.city,
      stadium: c.stadium,
      capacity: c.capacity,
      colors: c.colors,
      leagueId: c.leagueId,
      reputation: c.reputation,
      balance: clubBalance(c),
      reserveOf: c.reserveOf ?? undefined,
      logo: c.logo,
    };
  }
  if (!clubs[opts.clubId]) throw new Error(`Neznámy klub: ${opts.clubId}`);

  const leagueKey = (clubId: string | null) => (clubId ? clubs[clubId]?.leagueId ?? '' : '');
  const priceFactor = (clubId: string | null) => LEAGUE_PRICE_FACTOR[leagueKey(clubId)] ?? 0.3;

  const players: Record<string, Player> = {};
  for (const dp of db.players) {
    const p = playerFromDb(rng, dp, clubs, season, date, priceFactor(dp.clubId));
    players[p.id] = p;
  }

  // Doplnenie kádrov, ktorým chýbajú hráči
  for (const c of Object.values(clubs)) {
    const squad = Object.values(players).filter((p) => p.clubId === c.id);
    const extra = generateSquad(rng, {
      clubId: c.id,
      country: c.country,
      reputation: c.reputation,
      season,
      priceFactor: priceFactor(c.id),
      young: !!c.reserveOf,
      newId,
    });
    for (const pos of ['B', 'O', 'Z', 'U'] as Position[]) {
      const missing = MIN_SQUAD[pos] - squad.filter((p) => p.position === pos).length;
      const candidates = extra.filter((p) => p.position === pos).slice(0, Math.max(0, missing));
      for (const p of candidates) players[p.id] = p;
    }
  }

  for (const p of Object.values(players)) {
    if (!p.wage) p.wage = fairWage(p, date, season, leagueKey(p.clubId));
  }

  // Zamestnanci – hlavného trénera môjho klubu nahrádza hráč
  const staff: Record<string, Staff> = {};
  for (const s of db.staff) {
    if (s.clubId === opts.clubId && s.role === 'trener') continue;
    staff[s.id] = { ...s };
  }

  const seasonData = createSeason({ leagues, season }, rng);
  const tactic = defaultTactic(Object.values(players).filter((p) => p.clubId === opts.clubId));

  return {
    version: SAVE_VERSION,
    date,
    season,
    seasonData,
    tactic,
    manager: { ...opts.manager, clubId: opts.clubId },
    clubs,
    leagues,
    players,
    staff,
    databaseName: db.name,
    news: [{ date, text: `${opts.manager.name} sa stal novým trénerom klubu ${clubs[opts.clubId].name}.` }],
    rngState: rng.state,
    nextId,
  };
}

/** Hráč z databázy → herný hráč; chýbajúce údaje sa odhadnú */
function playerFromDb(rng: Rng, dp: DbPlayer, clubs: Record<string, Club>, season: number, date: string, priceFactor: number): Player {
  const club = dp.clubId ? clubs[dp.clubId] : null;
  const age = ageOn(dp.birthDate, date);
  const youthPenalty = age < 21 ? (21 - age) * 2.2 : 0;
  const target = Math.max(25, (club?.reputation ?? 50) + rng.normal(-2, 5) - youthPenalty);

  // Vygenerovaný hráč slúži ako zdroj chýbajúcich hodnôt
  const gen = generatePlayer(rng, {
    id: dp.id,
    position: dp.position,
    age,
    targetOvr: target,
    nationality: dp.nationality,
    season,
    clubId: dp.clubId,
    priceFactor,
  });

  const p: Player = {
    ...gen,
    firstName: dp.firstName,
    lastName: dp.lastName,
    birthDate: dp.birthDate,
    fyz: dp.fyz ?? gen.fyz,
    tech: dp.tech ?? gen.tech,
    obr: dp.position === 'B' ? 0 : dp.obr ?? gen.obr,
    uto: dp.position === 'B' ? 0 : dp.uto ?? gen.uto,
    bra: dp.position === 'B' ? dp.bra ?? gen.bra : dp.bra ?? gen.bra,
    contractUntil: dp.contractUntil ?? gen.contractUntil,
    wage: dp.wage ?? 0,
  };
  p.potential = Math.max(Math.round(ovr(p)), dp.potential ?? gen.potential);
  return p;
}

export function squadOf(state: GameState, clubId: string): Player[] {
  return Object.values(state.players).filter((p) => p.clubId === clubId);
}

export function staffOf(state: GameState, clubId: string): Staff[] {
  return Object.values(state.staff).filter((s) => s.clubId === clubId);
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

/** Aktuálny stav hry ako databáza (napr. na pokračovanie s hráčmi po niekoľkých sezónach) */
export function databaseFromGame(state: GameState): Database {
  const leagueList = Object.values(state.leagues);
  return {
    format: 'futbalovy-manazer-databaza',
    version: 1,
    name: `Databáza z hry ${state.manager.name} (${state.date})`,
    season: state.season,
    leagues: leagueList.map((l) => ({ id: l.id, name: l.name, country: l.country, tier: l.tier, ...(l.split ? { split: l.split } : {}) })),
    clubs: Object.values(state.clubs).map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      abbr: c.abbr,
      country: c.country,
      leagueId: c.leagueId,
      city: c.city,
      stadium: c.stadium,
      capacity: c.capacity,
      colors: c.colors,
      reputation: c.reputation,
      balance: c.balance,
      reserveOf: c.reserveOf ?? null,
      logo: c.logo ?? null,
    })),
    players: Object.values(state.players).map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      nationality: p.nationality,
      birthDate: p.birthDate,
      position: p.position,
      clubId: p.clubId,
      fyz: p.fyz,
      tech: p.tech,
      obr: p.obr,
      uto: p.uto,
      bra: p.bra,
      potential: p.potential,
      contractUntil: p.contractUntil,
      wage: p.wage,
    })),
    staff: Object.values(state.staff).map((s) => ({ ...s })),
  };
}
