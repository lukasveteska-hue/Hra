// Zápas naživo – 90 minút za 60 sekúnd, s priebežnými výsledkami ostatných zápasov

import { useEffect, useRef, useState } from 'react';
import { createSim, finishMyMatch } from '../engine/advance';
import { MAX_SUBS, type MatchResult, type MatchSim } from '../engine/match';
import { ovr } from '../engine/ratings';
import { Rng } from '../engine/rng';
import { FORMATIONS, slotRating, STYLE_NAMES } from '../engine/tactics';
import type { Fixture, Style } from '../engine/types';
import { useGame } from './GameContext';
import { weatherFor, weatherLabel } from '../engine/weather';
import { Attr, ClubBadge, Modal, Pos, POS_NAME } from './common';
import { AttackSlider, TacticsEditor } from './TacticsEditor';

const MATCH_MS = 60_000;

/** Ikonky udalostí v priebehu zápasu */
const EVENT_ICON: Partial<Record<string, string>> = { goal: '⚽', yellow: '🟨', red: '🟥', sub: '🔄', injury: '🩹', half: '⏸️', end: '🏁', start: '📣' };

/** Názov štadióna (zahraničné kluby nemajú v hre zadaný štadión) */
function stadiumName(c: { stadium: string; shortName: string; capacity: number }): string {
  return c.stadium ? `${c.stadium} (${c.capacity.toLocaleString('sk-SK')})` : `štadión klubu ${c.shortName}`;
}
const TICK_MS = MATCH_MS / 90;

interface Live {
  rng: Rng;
  sim: MatchSim;
  mySide: 0 | 1;
  others: Array<{ fixture: Fixture; sim: MatchSim }>;
  result?: MatchResult;
}

