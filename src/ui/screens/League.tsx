import { useState } from 'react';
import { squadOf } from '../../engine/game';
import { ovr } from '../../engine/ratings';
import type { Club } from '../../engine/types';
import { useGame } from '../GameContext';
import { ClubBadge, DataTable, money, type Column } from '../common';

export function LeagueScreen({ openClub }: { openClub: (id: string) => void }) {
  const { state } = useGame();
  const myLeague = state.clubs[state.manager.clubId].leagueId ?? 'CZ1';
  const [leagueId, setLeagueId] = useState(myLeague);
  const league = state.leagues[leagueId];
  // Pred začiatkom sezóny zoradené podľa abecedy
  const clubs = league.clubIds.map((id) => state.clubs[id]).sort((a, b) => a.shortName.localeCompare(b.shortName, 'sk'));

  const strength = (c: Club) => {
    const s = squadOf(state, c.id).map(ovr).sort((a, b) => b - a).slice(0, 11);
    return s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
  };

  const columns: Column<Club>[] = [
    { key: 'rank', label: '#', className: 'num', render: (c) => clubs.indexOf(c) + 1 },
    {
      key: 'name',
      label: 'Klub',
      sticky: true,
      render: (c) => (
        <button className="link club-cell" onClick={() => openClub(c.id)}>
          <ClubBadge club={c} size={18} />
          {c.shortName}
        </button>
      ),
      sort: (c) => c.shortName,
    },
    { key: 'z', label: 'Z', title: 'Zápasy', className: 'num', render: () => 0 },
    { key: 'v', label: 'V', title: 'Výhry', className: 'num', render: () => 0 },
    { key: 'r', label: 'R', title: 'Remízy', className: 'num', render: () => 0 },
    { key: 'p', label: 'P', title: 'Prehry', className: 'num', render: () => 0 },
    { key: 'sk', label: 'Skóre', className: 'num', render: () => '0:0' },
    { key: 'b', label: 'B', title: 'Body', className: 'num', render: () => <strong>0</strong> },
    { key: 'str', label: 'Sila', title: 'Priemer základnej zostavy', className: 'num', render: (c) => strength(c).toFixed(1), sort: strength, desc: true },
    { key: 'cap', label: 'Štadión', className: 'num', render: (c) => c.capacity.toLocaleString('sk-SK'), sort: (c) => c.capacity, desc: true },
    { key: 'bal', label: 'Účet', className: 'num', render: (c) => money(c.balance), sort: (c) => c.balance, desc: true },
  ];

  return (
    <>
      <h1>Súťaže</h1>
      <div className="tabs">
        {Object.values(state.leagues).map((l) => (
          <button key={l.id} className={l.id === leagueId ? 'active' : ''} onClick={() => setLeagueId(l.id)}>
            {l.country === 'CZ' ? '🇨🇿' : '🇸🇰'} {l.name}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Sezóna ešte nezačala. Zápasy a tabuľka pribudnú v ďalšej fáze.
      </p>
      <DataTable
        rows={clubs}
        columns={columns}
        rowKey={(c) => c.id}
        rowClass={(c) => (c.id === state.manager.clubId ? 'highlight' : undefined)}
      />
    </>
  );
}
