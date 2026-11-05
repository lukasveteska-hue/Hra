// Akcie pri hráčovi: ponuka na kúpu, zmluva, prestupová listina

import { useState } from 'react';
import { cloneState } from '../engine/advance';
import { transferWindow } from '../engine/calendar';
import { marketValue, roundMoney } from '../engine/ratings';
import { Rng } from '../engine/rng';
import {
  clubPlayers,
  executeTransfer,
  MAX_SQUAD,
  playerAcceptsContract,
  playerDemand,
  respondToBid,
  type ContractDemand,
  releasePlayer,
  severanceFor,
} from '../engine/transfers';
import type { GameState, Player } from '../engine/types';
import { useGame } from './GameContext';
import { money } from './common';

function withRng(state: GameState, fn: (s: GameState, rng: Rng) => void): GameState {
  const s = cloneState(state);
  const rng = new Rng(s.rngState);
  fn(s, rng);
  s.rngState = rng.state;
  return s;
}

/** Tlačidlá v detaile hráča */
export function PlayerActions({ player }: { player: Player }) {
  const { state } = useGame();
  const [mode, setMode] = useState<'none' | 'bid' | 'contract' | 'renew' | 'list' | 'release'>('none');
  const me = state.manager.clubId;
  const mine = player.clubId === me;
  const window = transferWindow(state.date);

  if (player.abroad) return <p className="muted">Hráč pôsobí v zahraničí ({player.abroad}).</p>;

  return (
    <div className="panel" style={{ marginTop: 16, marginBottom: 0 }}>
      {mode === 'none' && (
        <div className="row">
          {mine && (
            <>
              <button onClick={() => setMode('list')}>{player.listed ? 'Upraviť / stiahnuť z listiny' : 'Dať na prestupovú listinu'}</button>
              <button onClick={() => setMode('renew')}>Predĺžiť zmluvu</button>
              <button className="danger" onClick={() => setMode('release')}>
                Ukončiť zmluvu
              </button>
            </>
          )}
          {!mine && player.clubId && (
            <button className="primary" onClick={() => setMode('bid')} disabled={!window}>
              Podať ponuku
            </button>
          )}
          {!mine && !player.clubId && (
            <button className="primary" onClick={() => setMode('contract')}>
              Ponúknuť zmluvu (voľný hráč)
            </button>
          )}
          {!mine && player.clubId && !window && <span className="muted">Kupovať sa dá len počas prestupového obdobia.</span>}
        </div>
      )}
      {mode === 'bid' && <BidForm player={player} onDone={() => setMode('none')} />}
      {mode === 'contract' && <ContractForm player={player} fee={0} renewal={false} onDone={() => setMode('none')} />}
      {mode === 'renew' && <ContractForm player={player} fee={0} renewal onDone={() => setMode('none')} />}
      {mode === 'list' && <ListForm player={player} onDone={() => setMode('none')} />}
      {mode === 'release' && <ReleaseForm player={player} onDone={() => setMode('none')} />}
    </div>
  );
}

function MoneyInput({ value, onChange, step }: { value: number; onChange: (v: number) => void; step: number }) {
  return (
    <div className="row" style={{ flexWrap: 'nowrap' }}>
      <button onClick={() => onChange(Math.max(0, value - step))} aria-label="Menej">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        style={{ textAlign: 'right' }}
      />
      <button onClick={() => onChange(value + step)} aria-label="Viac">
        +
      </button>
    </div>
  );
}