export function MatchScreen({ fixture, onDone }: { fixture: Fixture; onDone: () => void }) {
  const { state, setState } = useGame();
  const [phase, setPhase] = useState<'pre' | 'live' | 'done'>('pre');
  const [minute, setMinute] = useState(0);
  const [paused, setPaused] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const live = useRef<Live | null>(null);
  const [, force] = useState(0);
  const home = state.clubs[fixture.homeId];
  const away = state.clubs[fixture.awayId];

  const start = () => {
    const rng = new Rng(state.rngState);
    const sim = createSim(state, fixture, rng, state.manager.clubId);
    // Ostatné zápasy kola v mojej lige – odohrajú sa hneď, zobrazujú sa postupne
    const others = state.seasonData.fixtures
      .filter((f) => !f.played && f.date === fixture.date && f.leagueId === fixture.leagueId && f.id !== fixture.id)
      .map((f) => {
        const s = createSim(state, f, rng);
        s.runToEnd();
        return { fixture: f, sim: s };
      });
    live.current = { rng, sim, mySide: fixture.homeId === state.manager.clubId ? 0 : 1, others };
    setPhase('live');
  };

  useEffect(() => {
    if (phase !== 'live' || paused || subOpen) return;
    const t = setInterval(() => {
      const l = live.current;
      if (!l) return;
      l.sim.step([home.shortName, away.shortName]);
      setMinute(l.sim.minute);
      if (l.sim.finished) {
        l.result = l.sim.result();
        setPhase('done');
      }
    }, TICK_MS);
    return () => clearInterval(t);
  }, [phase, paused, subOpen, home.shortName, away.shortName]);

  const finish = () => {
    const l = live.current!;
    const results = [{ fixtureId: fixture.id, result: l.result ?? l.sim.result() }, ...l.others.map((o) => ({ fixtureId: o.fixture.id, result: o.sim.result() }))];
    setState(finishMyMatch(state, results, l.rng.state));
    onDone();
  };

  if (phase === 'pre') {
    return (
      <>
        <Scoreboard home={home} away={away} hg={null} ag={null} minute={null} />
        <p className="muted" style={{ marginTop: -4, textAlign: 'center' }}>
          {weatherLabel(weatherFor(fixture.id, fixture.date))} · 🏟️ {stadiumName(home)}
        </p>
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Zostava a taktika</h2>
          <div className="spacer" />
          <button className="primary" onClick={start}>
            Začať zápas ▶
          </button>
        </div>
        <TacticsEditor />
        <button className="primary" onClick={start} style={{ width: '100%' }}>
          Začať zápas ▶
        </button>
      </>
    );
  }

  const l = live.current!;
  const sim = l.sim;
  const [hs, as] = sim.sides;
  const my = sim.sides[l.mySide];
  const events = sim.events.slice().reverse();
  const totalPoss = hs.possession + as.possession || 1;

  return (
    <>
      <Scoreboard home={home} away={away} hg={hs.goals} ag={as.goals} minute={minute} />
      <p className="muted" style={{ marginTop: -4, textAlign: 'center', fontSize: 12 }}>
        {weatherLabel(weatherFor(fixture.id, fixture.date))} · 🏟️ {stadiumName(home)}
      </p>
      <ul className="commentary mobile-only panel" style={{ padding: '4px 12px' }}>
        {events.slice(0, 3).map((e, i) => (
          <li key={i} className={e.type}>
            <span className="min">{e.minute}'</span>
            <span className="txt">
                    {EVENT_ICON[e.type] ? `${EVENT_ICON[e.type]} ` : ''}
                    {e.text}
                  </span>
          </li>
        ))}
      </ul>
      {phase === 'done' && l.result && <MatchSummary result={l.result} sim={sim} onContinue={finish} />}
      <div className="grid-2 match-grid">
        <div className="col-side">
          {phase === 'live' && (
            <div className="panel">
              <h3>Taktika počas zápasu</h3>
              <div className="grid-2 keep">
                <label className="field">
                  <span>Formácia</span>
                  <select
                    value={my.formation}
                    onChange={(e) => {
                      sim.setTactic(l.mySide, { formation: e.target.value });
                      force((x) => x + 1);
                    }}
                  >
                    {Object.keys(FORMATIONS).map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Štýl</span>
                  <select
                    value={my.style}
                    onChange={(e) => {
                      sim.setTactic(l.mySide, { style: e.target.value as Style });
                      force((x) => x + 1);
                    }}
                  >
                    {Object.entries(STYLE_NAMES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <AttackSlider
                value={my.attack}
                onChange={(v) => {
                  sim.setTactic(l.mySide, { attack: v });
                  force((x) => x + 1);
                }}
              />
              <div className="row">
                <button onClick={() => setSubOpen(true)} disabled={my.subsUsed >= MAX_SUBS || !sim.canSub(my)}>
                  Striedať ({my.subsUsed}/{MAX_SUBS})
                </button>
                <button onClick={() => setPaused((p) => !p)}>{paused ? '▶ Pokračovať' : '⏸ Pauza'}</button>
              </div>
            </div>
          )}
          <div className="panel">
            <h3>Na ihrisku</h3>
            <div className="pitch-list">
              {my.onPitch.map((x) => {
                const p = state.players[x.id];
                const en = sim.energy[x.id] ?? p.energy;
                return (
                  <div key={x.id} className="pitch-row">
                    <Pos p={x.slot} />
                    <span>
                      {p.lastName} {sim.sides[l.mySide].captain === x.id ? '(K)' : ''}
                    </span>
                    <div className="energy-bar" title={`Energia ${Math.round(en)} %`}>
                      <div style={{ width: `${en}%`, background: en > 70 ? 'var(--good)' : en > 50 ? 'var(--mid)' : 'var(--bad)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {l.others.length > 0 && (
            <div className="panel">
              <h3>Ostatné zápasy kola</h3>
              <div className="other-matches">
                {l.others.map((o) => {
                  const goals = o.sim.events.filter((e) => e.type === 'goal' && e.minute <= minute);
                  const h = goals.filter((g) => g.side === 0).length;
                  const a = goals.filter((g) => g.side === 1).length;
                  const flash = goals.some((g) => g.minute >= minute - 2);
                  return (
                    <div key={o.fixture.id} className={`om${flash ? ' flash' : ''}`}>
                      <span className="h">{state.clubs[o.fixture.homeId].shortName}</span>
                      <span className="s">
                        {h}:{a}
                      </span>
                      <span>{state.clubs[o.fixture.awayId].shortName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {phase === 'done' && l.result && (
            <>
              <Ratings result={l.result} clubId={sim.sides[0].clubId} title={`Známky – ${home.shortName}`} />
              <Ratings result={l.result} clubId={sim.sides[1].clubId} title={`Známky – ${away.shortName}`} />
            </>
          )}
        </div>
        <div className="col-feed">
          <div className="panel">
            <h3>Priebeh zápasu</h3>
            <ul className="commentary">
              {events.map((e, i) => (
                <li key={i} className={e.type}>
                  <span className="min">{e.minute}'</span>
                  <span className="txt">
                    {EVENT_ICON[e.type] ? `${EVENT_ICON[e.type]} ` : ''}
                    {e.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h3>Štatistiky</h3>
            <div className="match-stats">
              <StatRow label="Strely" h={hs.shots} a={as.shots} />
              <StatRow label="Na bránu" h={hs.onTarget} a={as.onTarget} />
              <StatRow label="Držanie lopty" h={`${Math.round((hs.possession / totalPoss) * 100)} %`} a={`${Math.round((as.possession / totalPoss) * 100)} %`} />
              <StatRow label="Žlté karty" h={hs.yellow} a={as.yellow} />
              <StatRow label="Červené karty" h={hs.red} a={as.red} />
            </div>
          </div>
        </div>
      </div>
      {subOpen && <SubDialog sim={sim} side={l.mySide} onClose={() => setSubOpen(false)} />}
    </>
  );
}

function StatRow({ label, h, a }: { label: string; h: number | string; a: number | string }) {
  return (
    <>
      <span className="l">{h}</span>
      <span className="c">{label}</span>
      <span>{a}</span>
    </>
  );
}

function Scoreboard({
  home,
  away,
  hg,
  ag,
  minute,
}: {
  home: Parameters<typeof ClubBadge>[0]['club'] & { shortName: string };
  away: Parameters<typeof ClubBadge>[0]['club'] & { shortName: string };
  hg: number | null;
  ag: number | null;
  minute: number | null;
}) {
  return (
    <div className="scoreboard">
      <div className="team">
        <ClubBadge club={home} size={36} />
        <span>{home.shortName}</span>
      </div>
      <div>
        <div className="score">{hg === null ? 'vs' : `${hg}:${ag}`}</div>
        {minute !== null && (
          <>
            <div className="minute">{minute >= 90 ? 'Koniec' : minute === 45 ? 'Polčas' : `${minute}'`}</div>
            <div className="progress">
              <div style={{ width: `${(minute / 90) * 100}%` }} />
            </div>
          </>
        )}
      </div>
      <div className="team away">
        <span>{away.shortName}</span>
        <ClubBadge club={away} size={36} />
      </div>
    </div>
  );
}

function SubDialog({ sim, side, onClose }: { sim: MatchSim; side: 0 | 1; onClose: () => void }) {
  const { state } = useGame();
  const s = sim.sides[side];
  const bench = s.bench.filter((id) => !sim.hasAppeared(id));
  const [outId, setOut] = useState<string | null>(null);
  const [inId, setIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const outSlot = s.onPitch.find((x) => x.id === outId)?.slot;
  const en = (id: string) => Math.round(sim.energy[id] ?? state.players[id].energy);
  const enClass = (v: number) => (v < 50 ? 'bad' : v < 70 ? 'mid' : 'muted');

  // Na lavičke navrchu hráči z pozície odchádzajúceho, potom podľa hodnotenia na jeho mieste
  const benchSorted = [...bench].sort((a, b) => {
    const pa = state.players[a];
    const pb = state.players[b];
    if (!outSlot) return ovr(pb) - ovr(pa);
    return Number(pb.position === outSlot) - Number(pa.position === outSlot) || slotRating(pb, outSlot) - slotRating(pa, outSlot);
  });

  const confirm = () => {
    if (!outId || !inId) return;
    const err = sim.substitute(side, outId, inId);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <div>
          <h2 style={{ margin: 0 }}>Striedanie</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Zápas je pozastavený · zostáva {MAX_SUBS - s.subsUsed} striedaní
          </div>
        </div>
        <div className="spacer" />
        <button onClick={onClose} aria-label="Zavrieť">
          ✕
        </button>
      </div>

      <h3>Odchádza</h3>
      {s.onPitch.map((x) => {
        const p = state.players[x.id];
        const e = en(x.id);
        return (
          <button
            key={x.id}
            className={`pick-row sub-row${outId === x.id ? ' selected' : ''}`}
            onClick={() => {
              setOut(x.id);
              setError(null);
            }}
          >
            <Pos p={x.slot} />
            <span className="pick-name">
              {p.lastName} {p.firstName.charAt(0)}.
            </span>
            <span className="num">
              <Attr v={slotRating(p, x.slot)} />
            </span>
            <span className={`num ${enClass(e)}`}>{e} %</span>
          </button>
        );
      })}

      <h3 style={{ marginTop: 14 }}>Prichádza{outSlot ? ` na miesto: ${POS_NAME[outSlot].toLowerCase()}` : ''}</h3>
      {benchSorted.length ? (
        benchSorted.map((id) => {
          const p = state.players[id];
          const e = en(id);
          return (
            <button
              key={id}
              className={`pick-row sub-row${inId === id ? ' selected' : ''}${outSlot && p.position === outSlot ? ' same' : ''}`}
              onClick={() => {
                setIn(id);
                setError(null);
              }}
            >
              <Pos p={p.position} />
              <span className="pick-name">
                {p.lastName} {p.firstName.charAt(0)}.
              </span>
              <span className="num">
                <Attr v={outSlot ? slotRating(p, outSlot) : ovr(p)} />
              </span>
              <span className={`num ${enClass(e)}`}>{e} %</span>
            </button>
          );
        })
      ) : (
        <p className="muted">Na lavičke nie je nikto voľný.</p>
      )}

      {error && <p className="bad">{error}</p>}
      <div className="row sub-actions">
        <button onClick={onClose}>Zrušiť</button>
        <div className="spacer" />
        <button className="primary" disabled={!outId || !inId} onClick={confirm}>
          {outId && inId ? `🔄 ${state.players[outId].lastName} ➜ ${state.players[inId].lastName}` : 'Vystriedať'}
        </button>
      </div>
    </Modal>
  );
}

function Ratings({ result: r, clubId, title }: { result: MatchResult; clubId: string; title: string }) {
  const { state } = useGame();
  const mine = r.appeared.filter((id) => state.players[id]?.clubId === clubId);
  const color = (v: number) => (v >= 7.5 ? 'var(--good)' : v >= 6.5 ? 'var(--mid)' : v >= 5.5 ? 'var(--text)' : 'var(--bad)');
  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="pitch-list">
        {mine
          .sort((a, b) => (r.ratings[b] ?? 0) - (r.ratings[a] ?? 0))
          .map((id) => {
            const p = state.players[id];
            const goals = r.scorers.filter((x) => x === id).length;
            const v = r.ratings[id] ?? 6;
            return (
              <div key={id} className="pitch-row">
                <Pos p={p.position} />
                <span>
                  {p.lastName}
                  {goals > 0 && ` ${'⚽'.repeat(goals)}`}
                </span>
                <span className="num attr" style={{ color: color(v) }}>
                  {v.toFixed(1)}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function MatchSummary({ result: r, sim, onContinue }: { result: MatchResult; sim: MatchSim; onContinue: () => void }) {
  const { state } = useGame();
  const [h, a] = sim.sides;
  const motmId = Object.entries(r.ratings).sort((x, y) => y[1] - x[1])[0]?.[0];
  const motm = motmId ? state.players[motmId] : null;
  const clubName = (id: string) => state.clubs[id]?.shortName ?? '';
  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 16 }}>
          Zápas skončil {h.goals}:{a.goals}
        </strong>
        <div className="spacer" />
        <button className="primary" onClick={onContinue}>
          Pokračovať ▶
        </button>
      </div>
      <div className="grid-2">
        <div>
          <h3>Góly</h3>
          {r.goals.length === 0 && <div className="muted">Bez gólov.</div>}
          {r.goals.map(([m, pid, club], i) => (
            <div key={i}>
              <span className="muted">{m}'</span> ⚽ <strong>{state.players[pid]?.lastName}</strong> <span className="muted">({clubName(club)})</span>
            </div>
          ))}
        </div>
        <div>
          <h3>Hráč zápasu</h3>
          {motm && (
            <div className="stat">
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                ⭐ {motm.firstName} {motm.lastName}
              </div>
              <div className="muted">
                {clubName(motm.clubId ?? '')} · známka <strong>{r.ratings[motmId!].toFixed(1)}</strong>
                {r.scorers.filter((x) => x === motmId).length > 0 && ` · ${r.scorers.filter((x) => x === motmId).length}× gól`}
                {r.assists.filter((x) => x === motmId).length > 0 && ` · ${r.assists.filter((x) => x === motmId).length}× asistencia`}
              </div>
            </div>
          )}
          <p className="muted" style={{ fontSize: 12 }}>
            Známky sú na stupnici 1–10 (6,0 = priemerný výkon). Ovplyvňujú formu hráča.
          </p>
        </div>
      </div>
    </div>
  );
}
