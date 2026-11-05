import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { rebalanceUnplayed, roundRobin } from './schedule';
import type { Fixture, GameState } from './types';

const maxStreak = (seq: string) => Math.max(...(seq.match(/D+|V+/g) ?? ['']).map((x) => x.length));

describe('doma a vonku', () => {
  it('kluby sa striedajú (výnimočne 3 zápasy za sebou na rovnakom mieste)', () => {
    for (const n of [12, 16]) {
      const teams = Array.from({ length: n }, (_, i) => `t${i}`);
      const rounds = roundRobin(teams, true);
      for (const t of teams) {
        const seq = rounds.map((r) => (r.find((p) => p[0] === t) ? 'D' : 'V')).join('');
        expect(maxStreak(seq), `${t} ${seq}`).toBeLessThanOrEqual(3);
        expect(seq.split('D').length - 1).toBe(n - 1);
      }
    }
  });

  const save = '/tmp/claude-0/-home-user-Hra/af617432-542e-5b9e-b32f-2b957f8168b1/scratchpad/save-mid3.json';
  it.skipIf(!existsSync(save))('oprava rozohranej hry nemení odohrané zápasy', () => {
    const s = JSON.parse(readFileSync(save, 'utf8')) as GameState;
    const played = s.seasonData.fixtures.filter((f) => f.played).map((f) => `${f.id}:${f.homeId}-${f.awayId}`);
    rebalanceUnplayed(s.seasonData.fixtures, s.manager.clubId);
    expect(s.seasonData.fixtures.filter((f) => f.played).map((f) => `${f.id}:${f.homeId}-${f.awayId}`)).toEqual(played);
    const cz1 = s.seasonData.fixtures.filter((f: Fixture) => f.leagueId === 'CZ1' && f.phase === 'zakladna');
    // Každá dvojica raz doma, raz vonku
    const pairs = new Map<string, string[]>();
    for (const f of cz1) pairs.set([f.homeId, f.awayId].sort().join('|'), [...(pairs.get([f.homeId, f.awayId].sort().join('|')) ?? []), f.homeId]);
    for (const homes of pairs.values()) expect(new Set(homes).size).toBe(2);
    const me = s.manager.clubId;
    const seq = cz1.filter((f) => !f.played && (f.homeId === me || f.awayId === me)).sort((a, b) => a.round - b.round).map((f) => (f.homeId === me ? 'D' : 'V')).join('');
    console.log('moje zostávajúce zápasy:', seq);
    expect(maxStreak(seq)).toBeLessThanOrEqual(2);
    // Každý klub má v každom kole práve jeden zápas
    const perRound = new Map<string, number>();
    for (const f of cz1) for (const c of [f.homeId, f.awayId]) perRound.set(`${c}|${f.round}`, (perRound.get(`${c}|${f.round}`) ?? 0) + 1);
    expect([...perRound.values()].every((v) => v === 1)).toBe(true);
  });
});
