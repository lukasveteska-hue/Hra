// Prechod do novej sezóny

import { cloneState } from './advance';
import { retirements, youthIntake } from './development';
import { seasonStartSnapshot, squadValue } from './finance';
import { generatePlayer, pickNationality } from './generator';
import { expectedPosition, initialManagement, makeSponsorOffers } from './management';
import { ageOn, fairWage, LEAGUE_PRICE_FACTOR, ovr } from './ratings';
import { Rng } from './rng';
import { createSeason } from './schedule';
import { standings } from './standings';
import { autoLineup, defaultTactic } from './tactics';
import { freeAgents, generateFreeAgents, teamAverage } from './transfers';
import type { BoardRating, GameState, LeagueMove, Player, Position, SeasonHistory } from './types';

export const RATING_NAMES: Record<BoardRating, string> = {
  vyborna: 'Výborná',
  uspesna: 'Úspešná',
  prijatelna: 'Prijateľná',
  neuspesna: 'Neúspešná',
  katastrofalna: 'Katastrofálna',
};

export const RATING_ICON: Record<BoardRating, string> = {
  vyborna: '🌟',
  uspesna: '👍',
  prijatelna: '🙂',
  neuspesna: '👎',
  katastrofalna: '💥',
};

/** Cieľ vedenia na sezónu podľa sily klubu */
export function boardTarget(state: GameState): number {
  return expectedPosition(state, state.manager.clubId);
}

export function boardRating(state: GameState): { rating: BoardRating; position: number; target: number; text: string } {
  const me = state.manager.clubId;
  const club = state.clubs[me];
  const league = state.leagues[club.leagueId!];
  const table = standings(state, league.id);
  const position = table.findIndex((r) => r.clubId === me) + 1;
  const target = state.seasonData.boardTarget ?? boardTarget(state);
  const moves = state.seasonData.moves ?? [];
  const myMove = moves.find((m) => m.clubId === me);
  const diff = target - position;
  let rating: BoardRating =
    position === 1 ? 'vyborna' : diff >= 3 ? 'vyborna' : diff >= 1 ? 'uspesna' : diff >= -1 ? 'prijatelna' : diff >= -4 ? 'neuspesna' : 'katastrofalna';
  if (myMove && (myMove.reason === 'postup' || myMove.reason === 'baraz-postup')) rating = myMove.reason === 'postup' ? 'vyborna' : 'uspesna';
  if (myMove && (myMove.reason === 'zostup' || myMove.reason === 'baraz-zostup')) rating = target >= position - 1 ? 'neuspesna' : 'katastrofalna';
  const text =
    rating === 'vyborna'
      ? 'Vedenie je nadšené. Sezóna prekonala všetky očakávania.'
      : rating === 'uspesna'
        ? 'Vedenie je spokojné, cieľ ste splnili.'
        : rating === 'prijatelna'
          ? 'Vedenie je s výsledkom zmierené, ale čaká zlepšenie.'
          : rating === 'neuspesna'
            ? 'Vedenie je nespokojné. Ďalšia neúspešná sezóna by znamenala koniec.'
            : 'Vedenie je zdesené výsledkami sezóny.';
  return { rating, position, target, text };
}

export interface TransitionReport {
  finishedSeason: number;
  history: SeasonHistory;
  ratingText: string;
  fired: boolean;
  moves: LeagueMove[];
  retiredMine: Array<{ name: string; age: number }>;
  retiredCount: number;
  expiredMine: Array<{ name: string; age: number; ovr: number }>;
  youthMine: Array<{ id: string; name: string; position: Position; age: number; ovr: number; potential: number }>;
  jobOffers: string[];
}

function eligibleJobClubs(state: GameState, minRep: number, maxRep: number): string[] {
  return Object.values(state.clubs)
    .filter((c) => c.leagueId && !c.reserveOf && c.id !== state.manager.clubId && c.reputation >= minRep && c.reputation <= maxRep)
    .map((c) => c.id);
}

function pickSome(rng: Rng, list: string[], n: number): string[] {
  const a = [...list];
  const out: string[] = [];
  while (a.length && out.length < n) out.push(a.splice(Math.floor(rng.next() * a.length), 1)[0]);
  return out;
}

