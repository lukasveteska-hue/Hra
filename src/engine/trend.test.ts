import { it, expect } from 'vitest';
import { buildDefaultDatabase } from './database';
import { newGame } from './game';
import { playUntil } from './testUtil';

it('mesačné zmeny hodnotenia', async () => {
  let s = newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId: 'zlin', seed: 3 });
  s = await playUntil(s, (x) => x.date >= '2026-10-02');
  const squad = Object.values(s.players).filter((p) => p.clubId === 'zlin');
  const up = squad.filter((p) => (p.ovrDelta ?? 0) >= 0.05).length;
  const down = squad.filter((p) => (p.ovrDelta ?? 0) <= -0.05).length;
  console.log(`Zlín po 1. 10.: ▲ ${up}, ▼ ${down}, bez zmeny ${squad.length - up - down}; história`, JSON.stringify(squad[0].ovrHistory));
  expect(up + down).toBeGreaterThan(12);
  expect(squad[0].ovrHistory?.length).toBeGreaterThanOrEqual(3);
}, 120_000);
