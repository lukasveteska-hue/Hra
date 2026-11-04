import { leagueOf, squadOf, wageBill } from '../../engine/game';
import { marketValue, ovr } from '../../engine/ratings';
import { countryName } from '../../data/countries';
import { useGame } from '../GameContext';
import { formatDate, money, Flag } from '../common';

export function Overview({ openClub }: { openClub: (id: string) => void }) {
  const { state } = useGame();
  const club = state.clubs[state.manager.clubId];
  const squad = squadOf(state, club.id);
  const league = leagueOf(state, club);
  const top11 = squad.map(ovr).sort((a, b) => b - a).slice(0, 11);
  const avg = top11.reduce((a, b) => a + b, 0) / Math.max(1, top11.length);
  const value = squad.reduce((s, p) => s + marketValue(p, state.date, state.season), 0);
  const leagueRank = league
    ? [...league.clubIds]
        .sort((a, b) => state.clubs[b].reputation - state.clubs[a].reputation)
        .indexOf(club.id) + 1
    : null;

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

      <div className="grid-2" style={{ marginTop: 16 }}>
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
            <dt>Sila v lige</dt>
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
