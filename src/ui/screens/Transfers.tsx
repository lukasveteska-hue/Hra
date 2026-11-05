import { useState } from 'react';
import { cloneState } from '../../engine/advance';
import { transferWindow, transferWindowEnd } from '../../engine/calendar';
import { marketValue, ovr } from '../../engine/ratings';
import { Rng } from '../../engine/rng';
import { acceptOffer, counterOffer, rejectOffer } from '../../engine/transfers';
import type { Offer } from '../../engine/types';
import { useGame } from '../GameContext';
import { ClubBadge, Flag, formatDate, money, Pos } from '../common';
import { PlayerDetail } from '../players';
import { PlayersScreen } from './Players';

type Tab = 'offers' | 'search' | 'listed' | 'free' | 'history';

export function TransfersScreen() {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>('offers');
  const open = state.offers.filter((o) => o.status === 'nova');
  const w = transferWindow(state.date);

  return (
    <>
      <h1>Prestupy</h1>
      <p className="muted" style={{ marginTop: -6 }}>
        {w
          ? `Prestupové obdobie (${w}) je otvorené do ${formatDate(transferWindowEnd(state.date)!)}.`
          : 'Prestupové obdobie je zatvorené. Podpísať sa dajú len voľní hráči.'}
      </p>
      <div className="tabs">
        <button className={tab === 'offers' ? 'active' : ''} onClick={() => setTab('offers')}>
          Ponuky{open.length ? ` (${open.length})` : ''}
        </button>
        <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>
          Hľadať
        </button>
        <button className={tab === 'listed' ? 'active' : ''} onClick={() => setTab('listed')}>
          Na predaj
        </button>
        <button className={tab === 'free' ? 'active' : ''} onClick={() => setTab('free')}>
          Voľní hráči
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          História
        </button>
      </div>
      {tab === 'offers' && <Offers />}
      {tab === 'search' && <PlayersScreen key="all" />}
      {tab === 'listed' && <PlayersScreen key="listed" preset="listed" />}
      {tab === 'free' && <PlayersScreen key="free" preset="free" />}
      {tab === 'history' && <History />}
    </>
  );
}

function Offers() {
  const { state } = useGame();
  const open = state.offers.filter((o) => o.status === 'nova');
  const old = state.offers.filter((o) => o.status !== 'nova').slice(-15).reverse();
  return (
    <>
      {open.length === 0 && (
        <p className="muted">
          Žiadne nové ponuky. Ponuky prichádzajú počas prestupového obdobia – častejšie na hráčov na prestupovej listine.
        </p>
      )}
      {open.map((o) => (
        <OfferCard key={o.id} offer={o} />
      ))}
      {old.length > 0 && (
        <div className="panel">
          <h3>Staršie ponuky</h3>
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {old.map((o) => {
                  const p = state.players[o.playerId];
                  return (
                    <tr key={o.id}>
                      <td className="muted">{formatDate(o.date)}</td>
                      <td>{p ? `${p.firstName} ${p.lastName}` : '?'}</td>
                      <td>{o.fromClubId ? state.clubs[o.fromClubId].shortName : o.foreignName}</td>
                      <td className="num">{money(o.amount)}</td>
                      <td className={o.status === 'prijata' ? 'good' : 'muted'}>
                        {{ prijata: 'predaný', odmietnuta: 'odmietnutá', vyprsala: 'vypršala', protinavrh: 'protinávrh', nova: 'nová' }[o.status]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const { state, setState } = useGame();
  const p = state.players[offer.playerId];
  const [counter, setCounter] = useState(Math.round((offer.amount * 1.2) / 10_000) * 10_000);
  const [msg, setMsg] = useState<string | null>(null);
  const [detail, setDetail] = useState(false);
  if (!p) return null;
  const buyer = offer.fromClubId ? state.clubs[offer.fromClubId] : null;
  const value = marketValue(p, state.date, state.season);

  const act = (fn: (s: typeof state, rng: Rng) => string | void) => {
    const s = cloneState(state);
    const rng = new Rng(s.rngState);
    const text = fn(s, rng);
    s.rngState = rng.state;
    setState(s);
    if (text) setMsg(text);
  };

  return (
    <div className="panel">
      <div className="row">
        {buyer ? <ClubBadge club={buyer} size={30} /> : <Flag code={offer.foreignCountry ?? ''} showCode={false} />}
        {buyer && !buyer.leagueId && <Flag code={buyer.country} showCode={false} />}
        <div>
          <strong>{buyer ? buyer.name : offer.foreignName}</strong>
          <div className="muted" style={{ fontSize: 12 }}>
            {buyer?.leagueId ? 'domáca liga' : 'zahraničie'} · platí do {formatDate(offer.expires)}
          </div>
        </div>
        <div className="spacer" />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{money(offer.amount)}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            hodnota {money(value)} ({Math.round((offer.amount / value) * 100)} %)
          </div>
        </div>
      </div>
      <div className="row" style={{ margin: '10px 0' }}>
        <Pos p={p.position} />
        <button className="link" onClick={() => setDetail(true)}>
          {p.firstName} {p.lastName}
        </button>
        <span className="muted">
          celk. {Math.round(ovr(p))} · pot. {p.potential}
        </span>
      </div>
      {msg && <p className="mid">{msg}</p>}
      <div className="row">
        <button className="primary" onClick={() => act((s) => acceptOffer(s, offer.id))}>
          Prijať
        </button>
        <button className="danger" onClick={() => act((s) => rejectOffer(s, offer.id))}>
          Odmietnuť
        </button>
        <div className="spacer" />
        <input
          type="number"
          value={counter}
          step={10_000}
          onChange={(e) => setCounter(Number(e.target.value) || 0)}
          style={{ width: 140, textAlign: 'right' }}
        />
        <button onClick={() => act((s, rng) => counterOffer(s, offer.id, counter, rng))}>Protinávrh</button>
      </div>
      {detail && <PlayerDetail player={p} onClose={() => setDetail(false)} />}
    </div>
  );
}

function History() {
  const { state } = useGame();
  const [onlyMine, setOnlyMine] = useState(false);
  const me = state.manager.clubId;
  const list = state.transfers
    .filter((t) => !onlyMine || t.fromClubId === me || t.toClubId === me)
    .slice()
    .reverse()
    .slice(0, 200);
  const name = (id: string | null, alt?: string) => (id ? state.clubs[id]?.shortName : alt ?? '–');
  return (
    <>
      <label className="row" style={{ marginBottom: 10 }}>
        <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} style={{ width: 18, minHeight: 0 }} />
        Len môj klub
      </label>
      {list.length === 0 ? (
        <p className="muted">Zatiaľ žiadne prestupy.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Dátum</th>
                <th>Poz</th>
                <th className="sticky">Hráč</th>
                <th className="num">Vek</th>
                <th>Z klubu</th>
                <th>Do klubu</th>
                <th className="num">Suma</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t, i) => (
                <tr key={i} className={t.fromClubId === me || t.toClubId === me ? 'highlight' : undefined}>
                  <td className="muted">{formatDate(t.date)}</td>
                  <td>
                    <Pos p={t.position} />
                  </td>
                  <td className="sticky">{t.playerName}</td>
                  <td className="num">{t.age}</td>
                  <td>{name(t.fromClubId, t.fromName)}</td>
                  <td>{name(t.toClubId, t.toName)}</td>
                  <td className="num">{t.fee ? money(t.fee) : 'zadarmo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
