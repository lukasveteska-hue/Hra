import { describe, expect, it } from 'vitest';
import { buildDefaultDatabase, databaseToCsv, mergeCsvIntoDatabase, validateDatabase } from './database';
import { databaseFromGame, newGame, squadOf } from './game';
import { ovr } from './ratings';

const db = buildDefaultDatabase();
const manager = { name: 'Test', nationality: 'SK', age: 40 };

describe('predvolená databáza', () => {
  it('je platná a vždy rovnaká', () => {
    expect(validateDatabase(db)).toEqual([]);
    expect(buildDefaultDatabase().players[0]).toEqual(db.players[0]);
    expect(db.clubs.filter((c) => c.leagueId)).toHaveLength(60);
    expect(db.clubs.filter((c) => !c.leagueId).length).toBeGreaterThan(100);
  });
});

describe('nová hra', () => {
  const state = newGame(db, { manager, clubId: 'zlin', seed: 42 });

  it('každý klub má aspoň 22 hráčov', () => {
    for (const c of Object.values(state.clubs)) {
      expect(squadOf(state, c.id).length).toBeGreaterThanOrEqual(22);
    }
  });

  it('atribúty a potenciál sú v rozsahu 1–99', () => {
    for (const p of Object.values(state.players)) {
      for (const v of [p.fyz, p.tech, p.potential]) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(99);
      }
      expect(p.potential).toBeGreaterThanOrEqual(Math.floor(ovr(p)));
      if (p.clubId) expect(p.wage).toBeGreaterThan(0);
    }
  });

  it('silnejšie kluby majú lepších hráčov', () => {
    const avg = (id: string) => {
      const s = squadOf(state, id).map(ovr).sort((a, b) => b - a).slice(0, 11);
      return s.reduce((a, b) => a + b, 0) / s.length;
    };
    expect(avg('slavia')).toBeGreaterThan(avg('zlin'));
    expect(avg('zlin')).toBeGreaterThan(avg('malzenice'));
  });

  it('môj klub nemá ďalšieho hlavného trénera', () => {
    expect(Object.values(state.staff).some((s) => s.clubId === 'zlin' && s.role === 'trener')).toBe(false);
  });

  it('databáza z hry je platná', () => {
    expect(validateDatabase(databaseFromGame(state))).toEqual([]);
  });
});

describe('CSV', () => {
  it('export a import vráti rovnakých hráčov', () => {
    const csv = databaseToCsv(db);
    const { db: back, tables } = mergeCsvIntoDatabase(db, Object.entries(csv).map(([name, text]) => ({ name: `${name}.csv`, text })));
    expect(tables.sort()).toEqual(['hraci', 'kluby', 'ligy', 'zamestnanci']);
    expect(validateDatabase(back)).toEqual([]);
    expect(back.players).toHaveLength(db.players.length);
    const a = db.players[5];
    const b = back.players[5];
    expect(b.lastName).toBe(a.lastName);
    expect(b.position).toBe(a.position);
    expect(b.fyz).toBe(Math.round(a.fyz!));
    expect(back.clubs[0]).toMatchObject({ id: db.clubs[0].id, name: db.clubs[0].name, colors: db.clubs[0].colors });
  });

  it('hráči len s menom a klubom dostanú odhadnuté atribúty', () => {
    const csv = 'id;meno;priezvisko;narodnost;datum_narodenia;pozicia;klub\nx1;Ján;Skúšobný;SK;15.3.2001;Ú;zlin\n';
    const { db: small } = mergeCsvIntoDatabase(db, [{ name: 'hraci.csv', text: csv }]);
    expect(validateDatabase(small)).toEqual([]);
    const state = newGame(small, { manager, clubId: 'zlin', seed: 1 });
    const p = state.players.x1;
    expect(p.birthDate).toBe('2001-03-15');
    expect(p.position).toBe('U');
    expect(ovr(p)).toBeGreaterThan(30);
    // Ostatné kluby boli doplnené
    expect(squadOf(state, 'slavia').length).toBeGreaterThanOrEqual(22);
  });

  it('chybná databáza sa odmietne', () => {
    const csv = 'id;meno;priezvisko;narodnost;datum_narodenia;pozicia;klub\nx1;Ján;Chyba;SK;2001-03-15;X;neexistuje\n';
    const { db: bad } = mergeCsvIntoDatabase(db, [{ name: 'hraci.csv', text: csv }]);
    expect(validateDatabase(bad).length).toBe(2);
  });
});
