import { describe, expect, it } from 'vitest';
import { newGame, squadOf } from './game';
import { marketValue, ovr } from './ratings';

describe('nová hra', () => {
  const state = newGame({ manager: { name: 'Test', nationality: 'SK', age: 40 }, clubId: 'zlin', seed: 42 });

  it('každý klub má 25 hráčov', () => {
    for (const c of Object.values(state.clubs)) {
      expect(squadOf(state, c.id)).toHaveLength(25);
    }
  });

  it('atribúty a potenciál sú v rozsahu 1–99', () => {
    for (const p of Object.values(state.players)) {
      for (const v of [p.fyz, p.tech, p.potential]) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(99);
      }
      expect(p.potential).toBeGreaterThanOrEqual(Math.floor(ovr(p)));
    }
  });

  it('silnejšie kluby majú lepších hráčov', () => {
    const avg = (id: string) => {
      const s = squadOf(state, id).map(ovr).sort((a, b) => b - a).slice(0, 11);
      return s.reduce((a, b) => a + b, 0) / s.length;
    };
    expect(avg('slavia')).toBeGreaterThan(avg('zlin'));
    expect(avg('zlin')).toBeGreaterThan(avg('malzenice'));
  });

  it('vypíše prehľad', () => {
    for (const id of ['slavia', 'zlin', 'slovan', 'karvina', 'malzenice']) {
      const s = squadOf(state, id);
      const top = s.map(ovr).sort((a, b) => b - a).slice(0, 11);
      const val = s.reduce((a, p) => a + marketValue(p, state.date, state.season), 0);
      const wages = s.reduce((a, p) => a + p.wage, 0);
      console.log(id, 'top11', Math.round(top.reduce((a, b) => a + b) / 11), 'hodnota', Math.round(val / 1e5) / 10, 'mil', 'platy/mes', wages, 'účet', state.clubs[id].balance);
    }
  });
});
