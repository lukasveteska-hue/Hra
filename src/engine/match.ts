// Simulácia zápasu minútu po minúte.
// Ten istý engine sa používa na zápas naživo (krok po minúte) aj na rýchlu simuláciu ostatných zápasov.

import { ageOn } from './ratings';
import { weatherLabel, weatherPlayerFactor, type Weather } from './weather';
import type { Rng } from './rng';
import { autoLineup, bestFormation, conditionFactor, formationSlots, isAvailable, positionFactor } from './tactics';
import type { Player, Position, Style, Tactic } from './types';

export type EventType = 'start' | 'goal' | 'save' | 'miss' | 'yellow' | 'red' | 'injury' | 'sub' | 'half' | 'end' | 'tactic';

export interface MatchEvent {
  minute: number;
  type: EventType;
  side: 0 | 1;
  playerId?: string;
  otherId?: string;
  text: string;
}

interface OnPitch {
  id: string;
  slot: Position;
}

export interface SideState {
  clubId: string;
  formation: string;
  attack: number;
  style: Style;
  captain: string | null;
  onPitch: OnPitch[];
  bench: string[];
  subsUsed: number;
  subWindows: number[];
  goals: number;
  shots: number;
  onTarget: number;
  possession: number;
  yellow: number;
  red: number;
  human: boolean;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  goals: Array<[number, string, string]>;
  ratings: Record<string, number>;
  appeared: string[];
  energy: Record<string, number>;
  yellows: string[];
  reds: string[];
  injuries: Array<{ id: string; days: number }>;
  assists: string[];
  scorers: string[];
}

const SHARE: Record<Exclude<Position, 'B'>, { att: number; mid: number; def: number }> = {
  O: { att: 0.15, mid: 0.3, def: 1 },
  Z: { att: 0.5, mid: 1, def: 0.5 },
  U: { att: 1, mid: 0.3, def: 0.12 },
};
// Referenčné hodnoty pre formáciu 4-4-2 (aby sa dali porovnať rôzne formácie)
const ATT_REF = 4 * 0.15 + 4 * 0.5 + 2 * 1;
const DEF_REF = 4 + 4 * 0.5 + 2 * 0.12;
const MID_REF = 4 * 0.3 + 4 + 2 * 0.3;

// Ladenie simulácie (priemer ~2,8 gólu na zápas)
const SHOT_RATE = 0.1;
const RATIO_EXP = 1.1;
const GOAL_Q = 0.11;
const FIN_EXP = 1.5;

export const MAX_SUBS = 5;
export const MAX_SUB_WINDOWS = 3;

const name = (p: Player) => p.lastName;

export class MatchSim {
  minute = 0;
  sides: [SideState, SideState];
  events: MatchEvent[] = [];
  private players: Record<string, Player>;
  private rng: Rng;
  private date: string;
  weather: Weather | null;
  energy: Record<string, number> = {};
  private cards: Record<string, number> = {};
  private ratingAdj: Record<string, number> = {};
  private appeared = new Set<string>();
  private yellows: string[] = [];
  private reds: string[] = [];
  private injuries: Array<{ id: string; days: number }> = [];
  private sentOff = new Set<string>();
  private goalList: Array<[number, string, string]> = [];
  private assistList: string[] = [];
  private scorerList: string[] = [];
  private sideMap: Record<string, 0 | 1> = {};

  constructor(opts: {
    players: Record<string, Player>;
    rng: Rng;
    date: string;
    /** Počasie (nepovinné) */
    weather?: Weather;
    home: { clubId: string; tactic: Tactic; human?: boolean };
    away: { clubId: string; tactic: Tactic; human?: boolean };
  }) {
    this.players = opts.players;
    this.rng = opts.rng;
    this.date = opts.date;
    this.weather = opts.weather ?? null;
    this.sides = [this.makeSide(opts.home), this.makeSide(opts.away)];
    this.sides.forEach((side, si) => {
      for (const x of side.onPitch) this.sideMap[x.id] = si as 0 | 1;
      for (const id of side.bench) this.sideMap[id] = si as 0 | 1;
    });
    this.events.push({
      minute: 0,
      type: 'start',
      side: 0,
      text: `Rozhodca odpískal začiatok zápasu.${this.weather ? ` Počasie: ${weatherLabel(this.weather).replace(/^\S+ /, '').toLowerCase()}.` : ''}`,
    });
  }

