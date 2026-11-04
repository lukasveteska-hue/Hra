// Aktívna databáza – uložená v prehliadači; ak žiadna nie je nahratá, použije sa predvolená

import { del, get, set } from 'idb-keyval';
import { buildDefaultDatabase, type Database } from './database';

const KEY = 'db:active';
let defaultDb: Database | null = null;

export function defaultDatabase(): Database {
  defaultDb ??= buildDefaultDatabase();
  return defaultDb;
}

export async function getActiveDatabase(): Promise<{ db: Database; custom: boolean }> {
  const stored = await get<Database>(KEY).catch(() => undefined);
  if (stored) return { db: stored, custom: true };
  return { db: defaultDatabase(), custom: false };
}

export async function setActiveDatabase(db: Database): Promise<void> {
  await set(KEY, db);
}

export async function resetActiveDatabase(): Promise<void> {
  await del(KEY);
}
