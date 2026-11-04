// Slávnostné vyhodnotenie sezóny – tabuľky, štatistiky, grafy

import { useMemo, useState } from 'react';
import { TX_NAMES, squadValue, wageBillOf } from '../../engine/finance';
import { seasonLabel } from '../../engine/game';
import { ageOn, marketValue, ovr } from '../../engine/ratings';
import { clubSeason, leagueFacts, leaguePlayers, teamOfSeason, type ClubRecord } from '../../engine/seasonStats';
import { standings } from '../../engine/standings';
import type { Fixture, TxType } from '../../engine/types';
import { useGame } from '../GameContext';
import { BarChart, HBars, LineChart, NEGATIVE, POSITIVE, SERIES } from '../charts';
import { Attr, ClubBadge, Flag, money, Pos } from '../common';
import { balanceSeries, byType, delta, formatShort, monthlyNet, shortMoney, Tile } from './Finance';
import { LeagueTable } from './League';

type Tab = 'overview' | 'tables' | 'players' | 'league' | 'finance' | 'transfers';

const TABS: Array<[Tab, string]> = [
  ['overview', 'Môj klub'],
  ['tables', 'Konečné tabuľky'],
  ['players', 'Hráči'],
  ['league', 'Liga a ocenenia'],
  ['finance', 'Financie'],
  ['transfers', 'Prestupy'],
];

export function SeasonReview({ openClub }: { openClub: (id: string) => void }) {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>('overview');
  const me = state.manager.clubId;
  const club = state.clubs[me];
  const leagueId = club.leagueId!;
  const league = state.leagues[leagueId];
  const table = standings(state, leagueId);
  const pos = table.findIndex((r) => r.clubId === me) + 1;
  const row = table[pos - 1];
  const n = table.length;

  const trophy = pos === 1 ? '🏆' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos > n - 2 ? '😞' : '⚽';
  const headline =
    pos === 1
      ? league.tier === 1
        ? `${club.shortName} je majster ligy!`
        : `${club.shortName} vyhral ${league.name}!`
      : `${pos}. miesto v lige ${league.name}`;
  const zone = league.tier === 2 ? (pos <= 2 ? 'Postupové miesto' : null) : pos === n ? 'Zostupové miesto' : pos >= n - 2 ? 'Miesto v ohrození zostupu (baráž)' : null;

  return (
    <>
      <div className="hero">
        <div className="trophy">{trophy}</div>
        <div className="muted">Vyhodnotenie sezóny {seasonLabel(state.season)}</div>
        <div className="big">{headline}</div>
        <div className="sub">
          {row.points} bodov · {row.won}V {row.drawn}R {row.lost}P · skóre {row.gf}:{row.ga}
          {zone && ` · ${zone}`}
        </div>
      </div>
      <div className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <MyClub />}
      {tab === 'tables' && <Tables openClub={openClub} />}
      {tab === 'players' && <Players />}
      {tab === 'league' && <LeagueAwards />}
      {tab === 'finance' && <Finance />}
      {tab === 'transfers' && <Transfers />}
    </>
  );
}

function fixtureText(state: ReturnType<typeof useGame>['state'], f?: Fixture) {
  if (!f) return '–';
  return `${state.clubs[f.homeId].shortName} – ${state.clubs[f.awayId].shortName} ${f.homeGoals}:${f.awayGoals}`;
}

