// Počasie v deň zápasu – podľa ročného obdobia (stredná Európa) a náhody.
// Je vždy rovnaké pre ten istý zápas (počíta sa z id zápasu a dátumu).

import { Rng } from './rng';

export type WeatherKind = 'slnko' | 'polojasno' | 'zamracene' | 'dazd' | 'lejak' | 'sneh' | 'hmla';

export interface Weather {
  kind: WeatherKind;
  /** Teplota v °C */
  temp: number;
}

export const WEATHER_INFO: Record<WeatherKind, { name: string; icon: string }> = {
  slnko: { name: 'Slnečno', icon: '☀️' },
  polojasno: { name: 'Polojasno', icon: '⛅' },
  zamracene: { name: 'Zamračené', icon: '☁️' },
  dazd: { name: 'Dážď', icon: '🌧️' },
  lejak: { name: 'Lejak', icon: '⛈️' },
  sneh: { name: 'Sneženie', icon: '🌨️' },
  hmla: { name: 'Hmla', icon: '🌫️' },
};

/** Priemerná denná teplota podľa mesiaca (približne Česko/Slovensko) */
const AVG_TEMP = [0, -1, 1, 6, 12, 17, 20, 22, 22, 17, 11, 5, 1];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function weatherFor(fixtureId: string, date: string): Weather {
  const rng = new Rng(hash(`${fixtureId}|${date}`));
  const month = Number(date.slice(5, 7));
  const temp = Math.round(AVG_TEMP[month] + rng.normal(0, 4));
  const winter = month <= 2 || month === 12;
  const autumn = month >= 10 || month === 3;
  const r = rng.next();
  let kind: WeatherKind;
  if (winter) kind = r < 0.15 ? 'slnko' : r < 0.35 ? 'polojasno' : r < 0.6 ? 'zamracene' : r < 0.72 ? 'hmla' : temp <= 1 ? 'sneh' : 'dazd';
  else if (autumn) kind = r < 0.2 ? 'slnko' : r < 0.45 ? 'polojasno' : r < 0.68 ? 'zamracene' : r < 0.78 ? 'hmla' : r < 0.95 ? 'dazd' : 'lejak';
  else kind = r < 0.38 ? 'slnko' : r < 0.65 ? 'polojasno' : r < 0.8 ? 'zamracene' : r < 0.94 ? 'dazd' : 'lejak';
  if (kind === 'sneh' && temp > 2) kind = 'dazd';
  return { kind, temp };
}

/** Ako veľmi je počasie nepríjemné na hru (0 = ideálne, 1 = veľmi zlé) */
export function weatherHarshness(w: Weather): number {
  let h = { slnko: 0, polojasno: 0, zamracene: 0.05, dazd: 0.4, lejak: 0.8, sneh: 0.9, hmla: 0.3 }[w.kind];
  if (w.temp >= 28) h = Math.max(h, 0.5);
  if (w.temp <= -3) h = Math.max(h, 0.6);
  return h;
}

/**
 * Veľmi jemný vplyv na výkon: v zlom počasí sa fyzicky silným hráčom darí o trochu viac
 * ako technickým (max. približne ±2 %).
 */
export function weatherPlayerFactor(w: Weather, fyz: number, tech: number): number {
  const h = weatherHarshness(w);
  const bias = Math.max(-1, Math.min(1, (fyz - tech) / 30));
  return 1 + h * 0.02 * bias;
}

/** Vplyv na návštevnosť (pekné počasie +, zlé −) */
export function weatherAttendance(w: Weather): number {
  if (w.kind === 'slnko' && w.temp >= 12 && w.temp <= 27) return 0.05;
  if (w.kind === 'polojasno' && w.temp >= 10) return 0.03;
  return -weatherHarshness(w) * 0.08;
}

export function weatherLabel(w: Weather): string {
  const i = WEATHER_INFO[w.kind];
  return `${i.icon} ${i.name}, ${w.temp} °C`;
}
