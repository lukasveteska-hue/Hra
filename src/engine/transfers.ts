// Prestupový trh: ponuky, vyjednávanie, zmluvy, počítačové prestupy

import { FOREIGN_CLUBS, type ForeignClub } from '../data/foreignClubs';
import { addDays, transferWindow } from './calendar';
import { addMoney } from './finance';
import { transferBan } from './management';
import { generatePlayer, pickNationality } from './generator';
import { ageOn, COUNTRY_PRICE_FACTOR, fairWage, LEAGUE_PRICE_FACTOR, marketValue, ovr, roundMoney } from './ratings';
import type { Rng } from './rng';
import type { GameState, Offer, Player, Position } from './types';

export const MAX_SQUAD = 35;
const MIN_SQUAD = 18;

const leagueKey = (state: GameState, clubId: string | null) => (clubId ? state.clubs[clubId]?.leagueId ?? '' : '');

export function clubPlayers(state: GameState, clubId: string): Player[] {
  return Object.values(state.players).filter((p) => p.clubId === clubId);
}

export function teamAverage(state: GameState, clubId: string): number {
  const top = clubPlayers(state, clubId).map(ovr).sort((a, b) => b - a).slice(0, 11);
  return top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
}

/** Za koľko je klub ochotný hráča predať */
export function sellerValuation(state: GameState, p: Player): number {
  const v = marketValue(p, state.date, state.season);
  if (!p.clubId) return 0;
  const squad = clubPlayers(state, p.clubId).sort((a, b) => ovr(b) - ovr(a));
  const rank = squad.findIndex((x) => x.id === p.id);
  let f = rank < 3 ? 1.5 : rank < 11 ? 1.25 : 1.0;
  if (p.listed) f = Math.min(f, 0.95);
  if (ageOn(p.birthDate, state.date) > 31) f *= 0.9;
  if (p.contractUntil - state.season - 1 <= 0) f *= 0.8;
  if (squad.length <= MIN_SQUAD + 1) f *= 1.3;
  const v2 = p.listed && p.askingPrice ? Math.min(v * f, p.askingPrice) : v * f;
  return roundMoney(v2);
}

export type BidResponse =
  | { kind: 'accept'; fee: number }
  | { kind: 'counter'; fee: number; text: string }
  | { kind: 'reject'; text: string };

/** Odpoveď klubu na moju ponuku */
export function respondToBid(state: GameState, p: Player, amount: number, rng: Rng): BidResponse {
  const club = p.clubId ? state.clubs[p.clubId] : null;
  if (!club) return { kind: 'accept', fee: 0 };
  if (!transferWindow(state.date)) return { kind: 'reject', text: 'Mimo prestupového obdobia sa hráči kupovať nedajú (okrem voľných hráčov).' };
  if (transferBan(state)) return { kind: 'reject', text: 'Klub má pre veľký dlh zákaz nákupov. Najprv daj do poriadku financie.' };
  const val = sellerValuation(state, p);
  if (amount >= val) return { kind: 'accept', fee: amount };
  if (amount >= val * 0.75) {
    const fee = roundMoney(val * rng.range(1, 1.06));
    return { kind: 'counter', fee, text: `${club.shortName} požaduje ${fee.toLocaleString('sk-SK')} €.` };
  }
  if (rng.chance(0.6)) return { kind: 'reject', text: `Ponuka je príliš nízka. ${club.shortName} chce aspoň ${roundMoney(val).toLocaleString('sk-SK')} €.` };
  return { kind: 'reject', text: `${club.shortName} ponuku odmietol ako neprijateľnú.` };
}

export interface ContractDemand {
  wage: number;
  years: number;
  /** Hráč odmieta rokovať */
  refuses?: string;
}