/** Doplní kádre počítačových klubov na rozumný počet hráčov */
export function fillSquads(state: GameState, rng: Rng): void {
  const need: Record<Position, number> = { B: 3, O: 7, Z: 7, U: 5 };
  for (const c of Object.values(state.clubs)) {
    if (!c.leagueId || c.id === state.manager.clubId) continue;
    for (const pos of ['B', 'O', 'Z', 'U'] as Position[]) {
      const have = () => Object.values(state.players).filter((p) => p.clubId === c.id && p.position === pos).length;
      while (have() < need[pos]) {
        // Najprv voľný hráč primeranej kvality, inak nový hráč (z nižších súťaží)
        const free = freeAgents(state)
          .filter((p) => p.position === pos && ovr(p) <= c.reputation + 3)
          .sort((a, b) => ovr(b) - ovr(a))[0];
        let p: Player;
        if (free && ovr(free) >= c.reputation - 14) {
          p = free;
        } else {
          p = generatePlayer(rng, {
            id: `n${state.nextId++}`,
            position: pos,
            age: rng.int(19, 30),
            targetOvr: c.reputation - 6 + rng.normal(0, 4),
            nationality: pickNationality(rng, c.country),
            season: state.season,
            clubId: c.id,
            priceFactor: LEAGUE_PRICE_FACTOR[c.leagueId] ?? 0.2,
          });
          state.players[p.id] = p;
        }
        p.clubId = c.id;
        p.contractUntil = state.season + rng.int(1, 3);
        p.wage = fairWage(p, state.date, state.season, c.leagueId);
      }
    }
  }
}

/** Počítačové kluby s veľkým kádrom uvoľnia najslabších hráčov (nie mladých) */
function trimSquads(state: GameState): void {
  for (const c of Object.values(state.clubs)) {
    if (!c.leagueId || c.id === state.manager.clubId) continue;
    const squad = Object.values(state.players)
      .filter((p) => p.clubId === c.id)
      .sort((a, b) => ovr(a) - ovr(b));
    let extra = squad.length - 28;
    for (const p of squad) {
      if (extra <= 0) break;
      if (ageOn(p.birthDate, state.date) <= 20 && p.potential >= c.reputation) continue;
      p.clubId = null;
      p.wage = 0;
      extra--;
    }
  }
}

/** Voľných hráčov je najviac 80 – najslabší odídu do nižších súťaží */
function trimFreeAgents(state: GameState): void {
  const free = freeAgents(state).sort((a, b) => ovr(b) - ovr(a));
  for (const p of free.slice(80)) delete state.players[p.id];
  // Hráči v zahraničí sa po čase z hry vytratia
  for (const p of Object.values(state.players)) if (p.abroad && ageOn(p.birthDate, state.date) >= 30) delete state.players[p.id];
}

/** Konce zmlúv: počítačové kluby väčšinou predĺžia, moji hráči bez novej zmluvy odchádzajú */
function contractExpiries(state: GameState, endYear: number, rng: Rng): Array<{ name: string; age: number; ovr: number }> {
  const mine: Array<{ name: string; age: number; ovr: number }> = [];
  const me = state.manager.clubId;
  for (const p of Object.values(state.players)) {
    if (!p.clubId || p.contractUntil > endYear) continue;
    const club = state.clubs[p.clubId];
    const age = ageOn(p.birthDate, state.date);
    if (p.clubId === me) {
      mine.push({ name: `${p.firstName} ${p.lastName}`, age, ovr: Math.round(ovr(p)) });
    } else {
      const useful = ovr(p) >= teamAverage(state, p.clubId) - 7 || (age <= 23 && p.potential >= club.reputation - 5);
      if (useful && rng.chance(0.8)) {
        p.contractUntil = endYear + rng.int(1, 3);
        p.wage = fairWage(p, state.date, state.season, club.leagueId ?? '');
        continue;
      }
    }
    state.transfers.push({
      date: state.date,
      playerId: p.id,
      playerName: `${p.firstName} ${p.lastName}`,
      position: p.position,
      age,
      fromClubId: p.clubId,
      toClubId: null,
      toName: 'voľný hráč (koniec zmluvy)',
      fee: 0,
    });
    p.clubId = null;
    p.wage = 0;
    p.listed = false;
    p.askingPrice = null;
  }
  return mine;
}

/**
 * Pripraví novú sezónu. Vráti nový stav (ešte bez výberu nového klubu) a správu pre hráča.
 */
