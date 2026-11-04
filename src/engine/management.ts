// Správa klubu: vstupné, sponzori, pôžičky, štadión, zariadenia

import { addDays } from './calendar';
import { addMoney, wageBillOf } from './finance';
import { roundMoney } from './ratings';
import type { Rng } from './rng';
import type { GameState, Loan, Management, SponsorDeal } from './types';

/** Základná cena vstupenky podľa ligy */
export const TICKET_BASE: Record<string, number> = { CZ1: 9, SK1: 7, CZ2: 5, SK2: 4 };

/** Automatická (odporúčaná) cena vstupenky klubu */
export function autoTicketPrice(state: GameState, clubId: string): number {
  const c = state.clubs[clubId];
  return Math.round((TICKET_BASE[c.leagueId ?? ''] ?? 5) * (0.6 + c.reputation / 120) * 2) / 2;
}

export function ticketPriceOf(state: GameState, clubId: string): number {
  if (clubId === state.manager.clubId && state.management?.ticketPrice) return state.management.ticketPrice;
  return autoTicketPrice(state, clubId);
}

/** Ako cena vstupenky mení záujem divákov (vyššia cena = menej ľudí) */
export function priceDemand(state: GameState, clubId: string): number {
  const auto = autoTicketPrice(state, clubId);
  const price = ticketPriceOf(state, clubId);
  return Math.max(0.2, Math.min(1.6, (auto / price) ** 0.75));
}

// ---------- Sponzori ----------

const SPONSOR_NAMES = [
  'Stavby Morava', 'Agro Záhorie', 'TatraLog', 'Pivovar Hradná brána', 'Energo Východ', 'AutoCentrum Duna',
  'Hutní Ocel', 'Lesy a Píly', 'Kovotech', 'Mlyn Podunajsko', 'ProfiTrans', 'BetaBank', 'Nábytok Karpaty',
  'Sklárna Bohemia', 'Teplárne Sever', 'Vinárstvo Malé Karpaty', 'DataSoft', 'Strojárne Považie',
];

/** Základná mesačná suma od sponzora podľa veľkosti klubu */
export function sponsorBase(state: GameState, clubId: string): number {
  const c = state.clubs[clubId];
  return 0.33 * wageBillOf(state, clubId) + c.reputation * 250;
}

/** Očakávané umiestnenie podľa sily klubu v lige */
export function expectedPosition(state: GameState, clubId: string): number {
  const c = state.clubs[clubId];
  if (!c.leagueId) return 1;
  const ids = [...state.leagues[c.leagueId].clubIds].sort((a, b) => state.clubs[b].reputation - state.clubs[a].reputation);
  return ids.indexOf(clubId) + 1;
}

export function makeSponsorOffers(state: GameState, rng: Rng): SponsorDeal[] {
  const me = state.manager.clubId;
  const base = sponsorBase(state, me);
  const names = [...SPONSOR_NAMES].sort(() => rng.next() - 0.5).slice(0, 3);
  const exp = expectedPosition(state, me);
  const target = Math.max(1, exp - 2);
  const r = (v: number) => roundMoney(v, 1_000);
  return [
    { name: names[0], kind: 'istota', monthly: r(base * rng.range(0.98, 1.05)), winBonus: 0, targetPos: 0, targetBonus: 0 },
    { name: names[1], kind: 'vykon', monthly: r(base * 0.7), winBonus: r(base * rng.range(0.11, 0.14)), targetPos: 0, targetBonus: 0 },
    { name: names[2], kind: 'ambicia', monthly: r(base * 0.75), winBonus: 0, targetPos: target, targetBonus: r(base * rng.range(4.5, 6)) },
  ];
}

export const SPONSOR_KIND: Record<SponsorDeal['kind'], string> = {
  istota: 'Istota – vysoká pevná suma',
  vykon: 'Výkon – nižšia suma + bonus za každú ligovú výhru',
  ambicia: 'Ambícia – nižšia suma + veľký bonus za umiestnenie',
};

