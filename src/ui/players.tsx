// Tabuľka hráčov a detail hráča

import { useGame } from './GameContext';
import { ClubLink } from './NavContext';
import { Attr, ClubBadge, DataTable, Flag, FormArrow, Modal, Pos, POS_NAME, attrColor, money, type Column } from './common';
import { countryName } from '../data/countries';
import { ageOn, marketValue, ovr } from '../engine/ratings';
import type { Player, Position } from '../engine/types';
import { seasonLabel } from '../engine/game';
import { PlayerActions } from './transfersUi';
import { LineChart, SERIES } from './charts';
import { PERSONALITY_INFO, PERSONALITY_NAMES } from '../engine/transfers';

const POS_ORDER: Record<Position, number> = { B: 0, O: 1, Z: 2, U: 3 };

export function PlayerTable({
  players,
  showClub = false,
  onSelect,
}: {
  players: Player[];
  showClub?: boolean;
  onSelect: (p: Player) => void;
}) {
  const { state } = useGame();
  const { date, season } = state;

  const columns: Column<Player>[] = [
    {
      key: 'pos',
      label: 'Poz',
      render: (p) => <Pos p={p.position} />,
      sort: (p) => POS_ORDER[p.position] * 1000 - ovr(p),
    },
    {
      key: 'name',
      label: 'Meno',
      sticky: true,
      render: (p) => (
        <button className="link" onClick={() => onSelect(p)}>
          {p.lastName} {p.firstName.charAt(0)}.{p.listed ? ' 💲' : ''}
          {p.injuryDays > 0 ? ' 🩹' : ''}
          {p.suspension > 0 ? ' 🟥' : ''}
        </button>
      ),
      sort: (p) => `${p.lastName} ${p.firstName}`,
    },
    { key: 'nat', label: 'Nár', render: (p) => <Flag code={p.nationality} />, sort: (p) => p.nationality },
    { key: 'age', label: 'Vek', className: 'num', render: (p) => ageOn(p.birthDate, date), sort: (p) => ageOn(p.birthDate, date) },
  ];
  if (showClub) {
    columns.push({
      key: 'club',
      label: 'Klub',
      render: (p) => {
        const c = p.clubId ? state.clubs[p.clubId] : null;
        return c ? (
          <ClubLink id={c.id} size={16} />
        ) : (
          <span className="muted">bez klubu</span>
        );
      },
      sort: (p) => (p.clubId ? state.clubs[p.clubId].shortName : ''),
    });
  }
  columns.push(
    {
      key: 'ovr',
      label: 'Celk',
      title: 'Celkové hodnotenie (šípka = zmena za posledný mesiac)',
      className: 'num',
      render: (p) => (
        <>
          <Attr v={ovr(p)} />
          <Trend d={p.ovrDelta} />
        </>
      ),
      sort: ovr,
      desc: true,
    },
    { key: 'pot', label: 'Pot', title: 'Potenciál', className: 'num', render: (p) => <Attr v={p.potential} />, sort: (p) => p.potential, desc: true },
    { key: 'fyz', label: 'Fyz', title: 'Fyzické', className: 'num', render: (p) => <Attr v={p.fyz} />, sort: (p) => p.fyz, desc: true },
    { key: 'tech', label: 'Tech', title: 'Technické', className: 'num', render: (p) => <Attr v={p.tech} />, sort: (p) => p.tech, desc: true },
    {
      key: 'obr',
      label: 'Obr',
      title: 'Obranné (pri brankárovi Brankárske)',
      className: 'num',
      render: (p) => (p.position === 'B' ? <span title="Brankárske"><Attr v={p.bra} /></span> : <Attr v={p.obr} />),
      sort: (p) => (p.position === 'B' ? p.bra : p.obr),
      desc: true,
    },
    {
      key: 'uto',
      label: 'Útok',
      title: 'Útočné',
      className: 'num',
      render: (p) => (p.position === 'B' ? <span className="muted">–</span> : <Attr v={p.uto} />),
      sort: (p) => (p.position === 'B' ? 0 : p.uto),
      desc: true,
    },
    { key: 'form', label: 'Forma', className: 'center', render: (p) => <FormArrow form={p.form} />, sort: (p) => p.form, desc: true },
    { key: 'en', label: 'Ener', title: 'Energia', className: 'num', render: (p) => `${Math.round(p.energy)} %`, sort: (p) => p.energy, desc: true },
    { key: 'val', label: 'Hodnota', className: 'num', render: (p) => money(marketValue(p, date, season)), sort: (p) => marketValue(p, date, season), desc: true },
    { key: 'wage', label: 'Plat/mes', className: 'num', render: (p) => money(p.wage), sort: (p) => p.wage, desc: true },
    { key: 'contract', label: 'Zmluva', className: 'num', render: (p) => `do ${p.contractUntil}`, sort: (p) => p.contractUntil },
  );

  return (
    <DataTable
      rows={players}
      columns={columns}
      rowKey={(p) => p.id}
      onRowClick={onSelect}
      initialSort={{ key: 'pos', dir: 'asc' }}
      rowClass={(p) => (p.clubId === state.manager.clubId && showClub ? 'highlight' : undefined)}
    />
  );
}

