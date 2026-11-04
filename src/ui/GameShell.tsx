// Hlavná obrazovka hry: horná lišta, navigácia a obsah

import { useState } from 'react';
import { advance, continueMode, myFixtureToday, type AdvanceMode } from '../engine/advance';
import { transferWindow } from '../engine/calendar';
import { leagueOf, seasonLabel } from '../engine/game';
import { useGame } from './GameContext';
import { ClubBadge, formatDate, money } from './common';
import { MatchScreen } from './MatchScreen';
import { ClubScreen } from './screens/Club';
import { LeagueScreen } from './screens/League';
import { Overview } from './screens/Overview';
import { FinanceScreen } from './screens/Finance';
import { SeasonReview } from './screens/SeasonReview';
import { NewSeasonScreen } from './screens/NewSeason';
import { TransfersScreen } from './screens/Transfers';
import { SaveScreen } from './screens/Save';
import { SquadScreen } from './screens/Squad';

export type Screen = 'overview' | 'squad' | 'transfers' | 'league' | 'finance' | 'save' | 'review' | 'newseason';

const NAV: Array<{ id: Screen; label: string; icon: string }> = [
  { id: 'overview', label: 'Prehľad', icon: '🏠' },
  { id: 'squad', label: 'Káder', icon: '👕' },
  { id: 'transfers', label: 'Prestupy', icon: '🔄' },
  { id: 'league', label: 'Súťaže', icon: '🏆' },
  { id: 'finance', label: 'Financie', icon: '💶' },
  { id: 'save', label: 'Hra', icon: '💾' },
];

export function GameShell() {
  const { state, setState } = useGame();
  const [screen, setScreen] = useState<Screen>('overview');
  const [clubView, setClubView] = useState<string | null>(null);
  const [inMatch, setInMatch] = useState(false);
  const club = state.clubs[state.manager.clubId];
  const league = leagueOf(state, club);
  const mode = continueMode(state);
  const window = transferWindow(state.date);
  const todayMatch = myFixtureToday(state);
  const offerCount = state.offers.filter((o) => o.status === 'nova').length;

  const go = (s: Screen) => {
    setClubView(null);
    setScreen(s);
    scrollTo(0, 0);
  };
  const openClub = (id: string) => {
    setClubView(id);
    scrollTo(0, 0);
  };
  const move = (m: AdvanceMode) => {
    setState(advance(state, m));
    scrollTo(0, 0);
  };

  let main: React.ReactNode;
  if (inMatch && todayMatch) {
    main = (
      <MatchScreen
        fixture={todayMatch}
        onDone={() => {
          setInMatch(false);
          go('overview');
        }}
      />
    );
  } else if (clubView) {
    main = <ClubScreen clubId={clubView} onBack={() => setClubView(null)} />;
  } else {
    main = (
      <>
        {screen === 'overview' && <Overview openClub={openClub} openReview={() => go('review')} />}
        {screen === 'squad' && <SquadScreen />}
        {screen === 'transfers' && <TransfersScreen />}
        {screen === 'league' && <LeagueScreen openClub={openClub} />}
        {screen === 'finance' && <FinanceScreen />}
        {screen === 'save' && <SaveScreen />}
        {screen === 'review' && <SeasonReview openClub={openClub} onContinue={() => go('newseason')} />}
        {screen === 'newseason' && <NewSeasonScreen onDone={() => go('overview')} />}
      </>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="club">
          <ClubBadge club={club} size={30} />
          <div style={{ minWidth: 0 }}>
            <div className="club-name">{club.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {league?.name} · {seasonLabel(state.season)}
            </div>
          </div>
        </div>
        <div className="info">
          <div>
            <span className="label">{window ? `Prestupové obdobie (${window})` : 'Dátum'}</span>
            {formatDate(state.date)}
          </div>
          <div>
            <span className="label">Účet</span>
            <span className={club.balance < 0 ? 'bad' : ''}>{money(club.balance)}</span>
          </div>
        </div>
        {!inMatch && (
          <div className="advance">
            {mode === 'match' && (
              <button className="primary" onClick={() => setInMatch(true)}>
                Na zápas ▶
              </button>
            )}
            {mode === 'window' && (
              <>
                <button onClick={() => move('week')} title="Posunúť o 7 dní (zastaví sa v deň zápasu)">
                  +7 dní
                </button>
                <button onClick={() => move('window')} title="Do konca prestupového obdobia (zastaví sa v deň zápasu)">
                  Do konca obdobia
                </button>
                <button className="primary" onClick={() => move('day')}>
                  Ďalší deň ▶
                </button>
              </>
            )}
            {mode === 'next' && (
              <button className="primary" onClick={() => move('match')}>
                Ďalší zápas ▶
              </button>
            )}
            {mode === 'over' && (
              <button className="primary" onClick={() => go('review')}>
                🏆 Vyhodnotenie sezóny
              </button>
            )}
          </div>
        )}
      </header>

      <div className="layout">
        <nav className="sidenav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={screen === n.id && !clubView && !inMatch ? 'active' : ''}
              onClick={() => {
                setInMatch(false);
                go(n.id);
              }}
            >
              <span className="icon">{n.icon}</span>
              <span>
                {n.label}
                {n.id === 'transfers' && offerCount > 0 ? ` (${offerCount})` : ''}
              </span>
            </button>
          ))}
        </nav>
        <main className="content">{main}</main>
      </div>
    </div>
  );
}