/** Požiadavky hráča na zmluvu s mojím klubom */
export function playerDemand(state: GameState, p: Player, renewal: boolean): ContractDemand {
  const me = state.manager.clubId;
  const myClub = state.clubs[me];
  const myLeague = leagueKey(state, me);
  const age = ageOn(p.birthDate, state.date);
  const base = fairWage({ ...p, priceFactor: LEAGUE_PRICE_FACTOR[myLeague] ?? p.priceFactor }, state.date, state.season, myLeague);
  let f = 1.05;
  const fromRep = p.clubId ? state.clubs[p.clubId].reputation : 50;
  if (!renewal && transferBan(state)) {
    return { wage: 0, years: 0, refuses: 'Klub má pre veľký dlh zákaz podpisovania nových hráčov.' };
  }
  if (!renewal) {
    f += Math.max(0, fromRep - myClub.reputation) / 20;
    // Výrazne lepší hráč nechce do slabšieho klubu
    if (ovr(p) > teamAverage(state, me) + 14) {
      return { wage: 0, years: 0, refuses: `${p.lastName} nemá záujem hrať za klub tejto úrovne.` };
    }
  } else {
    f += (p.form / 20 - 0.5) * 0.2;
    if (age <= 23 && p.potential - ovr(p) > 8) f += 0.15;
    if (p.morale < 40) f += 0.15;
  }
  // Pri predĺžení zmluvy chce hráč aspoň toľko, koľko má
  const wage = roundMoney(Math.max(base * f, renewal ? p.wage * 1.05 : 0), 100);
  const years = age >= 32 ? 1 : age >= 29 ? 2 : age <= 22 ? 4 : 3;
  return { wage, years };
}

/** Prijme hráč ponúknutú zmluvu? */
export function playerAcceptsContract(demand: ContractDemand, offeredWage: number, rng: Rng): boolean {
  if (demand.refuses) return false;
  if (offeredWage >= demand.wage) return true;
  if (offeredWage >= demand.wage * 0.9) return rng.chance(0.5);
  return false;
}

/** Vykoná prestup (alebo podpis voľného hráča) */
export function executeTransfer(
  state: GameState,
  p: Player,
  to: { clubId: string } | { foreign: ForeignClub },
  fee: number,
  wage: number,
  years: number,
): void {
  const fromClubId = p.clubId;
  const age = ageOn(p.birthDate, state.date);
  const record = {
    date: state.date,
    playerId: p.id,
    playerName: `${p.firstName} ${p.lastName}`,
    position: p.position,
    age,
    fromClubId,
    fromName: fromClubId ? undefined : 'voľný hráč',
    toClubId: 'clubId' in to ? to.clubId : null,
    toName: 'foreign' in to ? `${to.foreign.name}` : undefined,
    fee,
  };
  if (fromClubId && fee) addMoney(state, fromClubId, 'prestup_predaj', fee, `Predaj: ${p.firstName} ${p.lastName}`);
  if ('clubId' in to) {
    if (fee) addMoney(state, to.clubId, 'prestup_nakup', -fee, `Nákup: ${p.firstName} ${p.lastName}`);
    p.clubId = to.clubId;
    p.wage = wage;
    p.contractUntil = state.season + years;
  } else {
    p.clubId = null;
    p.abroad = `${to.foreign.name}`;
  }
  p.listed = false;
  p.askingPrice = null;
  p.morale = Math.max(p.morale, 75);
  state.transfers.push(record);

  const me = state.manager.clubId;
  if (fromClubId === me) {
    state.tactic = {
      ...state.tactic,
      lineup: state.tactic.lineup.filter((id) => id !== p.id),
      bench: state.tactic.bench.filter((id) => id !== p.id),
    };
  }
  // Zrušenie ponúk na hráča
  for (const o of state.offers) if (o.playerId === p.id && o.status === 'nova') o.status = 'vyprsala';

  const toName = 'clubId' in to ? state.clubs[to.clubId].name : to.foreign.name;
  const fromName = fromClubId ? state.clubs[fromClubId].shortName : 'bez klubu';
  const money = fee ? ` za ${fee.toLocaleString('sk-SK')} €` : ' zadarmo';
  if (fromClubId === me || ('clubId' in to && to.clubId === me) || fee >= 500_000) {
    state.news.push({ date: state.date, text: `Prestup: ${p.firstName} ${p.lastName} (${fromName}) → ${toName}${money}.` });
  }
}

// ---------- Ponuky na mojich hráčov ----------

