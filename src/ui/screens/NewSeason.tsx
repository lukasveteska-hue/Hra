// Prechod do novej sezóny: hodnotenie vedenia, postupy a zostupy, odchody, mládež, ponuky práce

import { useMemo, useState } from 'react';
import { changeClub, RATING_ICON, RATING_NAMES, startNewSeason } from '../../engine/newSeason';
import { seasonLabel } from '../../engine/game';
import { useGame } from '../GameContext';
import { ClubBadge, money, Pos } from '../common';

const MOVE_TEXT = {
  postup: 'postupuje',
  zostup: 'zostupuje',
  'baraz-postup': 'postupuje cez baráž',
  'baraz-zostup': 'zostupuje po baráži',
};

export function NewSeasonScreen({ onDone }: { onDone: () => void }) {
  const { state, setState } = useGame();
  // Nová sezóna sa pripraví raz – až po potvrdení sa uloží
  const { state: next, report } = useMemo(() => startNewSeason(state), [state]);
  const [choice, setChoice] = useState<string | null>(report.fired ? report.jobOffers[0] ?? null : null);
  const h = report.history;
  const me = state.manager.clubId;

  const confirm = () => {
    setState(choice ? changeClub(next, choice) : next);
    onDone();
  };

  return (
    <>
      <div className="hero">
        <div className="trophy">{RATING_ICON[h.rating]}</div>
        <div className="muted">Hodnotenie vedenia za sezónu {seasonLabel(report.finishedSeason)}</div>
        <div className="big">{RATING_NAMES[h.rating]} sezóna</div>
        <div className="sub">
          Cieľ: {h.target}. miesto · skutočnosť: {h.position}. miesto · {report.ratingText}
        </div>
        {report.fired && (
          <p className="bad" style={{ fontWeight: 700, marginBottom: 0 }}>
            Vedenie ťa odvolalo z funkcie trénera. Vyber si nový klub z ponúk.
          </p>
        )}
      </div>

      {report.moves.length > 0 && (
        <div className="panel">
          <h3>Postupy a zostupy</h3>
          <div className="pitch-list">
            {report.moves.map((m) => {
              const c = state.clubs[m.clubId];
              const up = m.reason === 'postup' || m.reason === 'baraz-postup';
              return (
                <div key={m.clubId} className="row" style={{ gap: 8 }}>
                  <span className={up ? 'good' : 'bad'}>{up ? '⬆' : '⬇'}</span>
                  <ClubBadge club={c} size={18} />
                  <strong className={m.clubId === me ? 'mid' : ''}>{c.shortName}</strong>
                  <span className="muted">
                    {MOVE_TEXT[m.reason]} do súťaže {state.leagues[m.to].name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="panel">
          <h3>Odchody z kádra</h3>
          {report.retiredMine.length === 0 && report.expiredMine.length === 0 && <p className="muted">Nikto neodchádza.</p>}
          {report.retiredMine.map((p) => (
            <div key={p.name}>
              👋 <strong>{p.name}</strong> <span className="muted">ukončil kariéru ({p.age} r.)</span>
            </div>
          ))}
          {report.expiredMine.map((p) => (
            <div key={p.name}>
              📄 <strong>{p.name}</strong> <span className="muted">odchádza – skončila mu zmluva ({p.age} r., celk. {p.ovr})</span>
            </div>
          ))}
          <p className="muted" style={{ marginBottom: 0 }}>
            V celej súťaži ukončilo kariéru {report.retiredCount} hráčov.
          </p>
        </div>
        <div className="panel">
          <h3>Noví mládežníci z akadémie</h3>
          {report.youthMine.length === 0 ? (
            <p className="muted">Tento rok neprišiel nikto.</p>
          ) : (
            <div className="pitch-list">
              {report.youthMine.map((y) => (
                <div key={y.id} className="pitch-row" style={{ gridTemplateColumns: '28px 1fr auto' }}>
                  <Pos p={y.position} />
                  <span>
                    {y.name} <span className="muted">({y.age} r.)</span>
                  </span>
                  <span className="num">
                    celk. {y.ovr} · pot. <strong>{y.potential}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <h3>{report.fired ? 'Ponuky práce' : 'Ponuky z iných klubov'}</h3>
        {!report.fired && (
          <label className="row" style={{ marginBottom: 8 }}>
            <input type="radio" name="job" checked={choice === null} onChange={() => setChoice(null)} style={{ width: 18, minHeight: 0 }} />
            <ClubBadge club={state.clubs[me]} size={22} />
            <strong>Zostať v klube {state.clubs[me].name}</strong>
          </label>
        )}
        {report.jobOffers.length === 0 && !report.fired && <p className="muted">Žiadny iný klub ťa tentokrát neoslovil.</p>}
        {report.jobOffers.map((id) => {
          const c = next.clubs[id];
          const l = next.leagues[c.leagueId!];
          return (
            <label key={id} className="row" style={{ marginBottom: 8 }}>
              <input type="radio" name="job" checked={choice === id} onChange={() => setChoice(id)} style={{ width: 18, minHeight: 0 }} />
              <ClubBadge club={c} size={22} />
              <strong>{c.name}</strong>
              <span className="muted">
                {l.name} · sila {Math.round(c.reputation)} · na účte {money(c.balance)}
              </span>
            </label>
          );
        })}
      </div>

      <button className="primary" style={{ width: '100%', minHeight: 48 }} onClick={confirm} disabled={report.fired && !choice}>
        Začať sezónu {seasonLabel(report.finishedSeason + 1)} ▶
      </button>
    </>
  );
}