/** Šípka vývoja hodnotenia za posledný mesiac */
export function Trend({ d }: { d?: number }) {
  if (!d || Math.abs(d) < 0.05) return null;
  const up = d > 0;
  return (
    <span className={`trend ${up ? 'up' : 'down'}`} title={`${up ? '+' : ''}${d.toFixed(1)} za posledný mesiac`}>
      {up ? '▲' : '▼'}
    </span>
  );
}

function AttrBar({ label, v }: { label: string; v: number }) {
  return (
    <div className="attr-bar">
      <span className="muted">{label}</span>
      <div className="track">
        <div className="fill" style={{ width: `${v}%`, background: attrColor(v) }} />
      </div>
      <span className="num">
        <Attr v={v} />
      </span>
    </div>
  );
}

export function PlayerDetail({ player, onClose }: { player: Player; onClose: () => void }) {
  const { state } = useGame();
  // Vždy aktuálny stav hráča (po prestupe, predĺžení zmluvy…)
  const p = state.players[player.id] ?? player;
  const st = state.seasonData.stats[p.id];
  const club = p.clubId ? state.clubs[p.clubId] : null;
  const age = ageOn(p.birthDate, state.date);
  const [by, bm, bd] = p.birthDate.split('-');

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        {club && <ClubBadge club={club} size={36} />}
        <div>
          <h2 style={{ margin: 0 }}>
            {p.firstName} {p.lastName}
          </h2>
          <div className="muted">
            {POS_NAME[p.position]} · {club ? club.name : p.abroad ? `${p.abroad} (zahraničie)` : 'voľný hráč'}
          </div>
        </div>
        <div className="spacer" />
        <button onClick={onClose} aria-label="Zavrieť">
          ✕
        </button>
      </div>

      <div className="grid-2">
        <div className="stat">
          <div className="label">Celkové hodnotenie</div>
          <div className="value">
            <Attr v={ovr(p)} />
          </div>
        </div>
        <div className="stat">
          <div className="label">Potenciál</div>
          <div className="value">
            <Attr v={p.potential} />
          </div>
        </div>
      </div>

      {p.ovrDelta !== undefined && (
        <p style={{ margin: '8px 0 0' }}>
          Vývoj za posledný mesiac:{' '}
          <strong className={p.ovrDelta > 0 ? 'delta-up' : p.ovrDelta < 0 ? 'delta-down' : 'muted'}>
            {p.ovrDelta > 0 ? `▲ +${p.ovrDelta.toFixed(1)}` : p.ovrDelta < 0 ? `▼ ${p.ovrDelta.toFixed(1)}` : 'bez zmeny'}
          </strong>
        </p>
      )}
      {p.ovrHistory && p.ovrHistory.length >= 3 && (
        <>
          <h3 style={{ marginTop: 16 }}>Vývoj hodnotenia</h3>
          <LineChart
            series={[{ name: 'Celkové hodnotenie', color: SERIES[0], values: p.ovrHistory.map((x) => x[1]) }]}
            xLabels={p.ovrHistory.map((x) => `${x[0] % 100}/${String(Math.floor(x[0] / 100)).slice(2)}`)}
            height={160}
            yMin={Math.floor(Math.min(...p.ovrHistory.map((x) => x[1]))) - 1}
            yMax={Math.ceil(Math.max(...p.ovrHistory.map((x) => x[1]))) + 1}
            integerTicks
            format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
          />
        </>
      )}
      <h3 style={{ marginTop: 16 }}>Atribúty</h3>
      <div className="attr-bars">
        <AttrBar label="Fyzické" v={p.fyz} />
        <AttrBar label="Technické" v={p.tech} />
        {p.position === 'B' ? (
          <AttrBar label="Brankárske" v={p.bra} />
        ) : (
          <>
            <AttrBar label="Obranné" v={p.obr} />
            <AttrBar label="Útočné" v={p.uto} />
          </>
        )}
      </div>

      <h3 style={{ marginTop: 16 }}>Informácie</h3>
      <dl className="kv">
        <dt>Národnosť</dt>
        <dd>
          <Flag code={p.nationality} showCode={false} /> {countryName(p.nationality)}
        </dd>
        <dt>Vek</dt>
        <dd>
          {age} rokov ({Number(bd)}. {Number(bm)}. {by})
        </dd>
        <dt>Povaha</dt>
        <dd>
          {PERSONALITY_NAMES[p.personality ?? 'pohodar']} <span className="muted">– {PERSONALITY_INFO[p.personality ?? 'pohodar']}</span>
        </dd>
        <dt>Forma</dt>
        <dd>
          <FormArrow form={p.form} />
        </dd>
        <dt>Energia</dt>
        <dd>{Math.round(p.energy)} %</dd>
        {st && (
          <>
            <dt>Sezóna</dt>
            <dd>
              {st.apps} zápasov · {st.goals} gólov · {st.assists} asistencií · Ø {(st.ratingSum / Math.max(1, st.apps)).toFixed(2)}
            </dd>
          </>
        )}
        <dt>Morálka</dt>
        <dd>{Math.round(p.morale)} %</dd>
        <dt>Trhová hodnota</dt>
        <dd>{money(marketValue(p, state.date, state.season))}</dd>
        <dt>Plat</dt>
        <dd>{money(p.wage)} / mesiac</dd>
        <dt>Zmluva</dt>
        <dd>
          do 30. 6. {p.contractUntil} (sezóna {seasonLabel(p.contractUntil - 1)})
        </dd>
        {p.injuryDays > 0 && (
          <>
            <dt>Zranenie</dt>
            <dd className="bad">{p.injuryDays} dní</dd>
          </>
        )}
        {p.suspension > 0 && (
          <>
            <dt>Trest</dt>
            <dd className="bad">{p.suspension} zápasy</dd>
          </>
        )}
        {p.listed && (
          <>
            <dt>Na predaj</dt>
            <dd className="mid">{p.askingPrice ? money(p.askingPrice) : 'áno'}</dd>
          </>
        )}
      </dl>
      <TransferHistory playerId={p.id} />
      <PlayerActions player={p} />
    </Modal>
  );
}

