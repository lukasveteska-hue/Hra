import { useMemo, useState } from 'react';
import { formatDateShort } from '../dates';
import { standings, type TableRow } from '../../engine/standings';
import type { Fixture } from '../../engine/types';
import { useGame } from '../GameContext';
import { playoffName } from '../../engine/playoffs';
import { RATING_ICON, RATING_NAMES } from '../../engine/newSeason';
import { seasonLabel } from '../../engine/game';
import { LineChart, SERIES } from '../charts';
import { money } from '../common';
import { ClubBadge, Flag } from '../common';

type Tab = 'table' | 'rounds' | 'scorers' | 'playoff' | 'history';

export function LeagueScreen({ openClub }: { openClub: (id: string) => void }) {
  const { state } = useGame();
  const myLeague = state.clubs[state.manager.clubId].leagueId ?? 'CZ1';
  const [leagueId, setLeagueId] = useState(myLeague);
  const [tab, setTab] = useState<Tab>('table');
  const poId = `PO-${state.leagues[leagueId].country}`;
  const playoff = state.seasonData.fixtures.filter((f) => f.leagueId === poId);

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
      <div className="tabs">
        <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>
          Tabuľka
        </button>
        <button className={tab === 'rounds' ? 'active' : ''} onClick={() => setTab('rounds')}>
          Zápasy
        </button>
        <button className={tab === 'scorers' ? 'active' : ''} onClick={() => setTab('scorers')}>
          Strelci
        </button>
        {playoff.length > 0 && (
          <button className={tab === 'playoff' ? 'active' : ''} onClick={() => setTab('playoff')}>
            Baráž
          </button>
        )}
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          História
        </button>
      </div>
      {tab === 'table' && <LeagueTable leagueId={leagueId} openClub={openClub} />}
      {tab === 'rounds' && <Rounds leagueId={leagueId} />}
      {tab === 'scorers' && <Scorers leagueId={leagueId} />}
      {tab === 'playoff' && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            {playoffName(poId)} – dva zápasy, rozhoduje celkové skóre, pri rovnosti penalty.
          </p>
          <FixtureList fixtures={playoff} showDate />
        </>
      )}
      {tab === 'history' && <HistoryView />}
    </>
  );
}

