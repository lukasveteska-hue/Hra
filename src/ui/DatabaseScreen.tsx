// Správa databázy: stiahnutie, nahratie, obnovenie predvolenej

import { useEffect, useRef, useState } from 'react';
import {
  databaseSummary,
  databaseToCsv,
  mergeCsvIntoDatabase,
  parseDatabaseJson,
  validateDatabase,
  type Database,
} from '../engine/database';
import { getActiveDatabase, resetActiveDatabase, setActiveDatabase } from '../engine/dbstore';
import { downloadText } from '../engine/save';

const TABLE_NAMES = { ligy: 'ligy', kluby: 'kluby', hraci: 'hráči', zamestnanci: 'zamestnanci' };

export function DatabaseScreen({ onBack }: { onBack: () => void }) {
  const [db, setDb] = useState<Database | null>(null);
  const [custom, setCustom] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; details?: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () =>
    getActiveDatabase().then((r) => {
      setDb(r.db);
      setCustom(r.custom);
    });
  useEffect(() => {
    refresh();
  }, []);

  if (!db) return <div className="center-page muted">Načítavam…</div>;
  const sum = databaseSummary(db);
  const fileBase = db.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const downloadJson = () => downloadText(`${fileBase}.json`, JSON.stringify(db, null, 1));
  const downloadCsv = () => {
    const tables = databaseToCsv(db);
    for (const [name, text] of Object.entries(tables)) downloadText(`${fileBase}-${name}.csv`, text, 'text/csv');
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const list = await Promise.all([...files].map(async (f) => ({ name: f.name, text: await f.text() })));
      const json = list.find((f) => f.name.toLowerCase().endsWith('.json'));
      let next: Database;
      let what: string;
      if (json) {
        next = parseDatabaseJson(json.text);
        what = 'celá databáza';
      } else {
        const r = mergeCsvIntoDatabase(db, list);
        next = r.db;
        what = `tabuľky: ${r.tables.map((t) => TABLE_NAMES[t]).join(', ')}`;
      }
      const errors = validateDatabase(next);
      if (errors.length) {
        setMsg({ ok: false, text: 'Databáza obsahuje chyby a nebola nahratá:', details: errors });
        return;
      }
      await setActiveDatabase(next);
      setMsg({ ok: true, text: `Nahraté (${what}). Nové hry sa vytvoria z tejto databázy.` });
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="center-page">
      <div className="menu-box wide">
        <h1>Databáza</h1>

        <div className="panel">
          <h3>Aktívna databáza</h3>
          <p style={{ marginTop: 0 }}>
            <strong>{db.name}</strong> {custom ? <span className="mid">(nahratá)</span> : <span className="muted">(predvolená)</span>}
          </p>
          <div className="grid-3">
            <div className="stat">
              <div className="label">Ligy / kluby</div>
              <div className="value">
                {sum.leagues} / {sum.clubs}
              </div>
            </div>
            <div className="stat">
              <div className="label">Hráči (s atribútmi)</div>
              <div className="value">
                {sum.players} ({sum.playersWithAttrs})
              </div>
            </div>
            <div className="stat">
              <div className="label">Zamestnanci</div>
              <div className="value">{sum.staff}</div>
            </div>
          </div>
          <p className="muted">
            Zmena databázy sa prejaví v nových hrách. Rozohraté hry si ponechávajú svojich hráčov.
          </p>
        </div>

        <div className="panel">
          <h3>Stiahnuť</h3>
          <div className="row">
            <button onClick={downloadJson}>Celá databáza (JSON)</button>
            <button onClick={downloadCsv}>Tabuľky pre Excel (4× CSV)</button>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            JSON je jeden súbor so všetkým. CSV sú samostatné tabuľky (ligy, kluby, hráči, zamestnanci), ktoré sa dajú upraviť
            v Exceli alebo Google Tabuľkách.
          </p>
        </div>

        <div className="panel">
          <h3>Nahrať</h3>
          <button className="primary" onClick={() => fileRef.current?.click()}>
            Vybrať súbory…
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".json,.csv,application/json,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => upload(e.target.files)}
          />
          <ul className="muted" style={{ marginBottom: 0 }}>
            <li>Súbor JSON nahradí celú databázu.</li>
            <li>Súbory CSV nahradia len tie tabuľky, ktoré nahráš (napr. len hráčov). Môžeš vybrať viac súborov naraz.</li>
            <li>
              V tabuľke hráčov môžu atribúty, potenciál, zmluva a plat ostať prázdne – hra ich odhadne podľa sily klubu. Kluby
              s malým počtom hráčov hra doplní vygenerovanými.
            </li>
          </ul>
          {msg && (
            <div className={msg.ok ? 'good' : 'bad'} style={{ marginTop: 12 }}>
              {msg.text}
              {msg.details && (
                <ul>
                  {msg.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {custom && (
          <div className="panel">
            <h3>Obnoviť</h3>
            <button
              className="danger"
              onClick={async () => {
                if (confirm('Vrátiť predvolenú databázu? Nahratá databáza sa z prehliadača odstráni.')) {
                  await resetActiveDatabase();
                  setMsg({ ok: true, text: 'Obnovená predvolená databáza.' });
                  refresh();
                }
              }}
            >
              Vrátiť predvolenú databázu
            </button>
          </div>
        )}

        <button onClick={onBack}>← Späť</button>
      </div>
    </div>
  );
}
