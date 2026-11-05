import { describe, expect, it } from 'vitest';
import { playUntil } from './testUtil';
import { buildDefaultDatabase } from './database';
import { newGame } from './game';
import { chooseSponsor, expandStadium, loanLimit, loansOutstanding, takeLoan, upgradeFacility } from './management';
import { weatherFor, weatherHarshness, weatherPlayerFactor } from './weather';

import type { GameState } from './types';

const until = (s: GameState, date: string) => playUntil(s, (x) => x.date >= date);

const fresh = () => newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId: 'malzenice', seed: 3 });

describe('banka', () => {
  it('aj malý klub si môže štedro požičať', () => {
    const s = fresh();
    const limit = loanLimit(s);
    console.log('limit Malženice', limit, 'účet', s.clubs.malzenice.balance);
    expect(limit).toBeGreaterThanOrEqual(1_500_000);
    const before = s.clubs.malzenice.balance;
    expect(takeLoan(s, 1_000_000, 2)).toBeNull();
    expect(s.clubs.malzenice.balance).toBe(before + 1_000_000);
    expect(takeLoan(s, limit, 2)).not.toBeNull();
  });

  it('splátky znižujú dlh každý mesiac', async () => {
    let s = fresh();
    takeLoan(s, 600_000, 1);
    s = await until(s, '2026-08-02'); // prejdú 2 splátky (1. 7. a 1. 8.)
    const out = loansOutstanding(s);
    expect(out).toBeLessThan(600_000);
    expect(out).toBeGreaterThan(400_000);
    expect(s.ledger.some((t) => t.type === 'splatka')).toBe(true);
  }, 60_000);
});

describe('štadión a zariadenia', () => {
  it('rozšírenie štadióna sa dokončí', async () => {
    let s = fresh();
    takeLoan(s, 1_500_000, 3);
    const cap = s.clubs.malzenice.capacity;
    expect(expandStadium(s, 1000)).toBeNull();
    expect(upgradeFacility(s, 'trening')).toBeNull();
    const level = s.management.training;
    s = await until(s, '2026-09-30');
    expect(s.clubs.malzenice.capacity).toBe(cap + 1000);
    expect(s.management.training).toBe(level + 1);
  }, 60_000);

  it('sponzor sa dá vybrať', () => {
    const s = fresh();
    expect(s.management.sponsorOffers).toHaveLength(3);
    chooseSponsor(s, 1);
    expect(s.management.sponsor?.kind).toBe('vykon');
  });
});

describe('počasie', () => {
  it('zodpovedá ročnému obdobiu a je stále rovnaké', () => {
    expect(weatherFor('x', '2026-08-01')).toEqual(weatherFor('x', '2026-08-01'));
    const summer = Array.from({ length: 200 }, (_, i) => weatherFor(`s${i}`, '2026-07-25'));
    const winter = Array.from({ length: 200 }, (_, i) => weatherFor(`w${i}`, '2027-02-06'));
    const avg = (l: typeof summer) => l.reduce((a, w) => a + w.temp, 0) / l.length;
    expect(avg(summer)).toBeGreaterThan(15);
    expect(avg(winter)).toBeLessThan(5);
    expect(summer.some((w) => w.kind === 'sneh')).toBe(false);
    expect(winter.some((w) => w.kind === 'sneh')).toBe(true);
  });

  it('v zlom počasí mierne pomáha fyzicky silným hráčom', () => {
    const rain = { kind: 'lejak' as const, temp: 10 };
    expect(weatherHarshness(rain)).toBeGreaterThan(0.5);
    const phys = weatherPlayerFactor(rain, 75, 50);
    const tech = weatherPlayerFactor(rain, 50, 75);
    expect(phys).toBeGreaterThan(1);
    expect(tech).toBeLessThan(1);
    expect(phys - tech).toBeLessThan(0.05);
  });
});
