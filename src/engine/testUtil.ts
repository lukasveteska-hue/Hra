// Pomocné funkcie pre testy: odohranie sezóny s krátkymi prestávkami (aby testy neblokovali vitest)

import { advance, createSim, finishMyMatch, myFixtureToday, seasonFinished } from './advance';
import { Rng } from './rng';
import type { GameState } from './types';

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function playUntil(s: GameState, stop: (s: GameState) => boolean, max = 900): Promise<GameState> {
  for (let i = 0; i < max && !stop(s); i++) {
    const f = myFixtureToday(s);
    if (f) {
      const rng = new Rng(s.rngState);
      const sim = createSim(s, f, rng);
      sim.runToEnd();
      s = finishMyMatch(s, [{ fixtureId: f.id, result: sim.result() }], rng.state);
    } else s = advance(s, 'match');
    if (i % 5 === 0) await tick();
  }
  return s;
}

export const playToEnd = (s: GameState) => playUntil(s, seasonFinished);
