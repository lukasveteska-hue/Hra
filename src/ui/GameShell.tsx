// Hlavná obrazovka hry: horná lišta, navigácia a obsah

import { useState } from 'react';
import { leagueOf, seasonLabel } from '../engine/game';
import { useGame } from './GameContext';
import { ClubBadge, formatDate, money } from './common';
import { Overview } from './screens/Overview';
import { SquadScreen } from './screens/Squad';
import { LeagueScreen } from './screens/League';
import { PlayersScreen } from './screens/Players';
import { SaveScreen } from './screens/Save';
import { ClubScreen } from './screens/Club';

export type Screen = 'overview' | 'squad' | 'league' | 'players' | 'save';

const NAV: Array<{ id: Screen; label: string; icon: string }> = [
  { id: 'overview', label: 'Prehľad', icon: '🏠' },
  { id: 'squad', label: 'Káder', icon: '👕' },
  { id: 'league', label: 'Súťaže', icon: '🏆' },
  { id: 'players', label: 'Hráči', icon: '🔍' },
  { id: 'save', label: 'Hra', icon: '💾' },
];

export function GameShell() {
  const { state } = useGame();
  const [screen, setScreen] = useState<Screen>('overview');
  const [clubView, setClubView] = useState<string | null>(null);
  const club = state.clubs[state.manager.clubId];
  const league = leagueOf(state, club);

  const go = (s: Screen) => {
    setClubView(null);
    setScreen(s);
    window.scrollTo(0, 0);
  };
  const openClub = (id: string) => {
    setClubView(id);
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="club">
          <ClubBadge colors={club.colors} abbr={club.abbr} size={30} />
          <div style={{ minWidth: 0 }}>
            <div className="club-name">{club.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {league?.name} · {seasonLabel(state.season)}
            </div>
          </div>
        </div>
        <div className="info">
          <div>
            <span className="label">Dátum</span>
            {formatDate(state.date)}
          </div>
          <div>
            <span className="label">Účet</span>
            <span className={club.balance < 0 ? 'bad' : ''}>{money(club.balance)}</span>
          </div>
          <button className="primary" disabled title="Plynutie času príde v ďalšej fáze">
            Pokračovať ▶
          </button>
        </div>
      </header>

      <div className="layout">
        <nav className="sidenav">
          {NAV.map((n) => (
            <button key={n.id} className={screen === n.id && !clubView ? 'active' : ''} onClick={() => go(n.id)}>
              <span className="icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <main className="content">
          {clubView ? (
            <ClubScreen clubId={clubView} onBack={() => setClubView(null)} />
          ) : (
            <>
              {screen === 'overview' && <Overview openClub={openClub} />}
              {screen === 'squad' && <SquadScreen />}
              {screen === 'league' && <LeagueScreen openClub={openClub} />}
              {screen === 'players' && <PlayersScreen />}
              {screen === 'save' && <SaveScreen />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
