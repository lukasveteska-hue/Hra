// Úprava zostavy a taktiky môjho klubu

import { useState } from 'react';
import { squadOf } from '../engine/game';
import { ovr } from '../engine/ratings';
import { autoLineup, FORMATIONS, formationSlots, isAvailable, slotRating, STYLE_NAMES, validTactic } from '../engine/tactics';
import type { Player, Position, Style, Tactic } from '../engine/types';
import { useGame } from './GameContext';
import { Attr, FormArrow, Modal, Pos, POS_LABEL, POS_NAME } from './common';

export function TacticsEditor() {
  const { state, setState } = useGame();
  const squad = squadOf(state, state.manager.clubId);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const t = validTactic(state);
  const slots = formationSlots(t.formation);
  const [picking, setPicking] = useState<number | null>(null);

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
                  <button className="slot-btn" onClick={() => setPicking(i)} title="Vymeniť hráča na tomto mieste">
                    {p ? (
                      <>
                        <span className="slot-name">
                          {p.lastName} {p.firstName.charAt(0)}.
                        </span>
                        {p.position !== slot && <span className="mid"> ({POS_LABEL[p.position]})</span>}
                        {!isAvailable(p) && <span> {p.injuryDays > 0 ? '🩹' : '🟥'}</span>}
                      </>
                    ) : (
                      <span className="muted">vybrať hráča…</span>
                    )}
                    <span className="slot-chev">▾</span>
                  </button>
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
      {picking !== null && (
        <PlayerPicker
          slot={slots[picking]}
          slotIndex={picking}
          lineup={t.lineup}
          bench={t.bench}
          slots={slots}
          squad={squad}
          onPick={(id) => {
            setSlot(picking, id);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  );
}

/** Okno na výber hráča na miesto v zostave: lavička, mimo zostavy, už v zostave (výmena) */
function PlayerPicker({
  slot,
  slotIndex,
  lineup,
  bench,
  slots,
  squad,
  onPick,
  onClose,
}: {
  slot: Position;
  slotIndex: number;
  lineup: string[];
  bench: string[];
  slots: Position[];
  squad: Player[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const current = squad.find((p) => p.id === lineup[slotIndex]);
  // Najprv hráči z rovnakej pozície, potom podľa hodnotenia na tomto mieste
  const sort = (list: Player[]) =>
    [...list].sort((a, b) => Number(b.position === slot) - Number(a.position === slot) || slotRating(b, slot) - slotRating(a, slot));
  const onBench = sort(squad.filter((p) => bench.includes(p.id) && !lineup.includes(p.id)));
  const outside = sort(squad.filter((p) => !bench.includes(p.id) && !lineup.includes(p.id)));
  const inLineup = sort(squad.filter((p) => lineup.includes(p.id) && p.id !== current?.id));

  const Row = ({ p, note }: { p: Player; note?: string }) => {
    const avail = isAvailable(p);
    return (
      <button className={`pick-row${p.position === slot ? ' same' : ''}`} disabled={!avail} onClick={() => onPick(p.id)}>
        <Pos p={p.position} />
        <span className="pick-name">
          {p.lastName} {p.firstName.charAt(0)}.
          {!avail && <span className="bad"> {p.injuryDays > 0 ? `🩹 zranený (${p.injuryDays} d.)` : `🟥 trest (${p.suspension} z.)`}</span>}
          {note && <span className="muted"> · {note}</span>}
        </span>
        <span className="num" title="Hodnotenie na tomto mieste">
          <Attr v={slotRating(p, slot)} />
        </span>
        <span className="num muted" title="Energia">
          {Math.round(p.energy)}%
        </span>
        <FormArrow form={p.form} />
      </button>
    );
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <Pos p={slot} />
        <div>
          <h2 style={{ margin: 0 }}>Hráč na pozíciu: {POS_NAME[slot].toLowerCase()}</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Teraz tu hrá: {current ? `${current.firstName} ${current.lastName} (${POS_NAME[current.position].toLowerCase()})` : 'nikto'}
          </div>
        </div>
        <div className="spacer" />
        <button onClick={onClose} aria-label="Zavrieť">
          ✕
        </button>
      </div>
      <div className="pick-head muted">
        <span />
        <span>Hráč</span>
        <span className="num">Na mieste</span>
        <span className="num">Energ.</span>
        <span>Forma</span>
      </div>
      <h3>Lavička</h3>
      {onBench.length ? onBench.map((p) => <Row key={p.id} p={p} />) : <p className="muted">Nikto.</p>}
      <h3 style={{ marginTop: 14 }}>Mimo zostavy</h3>
      {outside.length ? outside.map((p) => <Row key={p.id} p={p} />) : <p className="muted">Nikto.</p>}
      <h3 style={{ marginTop: 14 }}>Už v zostave – výmena miest</h3>
      <p className="muted" style={{ marginTop: -6, fontSize: 12 }}>
        Hráč sa presunie sem a {current ? current.lastName : 'tento hráč'} prejde na jeho miesto.
      </p>
      {inLineup.map((p) => (
        <Row key={p.id} p={p} note={`hrá ako ${POS_NAME[slots[lineup.indexOf(p.id)]].toLowerCase()}`} />
      ))}
    </Modal>
  );
}

const order = (p: Player) => ({ B: 0, O: 1, Z: 2, U: 3 })[p.position];

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
