// Tabuľka ligy

import type { GameState } from './types';

export interface TableRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  /** Skupina nadstavby (index) alebo -1 */
  group: number;
  /** Posledných 5 výsledkov: V/R/P */
  last: string[];
}

export function standings(state: GameState, leagueId: string): TableRow[] {
  const league = state.leagues[leagueId];
  const rows = new Map<string, TableRow>();
  for (const id of league.clubIds) {
    rows.set(id, { clubId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, group: -1, last: [] });
  }
  const groupOf = new Map<string, number>();
  for (const f of state.seasonData.fixtures) {
    if (f.leagueId !== leagueId) continue;
    if (f.phase.startsWith('s')) {
      const g = Number(f.phase.slice(1));
      groupOf.set(f.homeId, g);
      groupOf.set(f.awayId, g);
    }
    if (!f.played) continue;
    const h = rows.get(f.homeId)!;
    const a = rows.get(f.awayId)!;
    h.played++;
    a.played++;
    h.gf += f.homeGoals;
    h.ga += f.awayGoals;
    a.gf += f.awayGoals;
    a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) {
      h.won++;
      a.lost++;
      h.points += 3;
      h.last.push('V');
      a.last.push('P');
    } else if (f.homeGoals < f.awayGoals) {
      a.won++;
      h.lost++;
      a.points += 3;
      h.last.push('P');
      a.last.push('V');
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
      h.last.push('R');
      a.last.push('R');
    }
  }
  const list = [...rows.values()];
  for (const r of list) {
    r.group = groupOf.get(r.clubId) ?? -1;
    r.last = r.last.slice(-5);
  }
  const cmp = (x: TableRow, y: TableRow) =>
    y.points - x.points || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || state.clubs[x.clubId].shortName.localeCompare(state.clubs[y.clubId].shortName, 'sk');
  list.sort(cmp);

  // Po vytvorení nadstavby: skupiny podľa umiestnenia (1. skupina hore, tímy bez skupiny v strede, posledná dole)
  if (state.seasonData.splitDone[leagueId] && league.split?.length) {
    const order = (r: TableRow) => {
      if (r.group < 0) {
        // Tímy medzi skupinami
        return league.split!.findIndex((g) => g.from > 1) - 0.5;
      }
      return r.group;
    };
    list.sort((x, y) => order(x) - order(y) || cmp(x, y));
  }
  return list;
}
