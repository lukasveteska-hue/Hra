import { describe, expect, it } from 'vitest';
import { buildDefaultDatabase } from './database';
import { newGame } from './game';
import { ageOn, ovr } from './ratings';
import { freeAgents, playerDemand, teamAverage } from './transfers';
import type { GameState, Player } from './types';

function refusalRate(s: GameState, players: Player[]) {
  const d = players.map((p) => playerDemand(s, p, false));
  return { n: players.length, refuse: d.filter((x) => x.refuses).length / Math.max(1, players.length) };
}

describe('ochota hráčov prestúpiť do slabého klubu', () => {
  const s = newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId: 'malzenice', seed: 9 });
  const avg = teamAverage(s, 'malzenice');
  const others = Object.values(s.players).filter((p) => p.clubId && p.clubId !== 'malzenice');
  const age = (p: Player) => ageOn(p.birthDate, s.date);

  it('správanie podľa veku a kvality', () => {
    const stars = others.filter((p) => ovr(p) > avg + 18 && age(p) < 30);
    const vets = others.filter((p) => ovr(p) > avg + 18 && age(p) >= 34);
    const mid = others.filter((p) => ovr(p) > avg + 2 && ovr(p) < avg + 8);
    const rs = refusalRate(s, stars);
    const rv = refusalRate(s, vets);
    const rm = refusalRate(s, mid);
    const rf = refusalRate(s, freeAgents(s).filter((p) => age(p) >= 33));
    console.log(`priemer tímu ${avg.toFixed(1)} | hviezdy <30 r.: ${rs.n}, odmieta ${(rs.refuse * 100).toFixed(0)} % | veteráni 34+: ${rv.n}, odmieta ${(rv.refuse * 100).toFixed(0)} % | o trochu lepší: ${(rm.refuse * 100).toFixed(0)} % | voľní veteráni: ${rf.n}, odmieta ${(rf.refuse * 100).toFixed(0)} %`);
    expect(rs.refuse).toBeGreaterThan(0.85);
    // Aj hviezda má malú šancu
    expect(rs.refuse).toBeLessThan(1);
    expect(rv.refuse).toBeLessThan(rs.refuse - 0.2);
    expect(rm.refuse).toBeLessThan(0.35);
    expect(rf.refuse).toBeLessThan(0.3);
  });

  it('rozhodnutie je v tom istom období stále rovnaké', () => {
    const p = others[10];
    expect(playerDemand(s, p, false)).toEqual(playerDemand(s, p, false));
  });

  it('veteráni sú medzi voľnými hráčmi', () => {
    const vets = freeAgents(s).filter((p) => age(p) >= 33);
    expect(vets.length).toBeGreaterThan(8);
    expect(Math.max(...vets.map(ovr))).toBeGreaterThan(62);
  });
});

describe('plat veteránov', () => {
  it('skúsený veterán nechce hrať zadarmo', () => {
    const s = newGame(buildDefaultDatabase(), { manager: { name: 'T', nationality: 'SK', age: 40 }, clubId: 'zlin', seed: 9 });
    const fa = freeAgents(s);
    const vet = fa.filter((p) => ageOn(p.birthDate, s.date) >= 34).sort((a, b) => ovr(b) - ovr(a))[0];
    const young = fa.filter((p) => ageOn(p.birthDate, s.date) <= 28).sort((a, b) => Math.abs(ovr(a) - ovr(vet)) - Math.abs(ovr(b) - ovr(vet)))[0];
    const dv = playerDemand(s, vet, false);
    const dy = playerDemand(s, young, false);
    console.log(`veterán ${ageOn(vet.birthDate, s.date)} r., celk. ${ovr(vet).toFixed(0)}: ${dv.wage} € | mladší ${ageOn(young.birthDate, s.date)} r., celk. ${ovr(young).toFixed(0)}: ${dy.wage} €`);
    expect(dv.wage).toBeGreaterThan(5000);
  });
});
