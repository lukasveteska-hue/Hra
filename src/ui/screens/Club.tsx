import { useState } from 'react';
import { leagueOf, squadOf, wageBill } from '../../engine/game';
import { marketValue } from '../../engine/ratings';
import type { Player } from '../../engine/types';
import { useGame } from '../GameContext';
import { ClubBadge, money } from '../common';
import { PlayerDetail, PlayerTable } from '../players';

export function ClubScreen({ clubId, onBack }: { clubId: string; onBack: () => void }) {
  const { state } = useGame();
  const [selected, setSelected] = useState<Player | null>(null);
  const club = state.clubs[clubId];
  const squad = squadOf(state, clubId);
  const value = squad.reduce((s, p) => s + marketValue(p, state.date, state.season), 0);

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button onClick={onBack}>← Späť</button>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <ClubBadge colors={club.colors} abbr={club.abbr} size={44} />
        <div>
          <h1 style={{ margin: 0 }}>{club.name}</h1>
          <div className="muted">
            {leagueOf(state, club)?.name} · {club.city} · {club.stadium} ({club.capacity.toLocaleString('sk-SK')})
          </div>
        </div>
      </div>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="label">Hodnota kádra</div>
          <div className="value">{money(value)}</div>
        </div>
        <div className="stat">
          <div className="label">Platy za mesiac</div>
          <div className="value">{money(wageBill(state, clubId))}</div>
        </div>
        <div className="stat">
          <div className="label">Účet</div>
          <div className="value">{money(club.balance)}</div>
        </div>
      </div>
      <PlayerTable players={squad} onSelect={setSelected} />
      {selected && <PlayerDetail player={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
