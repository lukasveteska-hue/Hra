// Základné herné typy

/** B = brankár, O = obranca, Z = záložník, U = útočník */
export type Position = 'B' | 'O' | 'Z' | 'U';

/** Skrytý typ vývoja hráča – náhoda, či a kedy dosiahne potenciál */
export type DevType = 'normal' | 'early' | 'late' | 'bust';

/** Povaha hráča – ovplyvňuje, kam a za koľko je ochotný prestúpiť */
export type Personality = 'ambiciozny' | 'zoldnier' | 'lojalny' | 'pohodar';

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
  /** Povaha hráča */
  personality: Personality;
  /** Skryté: skutočný strop hráča (pri „neúspešnom“ talente nižší ako potenciál) */
  ceiling?: number;

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
  /** Hráč odišiel do zahraničia (názov klubu) – už nehrá v hre */
  abroad?: string;
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
  /** Nadstavba po základnej časti (žiadna = len základná časť) */
  split?: SplitGroup[];
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
  /** Zápasy a štatistiky aktuálnej sezóny */
  seasonData: SeasonData;
  /** Taktika môjho klubu */
  tactic: Tactic;
  /** Ponuky na mojich hráčov */
  offers: Offer[];
  /** Všetky prestupy (aj medzi počítačovými klubmi) */
  transfers: TransferRecord[];
  /** Účtovníctvo môjho klubu */
  ledger: Transaction[];
  /** Správa môjho klubu: vstupné, sponzori, pôžičky, stavby */
  management: Management;
  /** História mojich sezón */
  history: SeasonHistory[];
  /** Stav generátora náhodných čísel */
  rngState: number;
  nextId: number;
}

// ---------- Fáza 2: zápasy, taktika, sezóna ----------

export type Style = 'normal' | 'kratke' | 'centre' | 'nabehy';

export interface Tactic {
  formation: string;
  /** Útočnosť 0–100 */
  attack: number;
  style: Style;
  /** Hráči v základnej zostave podľa pozícií formácie (rovnaké poradie ako sloty) */
  lineup: string[];
  /** Náhradníci (max 9) */
  bench: string[];
  captain: string | null;
}

/** Nadstavba ligy: skupiny podľa umiestnenia po základnej časti */
export interface SplitGroup {
  name: string;
  /** Umiestnenie od–do (vrátane), napr. 1–6 */
  from: number;
  to: number;
}

export interface Fixture {
  id: string;
  leagueId: string;
  round: number;
  /** 'zakladna' alebo index skupiny nadstavby ("s0", "s1") */
  phase: string;
  date: string;
  homeId: string;
  awayId: string;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  /** Strelci gólov: [minúta, id hráča, id klubu] */
  goals: Array<[number, string, string]>;
  /** Počet divákov */
  attendance?: number;
}

export interface PlayerSeasonStats {
  apps: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  ratingSum: number;
}

export interface SeasonData {
  fixtures: Fixture[];
  /** Dátumy kôl pre každú ligu (vrátane nadstavby) */
  roundDates: Record<string, string[]>;
  /** Či už bola vytvorená nadstavba danej ligy */
  splitDone: Record<string, boolean>;
  stats: Record<string, PlayerSeasonStats>;
  /** Stav môjho klubu na začiatku sezóny (na porovnanie na konci) */
  start?: SeasonStart;
  /** Vývoj tabuliek po kolách */
  posHistory?: Record<string, PosSnapshot[]>;
  /** Hodnota kádra môjho klubu v čase */
  valueHistory?: Array<{ date: string; value: number }>;
  /** Za ktoré kluby (a hráčov) už prišli odmeny za sezónu */
  prizesPaid?: boolean;
  /** Cieľ vedenia: umiestnenie do tohto miesta */
  boardTarget?: number;
  /** Baráž: či už bola vytvorená a vyhodnotená */
  playoffsCreated?: boolean;
  playoffsResolved?: boolean;
  /** Výsledky baráže a postupy/zostupy pripravené na novú sezónu */
  moves?: LeagueMove[];
}

