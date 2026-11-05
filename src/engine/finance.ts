// Financie klubov: mesačné platy a príjmy, vstupné, odmeny za umiestnenie

import { marketValue, ovr } from './ratings';
import type { Rng } from './rng';
import { weatherAttendance, weatherFor } from './weather';
import { payLoans, priceDemand, ticketPriceOf, transferBan } from './management';
import { standings } from './standings';
import type { Fixture, GameState, SeasonStart, TxType } from './types';

export const TX_NAMES: Record<TxType, string> = {
  mzdy: 'Platy hráčov',
  vstupne: 'Vstupné',
  tv: 'Televízne práva',
  sponzor: 'Sponzori',
  odmena: 'Odmeny za umiestnenie',
  prestup_nakup: 'Nákupy hráčov',
  prestup_predaj: 'Predaje hráčov',
  priatelsky: 'Priateľské zápasy',
  pozicka: 'Pôžičky',
  splatka: 'Splátky pôžičiek',
  stavba: 'Štadión a zariadenia',
  odstupne: 'Odstupné hráčom',
  ine: 'Prevádzka klubu',
};

/** Televízne peniaze za mesiac podľa ligy */
const TV_MONTHLY: Record<string, number> = { CZ1: 30_000, SK1: 18_000, CZ2: 8_000, SK2: 3_000 };
/** Odmena za 1. miesto (posledné miesto dostane 15 %) */
const PRIZE_TOP: Record<string, number> = { CZ1: 1_000_000, SK1: 600_000, CZ2: 200_000, SK2: 80_000 };

export function wageBillOf(state: GameState, clubId: string): number {
  let sum = 0;
  for (const p of Object.values(state.players)) if (p.clubId === clubId) sum += p.wage;
  return sum;
}

export function squadValue(state: GameState, clubId: string): number {
  let sum = 0;
  for (const p of Object.values(state.players)) if (p.clubId === clubId) sum += marketValue(p, state.date, state.season);
  return sum;
}

/** Pohyb peňazí klubu; pri mojom klube sa zapíše do účtovníctva */
export function addMoney(state: GameState, clubId: string, type: TxType, amount: number, text: string): void {
  const club = state.clubs[clubId];
  if (!club || !amount) return;
  club.balance = Math.round(club.balance + amount);
  if (clubId === state.manager.clubId) {
    state.ledger.push({ date: state.date, type, amount: Math.round(amount), text, balance: club.balance });
  }
}

function tablePosition(state: GameState, clubId: string): { pos: number; of: number } {
  const lid = state.clubs[clubId].leagueId;
  if (!lid) return { pos: 1, of: 1 };
  const t = standings(state, lid);
  return { pos: t.findIndex((r) => r.clubId === clubId) + 1, of: t.length };
}

/** Prvý deň mesiaca: platy, televízia, sponzori, prevádzka */
export function monthlyFinance(state: GameState): void {
  const month = Number(state.date.slice(5, 7));
  const monthName = ['', 'január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'][month];
  for (const club of Object.values(state.clubs)) {
    if (!club.leagueId) continue;
    const wages = wageBillOf(state, club.id);
    const start = club.id === state.manager.clubId ? state.seasonData.start?.wageBill : undefined;
    const { pos, of } = tablePosition(state, club.id);
    // Sponzori platia viac pri úspechu
    const success = pos <= 3 ? 1.15 : pos > of - 3 ? 0.9 : 1;
    let sponsor = 0.33 * (start ?? wages) * success + club.reputation * 250;
    let sponsorName = 'Sponzori';
    if (club.id === state.manager.clubId && state.management) {
      // Ak si hráč nevybral sponzora, vyberie sa zmluva s istou sumou
      if (!state.management.sponsor && state.management.sponsorOffers.length) {
        state.management.sponsor = state.management.sponsorOffers[0];
        state.news.push({ date: state.date, text: `Vedenie podpísalo sponzorskú zmluvu so spoločnosťou ${state.management.sponsor.name}.` });
      }
      if (state.management.sponsor) {
        sponsor = state.management.sponsor.monthly;
        sponsorName = state.management.sponsor.name;
      }
    }
    addMoney(state, club.id, 'mzdy', -wages, `Platy za ${monthName}`);
    addMoney(state, club.id, 'tv', TV_MONTHLY[club.leagueId] ?? 0, `Televízne práva – ${monthName}`);
    addMoney(state, club.id, 'sponzor', sponsor, `${sponsorName} – ${monthName}`);
    addMoney(state, club.id, 'ine', -(wages * 0.15 + club.capacity * 2.5), `Prevádzka štadióna a klubu – ${monthName}`);
  }
  if (state.management) {
    payLoans(state);
    const bal = state.clubs[state.manager.clubId].balance;
    if (bal < 0) {
      state.news.push({
        date: state.date,
        text: transferBan(state)
          ? `Klub je hlboko v mínuse (${Math.round(bal).toLocaleString('sk-SK')} €) – zväz zakázal nákupy hráčov.`
          : `Pozor: klub je v mínuse (${Math.round(bal).toLocaleString('sk-SK')} €).`,
      });
    }
  }
}

