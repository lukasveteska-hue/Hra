import { describe, expect, it } from 'vitest';
import { seasonFinished } from './advance';
import { playToEnd } from './testUtil';
import { buildDefaultDatabase } from './database';
import { newGame } from './game';
import { startNewSeason, changeClub } from './newSeason';
import { ageOn } from './ratings';


describe('viac sezón za sebou', () => {
  it('liga, kádre a hráči ostávajú v poriadku', async () => {
    let s = newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId: 'trencin', seed: 31 });
    const startPlayers = Object.keys(s.players).length;
    for (let season = 0; season < 3; season++) {
      s = await playToEnd(s);
      expect(seasonFinished(s)).toBe(true);
      const { state, report } = startNewSeason(s);
      console.log(
        `sezóna ${report.finishedSeason}: ${report.history.position}. miesto, hodnotenie ${report.history.rating}, vyhodený ${report.fired}, ponuky ${report.jobOffers.length},` +
          ` koniec kariéry ${report.retiredCount}, mládež ${report.youthMine.length}, odchody (zmluvy) ${report.expiredMine.length}, hráčov ${Object.keys(state.players).length}`,
      );
      s = report.fired && report.jobOffers.length ? changeClub(state, report.jobOffers[0]) : state;
      for (const l of Object.values(s.leagues)) {
        expect(l.clubIds.length).toBe(l.id.startsWith('CZ') ? 16 : l.id === 'SK1' ? 12 : 16);
        for (const id of l.clubIds) expect(s.clubs[id].leagueId).toBe(l.id);
      }
      for (const c of Object.values(s.clubs)) {
        const n = Object.values(s.players).filter((p) => p.clubId === c.id).length;
        if (c.id !== s.manager.clubId) expect(n).toBeGreaterThanOrEqual(22);
        expect(n).toBeLessThan(40);
      }
      expect(s.history).toHaveLength(season + 1);
      expect(s.seasonData.fixtures.every((f) => !f.played)).toBe(true);
    }
    const total = Object.keys(s.players).length;
    expect(total).toBeGreaterThan(startPlayers * 0.85);
    expect(total).toBeLessThan(startPlayers * 1.4);
    // Nikto nehrá vo veku nad 41 rokov
    expect(Object.values(s.players).every((p) => ageOn(p.birthDate, s.date) <= 41)).toBe(true);
  }, 300_000);
});