export function chooseSponsor(state: GameState, index: number): void {
  const deal = state.management.sponsorOffers[index];
  if (!deal || state.management.sponsor) return;
  state.management.sponsor = deal;
  state.news.push({ date: state.date, text: `Klub podpísal sponzorskú zmluvu so spoločnosťou ${deal.name}.` });
}

// ---------- Pôžičky ----------

/** Koľko si klub môže celkovo požičať – štedré limity aj pre malé kluby */
export function loanLimit(state: GameState): number {
  const me = state.manager.clubId;
  const c = state.clubs[me];
  const yearlyWages = wageBillOf(state, me) * 12;
  const limit = Math.max(1_500_000, yearlyWages * 2.5, c.capacity * 250) + c.reputation * 20_000;
  return roundMoney(limit, 50_000);
}

export function loansOutstanding(state: GameState): number {
  return state.management.loans.reduce((s, l) => s + l.remaining, 0);
}

export function loanRate(years: number): number {
  return years <= 1 ? 0.04 : years <= 3 ? 0.055 : 0.065;
}

export function annuity(principal: number, rate: number, months: number): number {
  const r = rate / 12;
  return r === 0 ? principal / months : (principal * r) / (1 - (1 + r) ** -months);
}

export function takeLoan(state: GameState, amount: number, years: number): string | null {
  const free = loanLimit(state) - loansOutstanding(state);
  if (amount <= 0) return 'Zadaj sumu.';
  if (amount > free) return `Banka ti môže požičať najviac ${free.toLocaleString('sk-SK')} €.`;
  const rate = loanRate(years);
  const months = years * 12;
  const loan: Loan = {
    id: `l${state.nextId++}`,
    principal: amount,
    remaining: amount,
    rate,
    monthlyPayment: Math.round(annuity(amount, rate, months)),
    months,
    monthsLeft: months,
    startDate: state.date,
  };
  state.management.loans.push(loan);
  addMoney(state, state.manager.clubId, 'pozicka', amount, `Pôžička ${amount.toLocaleString('sk-SK')} € na ${years} r. (${(rate * 100).toFixed(1)} %)`);
  return null;
}

/** Predčasné splatenie zvyšku pôžičky */
export function repayLoan(state: GameState, id: string): string | null {
  const loan = state.management.loans.find((l) => l.id === id);
  if (!loan) return 'Pôžička neexistuje.';
  const me = state.manager.clubId;
  if (state.clubs[me].balance < loan.remaining) return 'Na splatenie nemáš dosť peňazí.';
  addMoney(state, me, 'splatka', -Math.round(loan.remaining), 'Predčasné splatenie pôžičky');
  state.management.loans = state.management.loans.filter((l) => l.id !== id);
  return null;
}

/** Mesačné splátky (1. deň v mesiaci) */
export function payLoans(state: GameState): void {
  const me = state.manager.clubId;
  for (const loan of state.management.loans) {
    const interest = (loan.remaining * loan.rate) / 12;
    const payment = loan.monthsLeft <= 1 ? loan.remaining + interest : loan.monthlyPayment;
    loan.remaining = Math.max(0, loan.remaining - (payment - interest));
    loan.monthsLeft--;
    addMoney(state, me, 'splatka', -Math.round(payment), `Splátka pôžičky (úrok ${Math.round(interest).toLocaleString('sk-SK')} €)`);
  }
  const done = state.management.loans.filter((l) => l.monthsLeft <= 0 || l.remaining < 1);
  if (done.length) state.news.push({ date: state.date, text: 'Pôžička bola úplne splatená.' });
  state.management.loans = state.management.loans.filter((l) => l.monthsLeft > 0 && l.remaining >= 1);
}

/** Zákaz prestupov pri veľkom dlhu */
export function transferBan(state: GameState): boolean {
  return state.clubs[state.manager.clubId].balance < -loanLimit(state) * 0.3;
}

