// Detail odohraného zápasu: góly, karty, striedania, štatistiky, známky hráčov

import { COMP_NAMES, isCompetition, STAGE_NAMES } from '../engine/cups';
import { playoffName } from '../engine/playoffs';
import type { Fixture, Player } from '../engine/types';
import { weatherFor, weatherLabel } from '../engine/weather';
import { useGame } from './GameContext';
import { ClubLink } from './NavContext';
import { ClubBadge, formatDate, Modal, Pos } from './common';

const ICON: Record<string, string> = { goal: '⚽', yellow: '🟨', red: '🟥', sub: '🔄', injury: '🩹' };

export function MatchReportModal({ fixture: f, onClose }: { fixture: Fixture; onClose: () => void }) {
  const { state } = useGame();
  const home = state.clubs[f.homeId];
  const away = state.clubs[f.awayId];
  const r = f.report;
  const pl = (id: string): Player | undefined => state.players[id];
  const pname = (id: string) => pl(id)?.lastName ?? '?';
  const comp = isCompetition(f.leagueId)
    ? `${COMP_NAMES[f.leagueId]} · ${STAGE_NAMES[f.phase] ?? f.phase}${f.phase !== 'lf' && f.round === 2 ? ' (odveta)' : ''}`
    : f.leagueId.startsWith('PO-')
      ? playoffName(f.leagueId)
      : f.leagueId === 'PRIATELSKY'
        ? 'Priateľský zápas'
        : `${state.leagues[f.leagueId]?.name ?? ''} · ${f.round}. kolo`;
  const stadium = home.stadium ? home.stadium : `štadión klubu ${home.shortName}`;

  // Góly: z podrobného záznamu (s asistenciami), inak zo zoznamu strelcov
  const goals = f.goals.map(([m, pid, club]) => [m, 'goal', club === f.homeId ? 0 : 1, pid, ''] as const);
  const motm = r ? Object.entries(r.ratings).sort((a, b) => b[1] - a[1])[0] : undefined;

  return (
    <Modal onClose={onClose}>
      <div className="row" style={{ marginBottom: 6 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {comp} · {formatDate(f.date)}
        </span>
        <div className="spacer" />
        <button onClick={onClose} aria-label="Zavrieť">
          ✕
        </button>
      </div>
      <div className="scoreboard" style={{ marginBottom: 6 }}>
        <div className="team">
          <ClubBadge club={home} size={34} />
          <span>{home.shortName}</span>
        </div>
        <div>
          <div className="score">
            {f.homeGoals}:{f.awayGoals}
          </div>
          {f.penaltyWinner && <div className="minute">pen. {state.clubs[f.penaltyWinner].shortName}</div>}
        </div>
        <div className="team away">
          <span>{away.shortName}</span>
          <ClubBadge club={away} size={34} />
        </div>
      </div>
      <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 0 }}>
        {weatherLabel(weatherFor(f.id, f.date))} · 🏟️ {stadium}
        {f.attendance ? ` · ${f.attendance.toLocaleString('sk-SK')} divákov` : ''}
      </p>

      <h3>Priebeh</h3>
      {(r ? r.events : goals).length === 0 && <p className="muted">Bez gólov.</p>}
      <div className="report-events">
        {(r ? r.events : goals).map((e, i) => {
          const [m, type, side, pid, other] = e;
          const txt =
            type === 'goal'
              ? `${pname(pid)}${other ? ` (asist. ${pname(other)})` : ''}`
              : type === 'sub'
                ? `${pname(pid)} za ${pname(other)}`
                : pname(pid);
          return (
            <div key={i} className={`rev ${side === 0 ? 'home' : 'away'} ${type}`}>
              <span className="rev-min">{m}'</span>
              <span className="rev-txt">
                {ICON[type]} {txt}
              </span>
            </div>
          );
        })}
      </div>

      {r ? (
        <>
          <h3 style={{ marginTop: 14 }}>Štatistiky</h3>
          <div className="match-stats">
            {(['Strely', 'Na bránu', 'Držanie lopty', 'Žlté karty', 'Červené karty'] as const).map((label, i) => (
              <StatPair key={label} label={label} h={r.stats[0][i]} a={r.stats[1][i]} pct={i === 2} />
            ))}
          </div>

          {motm && pl(motm[0]) && (
            <div className="stat" style={{ marginTop: 14 }}>
              ⭐ <strong>Hráč zápasu: {pl(motm[0])!.firstName} {pl(motm[0])!.lastName}</strong>{' '}
              <span className="muted">
                ({state.clubs[pl(motm[0])!.clubId ?? '']?.shortName ?? ''}) · známka {motm[1].toFixed(1)}
              </span>
            </div>
          )}

          <div className="grid-2" style={{ marginTop: 14 }}>
            {[0, 1].map((side) => (
              <div key={side}>
                <h3>
                  <ClubLink id={side === 0 ? f.homeId : f.awayId} />
                </h3>
                <Ratings ids={r.lineups[side]} subs={r.events.filter((e) => e[1] === 'sub' && e[2] === side).map((e) => e[3])} ratings={r.ratings} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted" style={{ marginTop: 14 }}>
          Podrobné štatistiky a známky hráčov sú k dispozícii len pri zápasoch odohraných po aktualizácii hry.
        </p>
      )}
    </Modal>
  );
}

function StatPair({ label, h, a, pct }: { label: string; h: number; a: number; pct?: boolean }) {
  return (
    <>
      <span className="l">{pct ? `${h} %` : h}</span>
      <span className="c">{label}</span>
      <span>{pct ? `${a} %` : a}</span>
    </>
  );
}

function Ratings({ ids, subs, ratings }: { ids: string[]; subs: string[]; ratings: Record<string, number> }) {
  const { state } = useGame();
  const color = (v: number) => (v >= 7.5 ? 'var(--good)' : v >= 6.5 ? 'var(--mid)' : v >= 5.5 ? 'var(--text)' : 'var(--bad)');
  const row = (id: string, sub: boolean) => {
    const p = state.players[id];
    const v = ratings[id];
    return (
      <div key={id} className="pitch-row">
        {p ? <Pos p={p.position} /> : <span />}
        <span>
          {sub && <span className="muted">🔄 </span>}
          {p ? `${p.firstName.charAt(0)}. ${p.lastName}` : 'bývalý hráč'}
        </span>
        <span className="num attr" style={{ color: v ? color(v) : undefined }}>
          {v ? v.toFixed(1) : '–'}
        </span>
      </div>
    );
  };
  return (
    <div className="pitch-list">
      {ids.map((id) => row(id, false))}
      {subs.map((id) => row(id, true))}
    </div>
  );
}
