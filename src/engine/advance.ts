// Plynutie času: dni, odohranie zápasov, zápis výsledkov

import { addDays, transferWindow, transferWindowEnd } from './calendar';
import { aiTactic, MatchSim, squadStrength, type MatchResult } from './match';
import { ageOn } from './ratings';
import { Rng } from './rng';
import { createSplitIfReady } from './schedule';
import { validTactic } from './tactics';
import { weatherFor } from './weather';
import { addMoney, matchdayIncome, monthlyFinance, seasonPrizes, squadValue } from './finance';
import { finishProjects } from './management';
import { monthlyDevelopment } from './development';
import { aiTransferDay, driftPriceFactor, expireOffers, generateOffersForMe } from './transfers';
import { standings } from './standings';
import type { Fixture, GameState, Player, Tactic } from './types';

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function squadPlayers(state: GameState, clubId: string): Player[] {
  return Object.values(state.players).filter((p) => p.clubId === clubId);
}

export function isMine(state: GameState, f: Fixture): boolean {
  const me = state.manager.clubId;
  return f.homeId === me || f.awayId === me;
}

/** Môj neodohraný zápas v dnešný deň */
export function myFixtureToday(state: GameState): Fixture | null {
  return state.seasonData.fixtures.find((f) => !f.played && f.date === state.date && isMine(state, f)) ?? null;
}

export function nextMyFixture(state: GameState): Fixture | null {
  return state.seasonData.fixtures.find((f) => !f.played && f.date >= state.date && isMine(state, f)) ?? null;
}

export function seasonFinished(state: GameState): boolean {
  return state.seasonData.fixtures.every((f) => f.played) && Object.values(state.seasonData.splitDone).every(Boolean);
}

/** Taktika pre klub v zápase (počítač) */
export function tacticFor(state: GameState, clubId: string, oppId: string, rng: Rng): Tactic {
  if (clubId === state.manager.clubId) return validTactic(state);
  const mine = squadPlayers(state, clubId);
  const diff = squadStrength(mine) - squadStrength(squadPlayers(state, oppId));
  return aiTactic(mine, rng, diff);
}

export function createSim(state: GameState, f: Fixture, rng: Rng, humanClub?: string): MatchSim {
  return new MatchSim({
    players: state.players,
    rng,
    date: state.date,
    weather: weatherFor(f.id, f.date),
    home: { clubId: f.homeId, tactic: tacticFor(state, f.homeId, f.awayId, rng), human: f.homeId === humanClub },
    away: { clubId: f.awayId, tactic: tacticFor(state, f.awayId, f.homeId, rng), human: f.awayId === humanClub },
  });
}