  private makeSide(s: { clubId: string; tactic: Tactic; human?: boolean }): SideState {
    const slots = formationSlots(s.tactic.formation);
    const onPitch = s.tactic.lineup.slice(0, slots.length).map((id, i) => ({ id, slot: slots[i] }));
    for (const p of onPitch) {
      this.energy[p.id] = this.players[p.id].energy;
      this.appeared.add(p.id);
    }
    for (const id of s.tactic.bench) this.energy[id] = this.players[id].energy;
    return {
      clubId: s.clubId,
      formation: s.tactic.formation,
      attack: s.tactic.attack,
      style: s.tactic.style,
      captain: s.tactic.captain,
      onPitch,
      bench: [...s.tactic.bench],
      subsUsed: 0,
      subWindows: [],
      goals: 0,
      shots: 0,
      onTarget: 0,
      possession: 0,
      yellow: 0,
      red: 0,
      human: !!s.human,
    };
  }

  get finished(): boolean {
    return this.minute >= 90;
  }

  /** Výkonnosť hráča práve teraz */
  private perf(id: string, slot: Position): number {
    const p = this.players[id];
    const withEnergy = { ...p, energy: this.energy[id] ?? p.energy };
    const w = this.weather ? weatherPlayerFactor(this.weather, p.fyz, p.tech) : 1;
    return conditionFactor(withEnergy) * positionFactor(p, slot) * w;
  }


  private strength(side: SideState) {
    let att = 0;
    let mid = 0;
    let def = 0;
    let gk = 0;
    for (const { id, slot } of side.onPitch) {
      const p = this.players[id];
      const f = this.perf(id, slot);
      if (slot === 'B') {
        gk = (0.7 * p.bra + 0.15 * p.fyz + 0.15 * p.tech) * f;
        continue;
      }
      const sh = SHARE[slot];
      att += (0.55 * p.uto + 0.3 * p.tech + 0.15 * p.fyz) * f * sh.att;
      def += (0.55 * p.obr + 0.25 * p.fyz + 0.2 * p.tech) * f * sh.def;
      mid += (0.5 * p.tech + 0.25 * p.fyz + 0.125 * (p.obr + p.uto)) * f * sh.mid;
    }
    if (!gk) gk = 15; // bez brankára
    const a = side.attack / 100;
    att *= 0.88 + 0.24 * a;
    def *= 1.12 - 0.24 * a;
    let chance = 1;
    let quality = 1;
    if (side.style === 'kratke') {
      mid *= 1.06;
      chance *= 0.96;
    } else if (side.style === 'centre') {
      chance *= 1.04;
      quality *= 0.97;
    } else if (side.style === 'nabehy') {
      att *= 1.05;
      def *= 0.97;
      quality *= 0.98;
    }
    return { att: att / ATT_REF, mid: mid / MID_REF, def: def / DEF_REF, gk, chance, quality };
  }

  private weightedPick(items: Array<{ id: string; w: number }>): string | null {
    const total = items.reduce((s, i) => s + Math.max(0, i.w), 0);
    if (total <= 0) return null;
    let x = this.rng.next() * total;
    for (const i of items) {
      x -= Math.max(0, i.w);
      if (x <= 0) return i.id;
    }
    return items[items.length - 1]?.id ?? null;
  }

  private sideName(i: 0 | 1, clubNames?: [string, string]) {
    return clubNames ? clubNames[i] : '';
  }