function RecordTable({ rows }: { rows: Array<[string, ClubRecord]> }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th />
            <th className="num">Z</th>
            <th className="num">V</th>
            <th className="num">R</th>
            <th className="num">P</th>
            <th className="num">Skóre</th>
            <th className="num">Body</th>
            <th className="num">Ø body</th>
            <th className="num">Úspešnosť</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, r]) => (
            <tr key={label}>
              <td>
                <strong>{label}</strong>
              </td>
              <td className="num">{r.played}</td>
              <td className="num">{r.won}</td>
              <td className="num">{r.drawn}</td>
              <td className="num">{r.lost}</td>
              <td className="num">
                {r.gf}:{r.ga}
              </td>
              <td className="num">{r.points}</td>
              <td className="num">{(r.points / Math.max(1, r.played)).toFixed(2)}</td>
              <td className="num">{Math.round((r.points / Math.max(1, r.played * 3)) * 100)} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MyClub() {
  const { state } = useGame();
  const me = state.manager.clubId;
  const leagueId = state.clubs[me].leagueId!;
  const cs = useMemo(() => clubSeason(state, me), [state, me]);
  const hist = state.seasonData.posHistory?.[leagueId] ?? [];
  const final = standings(state, leagueId);
  // Môj klub + prvé tri miesta
  const shown = [me, ...final.map((r) => r.clubId).filter((id) => id !== me).slice(0, 3)];
  const posSeries = shown.map((id, i) => ({
    name: state.clubs[id].shortName,
    color: SERIES[i],
    emphasis: id === me,
    values: hist.map((h) => h.order.indexOf(id) + 1 || null),
  }));
  const ptsSeries = shown.map((id, i) => ({
    name: state.clubs[id].shortName,
    color: SERIES[i],
    emphasis: id === me,
    values: hist.map((h) => h.points[id] ?? null),
  }));
  const labels = hist.map((_, i) => `${i + 1}.`);
  const buckets = ["1–15'", "16–30'", "31–45'", "46–60'", "61–75'", "76–90'"];
  const t = cs.total;

  return (
    <>
      <div className="tiles">
        <Tile label="Bodov" value={t.points} note={`${(t.points / Math.max(1, t.played)).toFixed(2)} na zápas`} />
        <Tile label="Strelené góly" value={t.gf} note={`${(t.gf / Math.max(1, t.played)).toFixed(2)} na zápas`} />
        <Tile label="Inkasované góly" value={t.ga} note={`${(t.ga / Math.max(1, t.played)).toFixed(2)} na zápas`} />
        <Tile label="Čisté konto" value={cs.cleanSheets} note={`${Math.round((cs.cleanSheets / Math.max(1, t.played)) * 100)} % zápasov`} />
        <Tile label="Najdlhšia séria výhier" value={cs.longestWin} />
        <Tile label="Najdlhšie bez prehry" value={cs.longestUnbeaten} />
        <Tile label="Najdlhšie bez výhry" value={cs.longestWinless} />
        <Tile label="Bez streleného gólu" value={cs.failedToScore} />
        <Tile label="Priemerná návštevnosť" value={cs.attendance.avg.toLocaleString('sk-SK')} note={`max ${cs.attendance.max.toLocaleString('sk-SK')} · spolu ${cs.attendance.total.toLocaleString('sk-SK')}`} />
        <Tile label="Góly v 1. / 2. polčase" value={`${cs.firstHalfGoals} / ${cs.secondHalfGoals}`} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Najvyššia výhra</h3>
          <div>{fixtureText(state, cs.biggestWin)}</div>
        </div>
        <div className="panel">
          <h3>Najvyššia prehra</h3>
          <div>{fixtureText(state, cs.biggestLoss)}</div>
        </div>
      </div>

      <div className="panel">
        <h3>Umiestnenie v tabuľke po kolách</h3>
        <LineChart series={posSeries} xLabels={labels} invert yMin={1} yMax={final.length} integerTicks format={(v) => `${v}.`} />
      </div>
      <div className="panel">
        <h3>Body po kolách</h3>
        <LineChart series={ptsSeries} xLabels={labels} yMin={0} />
      </div>

      <div className="panel">
        <h3>Výsledky zápas po zápase</h3>
        <div style={{ lineHeight: 2 }}>
          {cs.sequence.map((x, i) => (
            <span key={i} className={`result-chip ${x}`} title={`${i + 1}. zápas`}>
              {x}
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Doma a vonku</h3>
        <RecordTable
          rows={[
            ['Doma', cs.home],
            ['Vonku', cs.away],
            ['Spolu', cs.total],
          ]}
        />
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Strelené góly podľa minút</h3>
          <BarChart items={cs.goalsByMinute.map((v, i) => ({ label: buckets[i], value: v }))} height={200} />
        </div>
        <div className="panel">
          <h3>Inkasované góly podľa minút</h3>
          <BarChart items={cs.concededByMinute.map((v, i) => ({ label: buckets[i], value: v }))} height={200} color={NEGATIVE} />
        </div>
      </div>
    </>
  );
}

function Tables({ openClub }: { openClub: (id: string) => void }) {
  const { state } = useGame();
  return (
    <>
      {Object.values(state.leagues).map((l) => {
        const champ = standings(state, l.id)[0];
        return (
          <div key={l.id} className="panel">
            <div className="row" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>
                {l.country === 'CZ' ? '🇨🇿' : '🇸🇰'} {l.name}
              </h3>
              <div className="spacer" />
              <span className="club-cell">
                🏆 <ClubBadge club={state.clubs[champ.clubId]} size={20} />
                <strong>{state.clubs[champ.clubId].shortName}</strong>
              </span>
            </div>
            <LeagueTable leagueId={l.id} openClub={openClub} />
          </div>
        );
      })}
    </>
  );
}

function Players() {
  const { state } = useGame();
  const me = state.manager.clubId;
  const start = state.seasonData.start;
  const squad = Object.values(state.players).filter((p) => p.clubId === me);
  const rows = squad
    .map((p) => {
      const st = state.seasonData.stats[p.id] ?? { apps: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0 };
      const value = marketValue(p, state.date, state.season);
      return {
        p,
        st,
        avg: st.apps ? st.ratingSum / st.apps : 0,
        value,
        valueDelta: start?.playerValue[p.id] !== undefined ? value - start.playerValue[p.id] : null,
        ovrDelta: start?.playerOvr[p.id] !== undefined ? ovr(p) - start.playerOvr[p.id] : null,
      };
    })
    .sort((a, b) => b.st.apps - a.st.apps || b.avg - a.avg);
  const by = <T,>(f: (r: (typeof rows)[number]) => number, min = 0) => [...rows].filter((r) => r.st.apps >= min).sort((a, b) => f(b) - f(a))[0] as T;
  const top = by<(typeof rows)[number]>((r) => r.st.goals);
  const best = by<(typeof rows)[number]>((r) => r.avg, 5);
  const most = by<(typeof rows)[number]>((r) => r.st.apps);
  const assist = by<(typeof rows)[number]>((r) => r.st.assists);
  const name = (r?: (typeof rows)[number]) => (r ? `${r.p.firstName} ${r.p.lastName}` : '–');

  return (
    <>
      <div className="tiles">
        <Tile label="⚽ Najlepší strelec" value={name(top)} note={top ? `${top.st.goals} gólov` : undefined} />
        <Tile label="🎯 Najviac asistencií" value={name(assist)} note={assist ? `${assist.st.assists} asistencií` : undefined} />
        <Tile label="⭐ Najlepšia známka" value={name(best)} note={best ? `Ø ${best.avg.toFixed(2)}` : undefined} />
        <Tile label="🏃 Najviac zápasov" value={name(most)} note={most ? `${most.st.apps} zápasov` : undefined} />
      </div>
      <div className="panel">
        <h3>Štatistiky kádra</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Poz</th>
                <th className="sticky">Hráč</th>
                <th className="num">Vek</th>
                <th className="num">Zápasy</th>
                <th className="num">Góly</th>
                <th className="num">Asist.</th>
                <th className="num">Ø známka</th>
                <th className="num">ŽK</th>
                <th className="num">ČK</th>
                <th className="num">Celk.</th>
                <th className="num">Zmena</th>
                <th className="num">Hodnota</th>
                <th className="num">Zmena hodnoty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.id}>
                  <td>
                    <Pos p={r.p.position} />
                  </td>
                  <td className="sticky">
                    {r.p.lastName} {r.p.firstName.charAt(0)}.
                  </td>
                  <td className="num">{ageOn(r.p.birthDate, state.date)}</td>
                  <td className="num">{r.st.apps}</td>
                  <td className="num">{r.st.goals}</td>
                  <td className="num">{r.st.assists}</td>
                  <td className="num">{r.st.apps ? r.avg.toFixed(2) : '–'}</td>
                  <td className="num">{r.st.yellow}</td>
                  <td className="num">{r.st.red}</td>
                  <td className="num">
                    <Attr v={ovr(r.p)} />
                  </td>
                  <td className="num">{r.ovrDelta === null ? <span className="muted">nový</span> : deltaNum(r.ovrDelta, 1)}</td>
                  <td className="num">{money(r.value)}</td>
                  <td className="num">{r.valueDelta === null ? <span className="muted">nový</span> : deltaMoney(r.valueDelta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <h3>Góly hráčov</h3>
        <HBars
          items={rows
            .filter((r) => r.st.goals > 0)
            .sort((a, b) => b.st.goals - a.st.goals)
            .slice(0, 12)
            .map((r) => ({ label: r.p.lastName, value: r.st.goals }))}
          format={(v) => String(v)}
        />
      </div>
    </>
  );
}

function deltaNum(v: number, digits = 0) {
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  if (!r) return <span className="muted">0</span>;
  return <span className={r > 0 ? 'delta-up' : 'delta-down'}>{r > 0 ? `+${r}` : r}</span>;
}
function deltaMoney(v: number) {
  if (Math.abs(v) < 1000) return <span className="muted">0</span>;
  return <span className={v > 0 ? 'delta-up' : 'delta-down'}>{v > 0 ? '+' : ''}{shortMoney(v)}</span>;
}

function LeagueAwards() {
  const { state } = useGame();
  const [leagueId, setLeagueId] = useState(state.clubs[state.manager.clubId].leagueId!);
  const lines = useMemo(() => leaguePlayers(state, leagueId), [state, leagueId]);
  const facts = useMemo(() => leagueFacts(state, leagueId), [state, leagueId]);
  const team = useMemo(() => teamOfSeason(state, leagueId), [state, leagueId]);
  const maxApps = Math.max(1, ...lines.map((l) => l.stats.apps));
  const top = (f: (l: (typeof lines)[number]) => number, minApps = 0) =>
    lines.filter((l) => l.stats.apps >= minApps && f(l) > 0).sort((a, b) => f(b) - f(a)).slice(0, 10);
  const club = (id: string) => state.clubs[state.players[id].clubId!];
  const pct = (v: number) => `${Math.round((v / Math.max(1, facts.matches)) * 100)} %`;

  const Leaders = ({ title, list, value }: { title: string; list: typeof lines; value: (l: (typeof lines)[number]) => string }) => (
    <div className="panel">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table className="data">
          <tbody>
            {list.map((l, i) => {
              const p = state.players[l.id];
              return (
                <tr key={l.id} className={p.clubId === state.manager.clubId ? 'highlight' : undefined}>
                  <td className="num">{i + 1}.</td>
                  <td className="sticky">
                    {p.firstName} {p.lastName}
                  </td>
                  <td>
                    <Flag code={p.nationality} />
                  </td>
                  <td>
                    <span className="club-cell">
                      <ClubBadge club={club(l.id)} size={16} />
                      {club(l.id).shortName}
                    </span>
                  </td>
                  <td className="num">
                    <strong>{value(l)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <div className="tabs">
        {Object.values(state.leagues).map((l) => (
          <button key={l.id} className={l.id === leagueId ? 'active' : ''} onClick={() => setLeagueId(l.id)}>
            {l.name}
          </button>
        ))}
      </div>

      <div className="tiles">
        <Tile label="Zápasov" value={facts.matches} />
        <Tile label="Gólov" value={facts.goals} note={`${(facts.goals / Math.max(1, facts.matches)).toFixed(2)} na zápas`} />
        <Tile label="Výhry domácich" value={pct(facts.homeWins)} />
        <Tile label="Remízy" value={pct(facts.draws)} />
        <Tile label="Výhry hostí" value={pct(facts.awayWins)} />
        <Tile label="Priemerná návštevnosť" value={facts.avgAttendance.toLocaleString('sk-SK')} />
        <Tile label="Najlepší útok" value={facts.bestAttack ? state.clubs[facts.bestAttack.clubId].shortName : '–'} note={facts.bestAttack ? `${facts.bestAttack.gf} gólov` : undefined} />
        <Tile label="Najlepšia obrana" value={facts.bestDefense ? state.clubs[facts.bestDefense.clubId].shortName : '–'} note={facts.bestDefense ? `${facts.bestDefense.ga} inkasovaných` : undefined} />
        <Tile label="Najviac remíz" value={facts.mostDraws ? state.clubs[facts.mostDraws.clubId].shortName : '–'} note={facts.mostDraws ? `${facts.mostDraws.drawn} remíz` : undefined} />
        <Tile label="Najvyššia výhra" value={<span style={{ fontSize: 14 }}>{fixtureText(state, facts.biggestWin)}</span>} />
        <Tile label="Najviac gólov v zápase" value={<span style={{ fontSize: 14 }}>{fixtureText(state, facts.highestScoring)}</span>} />
      </div>

      <div className="panel">
        <h3>Jedenástka sezóny (4-4-2)</h3>
        <div className="pitch-list">
          {team.map((t) => {
            const p = state.players[t.id];
            return (
              <div key={t.id} className="pitch-row" style={{ gridTemplateColumns: '28px 1fr auto 52px' }}>
                <Pos p={t.slot} />
                <span>
                  {p.firstName} {p.lastName}
                </span>
                <span className="club-cell muted">
                  <ClubBadge club={club(t.id)} size={16} />
                  {club(t.id).shortName}
                </span>
                <span className="num">
                  <strong>{t.avg.toFixed(2)}</strong>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-2">
        <Leaders title="⚽ Strelci" list={top((l) => l.stats.goals)} value={(l) => String(l.stats.goals)} />
        <Leaders title="🎯 Asistencie" list={top((l) => l.stats.assists)} value={(l) => String(l.stats.assists)} />
        <Leaders title="⭐ Najlepšia priemerná známka" list={top((l) => l.avg, Math.max(5, maxApps * 0.4))} value={(l) => l.avg.toFixed(2)} />
        <Leaders title="🟨 Najviac kariet" list={top((l) => l.stats.yellow + l.stats.red * 2)} value={(l) => `${l.stats.yellow} / ${l.stats.red}`} />
      </div>

      <div className="panel">
        <h3>Góly po kolách</h3>
        <BarChart items={facts.goalsByRound.map((g, i) => ({ label: `${i + 1}.`, value: g }))} height={200} />
      </div>
      <div className="panel">
        <h3>Priemerná návštevnosť klubov</h3>
        <HBars items={facts.attendanceByClub.map((a) => ({ label: state.clubs[a.clubId].shortName, value: a.avg }))} format={(v) => v.toLocaleString('sk-SK')} />
      </div>
    </>
  );
}

function Finance() {
  const { state } = useGame();
  const me = state.manager.clubId;
  const club = state.clubs[me];
  const start = state.seasonData.start;
  const sums = byType(state.ledger);
  const income = Object.values(sums).filter((v) => v > 0).reduce((a, b) => a + b, 0);
  const expense = Object.values(sums).filter((v) => v < 0).reduce((a, b) => a + b, 0);
  const value = squadValue(state, me);
  const bal = balanceSeries(state.ledger, start?.balance ?? club.balance, `${state.season}-06-20`);
  const vh = state.seasonData.valueHistory ?? [];
  const items = (Object.keys(sums) as TxType[]).map((k) => ({ label: TX_NAMES[k], value: sums[k] })).sort((a, b) => b.value - a.value);

  return (
    <>
      <div className="tiles">
        <Tile label="Na účte" value={money(club.balance)} note={start ? delta(club.balance - start.balance, '') : undefined} />
        <Tile label="Príjmy" value={money(income)} />
        <Tile label="Výdavky" value={money(expense)} />
        <Tile label="Výsledok hospodárenia" value={money(income + expense)} />
        <Tile label="Hodnota kádra" value={money(value)} note={start ? delta(value - start.squadValue, '') : undefined} />
        <Tile label="Platy za mesiac" value={money(wageBillOf(state, me))} note={start ? delta(wageBillOf(state, me) - start.wageBill, '') : undefined} />
        <Tile label="Bilancia prestupov" value={money((sums.prestup_predaj ?? 0) + (sums.prestup_nakup ?? 0))} />
      </div>
      <div className="panel">
        <h3>Príjmy a výdavky podľa druhu</h3>
        <HBars items={items} format={shortMoney} />
      </div>
      <div className="panel">
        <h3>Zostatok na účte počas sezóny</h3>
        <LineChart series={[{ name: 'Zostatok', color: POSITIVE, values: bal.map((b) => b.balance) }]} xLabels={bal.map((b) => formatShort(b.date))} format={shortMoney} />
      </div>
      <div className="panel">
        <h3>Hodnota kádra počas sezóny</h3>
        <LineChart series={[{ name: 'Hodnota kádra', color: SERIES[2], values: vh.map((v) => v.value) }]} xLabels={vh.map((v) => formatShort(v.date))} format={shortMoney} />
      </div>
      <div className="panel">
        <h3>Hospodárenie po mesiacoch</h3>
        <BarChart items={monthlyNet(state.ledger).map((m) => ({ label: m.label, value: m.value, detail: `príjmy ${shortMoney(m.income)} · výdavky ${shortMoney(m.expense)}` }))} format={shortMoney} />
      </div>
    </>
  );
}

function Transfers() {
  const { state } = useGame();
  const me = state.manager.clubId;
  const season = state.transfers;
  const ins = season.filter((t) => t.toClubId === me);
  const outs = season.filter((t) => t.fromClubId === me);
  const top = [...season].sort((a, b) => b.fee - a.fee).slice(0, 15);
  const abroad = season.filter((t) => t.toName);
  const name = (id: string | null, alt?: string) => (id ? state.clubs[id]?.shortName : alt ?? '–');
  const sum = (list: typeof season) => list.reduce((a, t) => a + t.fee, 0);

  const List = ({ title, list }: { title: string; list: typeof season }) => (
    <div className="panel">
      <h3>{title}</h3>
      {list.length === 0 ? (
        <p className="muted">Žiadne.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <tbody>
              {list.map((t, i) => (
                <tr key={i} className={t.fromClubId === me || t.toClubId === me ? 'highlight' : undefined}>
                  <td>
                    <Pos p={t.position} />
                  </td>
                  <td className="sticky">{t.playerName}</td>
                  <td className="muted">
                    {name(t.fromClubId, t.fromName)} → {name(t.toClubId, t.toName)}
                  </td>
                  <td className="num">{t.fee ? money(t.fee) : 'zadarmo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="tiles">
        <Tile label="Príchody" value={ins.length} note={`za ${money(sum(ins))}`} />
        <Tile label="Odchody" value={outs.length} note={`za ${money(sum(outs))}`} />
        <Tile label="Bilancia" value={money(sum(outs) - sum(ins))} />
        <Tile label="Prestupov v CZ/SK" value={season.length} note={`spolu ${money(sum(season))}`} />
        <Tile label="Odchody do zahraničia" value={abroad.length} note={`za ${money(sum(abroad))}`} />
      </div>
      <div className="grid-2">
        <List title="Príchody do môjho klubu" list={ins} />
        <List title="Odchody z môjho klubu" list={outs} />
      </div>
      <List title="Najdrahšie prestupy sezóny" list={top} />
    </>
  );
}
