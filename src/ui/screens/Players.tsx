import { useMemo, useState } from 'react';
import { ageOn, marketValue, ovr } from '../../engine/ratings';
import type { Player, Position } from '../../engine/types';
import { useGame } from '../GameContext';
import { PlayerDetail, PlayerTable } from '../players';

const LIMIT = 200;

export function PlayersScreen({ preset = 'all' }: { preset?: 'all' | 'listed' | 'free' }) {
  const { state } = useGame();
  const [selected, setSelected] = useState<Player | null>(null);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<Position | ''>('');
  const [league, setLeague] = useState('');
  const [maxAge, setMaxAge] = useState(40);
  const [minOvr, setMinOvr] = useState(0);
  const [minPot, setMinPot] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return Object.values(state.players)
      .filter((p) => {
        if (p.clubId === state.manager.clubId || p.abroad) return false;
        if (preset === 'listed' && !p.listed) return false;
        if (preset === 'free' && p.clubId) return false;
        if (pos && p.position !== pos) return false;
        if (league && (p.clubId ? state.clubs[p.clubId].leagueId : null) !== league) return false;
        if (ageOn(p.birthDate, state.date) > maxAge) return false;
        if (ovr(p) < minOvr) return false;
        if (p.potential < minPot) return false;
        if (maxPrice && marketValue(p, state.date, state.season) > maxPrice) return false;
        if (needle && !`${p.firstName} ${p.lastName}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => ovr(b) - ovr(a))
      .slice(0, LIMIT);
  }, [state, q, pos, league, maxAge, minOvr, minPot, maxPrice, preset]);

  return (
    <>
      <div className="panel">
        <div className="grid-3">
          <label className="field">
            <span>Meno</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať…" />
          </label>
          <label className="field">
            <span>Pozícia</span>
            <select value={pos} onChange={(e) => setPos(e.target.value as Position | '')}>
              <option value="">Všetky</option>
              <option value="B">Brankár</option>
              <option value="O">Obranca</option>
              <option value="Z">Záložník</option>
              <option value="U">Útočník</option>
            </select>
          </label>
          <label className="field">
            <span>Liga</span>
            <select value={league} onChange={(e) => setLeague(e.target.value)}>
              <option value="">Všetky</option>
              {Object.values(state.leagues).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Max. vek: {maxAge}</span>
            <input type="range" min={16} max={40} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Min. celkové: {minOvr}</span>
            <input type="range" min={0} max={90} value={minOvr} onChange={(e) => setMinOvr(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Min. potenciál: {minPot}</span>
            <input type="range" min={0} max={95} value={minPot} onChange={(e) => setMinPot(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Max. cena</span>
            <select value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}>
              <option value={0}>Bez limitu</option>
              {[100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000].map((v) => (
                <option key={v} value={v}>
                  do {v.toLocaleString('sk-SK')} €
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="muted">
          Nájdených {results.length}
          {results.length === LIMIT ? '+ (zobrazených prvých 200)' : ''} hráčov
        </div>
      </div>
      <PlayerTable players={results} showClub onSelect={setSelected} />
      {selected && <PlayerDetail player={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
