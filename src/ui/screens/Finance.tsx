import { useMemo, useState } from 'react';
import { TX_NAMES, squadValue, wageBillOf } from '../../engine/finance';
import type { Transaction, TxType } from '../../engine/types';
import { useGame } from '../GameContext';
import { BarChart, HBars, LineChart, NEGATIVE, POSITIVE } from '../charts';
import { formatDate, money } from '../common';
import { BankPanel, FacilitiesPanel, SponsorPanel, TicketsPanel } from './Management';

const MONTHS = ['', 'jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];

export const shortMoney = (v: number) => {
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toLocaleString('sk-SK', { maximumFractionDigits: 1 })} mil.`;
  if (a >= 1_000) return `${sign}${Math.round(a / 1_000)} tis.`;
  return `${sign}${Math.round(a)}`;
};

/** Súčty podľa druhu */
export function byType(ledger: Transaction[]): Record<TxType, number> {
  const out = {} as Record<TxType, number>;
  for (const t of ledger) out[t.type] = (out[t.type] ?? 0) + t.amount;
  return out;
}

/** Čistý zisk po mesiacoch */
export function monthlyNet(ledger: Transaction[]): Array<{ label: string; value: number; income: number; expense: number }> {
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of ledger) {
    const k = t.date.slice(0, 7);
    const m = map.get(k) ?? { income: 0, expense: 0 };
    if (t.amount >= 0) m.income += t.amount;
    else m.expense += t.amount;
    map.set(k, m);
  }
  return [...map.entries()].map(([k, m]) => ({
    label: `${MONTHS[Number(k.slice(5))]} ${k.slice(2, 4)}`,
    value: m.income + m.expense,
    income: m.income,
    expense: m.expense,
  }));
}

/** Zostatok na účte v čase (jeden bod denne) */
export function balanceSeries(ledger: Transaction[], startBalance: number, startDate: string) {
  const points: Array<{ date: string; balance: number }> = [{ date: startDate, balance: startBalance }];
  for (const t of ledger) {
    const last = points[points.length - 1];
    if (last.date === t.date) last.balance = t.balance;
    else points.push({ date: t.date, balance: t.balance });
  }
  return points;
}

type FinTab = 'overview' | 'tickets' | 'sponsor' | 'bank' | 'stadium';

export function FinanceScreen() {
  const { state } = useGame();
  const [tab, setTab] = useState<FinTab>('overview');
  const tabs: Array<[FinTab, string]> = [
    ['overview', 'Prehľad'],
    ['tickets', 'Vstupné'],
    ['sponsor', state.management.sponsor ? 'Sponzori' : 'Sponzori ❗'],
    ['bank', 'Banka'],
    ['stadium', 'Štadión a zariadenia'],
  ];
  return (
    <>
      <h1>Financie</h1>
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <FinanceOverview />}
      {tab === 'tickets' && <TicketsPanel />}
      {tab === 'sponsor' && <SponsorPanel />}
      {tab === 'bank' && <BankPanel />}
      {tab === 'stadium' && <FacilitiesPanel />}
    </>
  );
}

function FinanceOverview() {
  const { state } = useGame();
  const [showAll, setShowAll] = useState(false);
  const me = state.manager.clubId;
  const club = state.clubs[me];
  const start = state.seasonData.start;
  const ledger = state.ledger;
  const sums = useMemo(() => byType(ledger), [ledger]);
  const income = Object.values(sums).filter((v) => v > 0).reduce((a, b) => a + b, 0);
  const expense = Object.values(sums).filter((v) => v < 0).reduce((a, b) => a + b, 0);
  const monthly = monthlyNet(ledger);
  const bal = balanceSeries(ledger, start?.balance ?? club.balance, `${state.season}-06-20`);
  const value = squadValue(state, me);

  const incomeItems = (Object.keys(sums) as TxType[]).filter((k) => sums[k] > 0).map((k) => ({ label: TX_NAMES[k], value: sums[k] })).sort((a, b) => b.value - a.value);
  const expenseItems = (Object.keys(sums) as TxType[]).filter((k) => sums[k] < 0).map((k) => ({ label: TX_NAMES[k], value: sums[k] })).sort((a, b) => a.value - b.value);

  return (
    <>
      <div className="tiles">
        <Tile label="Na účte" value={money(club.balance)} note={start ? delta(club.balance - start.balance, 'od začiatku sezóny') : undefined} />
        <Tile label="Príjmy v sezóne" value={money(income)} />
        <Tile label="Výdavky v sezóne" value={money(expense)} />
        <Tile label="Výsledok sezóny" value={money(income + expense)} />
        <Tile label="Platy za mesiac" value={money(wageBillOf(state, me))} />
        <Tile label="Hodnota kádra" value={money(value)} note={start ? delta(value - start.squadValue, 'od začiatku sezóny') : undefined} />
      </div>

      <div className="panel">
        <h3>Zostatok na účte</h3>
        <LineChart
          series={[{ name: 'Zostatok', color: POSITIVE, values: bal.map((b) => b.balance) }]}
          xLabels={bal.map((b) => formatShort(b.date))}
          format={shortMoney}
        />
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Príjmy podľa druhu</h3>
          {incomeItems.length ? <HBars items={incomeItems} format={shortMoney} /> : <p className="muted">Zatiaľ žiadne príjmy.</p>}
        </div>
        <div className="panel">
          <h3>Výdavky podľa druhu</h3>
          {expenseItems.length ? <HBars items={expenseItems} format={shortMoney} color={NEGATIVE} /> : <p className="muted">Zatiaľ žiadne výdavky.</p>}
        </div>
      </div>

      <div className="panel">
        <h3>Hospodárenie po mesiacoch</h3>
        <BarChart
          items={monthly.map((m) => ({ label: m.label, value: m.value, detail: `príjmy ${shortMoney(m.income)} · výdavky ${shortMoney(m.expense)}` }))}
          format={shortMoney}
        />
      </div>

      <div className="panel">
        <h3>Pohyby na účte</h3>
        {ledger.length === 0 ? (
          <p className="muted">Zatiaľ žiadne pohyby. Platy a príjmy sa účtujú vždy 1. deň v mesiaci, vstupné po domácich zápasoch.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Dátum</th>
                    <th className="sticky">Popis</th>
                    <th>Druh</th>
                    <th className="num">Suma</th>
                    <th className="num">Zostatok</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger
                    .slice()
                    .reverse()
                    .slice(0, showAll ? undefined : 40)
                    .map((t, i) => (
                      <tr key={i}>
                        <td className="muted">{formatDate(t.date)}</td>
                        <td className="sticky">{t.text}</td>
                        <td className="muted">{TX_NAMES[t.type]}</td>
                        <td className={`num ${t.amount >= 0 ? 'good' : 'bad'}`}>{money(t.amount)}</td>
                        <td className="num">{money(t.balance)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!showAll && ledger.length > 40 && (
              <button style={{ marginTop: 10 }} onClick={() => setShowAll(true)}>
                Zobraziť všetko ({ledger.length})
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}

export function Tile({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {note && <div className="note">{note}</div>}
    </div>
  );
}

export function delta(v: number, suffix: string, fmt: (v: number) => string = money) {
  return (
    <span className={v > 0 ? 'delta-up' : v < 0 ? 'delta-down' : ''}>
      {v > 0 ? '▲ +' : v < 0 ? '▼ ' : ''}
      {fmt(v)} {suffix}
    </span>
  );
}

export function formatShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}.`;
}
