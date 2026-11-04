// Úvodná obrazovka, nová hra, načítanie

import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_OPTIONS } from '../data/countries';
import { LEAGUES } from '../data/clubs';
import { newGame, startingBalance } from '../engine/game';
import { deleteSave, importFromFile, listSaves, loadGame, type SaveMeta } from '../engine/save';
import type { GameState } from '../engine/types';
import { ClubBadge, money } from './common';

export function MainMenu({ onStart }: { onStart: (s: GameState) => void }) {
  const [mode, setMode] = useState<'menu' | 'new' | 'load'>('menu');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      onStart(await importFromFile(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (mode === 'new') return <NewGame onBack={() => setMode('menu')} onStart={onStart} />;
  if (mode === 'load') return <LoadGame onBack={() => setMode('menu')} onStart={onStart} />;

  return (
    <div className="center-page">
      <div className="menu-box">
        <div className="title">⚽ Futbalový manažér</div>
        <p className="muted">Česká a slovenská liga · sezóna 2026/27</p>
        <div className="panel menu-buttons">
          <button className="primary" onClick={() => setMode('new')}>
            Nová hra
          </button>
          <button onClick={() => setMode('load')}>Načítať hru</button>
          <button onClick={() => fileRef.current?.click()}>Načítať zo súboru…</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => importFile(e.target.files?.[0])}
          />
          {error && <div className="bad">{error}</div>}
        </div>
      </div>
    </div>
  );
}

function LoadGame({ onBack, onStart }: { onBack: () => void; onStart: (s: GameState) => void }) {
  const [saves, setSaves] = useState<SaveMeta[] | null>(null);

  const refresh = () => listSaves().then(setSaves);
  useEffect(() => {
    refresh();
  }, []);

  const load = async (slot: string) => {
    const s = await loadGame(slot);
    if (s) onStart(s);
  };

  return (
    <div className="center-page">
      <div className="menu-box">
        <h1>Načítať hru</h1>
        <div className="panel">
          {saves === null && <div className="muted">Načítavam…</div>}
          {saves?.length === 0 && <div className="muted">Žiadne uložené hry.</div>}
          {saves?.map((s) => (
            <div key={s.slot} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div>
                  <strong>{s.label}</strong> · {s.clubName}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {s.managerName} · v hre {s.gameDate} · uložené {new Date(s.savedAt).toLocaleString('sk-SK')}
                </div>
              </div>
              <div className="spacer" />
              <button className="primary" onClick={() => load(s.slot)}>
                Načítať
              </button>
              <button
                className="danger"
                onClick={async () => {
                  if (confirm(`Naozaj zmazať uloženú hru „${s.label}“?`)) {
                    await deleteSave(s.slot);
                    refresh();
                  }
                }}
              >
                Zmazať
              </button>
            </div>
          ))}
        </div>
        <button onClick={onBack}>← Späť</button>
      </div>
    </div>
  );
}

function NewGame({ onBack, onStart }: { onBack: () => void; onStart: (s: GameState) => void }) {
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('SK');
  const [age, setAge] = useState(40);
  const [leagueId, setLeagueId] = useState('CZ1');
  const [clubId, setClubId] = useState<string | null>(null);

  const league = LEAGUES.find((l) => l.id === leagueId)!;
  const clubs = useMemo(() => [...league.clubs].sort((a, b) => a.reputation - b.reputation), [league]);
  const valid = name.trim().length >= 2 && clubId && age >= 25 && age <= 75;

  const start = () => {
    if (!valid || !clubId) return;
    onStart(newGame({ manager: { name: name.trim(), nationality, age }, clubId }));
  };

  return (
    <div className="center-page">
      <div className="menu-box wide">
        <h1>Nová hra</h1>

        <div className="panel">
          <h3>Tréner</h3>
          <div className="grid-3">
            <label className="field">
              <span>Meno a priezvisko</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="napr. Ján Novák" maxLength={40} />
            </label>
            <label className="field">
              <span>Národnosť</span>
              <select value={nationality} onChange={(e) => setNationality(e.target.value)}>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Vek</span>
              <input type="number" min={25} max={75} value={age} onChange={(e) => setAge(Number(e.target.value))} />
            </label>
          </div>
        </div>

        <div className="panel">
          <h3>Klub</h3>
          <div className="tabs">
            {LEAGUES.map((l) => (
              <button
                key={l.id}
                className={l.id === leagueId ? 'active' : ''}
                onClick={() => {
                  setLeagueId(l.id);
                  setClubId(null);
                }}
              >
                {l.country === 'CZ' ? '🇨🇿' : '🇸🇰'} {l.name}
              </button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Kluby sú zoradené od najslabšieho. Slabší klub = ťažšia hra.
          </p>
          <div className="club-pick">
            {clubs.map((c) => (
              <button key={c.id} className={c.id === clubId ? 'selected' : ''} onClick={() => setClubId(c.id)}>
                <ClubBadge colors={c.colors} abbr={c.abbr} size={26} />
                <span>
                  <div>{c.name}</div>
                  <div className="meta">
                    Sila {c.reputation} · {money(startingBalance(c.reputation, league.country))}
                    {c.reserveOf ? ' · B-tím' : ''}
                  </div>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <button onClick={onBack}>← Späť</button>
          <div className="spacer" />
          <button className="primary" disabled={!valid} onClick={start}>
            Začať kariéru
          </button>
        </div>
      </div>
    </div>
  );
}
