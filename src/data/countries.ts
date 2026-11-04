// Krajiny – slovenské názvy a vlajky

export const COUNTRY_NAMES: Record<string, string> = {
  SK: 'Slovensko',
  CZ: 'Česko',
  PL: 'Poľsko',
  HU: 'Maďarsko',
  AT: 'Rakúsko',
  DE: 'Nemecko',
  UA: 'Ukrajina',
  HR: 'Chorvátsko',
  RS: 'Srbsko',
  SI: 'Slovinsko',
  BA: 'Bosna a Hercegovina',
  ME: 'Čierna Hora',
  MK: 'Severné Macedónsko',
  AL: 'Albánsko',
  RO: 'Rumunsko',
  BG: 'Bulharsko',
  GR: 'Grécko',
  TR: 'Turecko',
  EN: 'Anglicko',
  SC: 'Škótsko',
  WA: 'Wales',
  IE: 'Írsko',
  ES: 'Španielsko',
  PT: 'Portugalsko',
  IT: 'Taliansko',
  FR: 'Francúzsko',
  NL: 'Holandsko',
  BE: 'Belgicko',
  CH: 'Švajčiarsko',
  DK: 'Dánsko',
  NO: 'Nórsko',
  SE: 'Švédsko',
  FI: 'Fínsko',
  IS: 'Island',
  CY: 'Cyprus',
  IL: 'Izrael',
  LT: 'Litva',
  LV: 'Lotyšsko',
  EE: 'Estónsko',
  BY: 'Bielorusko',
  RU: 'Rusko',
  GE: 'Gruzínsko',
  AM: 'Arménsko',
  AZ: 'Azerbajdžan',
  KZ: 'Kazachstan',
  MD: 'Moldavsko',
  BR: 'Brazília',
  AR: 'Argentína',
  UY: 'Uruguaj',
  CO: 'Kolumbia',
  US: 'USA',
  JP: 'Japonsko',
  KR: 'Južná Kórea',
  NG: 'Nigéria',
  GH: 'Ghana',
  CI: 'Pobrežie Slonoviny',
  SN: 'Senegal',
  CM: 'Kamerun',
  ML: 'Mali',
  MA: 'Maroko',
  DZ: 'Alžírsko',
  EG: 'Egypt',
  ZA: 'Južná Afrika',
  GN: 'Guinea',
  BF: 'Burkina Faso',
  GM: 'Gambia',
  TG: 'Togo',
  AU: 'Austrália',
};

const SUBDIVISION_FLAGS: Record<string, string> = {
  EN: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  SC: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  WA: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

export function flagEmoji(code: string): string {
  if (SUBDIVISION_FLAGS[code]) return SUBDIVISION_FLAGS[code];
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

/** Krajiny na výber pri vytváraní trénera, zoradené podľa názvu */
export const COUNTRY_OPTIONS = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name, 'sk'));