function foreignBuyerFor(state: GameState, p: Player, rng: Rng): ForeignClub | null {
  const o = ovr(p);
  const age = ageOn(p.birthDate, state.date);
  const fits = FOREIGN_CLUBS.filter((c) => o >= c.reputation - 13 || (age <= 21 && p.potential >= c.reputation - 3));
  return fits.length ? rng.pick(fits) : null;
}

/** Hodnota hráča, keby hral v danej krajine */
function valueIn(state: GameState, p: Player, factor: number): number {
  return marketValue({ ...p, priceFactor: factor }, state.date, state.season);
}

/** Denne počas prestupového obdobia: ponuky na mojich hráčov. Vráti počet nových ponúk. */
export function generateOffersForMe(state: GameState, rng: Rng): number {
  if (!transferWindow(state.date)) return 0;
  const me = state.manager.clubId;
  const squad = clubPlayers(state, me);
  if (squad.length <= MIN_SQUAD) return 0;
  const listed = squad.filter((p) => p.listed).length;
  if (!rng.chance(0.16 + listed * 0.06)) return 0;

  const target = weighted(
    rng,
    squad.map((p) => {
      const age = ageOn(p.birthDate, state.date);
      const talent = age <= 23 ? 1 + Math.max(0, p.potential - ovr(p)) / 10 : 1;
      return { item: p, w: (p.listed ? 3 : 1) * talent * (0.5 + p.form / 20) * Math.sqrt(marketValue(p, state.date, state.season)) };
    }),
  );
  if (!target) return 0;
  if (state.offers.some((o) => o.playerId === target.id && o.status === 'nova')) return 0;

  const base = marketValue(target, state.date, state.season);
  let offer: Offer;
  const id = `o${state.nextId++}`;
  if (rng.chance(0.35)) {
    const fc = foreignBuyerFor(state, target, rng);
    if (!fc) return 0;
    const factor = COUNTRY_PRICE_FACTOR[fc.country] ?? 0.4;
    const amount = roundMoney(Math.max(base, valueIn(state, target, factor) * rng.range(0.22, 0.4)));
    offer = { id, playerId: target.id, fromClubId: null, foreignName: fc.name, foreignCountry: fc.country, amount, maxAmount: roundMoney(amount * rng.range(1.1, 1.35)), date: state.date, expires: addDays(state.date, 3), status: 'nova' };
  } else {
    const o = ovr(target);
    const buyers = Object.values(state.clubs).filter(
      (c) => c.id !== me && c.leagueId && c.reputation >= o - 6 && c.balance > base * 1.1 && !c.reserveOf,
    );
    if (!buyers.length) return 0;
    const buyer = rng.pick(buyers);
    let amount = roundMoney(base * rng.range(0.75, 1.1));
    if (target.listed && target.askingPrice) amount = roundMoney(Math.max(amount, target.askingPrice * rng.range(0.8, 1)));
    amount = Math.min(amount, roundMoney(buyer.balance * 0.8));
    offer = { id, playerId: target.id, fromClubId: buyer.id, amount, maxAmount: roundMoney(Math.min(buyer.balance * 0.9, amount * rng.range(1.05, 1.3))), date: state.date, expires: addDays(state.date, 3), status: 'nova' };
  }
  state.offers.push(offer);
  const buyerName = offer.fromClubId ? state.clubs[offer.fromClubId].name : offer.foreignName;
  state.news.push({ date: state.date, text: `Ponuka: ${buyerName} chce kúpiť hráča ${target.firstName} ${target.lastName} za ${offer.amount.toLocaleString('sk-SK')} €.` });
  return 1;
}

export function expireOffers(state: GameState): void {
  for (const o of state.offers) if (o.status === 'nova' && o.expires < state.date) o.status = 'vyprsala';
}

/** Prijatie ponuky na môjho hráča */
export function acceptOffer(state: GameState, offerId: string, amount?: number): void {
  const o = state.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'nova') return;
  const p = state.players[o.playerId];
  const fee = amount ?? o.amount;
  o.status = 'prijata';
  if (o.fromClubId) {
    const wage = fairWage(p, state.date, state.season, leagueKey(state, o.fromClubId));
    executeTransfer(state, p, { clubId: o.fromClubId }, fee, wage, 3);
  } else {
    const fc = FOREIGN_CLUBS.find((c) => c.name === o.foreignName) ?? { name: o.foreignName ?? 'zahraničný klub', country: o.foreignCountry ?? 'EN', reputation: 75 };
    executeTransfer(state, p, { foreign: fc }, fee, 0, 0);
  }
}