/** Zapíše výsledok zápasu do stavu hry (stav sa mení priamo – volať na kópii) */
export function applyResult(state: GameState, fixtureId: string, r: MatchResult, rng: Rng): void {
  const f = state.seasonData.fixtures.find((x) => x.id === fixtureId);
  if (!f || f.played) return;
  f.played = true;
  matchdayIncome(state, f, rng);
  f.homeGoals = r.homeGoals;
  f.awayGoals = r.awayGoals;
  f.goals = r.goals;

  const stats = state.seasonData.stats;
  const st = (id: string) => (stats[id] ??= { apps: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0 });

  // Odpykanie trestov – hráči s trestom tento zápas nehrali
  for (const clubId of [f.homeId, f.awayId]) {
    for (const p of squadPlayers(state, clubId)) if (p.suspension > 0) p.suspension--;
  }

  const appeared = new Set(r.appeared);
  for (const id of r.appeared) {
    const p = state.players[id];
    if (!p) continue;
    const rating = r.ratings[id] ?? 6;
    p.careerMatches++;
    p.energy = Math.round(r.energy[id] ?? p.energy);
    p.form = clamp(p.form + (rating - 6.3) * 1.8 + (10 - p.form) * 0.12 + rng.normal(0, 1.2), 0, 20);
    p.morale = clamp(p.morale + 2, 0, 100);
    driftPriceFactor(state, p);
    const s = st(id);
    s.apps++;
    s.ratingSum += rating;
  }
  // Kto nehral, stráca morálku
  for (const clubId of [f.homeId, f.awayId]) {
    for (const p of squadPlayers(state, clubId)) {
      if (!appeared.has(p.id) && p.injuryDays <= 0) p.morale = clamp(p.morale - 1, 25, 100);
    }
  }
  for (const id of r.scorers) st(id).goals++;
  for (const id of r.assists) st(id).assists++;
  for (const id of r.yellows) {
    const p = state.players[id];
    st(id).yellow++;
    p.yellowCards++;
    if (p.yellowCards % 5 === 0) p.suspension += 1;
  }
  for (const id of r.reds) {
    st(id).red++;
    state.players[id].suspension += rng.int(1, 2);
  }
  for (const inj of r.injuries) {
    const p = state.players[inj.id];
    p.injuryDays = Math.max(p.injuryDays, inj.days);
  }

  if (isMine(state, f)) {
    const me = state.manager.clubId;
    const sp = state.management?.sponsor;
    const won = (f.homeId === me && f.homeGoals > f.awayGoals) || (f.awayId === me && f.awayGoals > f.homeGoals);
    if (sp?.winBonus && won) addMoney(state, me, 'sponzor', sp.winBonus, `${sp.name} – bonus za výhru`);
    const home = state.clubs[f.homeId].shortName;
    const away = state.clubs[f.awayId].shortName;
    const myGoals = f.homeId === me ? f.homeGoals : f.awayGoals;
    const oppGoals = f.homeId === me ? f.awayGoals : f.homeGoals;
    const word = myGoals > oppGoals ? 'Výhra' : myGoals < oppGoals ? 'Prehra' : 'Remíza';
    state.news.push({ date: state.date, text: `${word}: ${home} – ${away} ${f.homeGoals}:${f.awayGoals}` });
    for (const inj of r.injuries) {
      const p = state.players[inj.id];
      if (p.clubId === me) state.news.push({ date: state.date, text: `${p.firstName} ${p.lastName} sa zranil, bude chýbať približne ${inj.days} dní.` });
    }
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Odohrá všetky neodohrané zápasy do dnešného dňa vrátane (okrem môjho dnešného) */
function playPendingFixtures(state: GameState, rng: Rng): void {
  for (const f of state.seasonData.fixtures) {
    if (f.played || f.date > state.date) continue;
    if (isMine(state, f) && f.date === state.date) continue;
    const sim = createSim(state, f, rng);
    sim.runToEnd();
    applyResult(state, f.id, sim.result(), rng);
  }
}

/** Denné zmeny: regenerácia energie, liečenie zranení */
function dailyUpdate(state: GameState): void {
  for (const p of Object.values(state.players)) {
    if (p.injuryDays > 0) p.injuryDays--;
    if (p.energy < 100) {
      const age = ageOn(p.birthDate, state.date);
      const rec = 7 + (p.fyz - 50) / 25 - Math.max(0, age - 29) * 0.4;
      p.energy = Math.min(100, p.energy + Math.max(3, rec));
    }
  }
}

/**
 * Ukončí aktuálny deň (odohrá zvyšné zápasy dňa) a posunie hru na ďalší deň.
 * Volať len vtedy, keď nemám dnes neodohraný zápas.
 */
function endDay(state: GameState, rng: Rng): number {
  playPendingFixtures(state, rng);
  snapshotTables(state);
  if (seasonFinished(state)) seasonPrizes(state);
  expireOffers(state);
  finishProjects(state);
  aiTransferDay(state, rng);
  const newOffers = generateOffersForMe(state, rng);
  for (const id of Object.keys(state.leagues)) {
    if (createSplitIfReady(state, id)) {
      state.news.push({ date: state.date, text: `${state.leagues[id].name}: základná časť skončila, začína nadstavba.` });
    }
  }
  const before = transferWindow(state.date);
  state.date = addDays(state.date, 1);
  dailyUpdate(state);
  const after = transferWindow(state.date);
  if (before && !after) state.news.push({ date: state.date, text: 'Prestupové obdobie sa skončilo.' });
  if (!before && after) state.news.push({ date: state.date, text: `Začalo sa ${after === 'leto' ? 'letné' : 'zimné'} prestupové obdobie.` });
  const day = state.date.slice(8);
  if (day === '01') monthlyFinance(state);
  const month = Number(state.date.slice(5, 7));
  if (day === '01' && month !== 6 && month !== 7) monthlyDevelopment(state, rng);
  if (day === '01' || day === '15') {
    (state.seasonData.valueHistory ??= []).push({ date: state.date, value: squadValue(state, state.manager.clubId) });
  }
  return newOffers;
}

/** Uloží poradie v tabuľkách lig, v ktorých sa dnes hralo */
function snapshotTables(state: GameState): void {
  const hist = (state.seasonData.posHistory ??= {});
  for (const id of Object.keys(state.leagues)) {
    if (!state.seasonData.fixtures.some((f) => f.leagueId === id && f.date === state.date && f.played)) continue;
    const t = standings(state, id);
    const list = (hist[id] ??= []);
    if (list[list.length - 1]?.date === state.date) list.pop();
    list.push({ date: state.date, order: t.map((r) => r.clubId), points: Object.fromEntries(t.map((r) => [r.clubId, r.points])) });
  }
}

export type AdvanceMode = 'day' | 'week' | 'window' | 'match';

/**
 * Posunie čas. Zastaví sa vždy v deň môjho zápasu (pred zápasom) a na konci sezóny.
 * - day: o jeden deň
 * - week: o 7 dní
 * - window: do konca prestupového obdobia
 * - match: do dňa môjho ďalšieho zápasu
 */
export function advance(state: GameState, mode: AdvanceMode): GameState {
  const s = cloneState(state);
  const rng = new Rng(s.rngState);
  if (myFixtureToday(s)) return s;
  const target =
    mode === 'day' ? addDays(s.date, 1) : mode === 'week' ? addDays(s.date, 7) : mode === 'window' ? addDays(transferWindowEnd(s.date) ?? s.date, 1) : null;
  for (let i = 0; i < 400; i++) {
    if (seasonFinished(s)) {
      // Posledný deň sezóny – zápis tabuliek a odmien
      snapshotTables(s);
      seasonPrizes(s);
      break;
    }
    const offers = endDay(s, rng);
    if (myFixtureToday(s)) break;
    // Pri novej ponuke na môjho hráča sa hra zastaví
    if (offers > 0 && mode !== 'day') break;
    if (target && s.date >= target) break;
  }
  s.rngState = rng.state;
  return s;
}

/** Zapíše výsledok môjho zápasu a ďalších zápasov, ktoré bežali súčasne */
export function finishMyMatch(state: GameState, results: Array<{ fixtureId: string; result: MatchResult }>, rngState: number): GameState {
  const s = cloneState(state);
  const rng = new Rng(rngState);
  for (const { fixtureId, result } of results) applyResult(s, fixtureId, result, rng);
  if (seasonFinished(s)) {
    snapshotTables(s);
    seasonPrizes(s);
  }
  s.rngState = rng.state;
  return s;
}

/** Ďalší krok, ktorý ponúkne tlačidlo Pokračovať */
export function continueMode(state: GameState): 'match' | 'window' | 'next' | 'over' {
  if (myFixtureToday(state)) return 'match';
  if (seasonFinished(state)) return 'over';
  if (transferWindow(state.date)) return 'window';
  return 'next';
}
