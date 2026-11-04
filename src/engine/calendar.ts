// Dátumy a kalendár sezóny

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = nedeľa … 6 = sobota */
export function weekday(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

const WEEKDAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
export function weekdayName(iso: string): string {
  return WEEKDAYS[weekday(iso)];
}

/** Prestupové obdobia: leto 20. 6. – 1. 9., zima 1. 1. – 28. 2. */
export function transferWindow(iso: string): 'leto' | 'zima' | null {
  const md = iso.slice(5);
  if (md >= '06-15' && md <= '09-01') return 'leto';
  if (md >= '01-01' && md <= '02-28') return 'zima';
  return null;
}

/** Koniec aktuálneho prestupového obdobia */
export function transferWindowEnd(iso: string): string | null {
  const w = transferWindow(iso);
  const y = iso.slice(0, 4);
  if (w === 'leto') return `${y}-09-01`;
  if (w === 'zima') return `${y}-02-28`;
  return null;
}

/**
 * Dátumy kôl ligy: soboty od začiatku do konca sezóny, bez zimnej prestávky
 * a reprezentačných prestávok. Ak sobôt nestačí, pridajú sa kolá v stredu.
 */
export function roundDates(season: number, start: string, count: number): string[] {
  const end = `${season + 1}-05-29`;
  const winterFrom = `${season}-12-13`;
  const winterTo = `${season + 1}-02-05`;
  // Reprezentačné prestávky (soboty)
  const breaks = new Set([`${season}-09-05`, `${season}-10-10`, `${season}-11-14`, `${season + 1}-03-27`]);
  const inWinter = (d: string) => d > winterFrom && d < winterTo;

  let d = start;
  while (weekday(d) !== 6) d = addDays(d, 1);
  const saturdays: string[] = [];
  for (; d <= end; d = addDays(d, 7)) {
    if (!inWinter(d) && !breaks.has(d)) saturdays.push(d);
  }
  if (saturdays.length >= count) return saturdays.slice(0, count);

  // Doplnenie stredajších kôl rovnomerne počas sezóny (nie v prvých 3 týždňoch)
  const wednesdays = saturdays.slice(3, -1).map((s) => addDays(s, 4)).filter((w) => !inWinter(w));
  const need = count - saturdays.length;
  const picked: string[] = [];
  for (let i = 0; i < need && i < wednesdays.length; i++) {
    picked.push(wednesdays[Math.floor(((i + 0.5) * wednesdays.length) / need)]);
  }
  return [...saturdays, ...picked].sort();
}
