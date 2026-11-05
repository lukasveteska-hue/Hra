import { describe, expect, it } from 'vitest';
import { buildDefaultDatabase } from './database';
import { FRIENDLY } from './friendlies';
import { newGame } from './game';
import { playUntil } from './testUtil';

describe('priateľské zápasy', () => {
  it('odohrajú sa v lete samé a prinesú peniaze a formu', async () => {
    let s = newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId: 'zlin', seed: 2 });
    const fr = s.seasonData.fixtures.filter((f) => f.leagueId === FRIENDLY);
    expect(fr).toHaveLength(5);
    const formBefore = Object.values(s.players).filter((p) => p.clubId === 'zlin').reduce((a, p) => a + p.form, 0);
    s = await playUntil(s, (x) => x.date >= '2026-07-15');
    const played = s.seasonData.fixtures.filter((f) => f.leagueId === FRIENDLY && f.played);
    expect(played).toHaveLength(3);
    const money = s.ledger.filter((t) => t.type === 'priatelsky');
    console.log(money.map((t) => `${t.text}: ${t.amount}`).join(' | '));
    expect(money).toHaveLength(3);
    const formAfter = Object.values(s.players).filter((p) => p.clubId === 'zlin').reduce((a, p) => a + p.form, 0);
    expect(formAfter).toBeGreaterThan(formBefore);
    // Žiadne zranenia ani štatistiky z prípravy
    expect(Object.keys(s.seasonData.stats).filter((id) => s.players[id]?.clubId === 'zlin')).toHaveLength(0);
  }, 120_000);
});