export interface LeagueMove {
  clubId: string;
  from: string;
  to: string;
  reason: 'postup' | 'zostup' | 'baraz-postup' | 'baraz-zostup';
}

export type BoardRating = 'vyborna' | 'uspesna' | 'prijatelna' | 'neuspesna' | 'katastrofalna';

export interface SeasonHistory {
  season: number;
  clubId: string;
  leagueId: string;
  position: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  rating: BoardRating;
  target: number;
  /** Majstri jednotlivých líg */
  champions: Record<string, string>;
  /** Najlepší strelec môjho klubu */
  topScorer?: { name: string; goals: number };
  /** Najlepší strelec ligy */
  leagueTopScorer?: { name: string; club: string; goals: number };
  balanceEnd: number;
  income: number;
  expense: number;
  squadValueEnd: number;
  moves: LeagueMove[];
  /** Najdrahší predaj a nákup môjho klubu */
  bestSale?: { name: string; fee: number };
  bestBuy?: { name: string; fee: number };
}

// ---------- Fáza 3: prestupy, financie, história ----------

export type TxType =
  | 'mzdy'
  | 'vstupne'
  | 'tv'
  | 'sponzor'
  | 'odmena'
  | 'prestup_nakup'
  | 'prestup_predaj'
  | 'priatelsky'
  | 'pozicka'
  | 'splatka'
  | 'stavba'
  | 'ine';

export interface Transaction {
  date: string;
  type: TxType;
  amount: number;
  text: string;
  /** Zostatok po transakcii */
  balance: number;
}

export interface Offer {
  id: string;
  playerId: string;
  /** Kupujúci klub v hre, alebo null pri zahraničnom klube */
  fromClubId: string | null;
  /** Názov zahraničného klubu */
  foreignName?: string;
  foreignCountry?: string;
  amount: number;
  date: string;
  /** Do kedy platí */
  expires: string;
  /** Maximálna suma, ktorú je klub ochotný zaplatiť (skryté) */
  maxAmount: number;
  status: 'nova' | 'prijata' | 'odmietnuta' | 'protinavrh' | 'vyprsala';
}

export interface TransferRecord {
  date: string;
  playerId: string;
  playerName: string;
  position: Position;
  age: number;
  fromClubId: string | null;
  /** Ak klub nie je v hre (zahraničie / voľný hráč) */
  fromName?: string;
  toClubId: string | null;
  toName?: string;
  fee: number;
}

export interface SeasonStart {
  balance: number;
  squadValue: number;
  wageBill: number;
  playerOvr: Record<string, number>;
  playerValue: Record<string, number>;
  reputation: number;
}

export interface PosSnapshot {
  date: string;
  /** Poradie klubov (id) v tabuľke */
  order: string[];
  points: Record<string, number>;
}

// ---------- Fáza 4: správa klubu ----------

export interface SponsorDeal {
  name: string;
  /** Popis typu zmluvy */
  kind: 'istota' | 'vykon' | 'ambicia';
  monthly: number;
  /** Bonus za každú výhru v lige */
  winBonus: number;
  /** Bonus, ak klub skončí na tomto mieste alebo lepšie */
  targetPos: number;
  targetBonus: number;
}

export interface Loan {
  id: string;
  principal: number;
  remaining: number;
  /** Ročný úrok, napr. 0.05 */
  rate: number;
  monthlyPayment: number;
  months: number;
  monthsLeft: number;
  startDate: string;
}

export interface Project {
  kind: 'stadion' | 'trening' | 'akademia';
  seats?: number;
  level?: number;
  cost: number;
  startDate: string;
  finishDate: string;
}

export interface Management {
  /** Cena vstupenky; null = automatická */
  ticketPrice: number | null;
  sponsor: SponsorDeal | null;
  sponsorOffers: SponsorDeal[];
  loans: Loan[];
  projects: Project[];
  /** Úroveň tréningového centra 1–5 */
  training: number;
  /** Úroveň mládežníckej akadémie 1–5 */
  youth: number;
}