function BidForm({ player, onDone }: { player: Player; onDone: () => void }) {
  const { state, setState } = useGame();
  const value = marketValue(player, state.date, state.season);
  const [amount, setAmount] = useState(roundMoney(value * 0.9));
  const [msg, setMsg] = useState<string | null>(null);
  const [agreedFee, setAgreedFee] = useState<number | null>(null);
  const [counter, setCounter] = useState<number | null>(null);
  const club = state.clubs[state.manager.clubId];
  const seller = state.clubs[player.clubId!];
  const step = value > 1_000_000 ? 50_000 : 10_000;
  const full = clubPlayers(state, club.id).length >= MAX_SQUAD;

  if (agreedFee !== null) {
    return <ContractForm player={player} fee={agreedFee} renewal={false} onDone={onDone} />;
  }

  const submit = (sum: number) => {
    if (sum > club.balance) {
      setMsg('Na túto ponuku nemáš dosť peňazí.');
      return;
    }
    let res: ReturnType<typeof respondToBid> | null = null;
    // Odpoveď klubu závisí od náhody – stav generátora sa uloží
    setState(withRng(state, (s, rng) => (res = respondToBid(s, s.players[player.id], sum, rng))));
    const r = res as ReturnType<typeof respondToBid> | null;
    if (!r) return;
    if (r.kind === 'accept') {
      setMsg(null);
      setAgreedFee(r.fee);
    } else if (r.kind === 'counter') {
      setCounter(r.fee);
      setMsg(r.text);
    } else {
      setCounter(null);
      setMsg(r.text);
    }
  };

  return (
    <>
      <h3>Ponuka pre {seller.shortName}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Trhová hodnota {money(value)} · na účte máš {money(club.balance)}
        {player.listed && player.askingPrice ? ` · na listine za ${money(player.askingPrice)}` : ''}
      </p>
      {full && <p className="bad">Máš plný káder ({MAX_SQUAD} hráčov).</p>}
      <MoneyInput value={amount} onChange={setAmount} step={step} />
      {msg && <p className={counter ? 'mid' : 'bad'}>{msg}</p>}
      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={onDone}>Zrušiť</button>
        <div className="spacer" />
        {counter && (
          <button onClick={() => submit(counter)} disabled={full}>
            Prijať {money(counter)}
          </button>
        )}
        <button className="primary" onClick={() => submit(amount)} disabled={full}>
          Poslať ponuku
        </button>
      </div>
    </>
  );
}

function ContractForm({ player, fee, renewal, onDone }: { player: Player; fee: number; renewal: boolean; onDone: () => void }) {
  const { state, setState } = useGame();
  const [demand] = useState<ContractDemand>(() => playerDemand(state, player, renewal));
  const [wage, setWage] = useState(demand.wage);
  const [years, setYears] = useState(demand.years || 2);
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const me = state.manager.clubId;
  const done = msg?.ok;

  const reasons = demand.reasons.length > 0 && (
    <ul className="muted" style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13 }}>
      {demand.reasons.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );

  if (demand.refuses) {
    return (
      <>
        <p className="bad">{demand.refuses}</p>
        {reasons}
        <button onClick={onDone}>Zavrieť</button>
      </>
    );
  }

  const submit = () => {
    let accepted = false;
    const next = withRng(state, (s, rng) => {
      accepted = playerAcceptsContract(demand, wage, rng);
      const p = s.players[player.id];
      if (!accepted) {
        if (renewal) p.morale = Math.max(20, p.morale - 4);
        return;
      }
      if (renewal) {
        p.wage = wage;
        p.contractUntil = s.season + years;
        s.news.push({ date: s.date, text: `${p.firstName} ${p.lastName} predĺžil zmluvu do roku ${p.contractUntil}.` });
      } else {
        executeTransfer(s, p, { clubId: me }, fee, wage, years);
      }
    });
    setState(next);
    if (accepted) {
      setMsg({ ok: true, text: renewal ? 'Zmluva predĺžená.' : `${player.lastName} podpísal zmluvu. Vitaj v klube!` });
    } else {
      const t = tries + 1;
      setTries(t);
      setMsg({ ok: false, text: t >= 3 ? `${player.lastName} ukončil rokovania.` : `${player.lastName} ponuku odmieta. Chce viac.` });
    }
  };

  return (
    <>
      <h3>{renewal ? 'Predĺženie zmluvy' : 'Zmluva s hráčom'}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {fee ? `Klub súhlasí s prestupom za ${money(fee)}. ` : ''}
        {player.lastName} žiada približne {money(demand.wage)} mesačne{renewal ? ` (teraz má ${money(player.wage)})` : ''}.
      </p>
      {reasons}
      {!done && (
        <>
          <label className="field">
            <span>Mesačný plat</span>
            <MoneyInput value={wage} onChange={setWage} step={wage >= 20_000 ? 1_000 : 100} />
          </label>
          <label className="field">
            <span>Dĺžka zmluvy: {years} {years === 1 ? 'rok' : years < 5 ? 'roky' : 'rokov'} (do 30. 6. {state.season + years})</span>
            <input type="range" min={1} max={5} value={years} onChange={(e) => setYears(Number(e.target.value))} />
          </label>
        </>
      )}
      {msg && <p className={msg.ok ? 'good' : 'bad'}>{msg.text}</p>}
      <div className="row">
        <button onClick={onDone}>{done ? 'Zavrieť' : 'Zrušiť'}</button>
        <div className="spacer" />
        {!done && (
          <button className="primary" onClick={submit} disabled={tries >= 3}>
            Ponúknuť zmluvu
          </button>
        )}
      </div>
    </>
  );
}