  /** Odohrá jednu minútu */
  step(clubNames?: [string, string]): void {
    if (this.finished) return;
    this.minute++;
    const m = this.minute;
    const [h, a] = this.sides;
    const sh = this.strength(h);
    const sa = this.strength(a);
    // Domáce prostredie
    sh.att *= 1.05;
    sh.mid *= 1.04;
    sh.def *= 1.03;

    const possH = sh.mid ** 2 / (sh.mid ** 2 + sa.mid ** 2);
    h.possession += possH;
    a.possession += 1 - possH;

    const attempt = (si: 0 | 1, me: typeof sh, opp: typeof sh, poss: number) => {
      const side = this.sides[si];
      const ratio = me.att / Math.max(1, opp.def);
      // Tím, ktorý vysoko vedie, poľaví
      const lead = side.goals - this.sides[si === 0 ? 1 : 0].goals;
      const ease = lead >= 4 ? 0.4 : lead >= 3 ? 0.6 : 1;
      const rate = Math.min(0.4, SHOT_RATE * 2 * poss * ratio ** RATIO_EXP * me.chance * ease);
      if (this.rng.next() >= rate) return;
      side.shots++;
      // Strelec podľa útočného podielu
      const shooters = side.onPitch
        .filter((x) => x.slot !== 'B')
        .map((x) => {
          const p = this.players[x.id];
          return { id: x.id, w: (0.55 * p.uto + 0.3 * p.tech + 0.15 * p.fyz) * SHARE[x.slot as 'O'].att * this.perf(x.id, x.slot) };
        });
      const shooterId = this.weightedPick(shooters);
      if (!shooterId) return;
      const sp = this.players[shooterId];
      const slot = side.onPitch.find((x) => x.id === shooterId)!.slot;
      const fin =
        (side.style === 'centre' ? 0.45 * sp.uto + 0.25 * sp.tech + 0.3 * sp.fyz : 0.6 * sp.uto + 0.4 * sp.tech) * this.perf(shooterId, slot);
      const q = Math.max(0.02, Math.min(0.4, GOAL_Q * (fin / Math.max(10, opp.gk)) ** FIN_EXP * ratio ** 0.3 * me.quality));
      const roll = this.rng.next();
      const oppSide = this.sides[si === 0 ? 1 : 0];
      const gkId = oppSide.onPitch.find((x) => x.slot === 'B')?.id;
      if (roll < q) {
        side.goals++;
        side.onTarget++;
        this.goalList.push([m, shooterId, side.clubId]);
        this.scorerList.push(shooterId);
        this.adj(shooterId, 1.0);
        if (gkId) this.adj(gkId, -0.4);
        for (const x of oppSide.onPitch) if (x.slot === 'O') this.adj(x.id, -0.15);
        let text = `GÓL! ${name(sp)} (${this.sideName(si, clubNames)})`;
        if (this.rng.chance(0.75)) {
          const assistId = this.weightedPick(
            side.onPitch
              .filter((x) => x.id !== shooterId && x.slot !== 'B')
              .map((x) => {
                const p = this.players[x.id];
                return { id: x.id, w: (p.tech + p.uto * 0.5) * (x.slot === 'Z' ? 1.4 : x.slot === 'U' ? 1 : 0.5) };
              }),
          );
          if (assistId) {
            this.assistList.push(assistId);
            this.adj(assistId, 0.6);
            text += `, prihrával ${name(this.players[assistId])}`;
          }
        }
        this.events.push({ minute: m, type: 'goal', side: si, playerId: shooterId, text: `${text}. ${h.goals}:${a.goals}` });
      } else if (roll < q + 0.3) {
        side.onTarget++;
        this.adj(shooterId, 0.1);
        if (gkId) this.adj(gkId, 0.15);
        if (this.rng.chance(0.45) && gkId) {
          this.events.push({ minute: m, type: 'save', side: si, playerId: shooterId, text: `${name(sp)} strieľa, ${name(this.players[gkId])} chytá.` });
        }
      } else if (this.rng.chance(0.3)) {
        const misses = ['strieľa vedľa', 'trafil len žrď', 'mieri nad bránu', 'hlavičkuje tesne vedľa'];
        this.events.push({ minute: m, type: 'miss', side: si, playerId: shooterId, text: `${name(sp)} ${this.rng.pick(misses)}.` });
      }
    };
    attempt(0, sh, sa, possH);
    attempt(1, sa, sh, 1 - possH);

    // Karty a zranenia
    for (const si of [0, 1] as const) {
      const side = this.sides[si];
      const opp = this.sides[si === 0 ? 1 : 0];
      const yellowP = 0.018 * (1 + (opp.attack / 100 - 0.5) * 0.3);
      if (this.rng.next() < yellowP) {
        const id = this.weightedPick(side.onPitch.map((x) => ({ id: x.id, w: x.slot === 'B' ? 0.1 : SHARE[x.slot].def * 0.6 + 0.5 })));
        if (id) this.card(si, id, this.rng.next() < 0.04 ? 'red' : 'yellow', clubNames);
      }
      if (this.rng.next() < 0.0011) {
        const id = this.rng.pick(side.onPitch).id;
        this.injure(si, id);
      }
    }

    // Únava
    for (const side of this.sides) {
      const a = side.attack / 100;
      for (const { id } of side.onPitch) {
        const p = this.players[id];
        const age = ageOn(p.birthDate, this.date);
        const ageF = 1 + Math.max(0, age - 27) * 0.03;
        this.energy[id] = Math.max(0, this.energy[id] - 0.27 * ageF * (1.25 - p.fyz / 200) * (0.92 + 0.16 * a));
      }
    }

    // Rozhodnutia počítača
    for (const si of [0, 1] as const) if (!this.sides[si].human) this.aiDecisions(si);

    if (m === 45) this.events.push({ minute: 45, type: 'half', side: 0, text: `Polčas ${h.goals}:${a.goals}.` });
    if (m === 90) this.events.push({ minute: 90, type: 'end', side: 0, text: `Koniec zápasu ${h.goals}:${a.goals}.` });
  }

