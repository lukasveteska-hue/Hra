// Správa klubu: vstupné, sponzori, banka, štadión a zariadenia

import { useState } from 'react';
import { cloneState } from '../../engine/advance';
import { formatDate, money } from '../common';
import { useGame } from '../GameContext';
import {
  annuity,
  autoTicketPrice,
  chooseSponsor,
  expandStadium,
  facilityCost,
  loanLimit,
  loanRate,
  loansOutstanding,
  priceDemand,
  repayLoan,
  seatCost,
  SPONSOR_KIND,
  stadiumDays,
  takeLoan,
  ticketPriceOf,
  transferBan,
  upgradeFacility,
} from '../../engine/management';
import type { GameState } from '../../engine/types';
import { Tile } from './Finance';

function useAction() {
  const { state, setState } = useGame();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: (s: GameState) => string | null | void, okText?: string) => {
    const s = cloneState(state);
    const err = fn(s);
    if (err) {
      setMsg({ ok: false, text: err });
      return;
    }
    setState(s);
    if (okText) setMsg({ ok: true, text: okText });
  };
  return { state, run, msg };
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={msg.ok ? 'good' : 'bad'}>{msg.text}</p>;
}

export function TicketsPanel() {
  const { state, run, msg } = useAction();
  const me = state.manager.clubId;
  const club = state.clubs[me];
  const auto = autoTicketPrice(state, me);
  const current = ticketPriceOf(state, me);
  const [price, setPrice] = useState(current);
  const homeGames = state.seasonData.fixtures.filter((f) => f.homeId === me && f.played && f.attendance);
  const last = homeGames.slice(-5);
  const avg = last.length ? Math.round(last.reduce((a, f) => a + (f.attendance ?? 0), 0) / last.length) : null;
  // Odhad podľa aktuálneho záujmu
  const demandNow = priceDemand(state, me);
  const ratio = (auto / price) ** 0.75 / demandNow;
  const est = avg ? Math.min(club.capacity * 0.98, Math.round(avg * ratio)) : null;

  return (
    <div className="panel">
      <h3>Cena vstupenky</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Odporúčaná cena pre klub tvojej veľkosti je {auto.toFixed(2)} €. Vyššia cena prinesie viac peňazí z jedného diváka, ale príde menej ľudí. Na
        návštevnosť vplýva aj umiestnenie v tabuľke, súper a počasie.
      </p>
      <div className="tiles">
        <Tile label="Aktuálna cena" value={`${current.toFixed(2)} €`} note={state.management.ticketPrice ? 'nastavená ručne' : 'automatická'} />
        <Tile label="Kapacita štadióna" value={club.capacity.toLocaleString('sk-SK')} />
        <Tile label="Priemer posledných zápasov" value={avg ? avg.toLocaleString('sk-SK') : '–'} />
        <Tile label="Odhad pri novej cene" value={est ? est.toLocaleString('sk-SK') : '–'} note={est ? `≈ ${money(est * price)} na zápas` : undefined} />
      </div>
      <label className="field">
        <span>Nová cena: {price.toFixed(2)} €</span>
        <input type="range" min={1} max={Math.max(40, Math.ceil(auto * 3))} step={0.5} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </label>
      <div className="row">
        <button onClick={() => run((s) => void (s.management.ticketPrice = null), 'Cena je opäť automatická.')}>Automatická cena</button>
        <div className="spacer" />
        <button className="primary" onClick={() => run((s) => void (s.management.ticketPrice = price), `Cena vstupenky je ${price.toFixed(2)} €.`)}>
          Nastaviť cenu
        </button>
      </div>
      <Msg msg={msg} />
    </div>
  );
}

