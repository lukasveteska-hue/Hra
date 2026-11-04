// Úvodná obrazovka, nová hra, načítanie, databáza

import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_OPTIONS } from '../data/countries';
import { clubBalance, newGame } from '../engine/game';
import type { Database } from '../engine/database';
import { getActiveDatabase } from '../engine/dbstore';
import { deleteSave, importFromFile, listSaves, loadGame, type SaveMeta } from '../engine/save';
import type { GameState } from '../engine/types';
import { ClubBadge, money } from './common';
import { DatabaseScreen } from './DatabaseScreen';

export function MainMenu({ onStart }: { onStart: (s: GameState) => void }) {
  const [mode, setMode] = useState<'menu' | 'new' | 'load' | 'db'>('menu');
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
  if (mode === 'db') return <DatabaseScreen onBack={() => setMode('menu')} />;

  return (
    <div className="center-page">
      <div className="menu-box">
        <div className="title">⚽ Futbalový manažér</div>
        <p className="muted">Česká a slovenská liga</p>
        <div className="panel menu-buttons">
          <button className="primary" onClick={() => setMode('new')}>
            Nová hra
          </button>
          <button onClick={() => setMode('load')}>Načítať hru</button>
          <button onClick={() => fileRef.current?.click()}>Načítať hru zo súboru…</button>
          <button onClick={() => setMode('db')}>Databáza hráčov a klubov</button>
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
  const [db, setDb] = useState<Database | null>(null);
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('SK');
  const [age, setAge] = useState(40);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActiveDatabase().then(({ db }) => {
      setDb(db);
      setLeagueId(db.leagues[0]?.id ?? null);
    });
  }, []);

  const clubs = useMemo(
    () => (db && leagueId ? db.clubs.filter((c) => c.leagueId === leagueId).sort((a, b) => a.reputation - b.reputation) : []),
    [db, leagueId],
  );
  const valid = !!db && name.trim().length >= 2 && !!clubId && age >= 25 && age <= 75;

  const start = () => {
    if (!valid || !db || !clubId) return;
    try {
      onStart(newGame(db, { manager: { name: name.trim(), nationality, age }, clubId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!db) {
    return (
      <div className="center-page">
        <div className="muted">Načítavam databázu…</div>
      </div>
    );
  }

  return (
    <div className="center-page">
      <div className="menu-box wide">
        <h1>Nová hra</h1>
        <p className="muted" style={{ marginTop: -6 }}>
          Databáza: {db.name}
        </p>

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
            {db.leagues.map((l) => (
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
                <ClubBadge club={c} size={26} />
                <span>
                  <div>{c.name}</div>
                  <div className="meta">
                    Sila {c.reputation} · {money(clubBalance(c))}
                    {c.reserveOf ? ' · B-tím' : ''}
                  </div>
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="bad">{error}</p>}
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