export function startNewSeason(prev: GameState): { state: GameState; report: TransitionReport } {
  const state = cloneState(prev);
  const rng = new Rng(state.rngState);
  const me = state.manager.clubId;
  const myClub = state.clubs[me];
  const finished = state.season;
  const leagueId = myClub.leagueId!;
  const table = standings(state, leagueId);
  const row = table.find((r) => r.clubId === me)!;
  const { rating, position, target, text } = boardRating(state);
  const moves = state.seasonData.moves ?? [];

  // ---------- História ----------
  const champions: Record<string, string> = {};
  for (const l of Object.values(state.leagues)) champions[l.id] = standings(state, l.id)[0]?.clubId;
  const myStats = Object.entries(state.seasonData.stats).filter(([id]) => state.players[id]?.clubId === me);
  const top = myStats.sort((a, b) => b[1].goals - a[1].goals)[0];
  const leagueClubs = new Set(state.leagues[leagueId].clubIds);
  const lt = Object.entries(state.seasonData.stats)
    .filter(([id]) => state.players[id]?.clubId && leagueClubs.has(state.players[id].clubId!))
    .sort((a, b) => b[1].goals - a[1].goals)[0];
  const seasonTransfers = state.transfers.filter((t) => t.date >= `${finished}-06-01`);
  const sale = seasonTransfers.filter((t) => t.fromClubId === me && t.fee > 0).sort((a, b) => b.fee - a.fee)[0];
  const buy = seasonTransfers.filter((t) => t.toClubId === me && t.fee > 0).sort((a, b) => b.fee - a.fee)[0];
  const income = state.ledger.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const expense = state.ledger.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0);
  const history: SeasonHistory = {
    season: finished,
    clubId: me,
    leagueId,
    position,
    points: row.points,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    gf: row.gf,
    ga: row.ga,
    rating,
    target,
    champions,
    topScorer: top ? { name: `${state.players[top[0]].firstName} ${state.players[top[0]].lastName}`, goals: top[1].goals } : undefined,
    leagueTopScorer: lt
      ? { name: `${state.players[lt[0]].firstName} ${state.players[lt[0]].lastName}`, club: state.clubs[state.players[lt[0]].clubId!].shortName, goals: lt[1].goals }
      : undefined,
    balanceEnd: myClub.balance,
    income,
    expense,
    squadValueEnd: squadValue(state, me),
    moves,
    bestSale: sale ? { name: sale.playerName, fee: sale.fee } : undefined,
    bestBuy: buy ? { name: buy.playerName, fee: buy.fee } : undefined,
  };
  const prevSame = state.history[state.history.length - 1];
  const fired = rating === 'katastrofalna' || (rating === 'neuspesna' && prevSame?.clubId === me && prevSame.rating === 'neuspesna');
  state.history.push(history);

  // ---------- Reputácia klubov a presuny medzi ligami ----------
  for (const l of Object.values(state.leagues)) {
    standings(state, l.id).forEach((r, i) => {
      const c = state.clubs[r.clubId];
      const exp = expectedPosition(state, c.id);
      c.reputation = Math.max(35, Math.min(90, c.reputation + Math.max(-3, Math.min(3, (exp - (i + 1)) * 0.35))));
    });
  }
  for (const m of moves) {
    const c = state.clubs[m.clubId];
    state.leagues[m.from].clubIds = state.leagues[m.from].clubIds.filter((id) => id !== m.clubId);
    state.leagues[m.to].clubIds.push(m.clubId);
    c.leagueId = m.to;
    c.reputation = Math.max(35, Math.min(90, c.reputation + (m.to.endsWith('1') ? 2 : -3)));
  }
  for (const c of Object.values(state.clubs)) c.reputation = Math.round(c.reputation * 10) / 10;

  // ---------- Hráči: koniec kariéry, zmluvy ----------
  const myBefore = new Set(Object.values(state.players).filter((p) => p.clubId === me).map((p) => p.id));
  const retired = retirements(state, rng);
  const retiredMine = retired.filter((p) => myBefore.has(p.id)).map((p) => ({ name: `${p.firstName} ${p.lastName}`, age: ageOn(p.birthDate, state.date) }));
  const expiredMine = contractExpiries(state, finished + 1, rng);

  // ---------- Nová sezóna ----------
  state.season = finished + 1;
  state.date = `${state.season}-06-20`;
  const youth = youthIntake(state, rng);
  trimSquads(state);
  generateFreeAgents(state, rng, Math.max(0, 55 - freeAgents(state).length));
  fillSquads(state, rng);
  trimFreeAgents(state);

  for (const p of Object.values(state.players)) {
    p.yellowCards = 0;
    p.form = Math.max(4, Math.min(16, Math.round(p.form * 0.5 + 5 + rng.normal(0, 1.5))));
    p.morale = Math.round(p.morale * 0.5 + 35);
    p.energy = 100;
    if (p.clubId && !p.wage) p.wage = fairWage(p, state.date, state.season, state.clubs[p.clubId].leagueId ?? '');
    p.listed = p.clubId === me ? p.listed : false;
  }

  state.offers = [];
  state.ledger = [];
  state.seasonData = createSeason(state, rng);
  state.management.sponsor = null;
  state.management.sponsorOffers = makeSponsorOffers(state, rng);
  const squad = Object.values(state.players).filter((p) => p.clubId === me);
  state.tactic = { ...state.tactic, ...autoLineup(squad, state.tactic.formation) };
  state.seasonData.boardTarget = boardTarget(state);
  state.seasonData.start = seasonStartSnapshot(state);
  state.seasonData.valueHistory = [{ date: state.date, value: state.seasonData.start.squadValue }];

  // ---------- Ponuky práce ----------
  const rep = state.clubs[me].reputation;
  let jobOffers: string[] = [];
  if (fired) jobOffers = pickSome(rng, eligibleJobClubs(state, rep - 15, rep - 2), 3);
  else if (rating === 'vyborna') jobOffers = pickSome(rng, eligibleJobClubs(state, rep + 2, rep + 10), 2);
  else if (rating === 'uspesna') jobOffers = pickSome(rng, eligibleJobClubs(state, rep + 1, rep + 6), rng.chance(0.6) ? 1 : 0);
  else if (rating === 'prijatelna' && rng.chance(0.3)) jobOffers = pickSome(rng, eligibleJobClubs(state, rep - 3, rep + 3), 1);
  if (fired && !jobOffers.length) jobOffers = pickSome(rng, eligibleJobClubs(state, 0, rep), 3);

  state.news.push({ date: state.date, text: `Začína sezóna ${state.season}/${String((state.season + 1) % 100).padStart(2, '0')}. Cieľ vedenia: ${state.seasonData.boardTarget}. miesto.` });
  for (const y of youth) state.news.push({ date: state.date, text: `Z akadémie prichádza ${y.firstName} ${y.lastName} (${ageOn(y.birthDate, state.date)} r., potenciál ${y.potential}).` });
  state.rngState = rng.state;

  return {
    state,
    report: {
      finishedSeason: finished,
      history,
      ratingText: text,
      fired,
      moves,
      retiredMine,
      retiredCount: retired.length,
      expiredMine,
      youthMine: youth.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        position: p.position,
        age: ageOn(p.birthDate, state.date),
        ovr: Math.round(ovr(p)),
        potential: p.potential,
      })),
      jobOffers,
    },
  };
}

/** Prijatie ponuky iného klubu */
export function changeClub(prev: GameState, clubId: string): GameState {
  const state = cloneState(prev);
  const rng = new Rng(state.rngState);
  const old = state.clubs[state.manager.clubId];
  state.manager.clubId = clubId;
  initialManagement(state, rng);
  state.tactic = defaultTactic(Object.values(state.players).filter((p) => p.clubId === clubId));
  state.ledger = [];
  state.offers = [];
  state.seasonData.boardTarget = boardTarget(state);
  state.seasonData.start = seasonStartSnapshot(state);
  state.seasonData.valueHistory = [{ date: state.date, value: state.seasonData.start.squadValue }];
  // Hlavný tréner nového klubu odchádza do môjho starého klubu, ktorý si doplní káder
  for (const s of Object.values(state.staff)) if (s.clubId === clubId && s.role === 'trener') s.clubId = old.id;
  fillSquads(state, rng);
  state.news.push({ date: state.date, text: `${state.manager.name} odchádza z klubu ${old.name} a stáva sa trénerom klubu ${state.clubs[clubId].name}.` });
  state.rngState = rng.state;
  return state;
}
