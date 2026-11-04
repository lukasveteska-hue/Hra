import { describe, expect, it } from 'vitest';
import { advance, createSim, finishMyMatch, myFixtureToday, seasonFinished } from './advance';
import { roundDates } from './calendar';
import { buildDefaultDatabase } from './database';
import { newGame } from './game';
import { Rng } from './rng';
import { roundRobin } from './schedule';
import { standings } from './standings';
import type { GameState } from './types';

function playSeason(clubId: string, seed: number): GameState {
  let s = newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId, seed });
  for (let i = 0; i < 500 && !seasonFinished(s); i++) {
    const f = myFixtureToday(s);
    if (f) {
      const rng = new Rng(s.rngState);
      const sim = createSim(s, f, rng);
      sim.runToEnd();
      s = finishMyMatch(s, [{ fixtureId: f.id, result: sim.result() }], rng.state);
    } else {
      s = advance(s, 'match');
    }
  }
  return s;
}

describe('rozpis', () => {
  it('každý s každým doma a vonku', () => {
    const teams = ['a', 'b', 'c', 'd', 'e', 'f'];
    const rounds = roundRobin(teams, true);
    expect(rounds).toHaveLength(10);
    const pairs = rounds.flat().map(([h, a]) => `${h}-${a}`);
    expect(new Set(pairs).size).toBe(30);
    for (const r of rounds) expect(new Set(r.flat()).size).toBe(6);
  });

  it('dátumy kôl sú zoradené a mimo zimnej prestávky', () => {
    const d = roundDates(2026, '2026-07-25', 40);
    expect(d).toHaveLength(40);
    expect([...d].sort()).toEqual(d);
    expect(d.every((x) => x < '2026-12-14' || x > '2027-02-05')).toBe(true);
    expect(d[d.length - 1] <= '2027-05-29').toBe(true);
  });
});

describe('celá sezóna', () => {
  const s = playSeason('zlin', 7);

  it('všetky zápasy sú odohrané a nadstavby vytvorené', () => {
    expect(seasonFinished(s)).toBe(true);
    const cz1 = s.seasonData.fixtures.filter((f) => f.leagueId === 'CZ1');
    // 240 základná časť + 2× 30 nadstavba
    expect(cz1).toHaveLength(300);
    const sk1 = s.seasonData.fixtures.filter((f) => f.leagueId === 'SK1');
    expect(sk1).toHaveLength(132 + 60);
  });

  it('výsledky sú realistické', () => {
    const fx = s.seasonData.fixtures;
    const goals = fx.reduce((a, f) => a + f.homeGoals + f.awayGoals, 0) / fx.length;
    const homeWins = fx.filter((f) => f.homeGoals > f.awayGoals).length / fx.length;
    const draws = fx.filter((f) => f.homeGoals === f.awayGoals).length / fx.length;
    console.log('gólov na zápas', goals.toFixed(2), 'výhry domácich', homeWins.toFixed(2), 'remízy', draws.toFixed(2));
    expect(goals).toBeGreaterThan(2.1);
    expect(goals).toBeLessThan(3.6);
    expect(homeWins).toBeGreaterThan(0.38);
    expect(draws).toBeGreaterThan(0.15);
  });

  it('silné kluby sú hore', () => {
    const t = standings(s, 'CZ1');
    const names = t.map((r) => `${s.clubs[r.clubId].shortName} ${r.points}`);
    console.log('CZ1:', names.join(', '));
    const top3 = t.slice(0, 4).map((r) => r.clubId);
    expect(top3.some((id) => ['slavia', 'sparta', 'plzen'].includes(id))).toBe(true);
    const sk = standings(s, 'SK1');
    console.log('SK1:', sk.map((r) => `${s.clubs[r.clubId].shortName} ${r.points}`).join(', '));
    expect(sk.slice(0, 3).map((r) => r.clubId)).toContain('slovan');
  });

  it('štatistiky strelcov existujú', () => {
    const top = Object.entries(s.seasonData.stats).sort((a, b) => b[1].goals - a[1].goals).slice(0, 3);
    console.log('strelci', top.map(([id, st]) => `${s.players[id].lastName} ${st.goals}`).join(', '));
    expect(top[0][1].goals).toBeGreaterThan(8);
  });
});

describe('prestupy a financie počas sezóny', () => {
  const s = playSeason('zlin', 11);

  it('počítačové kluby prestupujú a prichádzajú ponuky', () => {
    console.log('prestupov', s.transfers.length, 'do zahraničia', s.transfers.filter((t) => t.toName).length, 'ponúk na mňa', s.offers.length);
    expect(s.transfers.length).toBeGreaterThan(20);
    expect(s.offers.length).toBeGreaterThan(3);
  });

  it('financie klubov sú rozumné', () => {
    const rows = Object.values(s.clubs)
      .filter((c) => ['slavia', 'zlin', 'slovan', 'malzenice', 'karvina', 'trencin'].includes(c.id))
      .map((c) => `${c.shortName} ${Math.round(c.balance / 1000)} tis.`);
    console.log('zostatky', rows.join(', '));
    const byType: Record<string, number> = {};
    for (const t of s.ledger) byType[t.type] = (byType[t.type] ?? 0) + t.amount;
    console.log('môj klub', JSON.stringify(byType));
    const broke = Object.values(s.clubs).filter((c) => c.balance < -2_000_000);
    expect(broke.map((c) => c.shortName)).toEqual([]);
    expect(s.seasonData.prizesPaid).toBe(true);
    expect(s.seasonData.posHistory?.CZ1.length).toBeGreaterThan(30);
  });
});
