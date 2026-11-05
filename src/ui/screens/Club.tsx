import { useState } from 'react';
import { leagueOf, squadOf, staffOf, wageBill } from '../../engine/game';
import { STAFF_ROLES } from '../../engine/database';
import { ageOn, ovr } from '../../engine/ratings';
import { standings } from '../../engine/standings';
import { countryName } from '../../data/countries';
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
  const league = leagueOf(state, club);
  const pos = league ? standings(state, league.id).findIndex((r) => r.clubId === clubId) + 1 : 0;
  const listed = squad.filter((p) => p.listed).length;
  const mine = clubId === state.manager.clubId;
  const avg = squad.map(ovr).sort((a, b) => b - a).slice(0, 11).reduce((a, b, _i, arr) => a + b / arr.length, 0);

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
            {league ? (
              <>
                {league.name} · {pos}. miesto{club.city ? ` · ${club.city}` : ''}
                {club.stadium ? ` · ${club.stadium} (${club.capacity.toLocaleString('sk-SK')})` : ''}
              </>
            ) : (
              <>
                <Flag code={club.country} showCode={false} /> {countryName(club.country)} · zahraničný klub
              </>
            )}
          </div>
        </div>
      </div>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="label">Sila klubu · priemer zostavy</div>
          <div className="value">
            {Math.round(club.reputation)} · {avg.toFixed(1)}
          </div>
        </div>
        <div className="stat">
          <div className="label">Hráčov · na predaj</div>
          <div className="value">
            {squad.length} · {listed}
          </div>
        </div>
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
      {!mine && (
        <p className="muted" style={{ marginTop: 0 }}>
          Klikni na hráča – v jeho detaile môžeš podať ponuku na kúpu. Hráči s 💲 sú na predaj.
        </p>
      )}
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
