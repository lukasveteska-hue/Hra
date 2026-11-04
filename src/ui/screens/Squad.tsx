import { useState } from 'react';
import { squadOf } from '../../engine/game';
import type { Player } from '../../engine/types';
import { useGame } from '../GameContext';
import { PlayerDetail, PlayerTable } from '../players';
import { StaffList } from './Club';

export function SquadScreen() {
  const { state } = useGame();
  const [selected, setSelected] = useState<Player | null>(null);
  const squad = squadOf(state, state.manager.clubId);

  return (
    <>
      <h1>Káder</h1>
      <p className="muted" style={{ marginTop: -6 }}>
        Kliknutím na hlavičku stĺpca zoradíš tabuľku, kliknutím na hráča otvoríš detail.
      </p>
      <PlayerTable players={squad} onSelect={setSelected} />
      <StaffList clubId={state.manager.clubId} />
      {selected && <PlayerDetail player={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
