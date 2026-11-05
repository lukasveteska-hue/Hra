import { describe, expect, it } from 'vitest';
import { advance, createSim, finishMyMatch, myFixtureToday, seasonFinished } from './advance';
import { COMP_NAMES, compTable, type CompId } from './cups';
import { buildDefaultDatabase } from './database';
import { newGame } from './game';
import { startNewSeason } from './newSeason';
import { Rng } from './rng';
import type { GameState } from './types';

function playToEnd(s: GameState): GameState {
  for (let i = 0; i < 800 && !seasonFinished(s); i++) {
    const f = myFixtureToday(s);
    if (f) {
      const rng = new Rng(s.rngState);
      const sim = createSim(s, f, rng);
      sim.runToEnd();
      s = finishMyMatch(s, [{ fixtureId: f.id, result: sim.result() }], rng.state);
    } else s = advance(s, 'match');
  }
  return s;
}

describe('poháre a Európa', () => {
  it('celá sezóna so všetkými súťažami', () => {
    // Slavia hrá Ligu majstrov
    let s = newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId: 'slavia', seed: 4 });
    s = playToEnd(s);
    expect(seasonFinished(s)).toBe(true);
    const comps = s.seasonData.comps!;
    for (const id of ['LM', 'EL', 'KL', 'POHAR-CZ', 'POHAR-SK'] as CompId[]) {
      const cs = comps[id];
      expect(cs.champion, id).toBeTruthy();
      const fx = s.seasonData.fixtures.filter((f) => f.leagueId === id);
      console.log(`${COMP_NAMES[id]}: víťaz ${s.clubs[cs.champion!].name}, zápasov ${fx.length}, CZ/SK: ${Object.entries(cs.reached).map(([c, r]) => `${s.clubs[c].shortName}→${r}`).join(', ')}`);
      if (['LM', 'EL', 'KL'].includes(id)) {
        expect(cs.leagueTeams).toHaveLength(36);
        expect(compTable(s, id).every((r) => r.played === 8)).toBe(true);
      }
    }
    // Nikto nehrá dva zápasy v jeden deň
    const byDay = new Map<string, number>();
    for (const f of s.seasonData.fixtures) for (const c of [f.homeId, f.awayId]) byDay.set(`${c}|${f.date}`, (byDay.get(`${c}|${f.date}`) ?? 0) + 1);
    expect([...byDay.values()].every((n) => n === 1)).toBe(true);
    const euroMoney = s.ledger.filter((t) => t.type === 'odmena' && /Liga|liga/.test(t.text)).reduce((a, t) => a + t.amount, 0);
    console.log('Slavia z Európy', euroMoney);

    const { state } = startNewSeason(s);
    const next = state.seasonData.comps!;
    console.log('ďalšia sezóna – LM:', JSON.stringify(next.LM.entrants), 'EL:', JSON.stringify(next.EL.entrants), 'KL:', JSON.stringify(next.KL.entrants));
    expect(Object.values(next.LM.entrants).flat().length).toBe(3);
    expect(next['POHAR-CZ'].entrants.r1.length).toBe(30);
  }, 600_000);
});