  private adj(id: string, v: number) {
    this.ratingAdj[id] = (this.ratingAdj[id] ?? 0) + v;
  }

  private card(si: 0 | 1, id: string, kind: 'yellow' | 'red', clubNames?: [string, string]) {
    const side = this.sides[si];
    const p = this.players[id];
    if (kind === 'yellow') {
      this.cards[id] = (this.cards[id] ?? 0) + 1;
      side.yellow++;
      this.yellows.push(id);
      this.adj(id, -0.3);
      if (this.cards[id] >= 2) {
        this.events.push({ minute: this.minute, type: 'red', side: si, playerId: id, text: `Druhá žltá a červená karta pre ${name(p)} (${this.sideName(si, clubNames)})!` });
        this.sendOff(si, id);
        return;
      }
      this.events.push({ minute: this.minute, type: 'yellow', side: si, playerId: id, text: `Žltá karta: ${name(p)}.` });
    } else {
      this.events.push({ minute: this.minute, type: 'red', side: si, playerId: id, text: `Priama červená karta pre ${name(p)} (${this.sideName(si, clubNames)})!` });
      this.sendOff(si, id);
    }
  }

  private sendOff(si: 0 | 1, id: string) {
    const side = this.sides[si];
    side.red++;
    this.reds.push(id);
    this.sentOff.add(id);
    this.adj(id, -1.5);
    side.onPitch = side.onPitch.filter((x) => x.id !== id);
  }

  private injure(si: 0 | 1, id: string) {
    const side = this.sides[si];
    const p = this.players[id];
    const days = Math.round(3 + this.rng.next() ** 2 * 50);
    this.injuries.push({ id, days });
    this.events.push({ minute: this.minute, type: 'injury', side: si, playerId: id, text: `${name(p)} sa zranil a nemôže pokračovať.` });
    const slot = side.onPitch.find((x) => x.id === id)?.slot ?? 'Z';
    // Automatické striedanie zraneného hráča
    const sub = this.bestBench(side, slot);
    if (sub && this.canSub(side)) this.substitute(si, id, sub, true);
    else side.onPitch = side.onPitch.filter((x) => x.id !== id);
  }

  private bestBench(side: SideState, slot: Position): string | null {
    const cands = side.bench.filter((id) => !this.appeared.has(id));
    if (!cands.length) return null;
    return cands.sort((x, y) => this.benchScore(y, slot) - this.benchScore(x, slot))[0];
  }

  private benchScore(id: string, slot: Position): number {
    const p = this.players[id];
    const base = slot === 'B' ? p.bra : slot === 'O' ? p.obr : slot === 'U' ? p.uto : (p.tech + p.obr + p.uto) / 3;
    return (base * 0.6 + p.fyz * 0.2 + p.tech * 0.2) * positionFactor(p, slot);
  }

  canSub(side: SideState): boolean {
    if (side.subsUsed >= MAX_SUBS) return false;
    const windows = side.subWindows.filter((w) => w !== 45);
    return windows.includes(this.minute) || windows.length < MAX_SUB_WINDOWS || this.minute === 45;
  }

  /** Striedanie; vráti chybu alebo null */
  substitute(si: 0 | 1, outId: string, inId: string, forced = false): string | null {
    const side = this.sides[si];
    if (!this.canSub(side)) return 'Už nemôžeš striedať (max. 5 hráčov v 3 prestávkach).';
    const idx = side.onPitch.findIndex((x) => x.id === outId);
    if (idx < 0) return 'Hráč nie je na ihrisku.';
    if (!side.bench.includes(inId) || this.appeared.has(inId)) return 'Hráč nie je na lavičke.';
    const slot = side.onPitch[idx].slot;
    side.onPitch[idx] = { id: inId, slot };
    side.subsUsed++;
    if (!side.subWindows.includes(this.minute)) side.subWindows.push(this.minute);
    this.appeared.add(inId);
    this.energy[inId] ??= this.players[inId].energy;
    this.events.push({
      minute: this.minute,
      type: 'sub',
      side: si,
      playerId: inId,
      otherId: outId,
      text: `Striedanie${forced ? ' (zranenie)' : ''}: ${name(this.players[inId])} za ${name(this.players[outId])}.`,
    });
    return null;
  }