export function LeagueTable({ leagueId, openClub }: { leagueId: string; openClub: (id: string) => void }) {
  const { state } = useGame();
  const league = state.leagues[leagueId];
  const rows = standings(state, leagueId);
  const split = state.seasonData.splitDone[leagueId] && league.split?.length;

  const groupLabel = (r: TableRow) => (r.group >= 0 ? league.split![r.group].name : 'Bez nadstavby');

  return (
    <>
      {league.split?.length ? (
        <p className="muted" style={{ marginTop: 0 }}>
          Po základnej časti nadstavba: {league.split.map((g) => `${g.name} (${g.from}.–${g.to}.)`).join(', ')}. Body sa prenášajú.
        </p>
      ) : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th className="num">#</th>
              <th className="sticky">Klub</th>
              <th className="num" title="Zápasy">Z</th>
              <th className="num" title="Výhry">V</th>
              <th className="num" title="Remízy">R</th>
              <th className="num" title="Prehry">P</th>
              <th className="num">Skóre</th>
              <th className="num" title="Rozdiel skóre">+/-</th>
              <th className="num" title="Body">B</th>
              <th>Forma</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = state.clubs[r.clubId];
              const sep = split && i > 0 && rows[i - 1].group !== r.group;
              return (
                <tr
                  key={r.clubId}
                  className={[r.clubId === state.manager.clubId ? 'highlight' : '', sep ? 'group-sep' : ''].join(' ')}
                  title={split ? groupLabel(r) : undefined}
                >
                  <td className="num">{i + 1}.</td>
                  <td className="sticky">
                    <button className="link club-cell" onClick={() => openClub(c.id)}>
                      <ClubBadge club={c} size={18} />
                      {c.shortName}
                    </button>
                  </td>
                  <td className="num">{r.played}</td>
                  <td className="num">{r.won}</td>
                  <td className="num">{r.drawn}</td>
                  <td className="num">{r.lost}</td>
                  <td className="num">
                    {r.gf}:{r.ga}
                  </td>
                  <td className="num">{r.gf - r.ga > 0 ? `+${r.gf - r.ga}` : r.gf - r.ga}</td>
                  <td className="num">
                    <strong>{r.points}</strong>
                  </td>
                  <td>
                    {r.last.map((x, j) => (
                      <span key={j} className={`result-chip ${x}`}>
                        {x}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Rounds({ leagueId }: { leagueId: string }) {
  const { state } = useGame();
  const fixtures = state.seasonData.fixtures.filter((f) => f.leagueId === leagueId);
  const rounds = useMemo(() => [...new Set(fixtures.map((f) => f.round))].sort((a, b) => a - b), [fixtures]);
  const current = fixtures.find((f) => !f.played)?.round ?? rounds[rounds.length - 1] ?? 1;
  const [round, setRound] = useState(current);
  const list = fixtures.filter((f) => f.round === round);
  const total = state.seasonData.roundDates[leagueId]?.length ?? rounds.length;

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button onClick={() => setRound((r) => Math.max(1, r - 1))} disabled={round <= 1}>
          ◀
        </button>
        <strong>
          {round}. kolo
          {state.seasonData.roundDates[leagueId]?.[round - 1] && ` · ${formatDateShort(state.seasonData.roundDates[leagueId][round - 1])}`}
        </strong>
        <button onClick={() => setRound((r) => Math.min(total, r + 1))} disabled={round >= total}>
          ▶
        </button>
      </div>
      {list.length === 0 ? (
        <p className="muted">Zápasy nadstavby sa určia po skončení základnej časti.</p>
      ) : (
        <FixtureList fixtures={list} />
      )}
    </>
  );
}

export function FixtureList({ fixtures, showDate = false }: { fixtures: Fixture[]; showDate?: boolean }) {
  const { state } = useGame();
  return (
    <div className="table-wrap">
      <table className="data">
        <tbody>
          {fixtures.map((f) => {
            const h = state.clubs[f.homeId];
            const a = state.clubs[f.awayId];
            const mine = f.homeId === state.manager.clubId || f.awayId === state.manager.clubId;
            return (
              <tr key={f.id} className={mine ? 'highlight' : undefined}>
                {showDate && <td className="muted">{formatDateShort(f.date)}</td>}
                <td style={{ textAlign: 'right' }}>
                  <span className="club-cell">
                    {h.shortName}
                    <ClubBadge club={h} size={18} />
                  </span>
                </td>
                <td className="center" style={{ width: 60 }}>
                  <strong>{f.played ? `${f.homeGoals}:${f.awayGoals}` : '–:–'}</strong>
                </td>
                <td>
                  <span className="club-cell">
                    <ClubBadge club={a} size={18} />
                    {a.shortName}
                  </span>
                </td>
                <td className="muted" style={{ whiteSpace: 'normal', fontSize: 12 }}>
                  {f.goals.map(([m, pid]) => `${state.players[pid]?.lastName ?? '?'} ${m}'`).join(', ')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Scorers({ leagueId }: { leagueId: string }) {
  const { state } = useGame();
  const clubIds = new Set(state.leagues[leagueId].clubIds);
  const rows = Object.entries(state.seasonData.stats)
    .filter(([id, s]) => s.goals > 0 && state.players[id] && clubIds.has(state.players[id].clubId ?? ''))
    .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists)
    .slice(0, 30);
  if (!rows.length) return <p className="muted">Zatiaľ nepadol žiadny gól.</p>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th className="num">#</th>
            <th className="sticky">Hráč</th>
            <th>Nár</th>
            <th>Klub</th>
            <th className="num">Góly</th>
            <th className="num">Asist.</th>
            <th className="num">Zápasy</th>
            <th className="num">Ø známka</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, s], i) => {
            const p = state.players[id];
            const c = state.clubs[p.clubId!];
            return (
              <tr key={id} className={p.clubId === state.manager.clubId ? 'highlight' : undefined}>
                <td className="num">{i + 1}.</td>
                <td className="sticky">
                  {p.firstName} {p.lastName}
                </td>
                <td>
                  <Flag code={p.nationality} />
                </td>
                <td>
                  <span className="club-cell">
                    <ClubBadge club={c} size={16} />
                    {c.shortName}
                  </span>
                </td>
                <td className="num">
                  <strong>{s.goals}</strong>
                </td>
                <td className="num">{s.assists}</td>
                <td className="num">{s.apps}</td>
                <td className="num">{(s.ratingSum / Math.max(1, s.apps)).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistoryView() {
  const { state } = useGame();
  const h = state.history;
  if (!h.length) return <p className="muted">História sa začne zapisovať po prvej odohratej sezóne.</p>;
  const leagueIds = Object.keys(state.leagues);
  return (
    <>
      <div className="panel">
        <h3>Moje sezóny</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Sezóna</th>
                <th className="sticky">Klub</th>
                <th>Liga</th>
                <th className="num">Miesto</th>
                <th className="num">Cieľ</th>
                <th className="num">Body</th>
                <th className="num">V-R-P</th>
                <th className="num">Skóre</th>
                <th>Hodnotenie</th>
                <th>Najlepší strelec</th>
                <th className="num">Účet na konci</th>
                <th className="num">Hodnota kádra</th>
                <th>Najdrahší predaj</th>
              </tr>
            </thead>
            <tbody>
              {h.map((x) => {
                const c = state.clubs[x.clubId];
                const move = x.moves.find((m) => m.clubId === x.clubId);
                return (
                  <tr key={x.season}>
                    <td>{seasonLabel(x.season)}</td>
                    <td className="sticky">
                      <span className="club-cell">
                        <ClubBadge club={c} size={16} />
                        {c.shortName}
                      </span>
                    </td>
                    <td>{state.leagues[x.leagueId]?.name}</td>
                    <td className="num">
                      <strong>{x.position}.</strong>
                      {move ? (move.to.endsWith('1') ? ' ⬆' : ' ⬇') : ''}
                      {x.position === 1 ? ' 🏆' : ''}
                    </td>
                    <td className="num">{x.target}.</td>
                    <td className="num">{x.points}</td>
                    <td className="num">
                      {x.won}-{x.drawn}-{x.lost}
                    </td>
                    <td className="num">
                      {x.gf}:{x.ga}
                    </td>
                    <td>
                      {RATING_ICON[x.rating]} {RATING_NAMES[x.rating]}
                    </td>
                    <td>{x.topScorer ? `${x.topScorer.name} (${x.topScorer.goals})` : '–'}</td>
                    <td className="num">{money(x.balanceEnd)}</td>
                    <td className="num">{money(x.squadValueEnd)}</td>
                    <td>{x.bestSale ? `${x.bestSale.name} (${money(x.bestSale.fee)})` : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {h.length >= 2 && (
        <div className="panel">
          <h3>Umiestnenie po sezónach</h3>
          <LineChart
            series={[{ name: 'Umiestnenie', color: SERIES[0], values: h.map((x) => x.position) }]}
            xLabels={h.map((x) => seasonLabel(x.season))}
            invert
            yMin={1}
            yMax={16}
            integerTicks
            format={(v) => `${v}.`}
          />
        </div>
      )}
      <div className="panel">
        <h3>Majstri</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Sezóna</th>
                {leagueIds.map((id) => (
                  <th key={id}>{state.leagues[id].name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {h.map((x) => (
                <tr key={x.season}>
                  <td>{seasonLabel(x.season)}</td>
                  {leagueIds.map((id) => {
                    const c = x.champions[id] ? state.clubs[x.champions[id]] : null;
                    return (
                      <td key={id}>
                        {c ? (
                          <span className="club-cell">
                            <ClubBadge club={c} size={16} />
                            {c.shortName}
                          </span>
                        ) : (
                          '–'
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
