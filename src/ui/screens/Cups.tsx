// Poháre a európske súťaže: priebeh, ligová fáza, strelci

import { useState } from 'react';
import { COMP_NAMES, compTable, EURO, STAGE_NAMES, stagesOf, type CompId } from '../../engine/cups';
import type { Fixture } from '../../engine/types';
import { useGame } from '../GameContext';
import { ClubBadge, Flag } from '../common';
import { formatDateShort } from '../dates';

export function CupView({ comp }: { comp: CompId }) {
  const { state } = useGame();
  const euro = EURO.includes(comp);
  const [tab, setTab] = useState<'progress' | 'table' | 'scorers'>('progress');
  const cs = state.seasonData.comps?.[comp];
  if (!cs) return <p className="muted">Súťaž sa v tejto sezóne nehrá.</p>;
  const champ = cs.champion ? state.clubs[cs.champion] : null;

  return (
    <>
      {champ && (
        <div className="panel row">
          🏆 <ClubBadge club={champ} size={24} />
          <strong>{champ.name}</strong>
          <span className="muted">víťaz súťaže {COMP_NAMES[comp]}</span>
        </div>
      )}
      <div className="tabs">
        <button className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')}>
          Priebeh
        </button>
        {euro && (
          <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>
            Ligová fáza
          </button>
        )}
        <button className={tab === 'scorers' ? 'active' : ''} onClick={() => setTab('scorers')}>
          Strelci
        </button>
      </div>
      {tab === 'progress' && <Progress comp={comp} />}
      {tab === 'table' && <LeaguePhase comp={comp} />}
      {tab === 'scorers' && <CompScorers comp={comp} />}
    </>
  );
}

function Progress({ comp }: { comp: CompId }) {
  const { state } = useGame();
  const cs = state.seasonData.comps![comp];
  const stages = stagesOf(comp).filter((s) => cs.created.includes(s.id));
  if (!stages.length) return <p className="muted">Súťaž sa ešte nezačala.</p>;
  return (
    <>
      {[...stages].reverse().map((st) => {
        const fx = state.seasonData.fixtures.filter((f) => f.leagueId === comp && f.phase === st.id);
        if (st.league) {
          const mine = fx.filter((f) => isDomestic(state, f.homeId) || isDomestic(state, f.awayId));
          return (
            <div key={st.id} className="panel">
              <h3>{STAGE_NAMES[st.id]}</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                36 klubov, každý 8 zápasov. 1.–8. miesto priamo do osemfinále, 9.–24. play-off, ostatní vypadávajú. Tabuľka je v karte „Ligová fáza“.
              </p>
              {mine.length > 0 && (
                <>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Zápasy českých a slovenských klubov:
                  </div>
                  <TieList fixtures={mine} single />
                </>
              )}
            </div>
          );
        }
        return (
          <div key={st.id} className="panel">
            <h3>{STAGE_NAMES[st.id]}</h3>
            {fx.length === 0 ? <p className="muted">Bez zápasov českých a slovenských klubov.</p> : <TieList fixtures={fx} single={st.legs === 1} />}
          </div>
        );
      })}
    </>
  );
}

const isDomestic = (state: ReturnType<typeof useGame>['state'], id: string) => !!state.clubs[id]?.leagueId;

