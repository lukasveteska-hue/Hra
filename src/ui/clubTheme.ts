// Klubové farby v rozhraní hry

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(hex: string): number {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Zvýrazňujúca farba: farebná klubová farba, ktorá je čitateľná na tmavom pozadí */
function pickAccent(colors: [string, string]): string {
  const cands = colors.filter((c) => saturation(c) > 0.35);
  for (const c of cands) {
    let x = c;
    // Príliš tmavé farby zosvetlíme, aby boli vidieť na antracitovom pozadí
    for (let i = 0; i < 6 && luminance(x) < 0.12; i++) x = mix(x, '#ffffff', 0.18);
    return x;
  }
  // Čierno-biele kluby
  return '#d9dde1';
}

export interface ClubTheme {
  '--accent': string;
  '--accent-2': string;
  '--accent-ink': string;
  '--club-1': string;
  '--club-2': string;
  '--club-bar': string;
}

export function clubTheme(colors: [string, string]): ClubTheme {
  const accent = pickAccent(colors);
  return {
    '--accent': accent,
    '--accent-2': mix(accent, '#ffffff', 0.25),
    '--accent-ink': luminance(accent) > 0.35 ? '#141414' : '#ffffff',
    '--club-1': colors[0],
    '--club-2': colors[1],
    // Horná lišta: tmavý odtieň klubovej farby
    '--club-bar': mix(colors[0], '#16181b', 0.72),
  };
}
