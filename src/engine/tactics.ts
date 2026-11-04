// Formácie, výber zostavy a výkonnosť hráča v zápase

import { ageOn, ovrAt } from './ratings';
import type { GameState, Player, Position, Style, Tactic } from './types';

/** Formácia → počet obrancov, záložníkov, útočníkov */
export const FORMATIONS: Record<string, [number, number, number]> = {
  '4-4-2': [4, 4, 2],
  '4-3-3': [4, 3, 3],
  '4-5-1': [4, 5, 1],
  '4-2-3-1': [4, 5, 1],
  '3-5-2': [3, 5, 2],
  '3-4-3': [3, 4, 3],
  '5-3-2': [5, 3, 2],
  '5-4-1': [5, 4, 1],
};

export const STYLE_NAMES: Record<Style, string> = {
  normal: 'Normálny',
  kratke: 'Krátke prihrávky',
  centre: 'Centre',
  nabehy: 'Nábehy',
};

/** Pozície slotov formácie (1 brankár + hráči v poli) */
export function formationSlots(formation: string): Position[] {
  const [o, z, u] = FORMATIONS[formation] ?? FORMATIONS['4-4-2'];
  return ['B', ...Array(o).fill('O'), ...Array(z).fill('Z'), ...Array(u).fill('U')];
}

export function isAvailable(p: Player): boolean {
  return p.injuryDays <= 0 && p.suspension <= 0;
}

/** Násobok výkonu podľa energie, formy, morálky a skúseností */
export function conditionFactor(p: Player): number {
  const energy = 0.72 + 0.28 * (p.energy / 100);
  const form = 0.94 + (p.form / 20) * 0.12;
  const morale = 0.97 + (p.morale / 100) * 0.06;
  // Skrytý bonus za odohrané zápasy v kariére
  const experience = 1 + Math.min(0.03, (p.careerMatches / 400) * 0.03);
  return energy * form * morale * experience;
}

/** Postih za hru mimo pozície */
export function positionFactor(p: Player, slot: Position): number {
  if (p.position === slot) return 1;
  if (slot === 'B') return 0.35;
  if (p.position === 'B') return 0.4;
  // Susedné pozície (O–Z, Z–U) menší postih
  const adjacent = p.position === 'Z' || slot === 'Z';
  return adjacent ? 0.85 : 0.72;
}

/** Hodnotenie hráča na danom mieste (bez kondície) */
export function slotRating(p: Player, slot: Position): number {
  return ovrAt(p, slot) * positionFactor(p, slot);
}

/** Automatický výber najlepšej zostavy pre formáciu */
export function autoLineup(players: Player[], formation: string): { lineup: string[]; bench: string[] } {
  const avail = players.filter(isAvailable);
  const used = new Set<string>();
  const slots = formationSlots(formation);
  const lineup: string[] = [];
  for (const slot of slots) {
    let best: Player | null = null;
    let bestScore = -1;
    for (const p of avail) {
      if (used.has(p.id)) continue;
      const score = slotRating(p, slot) * (0.6 + 0.4 * (p.energy / 100));
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (best) {
      used.add(best.id);
      lineup.push(best.id);
    }
  }
  // Lavička: náhradný brankár + najlepší ostatní
  const rest = avail.filter((p) => !used.has(p.id)).sort((a, b) => slotRating(b, b.position) - slotRating(a, a.position));
  const bench: string[] = [];
  const gk = rest.find((p) => p.position === 'B');
  if (gk) bench.push(gk.id);
  for (const p of rest) {
    if (bench.length >= 9) break;
    if (!bench.includes(p.id)) bench.push(p.id);
  }
  return { lineup, bench };
}

/** Formácia, ktorá najlepšie sedí kádru (pre počítačom riadené kluby) */
export function bestFormation(players: Player[]): string {
  const avail = players.filter(isAvailable);
  const count = (pos: Position) => avail.filter((p) => p.position === pos).length;
  const [o, z, u] = [count('O'), count('Z'), count('U')];
  if (u >= 3 && z >= 4) return '4-3-3';
  if (o >= 5 && u < 2) return '5-4-1';
  if (u < 2) return '4-5-1';
  return z >= 5 && o >= 4 ? '4-4-2' : o >= 5 ? '5-3-2' : '4-4-2';
}

export function defaultTactic(players: Player[]): Tactic {
  const formation = bestFormation(players);
  const { lineup, bench } = autoLineup(players, formation);
  const captain = [...lineup].sort((a, b) => {
    const pa = players.find((p) => p.id === a)!;
    const pb = players.find((p) => p.id === b)!;
    return pb.careerMatches - pa.careerMatches;
  })[0] ?? null;
  return { formation, attack: 50, style: 'normal', lineup, bench, captain };
}

/** Zostava môjho klubu – ak niekto chýba (zranenie, trest, prestup), doplní sa */
export function validTactic(state: GameState): Tactic {
  const squad = Object.values(state.players).filter((p) => p.clubId === state.manager.clubId);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const t = state.tactic;
  const slots = formationSlots(t.formation);
  const lineup = t.lineup.filter((id) => byId.has(id) && isAvailable(byId.get(id)!)).slice(0, slots.length);
  const ok = lineup.length === slots.length && t.lineup.length === slots.length && lineup.every((id, i) => id === t.lineup[i]);
  if (ok) {
    const bench = t.bench.filter((id) => byId.has(id) && isAvailable(byId.get(id)!) && !lineup.includes(id)).slice(0, 9);
    return { ...t, bench, captain: t.captain && lineup.includes(t.captain) ? t.captain : lineup[0] };
  }
  // Doplnenie chýbajúcich miest
  const auto = autoLineup(squad, t.formation);
  const final = slots.map((_, i) => {
    const id = t.lineup[i];
    return id && byId.has(id) && isAvailable(byId.get(id)!) ? id : null;
  });
  const used = new Set(final.filter(Boolean) as string[]);
  for (let i = 0; i < final.length; i++) {
    if (final[i]) continue;
    const slot = slots[i];
    const cand = squad
      .filter((p) => isAvailable(p) && !used.has(p.id))
      .sort((a, b) => slotRating(b, slot) - slotRating(a, slot))[0];
    if (cand) {
      final[i] = cand.id;
      used.add(cand.id);
    }
  }
  const lu = final.filter(Boolean) as string[];
  const bench = [...t.bench, ...auto.bench].filter((id, i, arr) => arr.indexOf(id) === i && byId.has(id) && isAvailable(byId.get(id)!) && !used.has(id)).slice(0, 9);
  return { ...t, lineup: lu, bench, captain: t.captain && used.has(t.captain) ? t.captain : lu[0] ?? null };
}

export function playerAge(state: GameState, p: Player): number {
  return ageOn(p.birthDate, state.date);
}