/** Protinávrh k ponuke. Vráti text odpovede. */
export function counterOffer(state: GameState, offerId: string, amount: number, rng: Rng): string {
  const o = state.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'nova') return 'Ponuka už neplatí.';
  const buyer = o.fromClubId ? state.clubs[o.fromClubId].shortName : o.foreignName;
  if (amount <= o.maxAmount) {
    acceptOffer(state, offerId, amount);
    return `${buyer} súhlasí so sumou ${amount.toLocaleString('sk-SK')} €. Hráč prestúpil.`;
  }
  if (rng.chance(0.5)) {
    o.status = 'odmietnuta';
    return `${buyer} rokovania ukončil.`;
  }
  // Zlepšená ponuka
  o.amount = roundMoney(Math.min(o.maxAmount, (o.amount + o.maxAmount) / 2));
  return `${buyer} to odmieta, ale zvyšuje ponuku na ${o.amount.toLocaleString('sk-SK')} €.`;
}

export function rejectOffer(state: GameState, offerId: string): void {
  const o = state.offers.find((x) => x.id === offerId);
  if (!o || o.status !== 'nova') return;
  o.status = 'odmietnuta';
  const p = state.players[o.playerId];
  // Hráč, ktorému zakážem prestup do väčšieho klubu, stráca morálku
  const bigger = o.fromClubId ? state.clubs[o.fromClubId].reputation > state.clubs[state.manager.clubId].reputation + 3 : true;
  if (bigger) p.morale = Math.max(20, p.morale - 12);
}

// ---------- Počítačom riadené kluby ----------

function weighted<T>(rng: Rng, items: Array<{ item: T; w: number }>): T | null {
  const total = items.reduce((s, i) => s + Math.max(0, i.w), 0);
  if (total <= 0) return null;
  let x = rng.next() * total;
  for (const i of items) {
    x -= Math.max(0, i.w);
    if (x <= 0) return i.item;
  }
  return items[items.length - 1]?.item ?? null;
}

/** Pozícia, kde klub najviac potrebuje posilu */
function neededPosition(state: GameState, clubId: string): { pos: Position; bar: number } {
  const squad = clubPlayers(state, clubId);
  const target: Record<Position, number> = { B: 3, O: 8, Z: 8, U: 5 };
  let best: { pos: Position; score: number; bar: number } = { pos: 'Z', score: -1e9, bar: 0 };
  for (const pos of ['B', 'O', 'Z', 'U'] as Position[]) {
    const ps = squad.filter((p) => p.position === pos).sort((a, b) => ovr(b) - ovr(a));
    const starters = pos === 'B' ? 1 : pos === 'U' ? 2 : 4;
    const weakest = ps[starters - 1] ? ovr(ps[starters - 1]) : 0;
    const score = (target[pos] - ps.length) * 4 + (state.clubs[clubId].reputation - weakest);
    if (score > best.score) best = { pos, score, bar: weakest };
  }
  return best;
}

