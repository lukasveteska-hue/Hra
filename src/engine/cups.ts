// Domáce poháre a európske súťaže (Liga majstrov, Európska liga, Konferenčná liga)

import { addDays } from './calendar';
import { addMoney } from './finance';
import { roundRobin } from './schedule';
import type { Rng } from './rng';
import type { Fixture, GameState } from './types';

export type CompId = 'LM' | 'EL' | 'KL' | 'POHAR-CZ' | 'POHAR-SK';
export const COMP_ORDER: CompId[] = ['LM', 'EL', 'KL', 'POHAR-CZ', 'POHAR-SK'];
export const EURO: CompId[] = ['LM', 'EL', 'KL'];

export const COMP_NAMES: Record<CompId, string> = {
  LM: 'Liga majstrov',
  EL: 'Európska liga',
  KL: 'Konferenčná liga',
  'POHAR-CZ': 'MOL Cup',
  'POHAR-SK': 'Slovnaft Cup',
};
export const COMP_SHORT: Record<CompId, string> = { LM: 'LM', EL: 'EL', KL: 'KL', 'POHAR-CZ': 'Pohár', 'POHAR-SK': 'Pohár' };

export const STAGE_NAMES: Record<string, string> = {
  q2: '2. predkolo',
  q3: '3. predkolo',
  po: 'Play-off',
  lf: 'Ligová fáza',
  kpo: 'Play-off o osemfinále',
  r16: 'Osemfinále',
  qf: 'Štvrťfinále',
  sf: 'Semifinále',
  f: 'Finále',
  r1: '1. kolo',
  r2: 'Osemfinále',
};

interface StageDef {
  id: string;
  legs: 1 | 2;
  league?: boolean;
  /** Dátumy (MM-DD); jul–dec patria do roku sezóny, jan–jún do nasledujúceho */
  dates: string[];
}

const EURO_KO: StageDef[] = [
  { id: 'lf', legs: 1, league: true, dates: ['09-15', '09-29', '10-20', '11-03', '11-24', '12-08', '01-19', '01-26'] },
  { id: 'kpo', legs: 2, dates: ['02-16', '02-23'] },
  { id: 'r16', legs: 2, dates: ['03-09', '03-16'] },
  { id: 'qf', legs: 2, dates: ['04-06', '04-13'] },
  { id: 'sf', legs: 2, dates: ['04-27', '05-04'] },
];

const STAGES: Record<CompId, StageDef[]> = {
  LM: [
    { id: 'q2', legs: 2, dates: ['07-21', '07-28'] },
    { id: 'q3', legs: 2, dates: ['08-04', '08-11'] },
    { id: 'po', legs: 2, dates: ['08-18', '08-25'] },
    ...EURO_KO,
    { id: 'f', legs: 1, dates: ['05-29'] },
  ],
  EL: [
    { id: 'q3', legs: 2, dates: ['08-06', '08-13'] },
    { id: 'po', legs: 2, dates: ['08-20', '08-27'] },
    ...EURO_KO.map((s) => ({ ...s, dates: s.dates.map((d) => shift(d, 2)) })),
    { id: 'f', legs: 1, dates: ['05-19'] },
  ],
  KL: [
    { id: 'q2', legs: 2, dates: ['07-23', '07-30'] },
    { id: 'q3', legs: 2, dates: ['08-06', '08-13'] },
    { id: 'po', legs: 2, dates: ['08-20', '08-27'] },
    ...EURO_KO.map((s) => ({ ...s, dates: s.dates.map((d) => shift(d, 2)) })),
    { id: 'f', legs: 1, dates: ['05-26'] },
  ],
  'POHAR-CZ': cupStages(),
  'POHAR-SK': cupStages(),
};

function cupStages(): StageDef[] {
  return [
    { id: 'r1', legs: 1, dates: ['09-23'] },
    { id: 'r2', legs: 1, dates: ['10-28'] },
    { id: 'qf', legs: 1, dates: ['03-03'] },
    { id: 'sf', legs: 1, dates: ['04-14'] },
    { id: 'f', legs: 1, dates: ['05-12'] },
  ];
}

