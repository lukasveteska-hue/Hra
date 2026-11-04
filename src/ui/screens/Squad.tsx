import { useState } from 'react';
import { squadOf } from '../../engine/game';
import type { Player } from '../../engine/types';
import { useGame } from '../GameContext';
import { PlayerDetail, PlayerTable } from '../players';
import { TacticsEditor } from '../TacticsEditor';
import { StaffList } from './Club';

export function SquadScreen() {
  const { state } = useGame();
  const [selected, setSelected] = useState<Player | null>(null);
  const [tab, setTab] = useState<'players' | 'tactic'>('players');
  const squad = squadOf(state, state.manager.clubId);

  return (
    <>
      <h1>Káder</h1>
      <div className="tabs">
        <button className={tab === 'players' ? 'active' : ''} onClick={() => setTab('players')}>
          Hráči
        </button>
        <button className={tab === 'tactic' ? 'active' : ''} onClick={() => setTab('tactic')}>
          Zostava a taktika
        </button>
      </div>
      {tab === 'players' ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            Kliknutím na hlavičku stĺpca zoradíš tabuľku, kliknutím na hráča otvoríš detail.
          </p>
          <PlayerTable players={squad} onSelect={setSelected} />
          <StaffList clubId={state.manager.clubId} />
        </>
      ) : (
        <TacticsEditor />
      )}
      {selected && <PlayerDetail player={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
