// Reálne kluby českej a slovenskej ligy, sezóna 2026/27
// Reputácia (1–99) je odhad sily klubu, dá sa upraviť.

export interface ClubSeed {
  id: string;
  name: string;
  shortName: string;
  abbr: string;
  city: string;
  stadium: string;
  capacity: number;
  colors: [string, string];
  reputation: number;
  reserveOf?: string;
}

export interface LeagueSeed {
  id: string;
  name: string;
  country: 'CZ' | 'SK';
  tier: 1 | 2;
  /** Nadstavba po základnej časti */
  split?: Array<{ name: string; from: number; to: number }>;
  clubs: ClubSeed[];
}

export const LEAGUES: LeagueSeed[] = [
  {
    id: 'CZ1',
    name: 'Chance Liga',
    country: 'CZ',
    tier: 1,
    split: [
      { name: 'Skupina o titul', from: 1, to: 6 },
      { name: 'Skupina o záchranu', from: 11, to: 16 },
    ],
    clubs: [
      { id: 'slavia', name: 'SK Slavia Praha', shortName: 'Slavia', abbr: 'SLA', city: 'Praha', stadium: 'Fortuna Arena', capacity: 19370, colors: ['#d50000', '#ffffff'], reputation: 75 },
      { id: 'sparta', name: 'AC Sparta Praha', shortName: 'Sparta', abbr: 'SPA', city: 'Praha', stadium: 'epet ARENA', capacity: 18349, colors: ['#7a0019', '#f2c200'], reputation: 74 },
      { id: 'plzen', name: 'FC Viktoria Plzeň', shortName: 'Plzeň', abbr: 'PLZ', city: 'Plzeň', stadium: 'Doosan Arena', capacity: 11597, colors: ['#c8102e', '#003da5'], reputation: 71 },
      { id: 'banik', name: 'FC Baník Ostrava', shortName: 'Baník', abbr: 'BAN', city: 'Ostrava', stadium: 'Městský stadion', capacity: 15081, colors: ['#004a99', '#ffffff'], reputation: 66 },
      { id: 'jablonec', name: 'FK Jablonec', shortName: 'Jablonec', abbr: 'JAB', city: 'Jablonec nad Nisou', stadium: 'Stadion Střelnice', capacity: 5690, colors: ['#00843d', '#111111'], reputation: 64 },
      { id: 'mlboleslav', name: 'FK Mladá Boleslav', shortName: 'Ml. Boleslav', abbr: 'MBO', city: 'Mladá Boleslav', stadium: 'Lokotrans Aréna', capacity: 5000, colors: ['#0047ab', '#ffffff'], reputation: 63 },
      { id: 'olomouc', name: 'SK Sigma Olomouc', shortName: 'Olomouc', abbr: 'SIG', city: 'Olomouc', stadium: 'Andrův stadion', capacity: 12474, colors: ['#005bbb', '#ffffff'], reputation: 63 },
      { id: 'liberec', name: 'FC Slovan Liberec', shortName: 'Liberec', abbr: 'LIB', city: 'Liberec', stadium: 'Stadion u Nisy', capacity: 9900, colors: ['#ffffff', '#00519e'], reputation: 63 },
      { id: 'hradec', name: 'FC Hradec Králové', shortName: 'Hradec Kr.', abbr: 'HKR', city: 'Hradec Králové', stadium: 'Malšovická aréna', capacity: 9300, colors: ['#111111', '#ffffff'], reputation: 62 },
      { id: 'slovacko', name: '1. FC Slovácko', shortName: 'Slovácko', abbr: 'SLO', city: 'Uherské Hradiště', stadium: 'Stadion Miroslava Valenty', capacity: 8000, colors: ['#00539f', '#ffffff'], reputation: 61 },
      { id: 'bohemians', name: 'Bohemians Praha 1905', shortName: 'Bohemians', abbr: 'BOH', city: 'Praha', stadium: 'Ďolíček', capacity: 6300, colors: ['#00a650', '#ffffff'], reputation: 60 },
      { id: 'teplice', name: 'FK Teplice', shortName: 'Teplice', abbr: 'TEP', city: 'Teplice', stadium: 'Na Stínadlech', capacity: 17078, colors: ['#ffd200', '#0033a0'], reputation: 60 },
      { id: 'pardubice', name: 'FK Pardubice', shortName: 'Pardubice', abbr: 'PAR', city: 'Pardubice', stadium: 'CFIG Arena', capacity: 4620, colors: ['#d6001c', '#ffffff'], reputation: 59 },
      { id: 'zlin', name: 'FC Zlín', shortName: 'Zlín', abbr: 'ZLN', city: 'Zlín', stadium: 'Letná', capacity: 5898, colors: ['#ffd400', '#004b9b'], reputation: 59 },
      { id: 'zbrojovka', name: 'FC Zbrojovka Brno', shortName: 'Zbrojovka', abbr: 'ZBR', city: 'Brno', stadium: 'Městský stadion Srbská', capacity: 10785, colors: ['#e2001a', '#ffffff'], reputation: 58 },
      { id: 'artis', name: 'SK Artis Brno', shortName: 'Artis Brno', abbr: 'ART', city: 'Brno', stadium: 'Městský stadion Srbská', capacity: 10785, colors: ['#1b3f8b', '#ffffff'], reputation: 58 },
    ],
  },
  {
    id: 'CZ2',
    name: 'Chance Národní liga',
    country: 'CZ',
    tier: 2,
    clubs: [
      { id: 'karvina', name: 'MFK Karviná', shortName: 'Karviná', abbr: 'KAR', city: 'Karviná', stadium: 'Městský stadion', capacity: 4833, colors: ['#00843d', '#ffffff'], reputation: 56 },
      { id: 'dukla', name: 'FK Dukla Praha', shortName: 'Dukla', abbr: 'DUK', city: 'Praha', stadium: 'Stadion Juliska', capacity: 8150, colors: ['#8b1a1a', '#ffd200'], reputation: 55 },
      { id: 'taborsko', name: 'FC Silon Táborsko', shortName: 'Táborsko', abbr: 'TAB', city: 'Tábor', stadium: 'Stadion v Kvapilově ulici', capacity: 1500, colors: ['#0033a0', '#ffffff'], reputation: 52 },
      { id: 'usti', name: 'FK Viagem Ústí nad Labem', shortName: 'Ústí n. L.', abbr: 'UST', city: 'Ústí nad Labem', stadium: 'Městský stadion', capacity: 4000, colors: ['#0055a5', '#ffffff'], reputation: 53 },
      { id: 'banikb', name: 'FC Baník Ostrava B', shortName: 'Baník B', abbr: 'BAB', city: 'Ostrava', stadium: 'Městský stadion', capacity: 15123, colors: ['#004a99', '#ffffff'], reputation: 49, reserveOf: 'banik' },
      { id: 'pribram', name: 'FK Příbram', shortName: 'Příbram', abbr: 'PRI', city: 'Příbram', stadium: 'Na Litavce', capacity: 9100, colors: ['#111111', '#ffffff'], reputation: 51 },
      { id: 'opava', name: 'SFC Opava', shortName: 'Opava', abbr: 'OPA', city: 'Opava', stadium: 'Stadion v Městských sadech', capacity: 7524, colors: ['#ffd200', '#003da5'], reputation: 52 },
      { id: 'zizkov', name: 'FK Viktoria Žižkov', shortName: 'Žižkov', abbr: 'ZIZ', city: 'Praha', stadium: 'FK Viktoria Stadion', capacity: 2799, colors: ['#d50000', '#ffffff'], reputation: 50 },
      { id: 'vlasim', name: 'FC Sellier & Bellot Vlašim', shortName: 'Vlašim', abbr: 'VLA', city: 'Vlašim', stadium: 'Stadion Kollárova ulice', capacity: 3000, colors: ['#0047ab', '#ffffff'], reputation: 50 },
      { id: 'slaviab', name: 'SK Slavia Praha B', shortName: 'Slavia B', abbr: 'SLB', city: 'Praha', stadium: 'FK Viktoria Stadion', capacity: 2799, colors: ['#d50000', '#ffffff'], reputation: 51, reserveOf: 'slavia' },
      { id: 'kromeriz', name: 'SK Hanácká Slavia Kroměříž', shortName: 'Kroměříž', abbr: 'KRO', city: 'Kroměříž', stadium: 'Stadion Jožky Silného', capacity: 1529, colors: ['#d50000', '#ffffff'], reputation: 48 },
      { id: 'prostejov', name: '1. SK Prostějov', shortName: 'Prostějov', abbr: 'PRO', city: 'Prostějov', stadium: 'Stadion Za Místním nádražím', capacity: 3500, colors: ['#0033a0', '#ffffff'], reputation: 51 },
      { id: 'jihlava', name: 'FC Vysočina Jihlava', shortName: 'Jihlava', abbr: 'JIH', city: 'Jihlava', stadium: 'Stadion v Jiráskově ulici', capacity: 4500, colors: ['#00843d', '#ffffff'], reputation: 51 },
      { id: 'kladno', name: 'SK Kladno', shortName: 'Kladno', abbr: 'KLA', city: 'Kladno', stadium: 'Stadion Františka Kloze', capacity: 3804, colors: ['#0033a0', '#ffffff'], reputation: 49 },
      { id: 'ceskalipa', name: 'FK Arsenal Česká Lípa', shortName: 'Česká Lípa', abbr: 'CLI', city: 'Česká Lípa', stadium: 'Městský stadion u Ploučnice', capacity: 5000, colors: ['#d50000', '#ffd200'], reputation: 47 },
      { id: 'trinec', name: 'FK Třinec', shortName: 'Třinec', abbr: 'TRI', city: 'Třinec', stadium: 'Stadion Rudolfa Labaje', capacity: 2200, colors: ['#ffffff', '#d50000'], reputation: 48 },
    ],
  },
  {
    id: 'SK1',
    name: 'Niké liga',
    country: 'SK',
    tier: 1,
    split: [
      { name: 'Skupina o titul', from: 1, to: 6 },
      { name: 'Skupina o záchranu', from: 7, to: 12 },
    ],
    clubs: [
      { id: 'slovan', name: 'ŠK Slovan Bratislava', shortName: 'Slovan', abbr: 'SBA', city: 'Bratislava', stadium: 'Tehelné pole', capacity: 22500, colors: ['#5ba4e0', '#ffffff'], reputation: 70 },
      { id: 'zilina', name: 'MŠK Žilina', shortName: 'Žilina', abbr: 'ZIL', city: 'Žilina', stadium: 'Štadión pod Dubňom', capacity: 10897, colors: ['#ffd200', '#007a3d'], reputation: 64 },
      { id: 'trnava', name: 'FC Spartak Trnava', shortName: 'Trnava', abbr: 'TRN', city: 'Trnava', stadium: 'Štadión Antona Malatinského', capacity: 19000, colors: ['#c8102e', '#111111'], reputation: 64 },
      { id: 'dac', name: 'FC DAC 1904 Dunajská Streda', shortName: 'DAC', abbr: 'DAC', city: 'Dunajská Streda', stadium: 'MOL Aréna', capacity: 12700, colors: ['#ffcd00', '#003b8f'], reputation: 64 },
      { id: 'kosice', name: 'FC Košice', shortName: 'Košice', abbr: 'KOS', city: 'Košice', stadium: 'Košická futbalová aréna', capacity: 12555, colors: ['#ffd200', '#00539f'], reputation: 61 },
      { id: 'podbrezova', name: 'FK Železiarne Podbrezová', shortName: 'Podbrezová', abbr: 'POD', city: 'Podbrezová', stadium: 'ZELPO Aréna', capacity: 4061, colors: ['#0047ab', '#ffffff'], reputation: 60 },
      { id: 'trencin', name: 'AS Trenčín', shortName: 'Trenčín', abbr: 'TRE', city: 'Trenčín', stadium: 'Štadión Sihoť', capacity: 10000, colors: ['#d40000', '#ffffff'], reputation: 59 },
      { id: 'ruzomberok', name: 'MFK Ružomberok', shortName: 'Ružomberok', abbr: 'RUZ', city: 'Ružomberok', stadium: 'Štadión pod Čebraťom', capacity: 4876, colors: ['#ffffff', '#0033a0'], reputation: 59 },
      { id: 'michalovce', name: 'MFK Zemplín Michalovce', shortName: 'Michalovce', abbr: 'MIC', city: 'Michalovce', stadium: 'Mestský futbalový štadión', capacity: 4400, colors: ['#00843d', '#ffffff'], reputation: 58 },
      { id: 'skalica', name: 'MFK Skalica', shortName: 'Skalica', abbr: 'SKA', city: 'Skalica', stadium: 'Mestský štadión', capacity: 2494, colors: ['#e30613', '#0b4ea2'], reputation: 57 },
      { id: 'komarno', name: 'KFC Komárno', shortName: 'Komárno', abbr: 'KOM', city: 'Komárno', stadium: 'ViOn Aréna', capacity: 4008, colors: ['#0055a5', '#ffffff'], reputation: 57 },
      { id: 'duklabb', name: 'FK Dukla Banská Bystrica', shortName: 'Dukla BB', abbr: 'DBB', city: 'Banská Bystrica', stadium: 'Národný atletický štadión', capacity: 7831, colors: ['#c8102e', '#ffd200'], reputation: 56 },
    ],
  },
  {
    id: 'SK2',
    name: 'Druhá liga',
    country: 'SK',
    tier: 2,
    clubs: [
      { id: 'presov', name: '1. FC Tatran Prešov', shortName: 'Prešov', abbr: 'PRE', city: 'Prešov', stadium: 'Futbal Tatran Arena', capacity: 6334, colors: ['#d50000', '#ffffff'], reputation: 53 },
      { id: 'zlmoravce', name: 'FC ViOn Zlaté Moravce', shortName: 'Zl. Moravce', abbr: 'ZLM', city: 'Zlaté Moravce', stadium: 'ViOn Aréna', capacity: 4006, colors: ['#ffd200', '#0033a0'], reputation: 51 },
      { id: 'samorin', name: 'FC ŠTK 1914 Šamorín', shortName: 'Šamorín', abbr: 'SAM', city: 'Šamorín', stadium: 'Pomlé', capacity: 1950, colors: ['#d50000', '#ffffff'], reputation: 49 },
      { id: 'liptmikulas', name: 'MFK Tatran Liptovský Mikuláš', shortName: 'Lipt. Mikuláš', abbr: 'LMI', city: 'Liptovský Mikuláš', stadium: 'Štadión Liptovský Mikuláš', capacity: 1950, colors: ['#0033a0', '#ffd200'], reputation: 49 },
      { id: 'bytca', name: 'MFK Bytča', shortName: 'Bytča', abbr: 'BYT', city: 'Bytča', stadium: 'Futbalový štadión MFK Bytča', capacity: 2000, colors: ['#00843d', '#ffffff'], reputation: 45 },
      { id: 'petrzalka', name: 'FC Petržalka', shortName: 'Petržalka', abbr: 'PET', city: 'Bratislava', stadium: 'Štadión FC Petržalka', capacity: 1600, colors: ['#ffd200', '#111111'], reputation: 49 },
      { id: 'zilinab', name: 'MŠK Žilina B', shortName: 'Žilina B', abbr: 'ZIB', city: 'Žilina', stadium: 'Štadión pod Dubňom', capacity: 11258, colors: ['#ffd200', '#007a3d'], reputation: 48, reserveOf: 'zilina' },
      { id: 'humenne', name: 'FK Humenné', shortName: 'Humenné', abbr: 'HUM', city: 'Humenné', stadium: 'Štadión Humenné', capacity: 1806, colors: ['#ffffff', '#00843d'], reputation: 46 },
      { id: 'povbystrica', name: 'MŠK Považská Bystrica', shortName: 'Pov. Bystrica', abbr: 'PBY', city: 'Považská Bystrica', stadium: 'Štadión MŠK Považská Bystrica', capacity: 2500, colors: ['#ff6a00', '#111111'], reputation: 47 },
      { id: 'pohronie', name: 'FK Pohronie', shortName: 'Pohronie', abbr: 'POH', city: 'Žiar nad Hronom', stadium: 'Mestský štadión', capacity: 2309, colors: ['#00843d', '#ffd200'], reputation: 47 },
      { id: 'zvolen', name: 'MFK Zvolen', shortName: 'Zvolen', abbr: 'ZVO', city: 'Zvolen', stadium: 'Štadión MFK Lokomotíva Zvolen', capacity: 1870, colors: ['#0033a0', '#ffffff'], reputation: 45 },
      { id: 'lehota', name: 'OFK Baník Lehota pod Vtáčnikom', shortName: 'Lehota p. V.', abbr: 'LEH', city: 'Lehota pod Vtáčnikom', stadium: 'Futbalový štadión OFK Baník', capacity: 800, colors: ['#111111', '#ffd200'], reputation: 44 },
      { id: 'slovanb', name: 'ŠK Slovan Bratislava B', shortName: 'Slovan B', abbr: 'SBB', city: 'Bratislava', stadium: 'Štadión Pasienky', capacity: 11591, colors: ['#5ba4e0', '#ffffff'], reputation: 50, reserveOf: 'slovan' },
      { id: 'galanta', name: 'FC Slovan Galanta', shortName: 'Galanta', abbr: 'GAL', city: 'Galanta', stadium: 'Štadión FC Slovan Galanta', capacity: 3000, colors: ['#0055a5', '#ffffff'], reputation: 45 },
      { id: 'malzenice', name: 'OFK Malženice', shortName: 'Malženice', abbr: 'MAL', city: 'Malženice', stadium: 'Štadión OFK Dynamo Malženice', capacity: 500, colors: ['#d50000', '#111111'], reputation: 44 },
      { id: 'inter', name: 'FK Inter Bratislava', shortName: 'Inter BA', abbr: 'INT', city: 'Bratislava', stadium: 'Štadión Pasienky', capacity: 11591, colors: ['#ffd200', '#111111'], reputation: 48 },
    ],
  },
];
