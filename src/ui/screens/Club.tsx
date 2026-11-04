import { useState } from 'react';
import { leagueOf, squadOf, staffOf, wageBill } from '../../engine/game';
import { STAFF_ROLES } from '../../engine/database';
import { ageOn } from '../../engine/ratings';
import { marketValue } from '../../engine/ratings';
import type { Player } from '../../engine/types';
import { useGame } from '../GameContext';
import { Attr, ClubBadge, Flag, money } from '../common';
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
        <ClubBadge club={club} size={44} />
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
      <StaffList clubId={clubId} />
      {selected && <PlayerDetail player={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

export function StaffList({ clubId }: { clubId: string }) {
  const { state } = useGame();
  const staff = staffOf(state, clubId);
  const isMine = clubId === state.manager.clubId;
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h3>Realizačný tím</h3>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Funkcia</th>
              <th>Meno</th>
              <th>Nár</th>
              <th className="num">Vek</th>
              <th className="num">Kvalita</th>
            </tr>
          </thead>
          <tbody>
            {isMine && (
              <tr className="highlight">
                <td>{STAFF_ROLES.trener}</td>
                <td>{state.manager.name} (ty)</td>
                <td>
                  <Flag code={state.manager.nationality} />
                </td>
                <td className="num">{state.manager.age}</td>
                <td className="num muted">–</td>
              </tr>
            )}
            {staff.map((s) => (
              <tr key={s.id}>
                <td>{STAFF_ROLES[s.role]}</td>
                <td>
                  {s.firstName} {s.lastName}
                </td>
                <td>
                  <Flag code={s.nationality} />
                </td>
                <td className="num">{ageOn(s.birthDate, state.date)}</td>
                <td className="num">
                  <Attr v={s.quality} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
