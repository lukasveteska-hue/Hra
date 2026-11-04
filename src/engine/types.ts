// Základné herné typy

/** B = brankár, O = obranca, Z = záložník, U = útočník */
export type Position = 'B' | 'O' | 'Z' | 'U';

/** Skrytý typ vývoja hráča – náhoda, či a kedy dosiahne potenciál */
export type DevType = 'normal' | 'early' | 'late' | 'bust';

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  /** ISO kód krajiny, napr. "CZ", "SK" */
  nationality: string;
  /** Dátum narodenia YYYY-MM-DD */
  birthDate: string;
  position: Position;

  // Atribúty 1–99 (s desatinami, zobrazujú sa ako celé čísla)
  fyz: number;
  tech: number;
  /** Obranné vlastnosti (pri brankárovi sa nepoužívajú) */
  obr: number;
  /** Útočné vlastnosti (pri brankárovi sa nepoužívajú) */
  uto: number;
  /** Brankárske schopnosti (len brankár) */
  bra: number;

  /** Potenciál 1–99 – viditeľný */
  potential: number;
  /** Skryté: typ vývoja */
  devType: DevType;

  /** Energia 0–100 */
  energy: number;
  /** Skrytá forma 0–20 (zobrazuje sa ako 5 šípok) */
  form: number;
  /** Morálka 0–100 */
  morale: number;
  /** Odohrané zápasy v kariére (skrytý bonus k výkonu) */
  careerMatches: number;

  /** Zranenie – počet dní do uzdravenia */
  injuryDays: number;
  /** Trest – počet zápasov */
  suspension: number;
  yellowCards: number;

  clubId: string | null;
  /** Rok, v ktorom zmluva končí (30. júna) */
  contractUntil: number;
  /** Mesačný plat v € */
  wage: number;
  /** Cenový koeficient ligy, ktorý sa po prestupe mení postupne */
  priceFactor: number;
  /** Je na prestupovej listine */
  listed: boolean;
  /** Požadovaná cena (ak je na listine) */
  askingPrice: number | null;
}

export type Country = 'CZ' | 'SK' | string;

export interface Club {
  id: string;
  name: string;
  shortName: string;
  /** 2–3 písmenová skratka na logo */
  abbr: string;
  country: Country;
  city: string;
  stadium: string;
  capacity: number;
  colors: [string, string];
  /** Id ligy (len CZ/SK); zahraničné kluby majú null */
  leagueId: string | null;
  /** Sila / reputácia klubu 1–99 */
  reputation: number;
  /** Zostatok na účte v € */
  balance: number;
  /** B-tím (nemôže postúpiť do ligy, kde hrá A-tím) */
  reserveOf?: string;
  /** Cesta alebo adresa loga, napr. "logos/slavia.png" */
  logo?: string | null;
}

/** Funkcia zamestnanca klubu */
export type StaffRole = 'trener' | 'asistent' | 'brankar_trener' | 'kondicny_trener' | 'lekar';

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate: string;
  role: StaffRole;
  clubId: string | null;
  /** Kvalita 1–99 */
  quality: number;
}

export interface League {
  id: string;
  name: string;
  country: 'CZ' | 'SK';
  tier: 1 | 2;
  clubIds: string[];
}

export interface Manager {
  name: string;
  nationality: string;
  age: number;
  clubId: string;
}

export interface NewsItem {
  date: string;
  text: string;
}

export interface GameState {
  version: number;
  /** Aktuálny dátum hry YYYY-MM-DD */
  date: string;
  /** Rok začiatku sezóny, napr. 2026 = sezóna 2026/27 */
  season: number;
  manager: Manager;
  clubs: Record<string, Club>;
  leagues: Record<string, League>;
  players: Record<string, Player>;
  staff: Record<string, Staff>;
  /** Názov databázy, z ktorej hra vznikla */
  databaseName: string;
  news: NewsItem[];
  /** Stav generátora náhodných čísel */
  rngState: number;
  nextId: number;
}
