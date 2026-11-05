import { describe, expect, it } from 'vitest';
import { advance } from './advance';
import { buildDefaultDatabase } from './database';
import { newGame } from './game';
import { ovr } from './ratings';
import { acceptOffer, releasePlayer, severanceFor } from './transfers';

const fresh = () => newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId: 'zlin', seed: 5 });

describe('predaj hráčov z listiny a ukončenie zmluvy', () => {
  it('hráči na listine dostanú ponuky aj za 0 €', () => {
    let s = fresh();
    const worst = Object.values(s.players).filter((p) => p.clubId === 'zlin').sort((a, b) => ovr(a) - ovr(b)).slice(0, 5);
    for (const p of worst) {
      p.listed = true;
      p.askingPrice = 0;
    }
    for (let i = 0; i < 20; i++) s = advance(s, 'day');
    const got = new Set(s.offers.map((o) => o.playerId));
    console.log('hráčov s ponukou', worst.filter((p) => got.has(p.id)).length, 'z 5, ponúk', s.offers.length);
    expect(worst.filter((p) => got.has(p.id)).length).toBeGreaterThanOrEqual(4);
    const o = s.offers.find((x) => x.status === 'nova' && worst.some((p) => p.id === x.playerId))!;
    acceptOffer(s, o.id);
    expect(s.players[o.playerId].clubId).not.toBe('zlin');
  });

  it('ukončenie zmluvy s odstupným', () => {
    const s = fresh();
    const p = Object.values(s.players).find((x) => x.clubId === 'zlin')!;
    const fee = severanceFor(s, p);
    const before = s.clubs.zlin.balance;
    expect(releasePlayer(s, p.id)).toBeNull();
    expect(s.players[p.id].clubId).toBeNull();
    expect(s.clubs.zlin.balance).toBe(before - fee);
    expect(fee).toBeGreaterThanOrEqual(p.wage);
    console.log('odstupné', fee, 'plat', p.wage);
  });
});
