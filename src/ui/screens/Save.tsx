import { useEffect, useState } from 'react';
import { downloadText, exportToFile, listSaves, saveGame, type SaveMeta } from '../../engine/save';
import { databaseFromGame } from '../../engine/game';
import { useGame } from '../GameContext';

export function SaveScreen() {
  const { state, quit } = useGame();
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => listSaves().then(setSaves);
  useEffect(() => {
    refresh();
  }, []);

  const save = async (slot: string, name: string) => {
    await saveGame(state, slot, name);
    setMsg(`Hra uložená: ${name}`);
    setLabel('');
    refresh();
  };

  return (
    <>
      <h1>Hra</h1>
      <div className="panel">
        <h3>Uložiť ako novú pozíciu</h3>
        <div className="row">
          <input
            style={{ flex: 1, minWidth: 180 }}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={`napr. ${state.clubs[state.manager.clubId].shortName} – začiatok`}
          />
          <button
            className="primary"
            onClick={() => save(`s${Date.now()}`, label.trim() || `${state.clubs[state.manager.clubId].shortName} ${state.date}`)}
          >
            Uložiť
          </button>
        </div>
        {msg && <p className="good">{msg}</p>}
      </div>

      <div className="panel">
        <h3>Prepísať existujúcu pozíciu</h3>
        {saves.length === 0 && <div className="muted">Žiadne uložené hry.</div>}
        {saves.map((s) => (
          <div key={s.slot} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong>{s.label}</strong>
              <div className="muted" style={{ fontSize: 12 }}>
                {s.clubName} · v hre {s.gameDate}
              </div>
            </div>
            <div className="spacer" />
            <button
              onClick={() => {
                if (confirm(`Prepísať „${s.label}“?`)) save(s.slot, s.label);
              }}
            >
              Prepísať
            </button>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>Súbor</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Záloha alebo prenos hry na iné zariadenie (napr. z počítača do mobilu).
        </p>
        <div className="row">
          <button onClick={() => exportToFile(state)}>Stiahnuť hru do súboru</button>
          <button onClick={() => downloadText(`databaza-${state.date}.json`, JSON.stringify(databaseFromGame(state), null, 1))}>
            Stiahnuť aktuálnych hráčov ako databázu
          </button>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Databáza z hry obsahuje hráčov a kluby v aktuálnom stave. Dá sa nahrať v hlavnom menu a začať z nej novú hru.
        </p>
      </div>

      <button
        className="danger"
        onClick={() => {
          if (confirm('Odísť do hlavného menu? Neuložený postup sa stratí.')) quit();
        }}
      >
        Hlavné menu
      </button>
    </>
  );
}