function shift(md: string, days: number): string {
  return addDays(`2026-${md}`, days).slice(5);
}

export function stagesOf(comp: CompId): StageDef[] {
  return STAGES[comp];
}

function dateFor(season: number, md: string): string {
  const month = Number(md.slice(0, 2));
  return `${month >= 7 ? season : season + 1}-${md}`;
}

/** Kam sa presúva klub vyradený v kvalifikácii */
const DROP: Record<string, { comp: CompId; stage: string }> = {
  'LM:q2': { comp: 'EL', stage: 'q3' },
  'LM:q3': { comp: 'EL', stage: 'po' },
  'LM:po': { comp: 'EL', stage: 'lf' },
  'EL:q3': { comp: 'KL', stage: 'po' },
  'EL:po': { comp: 'KL', stage: 'lf' },
};

/** Peniaze pre české a slovenské kluby */
const PRIZE: Record<'LM' | 'EL' | 'KL', Record<string, number>> = {
  LM: { qual: 400_000, lf: 12_000_000, win: 1_500_000, draw: 500_000, kpo: 800_000, r16: 2_000_000, qf: 3_000_000, sf: 4_500_000, f: 6_000_000, champion: 4_000_000 },
  EL: { qual: 300_000, lf: 4_000_000, win: 450_000, draw: 150_000, kpo: 300_000, r16: 1_200_000, qf: 1_800_000, sf: 2_800_000, f: 4_500_000, champion: 3_000_000 },
  KL: { qual: 250_000, lf: 3_000_000, win: 400_000, draw: 130_000, kpo: 250_000, r16: 800_000, qf: 1_300_000, sf: 2_000_000, f: 3_000_000, champion: 2_000_000 },
};

export interface CompState {
  id: CompId;
  /** Kluby, ktoré vstupujú do danej fázy (priamo alebo presunom z inej súťaže) */
  entrants: Record<string, string[]>;
  created: string[];
  resolved: string[];
  /** Postupujúci z fázy */
  advanced: Record<string, string[]>;
  /** Účastníci ligovej fázy */
  leagueTeams?: string[];
  /** Najlepších 8 z ligovej fázy (priamo do osemfinále) */
  seeded?: string[];
  champion?: string;
  /** Najďalej dosiahnutá fáza (pre CZ/SK kluby) */
  reached: Record<string, string>;
}

const isDomestic = (state: GameState, id: string) => !!state.clubs[id]?.leagueId;

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Voľný dátum: ak má niektorý klub v ten deň iný zápas, posunie sa o deň */
function freeDate(state: GameState, clubs: string[], date: string): string {
  let d = date;
  for (let i = 0; i < 4; i++) {
    const busy = state.seasonData.fixtures.some((f) => f.date === d && clubs.some((c) => f.homeId === c || f.awayId === c));
    if (!busy) return d;
    d = addDays(d, 1);
  }
  return d;
}

function addFixture(state: GameState, comp: CompId, stage: string, round: number, md: string, homeId: string, awayId: string): void {
  const date = freeDate(state, [homeId, awayId], dateFor(state.season, md));
  const f: Fixture = {
    id: `${comp}-${stage}-${round}-${homeId}-${awayId}`,
    leagueId: comp,
    round,
    phase: stage,
    date,
    homeId,
    awayId,
    played: false,
    homeGoals: 0,
    awayGoals: 0,
    goals: [],
  };
  state.seasonData.fixtures.push(f);
}

/** Zahraničné kluby, ktoré ešte nie sú v ligovej fáze žiadnej súťaže */
function foreignPool(state: GameState, minRep: number, maxRep: number, exclude: Set<string>): string[] {
  return Object.values(state.clubs)
    .filter((c) => !c.leagueId && c.reputation >= minRep && c.reputation <= maxRep && !exclude.has(c.id))
    .map((c) => c.id);
}

const QUAL_RANGE: Record<'LM' | 'EL' | 'KL', [number, number]> = { LM: [66, 77], EL: [63, 74], KL: [55, 70] };

