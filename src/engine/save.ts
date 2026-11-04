// Ukladanie hry do prehliadača (IndexedDB) a export/import do súboru

import { del, get, set } from 'idb-keyval';
import { SAVE_VERSION } from './game';
import { Rng } from './rng';
import { createSeason } from './schedule';
import { defaultTactic } from './tactics';
import { seasonStartSnapshot } from './finance';
import { initialManagement } from './management';
import { randomPersonality } from './generator';
import type { GameState } from './types';

export interface SaveMeta {
  slot: string;
  label: string;
  savedAt: string;
  managerName: string;
  clubName: string;
  gameDate: string;
}

const INDEX_KEY = 'saves:index';
const slotKey = (slot: string) => `save:${slot}`;
export const AUTOSAVE_SLOT = 'auto';

export async function listSaves(): Promise<SaveMeta[]> {
  const index = (await get<SaveMeta[]>(INDEX_KEY)) ?? [];
  return index.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveGame(state: GameState, slot: string, label: string): Promise<void> {
  await set(slotKey(slot), state);
  const index = (await get<SaveMeta[]>(INDEX_KEY)) ?? [];
  const meta: SaveMeta = {
    slot,
    label,
    savedAt: new Date().toISOString(),
    managerName: state.manager.name,
    clubName: state.clubs[state.manager.clubId]?.name ?? '',
    gameDate: state.date,
  };
  await set(INDEX_KEY, [...index.filter((m) => m.slot !== slot), meta]);
}

export async function loadGame(slot: string): Promise<GameState | null> {
  const state = await get<GameState>(slotKey(slot));
  if (!state) return null;
  return migrate(state);
}

export async function deleteSave(slot: string): Promise<void> {
  await del(slotKey(slot));
  const index = (await get<SaveMeta[]>(INDEX_KEY)) ?? [];
  await set(INDEX_KEY, index.filter((m) => m.slot !== slot));
}

/** Stiahnutie textu ako súboru */
export function downloadText(fileName: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/\s+/g, '_');
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Export uloženej hry do súboru JSON */
export function exportToFile(state: GameState): void {
  const club = state.clubs[state.manager.clubId]?.shortName ?? 'hra';
  downloadText(`manazer-${club}-${state.date}.json`, JSON.stringify(state));
}

export async function importFromFile(file: File): Promise<GameState> {
  const text = await file.text();
  const state = JSON.parse(text) as GameState;
  if (!state || typeof state !== 'object' || !state.players || !state.clubs || !state.manager) {
    throw new Error('Súbor nie je platná uložená hra.');
  }
  return migrate(state);
}

/** Úprava starších uložených hier na aktuálnu verziu */
function migrate(state: GameState): GameState {
  if (state.version > SAVE_VERSION) {
    throw new Error('Uložená hra je z novšej verzie hry.');
  }
  if (state.version < 2) {
    state.staff ??= {};
    state.databaseName ??= 'Predvolená databáza 2026/27';
    state.version = 2;
  }
  if (state.version < 3) {
    const rng = new Rng(state.rngState);
    state.seasonData = createSeason(state, rng);
    state.tactic = defaultTactic(Object.values(state.players).filter((p) => p.clubId === state.manager.clubId));
    state.rngState = rng.state;
    state.version = 3;
  }
  if (state.version < 4) {
    state.offers ??= [];
    state.transfers ??= [];
    state.ledger ??= [];
    state.seasonData.start ??= seasonStartSnapshot(state);
    state.version = 4;
  }
  if (state.version < 5) {
    const rng = new Rng(state.rngState);
    initialManagement(state, rng);
    state.rngState = rng.state;
    state.version = 5;
  }
  if (state.version < 6) {
    const rng = new Rng(state.rngState);
    for (const p of Object.values(state.players)) p.personality ??= randomPersonality(rng);
    state.rngState = rng.state;
    state.version = 6;
  }
  return state;
}