function ReleaseForm({ player, onDone }: { player: Player; onDone: () => void }) {
  const { state, setState } = useGame();
  const fee = severanceFor(state, player);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const balance = state.clubs[state.manager.clubId].balance;
  const confirm = () => {
    const s = cloneState(state);
    const err = releasePlayer(s, player.id);
    if (err) {
      setMsg({ ok: false, text: err });
      return;
    }
    setState(s);
    setMsg({ ok: true, text: `Zmluva s hráčom ${player.lastName} je ukončená. Odchádza ako voľný hráč.` });
  };
  return (
    <>
      <h3>Ukončenie zmluvy dohodou</h3>
      {!msg?.ok && (
        <p style={{ marginTop: 0 }}>
          {player.lastName} má zmluvu do 30. 6. {player.contractUntil} a plat {money(player.wage)} mesačne. Za ukončenie zmluvy mu zaplatíš odstupné{' '}
          <strong>{money(fee)}</strong> (polovica zostávajúcich platov). Na účte máš {money(balance)}.
        </p>
      )}
      {msg && <p className={msg.ok ? 'good' : 'bad'}>{msg.text}</p>}
      <div className="row">
        <button onClick={onDone}>{msg?.ok ? 'Zavrieť' : 'Zrušiť'}</button>
        <div className="spacer" />
        {!msg?.ok && (
          <button className="danger" onClick={confirm}>
            Ukončiť zmluvu za {money(fee)}
          </button>
        )}
      </div>
    </>
  );
}

function ListForm({ player, onDone }: { player: Player; onDone: () => void }) {
  const { state, setState } = useGame();
  const value = marketValue(player, state.date, state.season);
  const [price, setPrice] = useState(player.askingPrice ?? roundMoney(value));
  const save = (listed: boolean) => {
    const s = cloneState(state);
    const p = s.players[player.id];
    p.listed = listed;
    p.askingPrice = listed ? price : null;
    setState(s);
    onDone();
  };
  return (
    <>
      <h3>Prestupová listina</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Trhová hodnota {money(value)}. Hráči na listine dostávajú ponuky počas prestupového obdobia – čím nižšia cena, tým skôr (pri 0 € si
        hráča niekto zoberie zadarmo).
      </p>
      <label className="field">
        <span>Požadovaná cena</span>
        <MoneyInput value={price} onChange={setPrice} step={value > 1_000_000 ? 50_000 : 10_000} />
      </label>
      <div className="row">
        <button onClick={onDone}>Zrušiť</button>
        {player.listed && (
          <button className="danger" onClick={() => save(false)}>
            Stiahnuť z listiny
          </button>
        )}
        <div className="spacer" />
        <button className="primary" onClick={() => save(true)}>
          {player.listed ? 'Uložiť cenu' : 'Dať na listinu'}
        </button>
      </div>
    </>
  );
}

