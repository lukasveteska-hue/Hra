// Ukladanie hry do prehliadača (IndexedDB) a export/import do súboru

import { del, get, set } from 'idb-keyval';
import { SAVE_VERSION } from './game';
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

/** Export uloženej hry do súboru JSON */
export function exportToFile(state: GameState): void {
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const club = state.clubs[state.manager.clubId]?.shortName ?? 'hra';
  a.href = url;
  a.download = `manazer-${club}-${state.date}.json`.replace(/\s+/g, '_');
  a.click();
  URL.revokeObjectURL(url);
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
  return state;
}
