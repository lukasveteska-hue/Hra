// Úprava zostavy a taktiky môjho klubu

import { squadOf } from '../engine/game';
import { ovr } from '../engine/ratings';
import { autoLineup, FORMATIONS, formationSlots, isAvailable, slotRating, STYLE_NAMES, validTactic } from '../engine/tactics';
import type { Player, Style, Tactic } from '../engine/types';
import { useGame } from './GameContext';
import { Attr, Pos, POS_LABEL } from './common';

export function TacticsEditor() {
  const { state, setState } = useGame();
  const squad = squadOf(state, state.manager.clubId);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const t = validTactic(state);
  const slots = formationSlots(t.formation);

  const update = (next: Partial<Tactic>) => setState({ ...state, tactic: { ...t, ...next } });

  const setFormation = (formation: string) => {
    // Hráči ostanú, kde sa dá, zvyšok sa doplní
    const auto = autoLineup(squad, formation);
    const newSlots = formationSlots(formation);
    const used = new Set<string>();
    const lineup = newSlots.map((slot) => {
      const keep = t.lineup.find((id) => !used.has(id) && byId.get(id)?.position === slot);
      if (keep) {
        used.add(keep);
        return keep;
      }
      return '';
    });
    for (let i = 0; i < lineup.length; i++) {
      if (lineup[i]) continue;
      const cand = [...t.lineup, ...auto.lineup, ...squad.map((p) => p.id)].find((id) => !used.has(id) && isAvailable(byId.get(id)!));
      if (cand) {
        lineup[i] = cand;
        used.add(cand);
      }
    }
    update({ formation, lineup, bench: t.bench.filter((id) => !used.has(id)) });
  };

  const setSlot = (i: number, id: string) => {
    const lineup = [...t.lineup];
    const old = lineup[i];
    const prev = lineup.indexOf(id);
    lineup[i] = id;
    if (prev >= 0) {
      // Výmena dvoch hráčov v zostave
      lineup[prev] = old;
      update({ lineup });
    } else {
      // Hráč z lavičky si vymení miesto s hráčom zo zostavy
      const bench = t.bench.includes(id) ? t.bench.map((b) => (b === id ? old : b)) : t.bench;
      update({ lineup, bench });
    }
  };

  const toggleBench = (id: string) => {
    if (t.bench.includes(id)) update({ bench: t.bench.filter((b) => b !== id) });
    else if (t.bench.length < 9) update({ bench: [...t.bench, id] });
  };

  const best = () => {
    const auto = autoLineup(squad, t.formation);
    update({ lineup: auto.lineup, bench: auto.bench });
  };

  const reserves = squad.filter((p) => !t.lineup.includes(p.id)).sort((a, b) => order(a) - order(b) || ovr(b) - ovr(a));

  return (
    <>
      <div className="panel">
        <div className="grid-3">
          <label className="field">
            <span>Formácia</span>
            <select value={t.formation} onChange={(e) => setFormation(e.target.value)}>
              {Object.keys(FORMATIONS).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Štýl hry</span>
            <select value={t.style} onChange={(e) => update({ style: e.target.value as Style })}>
              {Object.entries(STYLE_NAMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Kapitán</span>
            <select value={t.captain ?? ''} onChange={(e) => update({ captain: e.target.value })}>
              {t.lineup.map((id) => (
                <option key={id} value={id}>
                  {byId.get(id)?.lastName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <AttackSlider value={t.attack} onChange={(attack) => update({ attack })} />
        <button onClick={best}>Vybrať najlepšiu zostavu</button>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Základná zostava</h3>
          <div className="lineup">
            {slots.map((slot, i) => {
              const p = byId.get(t.lineup[i]);
              return (
                <div key={i} className="lineup-row">
                  <Pos p={slot} />
                  <select value={t.lineup[i] ?? ''} onChange={(e) => setSlot(i, e.target.value)}>
                    {squad
                      .slice()
                      .sort((a, b) => slotRating(b, slot) - slotRating(a, slot))
                      .map((c) => (
                        <option key={c.id} value={c.id} disabled={!isAvailable(c)}>
                          {optionLabel(c, slot)}
                        </option>
                      ))}
                  </select>
                  <span className="num" title="Hodnotenie na tomto mieste">
                    {p ? <Attr v={slotRating(p, slot)} /> : '–'}
                  </span>
                  <span className="num muted" title="Energia">
                    {p ? `${Math.round(p.energy)}%` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <h3>
            Lavička ({t.bench.length}/9)
          </h3>
          <div className="lineup">
            {reserves.map((p) => (
              <label key={p.id} className={`lineup-row bench-row${!isAvailable(p) ? ' muted' : ''}`}>
                <input
                  type="checkbox"
                  checked={t.bench.includes(p.id)}
                  disabled={!isAvailable(p) || (!t.bench.includes(p.id) && t.bench.length >= 9)}
                  onChange={() => toggleBench(p.id)}
                />
                <Pos p={p.position} />
                <span className="bench-name">
                  {p.lastName} {p.firstName.charAt(0)}.{!isAvailable(p) && (p.injuryDays > 0 ? ' 🩹' : ' 🟥')}
                </span>
                <span className="num">
                  <Attr v={ovr(p)} />
                </span>
                <span className="num muted">{Math.round(p.energy)}%</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const order = (p: Player) => ({ B: 0, O: 1, Z: 2, U: 3 })[p.position];

function optionLabel(p: Player, slot: Player['position']): string {
  const status = p.injuryDays > 0 ? ' – zranený' : p.suspension > 0 ? ' – trest' : '';
  const off = p.position !== slot ? ` (${POS_LABEL[p.position]})` : '';
  return `${p.lastName} ${p.firstName.charAt(0)}.${off} ${Math.round(slotRating(p, slot))} · ${Math.round(p.energy)}%${status}`;
}

export function AttackSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const label = value < 25 ? 'veľmi defenzívne' : value < 45 ? 'defenzívne' : value <= 55 ? 'vyvážene' : value <= 75 ? 'útočne' : 'veľmi útočne';
  return (
    <label className="field">
      <span>
        Útočnosť: {value} ({label})
      </span>
      <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