/** Návštevnosť a vstupné domáceho klubu */
export function matchdayIncome(state: GameState, f: Fixture, rng: Rng): void {
  const home = state.clubs[f.homeId];
  const away = state.clubs[f.awayId];
  if (!home.leagueId) return;
  const { pos, of } = tablePosition(state, home.id);
  const tableBonus = ((of - pos) / Math.max(1, of - 1) - 0.5) * 0.2;
  const derby = home.city === away.city ? 0.15 : 0;
  const weather = weatherAttendance(weatherFor(f.id, f.date));
  // Európske zápasy lákajú viac divákov, pohár menej (okrem neskorých kôl)
  const euro = ['LM', 'EL', 'KL'].includes(f.leagueId) ? 0.3 + (f.phase === 'lf' || f.phase.startsWith('q') || f.phase === 'po' ? 0 : 0.15) : 0;
  const cup = f.leagueId.startsWith('POHAR') ? (['sf', 'f'].includes(f.phase) ? 0.15 : -0.12) : 0;
  const interest = 0.25 + home.reputation / 200 + tableBonus + (away.reputation - 55) / 250 + derby + weather + euro + cup + rng.normal(0, 0.05);
  const fill = Math.max(0.05, Math.min(0.98, interest * priceDemand(state, home.id)));
  const attendance = Math.round(home.capacity * fill);
  const price = ticketPriceOf(state, home.id) * (euro ? 1.6 : 1);
  f.attendance = attendance;
  addMoney(state, home.id, 'vstupne', attendance * price, `Vstupné: ${home.shortName} – ${away.shortName} (${attendance.toLocaleString('sk-SK')} divákov)`);
}

/** Odmeny za konečné umiestnenie (raz za sezónu) */
export function seasonPrizes(state: GameState): void {
  if (state.seasonData.prizesPaid) return;
  for (const league of Object.values(state.leagues)) {
    const t = standings(state, league.id);
    const top = PRIZE_TOP[league.id] ?? 100_000;
    t.forEach((r, i) => {
      const share = 1 - (i / Math.max(1, t.length - 1)) * 0.85;
      addMoney(state, r.clubId, 'odmena', top * share, `Odmena za ${i + 1}. miesto – ${league.name}`);
      const sp = state.management?.sponsor;
      if (r.clubId === state.manager.clubId && sp?.targetPos && i + 1 <= sp.targetPos) {
        addMoney(state, r.clubId, 'sponzor', sp.targetBonus, `${sp.name} – bonus za ${i + 1}. miesto`);
      }
    });
  }
  state.seasonData.prizesPaid = true;
}

/** Snímka môjho klubu na začiatku sezóny */
export function seasonStartSnapshot(state: GameState): SeasonStart {
  const me = state.manager.clubId;
  const playerOvr: Record<string, number> = {};
  const playerValue: Record<string, number> = {};
  for (const p of Object.values(state.players)) {
    if (p.clubId !== me) continue;
    playerOvr[p.id] = Math.round(ovr(p) * 10) / 10;
    playerValue[p.id] = marketValue(p, state.date, state.season);
  }
  return {
    balance: state.clubs[me].balance,
    squadValue: squadValue(state, me),
    wageBill: wageBillOf(state, me),
    playerOvr,
    playerValue,
    reputation: state.clubs[me].reputation,
  };
}