export function SponsorPanel() {
  const { state, run, msg } = useAction();
  const m = state.management;
  return (
    <div className="panel">
      <h3>Sponzori</h3>
      {m.sponsor ? (
        <>
          <p style={{ marginTop: 0 }}>
            Hlavný sponzor na túto sezónu: <strong>{m.sponsor.name}</strong>
          </p>
          <SponsorCard deal={m.sponsor} />
          <p className="muted">Nového sponzora si vyberieš na začiatku ďalšej sezóny.</p>
        </>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            Vyber si hlavného sponzora na túto sezónu. Ak si nevyberieš do 1. dňa v mesiaci, vedenie podpíše zmluvu s istou sumou.
          </p>
          <div className="grid-3">
            {m.sponsorOffers.map((d, i) => (
              <div key={d.name} className="stat">
                <SponsorCard deal={d} />
                <button className="primary" style={{ marginTop: 10, width: '100%' }} onClick={() => run((s) => chooseSponsor(s, i), `Zmluva so spoločnosťou ${d.name} je podpísaná.`)}>
                  Podpísať
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <Msg msg={msg} />
    </div>
  );
}

function SponsorCard({ deal }: { deal: GameState['management']['sponsorOffers'][number] }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{deal.name}</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        {SPONSOR_KIND[deal.kind]}
      </div>
      <dl className="kv">
        <dt>Mesačne</dt>
        <dd>{money(deal.monthly)}</dd>
        <dt>Za sezónu</dt>
        <dd>{money(deal.monthly * 12)}</dd>
        {deal.winBonus > 0 && (
          <>
            <dt>Bonus za výhru</dt>
            <dd>{money(deal.winBonus)}</dd>
          </>
        )}
        {deal.targetBonus > 0 && (
          <>
            <dt>Bonus</dt>
            <dd>
              {money(deal.targetBonus)} za {deal.targetPos}. miesto alebo lepšie
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

export function BankPanel() {
  const { state, run, msg } = useAction();
  const m = state.management;
  const limit = loanLimit(state);
  const out = loansOutstanding(state);
  const free = Math.max(0, limit - out);
  const [amount, setAmount] = useState(Math.min(free, Math.round(free / 2 / 50_000) * 50_000));
  const [years, setYears] = useState(3);
  const rate = loanRate(years);
  const payment = amount > 0 ? annuity(amount, rate, years * 12) : 0;

  return (
    <>
      <div className="panel">
        <h3>Banka</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Banka požičiava štedro aj menším klubom. Splátky sa platia každý mesiac 1. deň. Pozor: ak sa klub dostane hlboko do mínusu, zväz zakáže
          nákupy hráčov.
        </p>
        {transferBan(state) && <p className="bad">Klub má momentálne zákaz nákupov pre veľký dlh.</p>}
        <div className="tiles">
          <Tile label="Úverový limit" value={money(limit)} />
          <Tile label="Dlh voči banke" value={money(out)} />
          <Tile label="Môžeš si požičať" value={money(free)} />
          <Tile label="Mesačné splátky" value={money(m.loans.reduce((a, l) => a + l.monthlyPayment, 0))} />
        </div>
        <label className="field">
          <span>Suma: {money(amount)}</span>
          <input type="range" min={0} max={free} step={50_000} value={Math.min(amount, free)} onChange={(e) => setAmount(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>
            Doba splácania: {years} {years === 1 ? 'rok' : years < 5 ? 'roky' : 'rokov'} · úrok {(rate * 100).toFixed(1)} % ročne
          </span>
          <input type="range" min={1} max={5} value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </label>
        <p>
          Mesačná splátka: <strong>{money(payment)}</strong> · spolu zaplatíš {money(payment * years * 12)} (úroky {money(payment * years * 12 - amount)})
        </p>
        <button className="primary" disabled={amount <= 0} onClick={() => run((s) => takeLoan(s, amount, years), `Banka ti poslala ${money(amount)}.`)}>
          Požičať si
        </button>
        <Msg msg={msg} />
      </div>
      {m.loans.length > 0 && (
        <div className="panel">
          <h3>Moje pôžičky</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Od</th>
                  <th className="num">Požičané</th>
                  <th className="num">Zostáva</th>
                  <th className="num">Úrok</th>
                  <th className="num">Splátka</th>
                  <th className="num">Zostáva splátok</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {m.loans.map((l) => (
                  <tr key={l.id}>
                    <td>{formatDate(l.startDate)}</td>
                    <td className="num">{money(l.principal)}</td>
                    <td className="num">{money(l.remaining)}</td>
                    <td className="num">{(l.rate * 100).toFixed(1)} %</td>
                    <td className="num">{money(l.monthlyPayment)}</td>
                    <td className="num">{l.monthsLeft}</td>
                    <td>
                      <button onClick={() => run((s) => repayLoan(s, l.id), 'Pôžička je splatená.')}>Splatiť</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

const SEAT_OPTIONS = [500, 1000, 2500, 5000];

export function FacilitiesPanel() {
  const { state, run, msg } = useAction();
  const me = state.manager.clubId;
  const club = state.clubs[me];
  const m = state.management;
  const perSeat = seatCost(state);
  const building = m.projects.find((p) => p.kind === 'stadion');

  const Facility = ({ kind, title, level, effect }: { kind: 'trening' | 'akademia'; title: string; level: number; effect: string }) => {
    const project = m.projects.find((p) => p.kind === kind);
    return (
      <div className="stat">
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 22, margin: '6px 0', letterSpacing: 2 }}>
          {'★'.repeat(level)}
          <span className="muted">{'☆'.repeat(5 - level)}</span>
        </div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          {effect}
        </div>
        {project ? (
          <div className="mid">Vylepšuje sa na úroveň {project.level}, hotové {formatDate(project.finishDate)}.</div>
        ) : level >= 5 ? (
          <div className="good">Najvyššia úroveň.</div>
        ) : (
          <button onClick={() => run((s) => upgradeFacility(s, kind), 'Stavba sa začala.')}>
            Vylepšiť na {level + 1} za {money(facilityCost(state, kind))} (60 dní)
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="panel">
        <h3>Štadión – {club.stadium}</h3>
        <div className="tiles">
          <Tile label="Kapacita" value={club.capacity.toLocaleString('sk-SK')} />
          <Tile label="Cena za 1 miesto" value={money(perSeat)} />
          <Tile label="Údržba za mesiac" value={money(club.capacity * 2.5)} note="2,50 € za miesto" />
        </div>
        {building ? (
          <p className="mid">
            Prebieha rozšírenie o {building.seats?.toLocaleString('sk-SK')} miest, hotové {formatDate(building.finishDate)}.
          </p>
        ) : (
          <div className="row">
            {SEAT_OPTIONS.map((seats) => (
              <button key={seats} onClick={() => run((s) => expandStadium(s, seats), 'Stavba sa začala.')}>
                +{seats.toLocaleString('sk-SK')} miest · {money(seats * perSeat)} · {stadiumDays(seats)} dní
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="panel">
        <h3>Zariadenia klubu</h3>
        <div className="grid-2">
          <Facility kind="trening" title="Tréningové centrum" level={m.training} effect="Lepšie centrum = hráči rastú rýchlejšie (účinok príde s vývojom hráčov)." />
          <Facility kind="akademia" title="Mládežnícka akadémia" level={m.youth} effect="Lepšia akadémia = kvalitnejší mládežníci každé leto (príde s mládežou)." />
        </div>
      </div>
      <Msg msg={msg} />
    </>
  );
}