/** História prestupov hráča (od začiatku kariéry v hre) */
function TransferHistory({ playerId }: { playerId: string }) {
  const { state } = useGame();
  const list = state.transfers.filter((t) => t.playerId === playerId).reverse();
  const clubCell = (id: string | null, name?: string) => {
    const c = id ? state.clubs[id] : null;
    if (c)
      return (
        <span className="club-cell">
          <ClubBadge club={c} size={16} />
          {c.shortName}
        </span>
      );
    return <span className="muted">{name ?? 'voľný hráč'}</span>;
  };
  return (
    <>
      <h3 style={{ marginTop: 16 }}>História prestupov</h3>
      {list.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Žiadne prestupy – hráč je v klube od začiatku tvojej kariéry.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data transfer-history">
            <thead>
              <tr>
                <th>Dátum</th>
                <th>Odkiaľ</th>
                <th>Kam</th>
                <th className="num">Suma</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t, i) => (
                <tr key={i}>
                  <td>
                    {Number(t.date.slice(5, 7))}/{t.date.slice(0, 4)}
                  </td>
                  <td>{clubCell(t.fromClubId, t.fromName)}</td>
                  <td>{clubCell(t.toClubId, t.toName)}</td>
                  <td className="num">{t.fee > 0 ? money(t.fee) : <span className="muted">zadarmo</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
