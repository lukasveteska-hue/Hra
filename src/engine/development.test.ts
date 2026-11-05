import { describe, expect, it } from 'vitest';
import { playToEnd } from './testUtil';
import { buildDefaultDatabase } from './database';
import { newGame } from './game';
import { ageOn, ovr } from './ratings';

describe('vývoj hráčov počas sezóny', () => {
  it('mladí rastú, starší klesajú', async () => {
    let s = newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId: 'zlin', seed: 21 });
    const start = new Map(Object.values(s.players).map((p) => [p.id, { o: ovr(p), age: ageOn(p.birthDate, s.date), pot: p.potential }]));
    s = await playToEnd(s);
    const groups: Record<string, number[]> = { '17-20': [], '21-24': [], '25-29': [], '30-32': [], '33+': [] };
    let maxGain = 0;
    for (const p of Object.values(s.players)) {
      const st = start.get(p.id);
      if (!st || p.abroad) continue;
      const d = ovr(p) - st.o;
      maxGain = Math.max(maxGain, d);
      const g = st.age <= 20 ? '17-20' : st.age <= 24 ? '21-24' : st.age <= 29 ? '25-29' : st.age <= 32 ? '30-32' : '33+';
      groups[g].push(d);
    }
    const avg = (l: number[]) => l.reduce((a, b) => a + b, 0) / Math.max(1, l.length);
    console.log(Object.entries(groups).map(([k, v]) => `${k}: ${avg(v).toFixed(2)}`).join(' | '), '| max rast', maxGain.toFixed(1));
    expect(avg(groups['17-20'])).toBeGreaterThan(1.5);
    expect(avg(groups['21-24'])).toBeGreaterThan(0.5);
    expect(avg(groups['33+'])).toBeLessThan(-1);
    expect(maxGain).toBeLessThan(15);
  }, 120_000);
});