function payout(state: GameState, comp: CompId, clubId: string, key: string, label: string): void {
  if (!isDomestic(state, clubId)) return;
  if (comp === 'POHAR-CZ' || comp === 'POHAR-SK') return;
  const amount = PRIZE[comp][key];
  if (amount) addMoney(state, clubId, 'odmena', amount, `${COMP_NAMES[comp]} – ${label}`);
}

function bumpReputation(state: GameState, clubId: string, v: number) {
  const c = state.clubs[clubId];
  if (c?.leagueId) c.reputation = Math.min(90, Math.round((c.reputation + v) * 10) / 10);
}

/** Vytvorí zápasy fázy */
function createStage(state: GameState, cs: CompState, idx: number, rng: Rng): void {
  const def = STAGES[cs.id][idx];
  const prev = idx > 0 ? STAGES[cs.id][idx - 1] : null;
  const fromPrev = prev ? cs.advanced[prev.id] ?? [] : [];
  let teams = [...new Set([...fromPrev, ...(cs.entrants[def.id] ?? [])])];
  const euro = EURO.includes(cs.id);
  cs.created.push(def.id);

  if (def.league) {
    // Ligová fáza: doplnenie na 36 klubov zahraničnými podľa sily (s náhodou)
    const used = new Set<string>(teams);
    for (const c of COMP_ORDER) for (const t of state.seasonData.comps?.[c]?.leagueTeams ?? []) used.add(t);
    const pool = Object.values(state.clubs)
      .filter((c) => !c.leagueId && !used.has(c.id))
      .map((c) => ({ id: c.id, r: c.reputation + rng.normal(0, 3) }))
      .sort((a, b) => b.r - a.r)
      .map((x) => x.id);
    while (teams.length < 36 && pool.length) teams.push(pool.shift()!);
    teams = teams.slice(0, 36);
    cs.leagueTeams = teams;
    for (const t of teams) {
      if (isDomestic(state, t)) {
        cs.reached[t] = 'lf';
        payout(state, cs.id, t, 'lf', 'účasť v ligovej fáze');
        bumpReputation(state, t, 1);
        state.news.push({ date: state.date, text: `${state.clubs[t].name} hrá ligovú fázu súťaže ${COMP_NAMES[cs.id]}!` });
      }
    }
    // 8 kôl, každý klub 8 rôznych súperov
    const rounds = roundRobin(shuffle(rng, teams), false).slice(0, 8);
    rounds.forEach((pairs, r) => {
      for (const [h, a] of pairs) addFixture(state, cs.id, 'lf', r + 1, def.dates[r], h, a);
    });
    return;
  }

  let pairs: Array<[string, string]> = [];
  if (euro && ['q2', 'q3', 'po'].includes(def.id)) {
    // Kvalifikácia: CZ/SK kluby proti zahraničným súperom
    const dom = shuffle(rng, teams.filter((t) => isDomestic(state, t)));
    const foreign = shuffle(rng, teams.filter((t) => !isDomestic(state, t)));
    const [lo, hi] = QUAL_RANGE[cs.id as 'LM'];
    const extra = shuffle(rng, foreignPool(state, lo + (def.id === 'po' ? 3 : 0), hi + (def.id === 'po' ? 3 : 0), new Set(teams)));
    for (const d of dom) {
      const opp = foreign.pop() ?? extra.pop();
      if (opp) pairs.push(rng.chance(0.5) ? [d, opp] : [opp, d]);
    }
    // Zahraniční bez súpera postupujú bez boja
    cs.advanced[def.id] = [...foreign];
  } else if (def.id === 'kpo') {
    const order = cs.advanced.lf ?? [];
    const po = order.slice(8, 24);
    for (let i = 0; i < 8; i++) pairs.push([po[15 - i], po[i]]);
  } else if (def.id === 'r16' && cs.seeded) {
    const winners = shuffle(rng, cs.advanced.kpo ?? []);
    cs.seeded.forEach((s, i) => winners[i] && pairs.push([winners[i], s]));
  } else if (cs.id.startsWith('POHAR') && def.id === 'r1') {
    // 1. kolo: najsilnejšie kluby majú voľno, aby v osemfinále bolo 16 klubov
    const sorted = [...teams].sort((a, b) => state.clubs[b].reputation - state.clubs[a].reputation);
    const byes = Math.max(0, 32 - sorted.length);
    cs.advanced.r1 = sorted.slice(0, byes);
    const rest = shuffle(rng, sorted.slice(byes));
    for (let i = 0; i + 1 < rest.length; i += 2) pairs.push(lowerTierHome(state, rest[i], rest[i + 1], rng));
  } else {
    const list = shuffle(rng, teams);
    for (let i = 0; i + 1 < list.length; i += 2) {
      pairs.push(cs.id.startsWith('POHAR') ? lowerTierHome(state, list[i], list[i + 1], rng) : [list[i], list[i + 1]]);
    }
  }

  for (const [h, a] of pairs) {
    addFixture(state, cs.id, def.id, 1, def.dates[0], h, a);
    if (def.legs === 2) addFixture(state, cs.id, def.id, 2, def.dates[1], a, h);
  }
  state.seasonData.fixtures.sort((x, y) => x.date.localeCompare(y.date));
}