/** Dvojzápasy alebo jednotlivé zápasy */
function TieList({ fixtures, single }: { fixtures: Fixture[]; single?: boolean }) {
  const { state } = useGame();
  const me = state.manager.clubId;
  const groups = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const key = single ? f.id : [f.homeId, f.awayId].sort().join('|');
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  const club = (id: string) => state.clubs[id];
  return (
    <div className="table-wrap">
      <table className="data">
        <tbody>
          {[...groups.values()].map((legs) => {
            legs.sort((a, b) => a.round - b.round);
            const a = legs[0].homeId;
            const b = legs[0].awayId;
            const done = legs.every((f) => f.played);
            const ga = legs.reduce((s, f) => s + (f.homeId === a ? f.homeGoals : f.awayGoals), 0);
            const gb = legs.reduce((s, f) => s + (f.homeId === b ? f.homeGoals : f.awayGoals), 0);
            const pen = legs.find((f) => f.penaltyWinner)?.penaltyWinner;
            const winner = done ? (ga > gb ? a : gb > ga ? b : pen) : undefined;
            const mine = a === me || b === me;
            return (
              <tr key={legs[0].id} className={mine ? 'highlight' : undefined}>
                <td className="muted">{formatDateShort(legs[0].date)}</td>
                <td style={{ textAlign: 'right' }}>
                  <span className="club-cell" style={{ fontWeight: winner === a ? 700 : 400 }}>
                    {!club(a).leagueId && <Flag code={club(a).country} showCode={false} />}
                    {club(a).shortName}
                    <ClubBadge club={club(a)} size={18} />
                  </span>
                </td>
                <td className="center" style={{ whiteSpace: 'nowrap' }}>
                  {legs.map((f) => (
                    <div key={f.id}>
                      <strong>{f.played ? `${f.homeGoals}:${f.awayGoals}` : '–:–'}</strong>
                      {legs.length > 1 && <span className="muted"> ({f.round}. z.)</span>}
                    </div>
                  ))}
                  {pen && done && <div className="muted" style={{ fontSize: 11 }}>po penaltách</div>}
                </td>
                <td>
                  <span className="club-cell" style={{ fontWeight: winner === b ? 700 : 400 }}>
                    <ClubBadge club={club(b)} size={18} />
                    {club(b).shortName}
                    {!club(b).leagueId && <Flag code={club(b).country} showCode={false} />}
                  </span>
                </td>
                <td className="muted">{legs.length > 1 && done ? `celkovo ${ga}:${gb}` : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LeaguePhase({ comp }: { comp: CompId }) {
  const { state } = useGame();
  const rows = compTable(state, comp);
  if (!rows.length) return <p className="muted">Ligová fáza sa začne v septembri.</p>;
  const me = state.manager.clubId;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th className="num">#</th>
            <th className="sticky">Klub</th>
            <th>Krajina</th>
            <th className="num">Z</th>
            <th className="num">V</th>
            <th className="num">R</th>
            <th className="num">P</th>
            <th className="num">Skóre</th>
            <th className="num">B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const c = state.clubs[r.clubId];
            const zone = i < 8 ? 'var(--good)' : i < 24 ? 'var(--mid)' : 'var(--bad)';
            return (
              <tr key={r.clubId} className={r.clubId === me || c.leagueId ? 'highlight' : undefined}>
                <td className="num" style={{ boxShadow: `inset 3px 0 0 ${zone}` }}>
                  {i + 1}.
                </td>
                <td className="sticky">
                  <span className="club-cell">
                    <ClubBadge club={c} size={18} />
                    {c.shortName}
                  </span>
                </td>
                <td>
                  <Flag code={c.country} />
                </td>
                <td className="num">{r.played}</td>
                <td className="num">{r.won}</td>
                <td className="num">{r.drawn}</td>
                <td className="num">{r.lost}</td>
                <td className="num">
                  {r.gf}:{r.ga}
                </td>
                <td className="num">
                  <strong>{r.points}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted" style={{ padding: '0 10px' }}>
        <span className="good">▌</span> priamo do osemfinále · <span className="mid">▌</span> play-off · <span className="bad">▌</span> vypadávajú
      </p>
    </div>
  );
}

function CompScorers({ comp }: { comp: CompId }) {
  const { state } = useGame();
  const stats = state.seasonData.compStats?.[comp] ?? {};
  const rows = Object.entries(stats)
    .filter(([id, s]) => s.goals > 0 && state.players[id])
    .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists)
    .slice(0, 25);
  if (!rows.length) return <p className="muted">Zatiaľ bez gólov.</p>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th className="num">#</th>
            <th className="sticky">Hráč</th>
            <th>Klub</th>
            <th className="num">Góly</th>
            <th className="num">Asist.</th>
            <th className="num">Zápasy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, s], i) => {
            const p = state.players[id];
            const c = p.clubId ? state.clubs[p.clubId] : null;
            return (
              <tr key={id} className={p.clubId === state.manager.clubId ? 'highlight' : undefined}>
                <td className="num">{i + 1}.</td>
                <td className="sticky">
                  {p.firstName} {p.lastName} <Flag code={p.nationality} showCode={false} />
                </td>
                <td>
                  {c && (
                    <span className="club-cell">
                      <ClubBadge club={c} size={16} />
                      {c.shortName}
                    </span>
                  )}
                </td>
                <td className="num">
                  <strong>{s.goals}</strong>
                </td>
                <td className="num">{s.assists}</td>
                <td className="num">{s.apps}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
