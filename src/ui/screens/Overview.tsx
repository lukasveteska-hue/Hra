import { leagueOf, squadOf, wageBill } from '../../engine/game';
import { marketValue, ovr } from '../../engine/ratings';
import { countryName } from '../../data/countries';
import { useGame } from '../GameContext';
import { formatDate, money, Flag, ClubBadge } from '../common';
import { isMine } from '../../engine/advance';
import { standings } from '../../engine/standings';
import { formatDateShort } from '../dates';
import { FixtureList } from './League';

export function Overview({ openClub, openReview }: { openClub: (id: string) => void; openReview: () => void }) {
  const { state } = useGame();
  const club = state.clubs[state.manager.clubId];
  const squad = squadOf(state, club.id);
  const league = leagueOf(state, club);
  const top11 = squad.map(ovr).sort((a, b) => b - a).slice(0, 11);
  const avg = top11.reduce((a, b) => a + b, 0) / Math.max(1, top11.length);
  const value = squad.reduce((s, p) => s + marketValue(p, state.date, state.season), 0);
  const leagueRank = league ? standings(state, league.id).findIndex((r) => r.clubId === club.id) + 1 : null;
  const myFixtures = state.seasonData.fixtures.filter((f) => isMine(state, f));
  const next = myFixtures.find((f) => !f.played);
  const recent = myFixtures.filter((f) => f.played).slice(-3);
  const upcoming = myFixtures.filter((f) => !f.played).slice(0, 5);

  return (
    <>
      <h1>Prehľad</h1>
      <div className="grid-3">
        <div className="stat">
          <div className="label">Priemer základnej zostavy</div>
          <div className="value">{avg.toFixed(1)}</div>
        </div>
        <div className="stat">
          <div className="label">Hodnota kádra</div>
          <div className="value">{money(value)}</div>
        </div>
        <div className="stat">
          <div className="label">Platy za mesiac</div>
          <div className="value">{money(wageBill(state, club.id))}</div>
        </div>
      </div>

      {!next && state.seasonData.fixtures.every((f) => f.played) && (
        <div className="hero" style={{ marginTop: 16 }}>
          <div className="trophy">🏆</div>
          <div className="big">Sezóna sa skončila</div>
          <button className="primary" onClick={openReview} style={{ marginTop: 10 }}>
            Zobraziť vyhodnotenie sezóny
          </button>
        </div>
      )}
      {state.offers.some((o) => o.status === 'nova') && (
        <div className="panel" style={{ marginTop: 16, borderColor: 'var(--accent)' }}>
          <strong className="mid">Máš nové ponuky na hráčov</strong> – pozri sa do časti Prestupy.
        </div>
      )}
      {next && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Najbližší zápas</h3>
          <div className="row">
            <span className="club-cell">
              <ClubBadge club={state.clubs[next.homeId]} size={26} />
              <strong>{state.clubs[next.homeId].shortName}</strong>
            </span>
            <span className="muted">–</span>
            <span className="club-cell">
              <ClubBadge club={state.clubs[next.awayId]} size={26} />
              <strong>{state.clubs[next.awayId].shortName}</strong>
            </span>
            <div className="spacer" />
            <span className="muted">
              {formatDateShort(next.date)} {next.date.slice(0, 4)} · {next.round}. kolo
              {next.date === state.date ? ' · DNES' : ''}
            </span>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="panel">
          <h3>Posledné výsledky</h3>
          {recent.length ? <FixtureList fixtures={recent} showDate /> : <div className="muted">Sezóna ešte nezačala.</div>}
        </div>
        <div className="panel">
          <h3>Program</h3>
          {upcoming.length ? <FixtureList fixtures={upcoming} showDate /> : <div className="muted">Žiadne ďalšie zápasy.</div>}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Klub</h3>
          <dl className="kv">
            <dt>Názov</dt>
            <dd>
              <button className="link" onClick={() => openClub(club.id)}>
                {club.name}
              </button>
            </dd>
            <dt>Mesto</dt>
            <dd>{club.city}</dd>
            <dt>Štadión</dt>
            <dd>
              {club.stadium} ({club.capacity.toLocaleString('sk-SK')} miest)
            </dd>
            <dt>Liga</dt>
            <dd>{league?.name}</dd>
            <dt>Miesto v tabuľke</dt>
            <dd>
              {leagueRank}. z {league?.clubIds.length}
            </dd>
            <dt>Hráčov v kádri</dt>
            <dd>{squad.length}</dd>
          </dl>
        </div>
        <div className="panel">
          <h3>Tréner</h3>
          <dl className="kv">
            <dt>Meno</dt>
            <dd>{state.manager.name}</dd>
            <dt>Národnosť</dt>
            <dd>
              <Flag code={state.manager.nationality} showCode={false} /> {countryName(state.manager.nationality)}
            </dd>
            <dt>Vek</dt>
            <dd>{state.manager.age} rokov</dd>
          </dl>
        </div>
      </div>

      <div className="panel">
        <h3>Správy</h3>
        <ul className="news-list">
          {state.news
            .slice()
            .reverse()
            .slice(0, 15)
            .map((n, i) => (
              <li key={i}>
                <span className="date">{formatDate(n.date)}</span>
                {n.text}
              </li>
            ))}
        </ul>
      </div>
    </>
  );
}