// ---------- Štadión a zariadenia ----------

const SEAT_COST: Record<string, number> = { CZ1: 1_400, SK1: 1_200, CZ2: 900, SK2: 800 };
const FACILITY_COST: Record<string, number> = { CZ1: 300_000, SK1: 250_000, CZ2: 150_000, SK2: 120_000 };

export function seatCost(state: GameState): number {
  return SEAT_COST[state.clubs[state.manager.clubId].leagueId ?? ''] ?? 1000;
}

export function stadiumDays(seats: number): number {
  return 21 + Math.ceil(seats / 500) * 7;
}

export function expandStadium(state: GameState, seats: number): string | null {
  const me = state.manager.clubId;
  if (state.management.projects.some((p) => p.kind === 'stadion')) return 'Štadión sa už rozširuje.';
  const cost = seats * seatCost(state);
  if (state.clubs[me].balance < cost) return 'Na rozšírenie nemáš dosť peňazí.';
  addMoney(state, me, 'stavba', -cost, `Rozšírenie štadióna o ${seats.toLocaleString('sk-SK')} miest`);
  state.management.projects.push({ kind: 'stadion', seats, cost, startDate: state.date, finishDate: addDays(state.date, stadiumDays(seats)) });
  return null;
}

export function facilityCost(state: GameState, kind: 'trening' | 'akademia'): number {
  const level = kind === 'trening' ? state.management.training : state.management.youth;
  return (FACILITY_COST[state.clubs[state.manager.clubId].leagueId ?? ''] ?? 150_000) * level;
}

export function upgradeFacility(state: GameState, kind: 'trening' | 'akademia'): string | null {
  const me = state.manager.clubId;
  const m = state.management;
  const level = kind === 'trening' ? m.training : m.youth;
  if (level >= 5) return 'Už je na najvyššej úrovni.';
  if (m.projects.some((p) => p.kind === kind)) return 'Už sa vylepšuje.';
  const cost = facilityCost(state, kind);
  if (state.clubs[me].balance < cost) return 'Nemáš dosť peňazí.';
  const name = kind === 'trening' ? 'tréningového centra' : 'mládežníckej akadémie';
  addMoney(state, me, 'stavba', -cost, `Vylepšenie ${name} na úroveň ${level + 1}`);
  m.projects.push({ kind, level: level + 1, cost, startDate: state.date, finishDate: addDays(state.date, 60) });
  return null;
}

/** Denne: dokončenie stavieb */
export function finishProjects(state: GameState): void {
  const m = state.management;
  const club = state.clubs[state.manager.clubId];
  for (const p of m.projects.filter((x) => x.finishDate <= state.date)) {
    if (p.kind === 'stadion' && p.seats) {
      club.capacity += p.seats;
      state.news.push({ date: state.date, text: `Rozšírenie štadióna je hotové! Nová kapacita: ${club.capacity.toLocaleString('sk-SK')} miest.` });
    } else if (p.kind === 'trening' && p.level) {
      m.training = p.level;
      state.news.push({ date: state.date, text: `Tréningové centrum je vylepšené na úroveň ${p.level}.` });
    } else if (p.kind === 'akademia' && p.level) {
      m.youth = p.level;
      state.news.push({ date: state.date, text: `Mládežnícka akadémia je vylepšená na úroveň ${p.level}.` });
    }
  }
  m.projects = m.projects.filter((x) => x.finishDate > state.date);
}

export function initialManagement(state: GameState, rng: Rng): Management {
  const rep = state.clubs[state.manager.clubId].reputation;
  const level = Math.max(1, Math.min(4, Math.round((rep - 35) / 10)));
  const m: Management = { ticketPrice: null, sponsor: null, sponsorOffers: [], loans: [], projects: [], training: level, youth: level };
  state.management = m;
  m.sponsorOffers = makeSponsorOffers(state, rng);
  return m;
}