/** Denné prestupy medzi počítačom riadenými klubmi a odchody do zahraničia */
export function aiTransferDay(state: GameState, rng: Rng): void {
  if (!transferWindow(state.date)) return;
  const me = state.manager.clubId;
  const clubs = Object.values(state.clubs).filter((c) => c.leagueId && c.id !== me);

  // Nákupy medzi klubmi
  const deals = rng.chance(0.6) ? rng.int(1, 3) : 0;
  for (let d = 0; d < deals; d++) {
    const buyer = rng.pick(clubs);
    if (buyer.reserveOf) continue;
    const squad = clubPlayers(state, buyer.id);
    if (squad.length >= 30) continue;
    const { pos, bar } = neededPosition(state, buyer.id);
    const candidates = Object.values(state.players).filter(
      (p) =>
        p.clubId &&
        p.clubId !== me &&
        p.clubId !== buyer.id &&
        p.position === pos &&
        ovr(p) > bar + 1 &&
        ovr(p) < buyer.reputation + 6 &&
        state.clubs[p.clubId].reputation <= buyer.reputation + 2 &&
        clubPlayers(state, p.clubId).length > 20,
    );
    const p = weighted(rng, candidates.map((c) => ({ item: c, w: c.listed ? 3 : 1 })));
    if (!p) continue;
    const fee = sellerValuation(state, p);
    if (buyer.balance < fee * 1.2) continue;
    executeTransfer(state, p, { clubId: buyer.id }, fee, fairWage(p, state.date, state.season, buyer.leagueId!), rng.int(2, 4));
  }

  // Voľní hráči
  if (rng.chance(0.3)) {
    const buyer = rng.pick(clubs);
    if (clubPlayers(state, buyer.id).length < 24) {
      const { pos } = neededPosition(state, buyer.id);
      const free = freeAgents(state).filter((p) => p.position === pos).sort((a, b) => ovr(b) - ovr(a))[0];
      if (free && ovr(free) < buyer.reputation + 4) {
        executeTransfer(state, free, { clubId: buyer.id }, 0, fairWage(free, state.date, state.season, buyer.leagueId!), rng.int(1, 3));
      }
    }
  }

  // Odchod hráča do zahraničia
  if (rng.chance(0.12)) {
    const pool = Object.values(state.players).filter((p) => p.clubId && p.clubId !== me && clubPlayers(state, p.clubId).length > 20);
    const p = weighted(rng, pool.map((x) => ({ item: x, w: Math.max(0, ovr(x) - 60) ** 2 + (ageOn(x.birthDate, state.date) <= 21 ? Math.max(0, x.potential - 70) ** 2 : 0) })));
    if (p) {
      const fc = foreignBuyerFor(state, p, rng);
      if (fc) {
        const fee = roundMoney(Math.max(marketValue(p, state.date, state.season), valueIn(state, p, COUNTRY_PRICE_FACTOR[fc.country] ?? 0.4) * rng.range(0.22, 0.4)));
        executeTransfer(state, p, { foreign: fc }, fee, 0, 0);
      }
    }
  }

  // Kluby dávajú na listinu nadbytočných hráčov
  if (rng.chance(0.2)) {
    const club = rng.pick(clubs);
    const squad = clubPlayers(state, club.id).sort((a, b) => ovr(a) - ovr(b));
    const cand = squad.find((p) => !p.listed && (squad.length > 24 || ageOn(p.birthDate, state.date) > 32));
    if (cand) {
      cand.listed = true;
      cand.askingPrice = roundMoney(marketValue(cand, state.date, state.season) * 0.9);
    }
  }
}

export function freeAgents(state: GameState): Player[] {
  return Object.values(state.players).filter((p) => !p.clubId && !p.abroad);
}

/** Vytvorí voľných hráčov (na začiatku hry) */
export function generateFreeAgents(state: GameState, rng: Rng, count: number): void {
  for (let i = 0; i < count; i++) {
    const country = rng.chance(0.55) ? 'CZ' : 'SK';
    const pos = rng.pick<Position>(['B', 'O', 'O', 'Z', 'Z', 'Z', 'U', 'U']);
    const age = rng.int(19, 34);
    const p = generatePlayer(rng, {
      id: `v${state.nextId++}`,
      position: pos,
      age,
      targetOvr: rng.range(38, 64),
      nationality: pickNationality(rng, country),
      season: state.season,
      clubId: null,
      priceFactor: LEAGUE_PRICE_FACTOR[country === 'CZ' ? 'CZ2' : 'SK2'],
    });
    p.contractUntil = state.season;
    p.wage = 0;
    state.players[p.id] = p;
  }
}

/** Cena hráča sa po prestupe do inej ligy mení postupne */
export function driftPriceFactor(state: GameState, p: Player): void {
  const target = LEAGUE_PRICE_FACTOR[leagueKey(state, p.clubId)];
  if (target) p.priceFactor += (target - p.priceFactor) / 40;
}