/** V pohári hrá doma klub z nižšej ligy */
function lowerTierHome(state: GameState, a: string, b: string, rng: Rng): [string, string] {
  const ta = state.leagues[state.clubs[a].leagueId!]?.tier ?? 1;
  const tb = state.leagues[state.clubs[b].leagueId!]?.tier ?? 1;
  if (ta > tb) return [a, b];
  if (tb > ta) return [b, a];
  return rng.chance(0.5) ? [a, b] : [b, a];
}

/** Penalty: mierne zvýhodnený silnejší klub */
function penalties(state: GameState, a: string, b: string, rng: Rng): string {
  const p = 0.5 + (state.clubs[a].reputation - state.clubs[b].reputation) / 120;
  return rng.chance(Math.max(0.3, Math.min(0.7, p))) ? a : b;
}

/** Vyhodnotí fázu, keď sú všetky jej zápasy odohrané */
function resolveStage(state: GameState, cs: CompState, idx: number, rng: Rng): boolean {
  const def = STAGES[cs.id][idx];
  const fx = state.seasonData.fixtures.filter((f) => f.leagueId === cs.id && f.phase === def.id);
  if (fx.some((f) => !f.played)) return false;
  cs.resolved.push(def.id);
  const euro = EURO.includes(cs.id);

  if (def.league) {
    const table = compTable(state, cs.id);
    cs.advanced.lf = table.map((r) => r.clubId);
    cs.seeded = table.slice(0, 8).map((r) => r.clubId);
    for (const r of table) {
      if (!isDomestic(state, r.clubId)) continue;
      const pos = table.indexOf(r) + 1;
      payout(state, cs.id, r.clubId, '', '');
      const prize = PRIZE[cs.id as 'LM'];
      if (r.won) addMoney(state, r.clubId, 'odmena', prize.win * r.won, `${COMP_NAMES[cs.id]} – ${r.won}× výhra v ligovej fáze`);
      if (r.drawn) addMoney(state, r.clubId, 'odmena', prize.draw * r.drawn, `${COMP_NAMES[cs.id]} – ${r.drawn}× remíza v ligovej fáze`);
      state.news.push({
        date: state.date,
        text: `${COMP_NAMES[cs.id]}: ${state.clubs[r.clubId].shortName} skončil v ligovej fáze ${pos}.${pos <= 8 ? ' a ide priamo do osemfinále!' : pos <= 24 ? ' a hrá play-off.' : ' a vypadol.'}`,
      });
    }
    return true;
  }

  // Dvojice a víťazi
  const ties = new Map<string, Fixture[]>();
  for (const f of fx) {
    const key = [f.homeId, f.awayId].sort().join('|');
    ties.set(key, [...(ties.get(key) ?? []), f]);
  }
  const winners: string[] = [...(cs.advanced[def.id] ?? [])];
  for (const legs of ties.values()) {
    const a = legs[0].homeId;
    const b = legs[0].awayId;
    const ga = legs.reduce((s, f) => s + (f.homeId === a ? f.homeGoals : f.awayGoals), 0);
    const gb = legs.reduce((s, f) => s + (f.homeId === b ? f.homeGoals : f.awayGoals), 0);
    let w = ga > gb ? a : gb > ga ? b : null;
    const last = legs.sort((x, y) => x.round - y.round)[legs.length - 1];
    if (!w) {
      w = penalties(state, a, b, rng);
      last.penaltyWinner = w;
    }
    const l = w === a ? b : a;
    winners.push(w);
    // Presun vyradeného CZ/SK klubu z kvalifikácie do nižšej súťaže
    const drop = DROP[`${cs.id}:${def.id}`];
    if (drop && isDomestic(state, l)) {
      const target = state.seasonData.comps![drop.comp];
      (target.entrants[drop.stage] ??= []).push(l);
      state.news.push({ date: state.date, text: `${state.clubs[l].shortName} vypadol v ${COMP_NAMES[cs.id]} a pokračuje v súťaži ${COMP_NAMES[drop.comp]}.` });
    }
    if (isDomestic(state, w)) {
      const next = STAGES[cs.id][idx + 1]?.id ?? 'vitaz';
      cs.reached[w] = def.id === 'f' ? 'vitaz' : next;
      if (euro) {
        if (['q2', 'q3', 'po'].includes(def.id)) payout(state, cs.id, w, 'qual', `postup cez ${STAGE_NAMES[def.id]}`);
        else payout(state, cs.id, w, next === 'vitaz' ? 'champion' : next, next === 'vitaz' ? 'víťazstvo' : `postup do fázy ${STAGE_NAMES[next]}`);
        bumpReputation(state, w, def.id === 'f' ? 3 : 0.5);
      } else {
        const cz = cs.id === 'POHAR-CZ';
        addMoney(state, w, 'odmena', def.id === 'f' ? (cz ? 400_000 : 200_000) : cz ? 30_000 : 15_000, `${COMP_NAMES[cs.id]} – ${def.id === 'f' ? 'víťazstvo' : `postup (${STAGE_NAMES[def.id]})`}`);
      }
    }
    if (isDomestic(state, l)) cs.reached[l] ??= def.id;
  }
  cs.advanced[def.id] = winners;
  if (def.id === 'f') {
    cs.champion = winners[0];
    if (cs.champion) {
      state.news.push({ date: state.date, text: `🏆 ${state.clubs[cs.champion].name} vyhral ${COMP_NAMES[cs.id]}!` });
    }
  }
  return true;
}