  /** Zmena taktiky počas zápasu */
  setTactic(si: 0 | 1, t: { formation?: string; attack?: number; style?: Style }) {
    const side = this.sides[si];
    if (t.attack !== undefined) side.attack = t.attack;
    if (t.style) side.style = t.style;
    if (t.formation && t.formation !== side.formation) {
      side.formation = t.formation;
      // Prerozdelenie hráčov na ihrisku do nových pozícií
      const slots = formationSlots(t.formation);
      const players = side.onPitch.map((x) => this.players[x.id]);
      const used = new Set<string>();
      const next: OnPitch[] = [];
      for (const slot of slots) {
        if (next.length >= players.length) break;
        const best = players
          .filter((p) => !used.has(p.id))
          .sort((x, y) => positionFactor(y, slot) * (y.position === slot ? 1.1 : 1) - positionFactor(x, slot) * (x.position === slot ? 1.1 : 1))[0];
        if (best) {
          used.add(best.id);
          next.push({ id: best.id, slot });
        }
      }
      side.onPitch = next;
    }
  }

  private aiDecisions(si: 0 | 1) {
    const side = this.sides[si];
    const m = this.minute;
    const diff = side.goals - this.sides[si === 0 ? 1 : 0].goals;
    if (m === 70 && diff < 0) side.attack = Math.max(side.attack, 70);
    if (m === 75 && diff > 0) side.attack = Math.min(side.attack, 35);
    if (m === 60 || m === 70 || m === 80) {
      const tired = side.onPitch
        .filter((x) => (this.energy[x.id] ?? 100) < 72)
        .sort((x, y) => (this.energy[x.id] ?? 0) - (this.energy[y.id] ?? 0));
      for (const t of tired.slice(0, 2)) {
        if (!this.canSub(side)) break;
        const sub = this.bestBench(side, t.slot);
        if (sub) this.substitute(si, t.id, sub);
      }
    }
  }

  /** Odohrá zápas do konca */
  runToEnd(clubNames?: [string, string]) {
    while (!this.finished) this.step(clubNames);
  }

  result(): MatchResult {
    const [h, a] = this.sides;
    const ratings: Record<string, number> = {};
    for (const id of this.appeared) {
      const mine = this.sideOf(id);
      const side = this.sides[mine];
      const opp = this.sides[mine === 0 ? 1 : 0];
      const res = side.goals > opp.goals ? 0.3 : side.goals < opp.goals ? -0.3 : 0;
      const r = 6 + res + (this.ratingAdj[id] ?? 0) + this.rng.normal(0, 0.35);
      ratings[id] = Math.round(Math.max(3, Math.min(10, r)) * 10) / 10;
    }
    return {
      homeGoals: h.goals,
      awayGoals: a.goals,
      goals: this.goalList,
      ratings,
      appeared: [...this.appeared],
      energy: { ...this.energy },
      yellows: this.yellows,
      reds: this.reds,
      injuries: this.injuries,
      assists: this.assistList,
      scorers: this.scorerList,
    };
  }

  sideOf(id: string): 0 | 1 {
    return this.sideMap[id] ?? 0;
  }

  /** Hráči, ktorí boli vylúčení */
  isSentOff(id: string): boolean {
    return this.sentOff.has(id);
  }

  hasAppeared(id: string): boolean {
    return this.appeared.has(id);
  }
}

/** Taktika pre počítačom riadený klub */
export function aiTactic(players: Player[], rng: Rng, strengthDiff: number): Tactic {
  const formation = bestFormation(players);
  const { lineup, bench } = autoLineup(players, formation);
  // Silnejší tím hrá útočnejšie
  const attack = Math.round(Math.max(25, Math.min(75, 50 + strengthDiff * 2.5 + rng.normal(0, 6))));
  const styles: Style[] = ['normal', 'normal', 'kratke', 'centre', 'nabehy'];
  const captain = [...lineup].sort((x, y) => {
    const px = players.find((p) => p.id === x)!;
    const py = players.find((p) => p.id === y)!;
    return py.careerMatches - px.careerMatches;
  })[0];
  return { formation, attack, style: rng.pick(styles), lineup, bench, captain: captain ?? null };
}

export function squadStrength(players: Player[]): number {
  const avail = players.filter(isAvailable);
  const { lineup } = autoLineup(avail, bestFormation(avail));
  const ps = lineup.map((id) => avail.find((p) => p.id === id)!);
  const slots = formationSlots(bestFormation(avail));
  if (!ps.length) return 0;
  return ps.reduce((s, p, i) => s + (slots[i] === 'B' ? p.bra * 0.6 + p.fyz * 0.2 + p.tech * 0.2 : 0.25 * (p.fyz + p.tech + p.obr + p.uto)), 0) / ps.length;
}