export interface CompRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

/** Tabuľka ligovej fázy */
export function compTable(state: GameState, comp: CompId): CompRow[] {
  const cs = state.seasonData.comps?.[comp];
  const rows = new Map<string, CompRow>();
  for (const id of cs?.leagueTeams ?? []) rows.set(id, { clubId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
  for (const f of state.seasonData.fixtures) {
    if (f.leagueId !== comp || f.phase !== 'lf' || !f.played) continue;
    const h = rows.get(f.homeId);
    const a = rows.get(f.awayId);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.gf += f.homeGoals;
    h.ga += f.awayGoals;
    a.gf += f.awayGoals;
    a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) {
      h.won++;
      a.lost++;
      h.points += 3;
    } else if (f.homeGoals < f.awayGoals) {
      a.won++;
      h.lost++;
      a.points += 3;
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
    }
  }
  return [...rows.values()].sort(
    (x, y) => y.points - x.points || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || state.clubs[y.clubId].reputation - state.clubs[x.clubId].reputation,
  );
}

/** Denne: vyhodnotenie dohraných fáz a vytvorenie ďalších */
export function progressCompetitions(state: GameState, rng: Rng): void {
  const comps = state.seasonData.comps;
  if (!comps) return;
  for (let guard = 0; guard < 20; guard++) {
    let changed = false;
    for (const id of COMP_ORDER) {
      const cs = comps[id];
      if (!cs || cs.champion !== undefined) continue;
      const stages = STAGES[id];
      const idx = stages.findIndex((s) => !cs.resolved.includes(s.id));
      if (idx < 0) continue;
      const def = stages[idx];
      if (!cs.created.includes(def.id)) {
        // Fáza sa vytvorí, keď je predošlá vyhodnotená (alebo hneď, ak je prvá)
        createStage(state, cs, idx, rng);
        changed = true;
      } else if (resolveStage(state, cs, idx, rng)) {
        changed = true;
        if (def.id === 'f' && cs.champion === undefined) cs.champion = '';
      }
    }
    if (!changed) break;
  }
}

export function competitionsDone(state: GameState): boolean {
  const comps = state.seasonData.comps;
  if (!comps) return true;
  return COMP_ORDER.every((id) => !comps[id] || comps[id].champion !== undefined);
}

/** Prihlási kluby do súťaží novej sezóny */
export function initCompetitions(state: GameState, euroEntrants: Partial<Record<CompId, Record<string, string[]>>>, rng: Rng): void {
  const comps: Record<string, CompState> = {};
  for (const id of COMP_ORDER) comps[id] = { id, entrants: {}, created: [], resolved: [], advanced: {}, reached: {} };
  for (const [comp, stages] of Object.entries(euroEntrants)) comps[comp].entrants = { ...stages };
  // Domáce poháre: všetky kluby 1. a 2. ligy okrem B-tímov
  for (const [comp, country] of [['POHAR-CZ', 'CZ'], ['POHAR-SK', 'SK']] as const) {
    comps[comp].entrants.r1 = Object.values(state.clubs)
      .filter((c) => c.leagueId && c.country === country && !c.reserveOf)
      .map((c) => c.id);
  }
  state.seasonData.comps = comps;
  progressCompetitions(state, rng);
}

/** Miesta v Európe podľa konečných tabuliek a víťazov pohárov */
export function euroEntrantsFrom(order: { CZ: string[]; SK: string[] }, cupWinners: { CZ?: string; SK?: string }) {
  const e: Partial<Record<CompId, Record<string, string[]>>> = { LM: {}, EL: {}, KL: {} };
  const add = (comp: CompId, stage: string, id: string | undefined) => {
    if (id) (e[comp]![stage] ??= []).push(id);
  };
  // Česko: majster → LM play-off, 2. → LM 2. predkolo, víťaz pohára → EL play-off, 3. → EL 3. predkolo, 4. → KL 2. predkolo
  {
    const used = new Set<string>();
    const next = () => order.CZ.find((id) => !used.has(id));
    const take = (comp: CompId, stage: string, id?: string) => {
      if (id) {
        used.add(id);
        add(comp, stage, id);
      }
    };
    take('LM', 'po', order.CZ[0]);
    take('LM', 'q2', order.CZ[1]);
    const cup = cupWinners.CZ && !used.has(cupWinners.CZ) ? cupWinners.CZ : undefined;
    take('EL', 'po', cup ?? next());
    take('EL', 'q3', next());
    take('KL', 'q2', next());
  }
  // Slovensko: majster → LM 2. predkolo, víťaz pohára → EL 3. predkolo, 2. a 3. → KL 2. predkolo
  {
    const used = new Set<string>();
    const next = () => order.SK.find((id) => !used.has(id));
    const take = (comp: CompId, stage: string, id?: string) => {
      if (id) {
        used.add(id);
        add(comp, stage, id);
      }
    };
    take('LM', 'q2', order.SK[0]);
    const cup = cupWinners.SK && !used.has(cupWinners.SK) ? cupWinners.SK : undefined;
    take('EL', 'q3', cup ?? next());
    take('KL', 'q2', next());
    take('KL', 'q2', next());
  }
  return e;
}

export function isCompetition(leagueId: string): leagueId is CompId {
  return (COMP_ORDER as string[]).includes(leagueId);
}
