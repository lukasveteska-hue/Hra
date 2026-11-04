# Databáza hry

Hra berie ligy, kluby, hráčov a zamestnancov z **databázy**. Databáza sa dá stiahnuť,
upraviť a znova nahrať v hlavnom menu: **Databáza hráčov a klubov**.

- Nová hra sa vždy vytvorí z aktívnej (naposledy nahratej) databázy.
- Rozohraté hry si ponechávajú svojich hráčov, zmena databázy ich neovplyvní.
- Predvolená databáza: reálne kluby sezóny 2026/27, zatiaľ **vygenerovaní** hráči a zamestnanci
  (vždy rovnakí). Postupne ich nahradíme reálnymi.
- V hre (obrazovka **Hra**) sa dá stiahnuť aj databáza z rozohratej hry – hráči v aktuálnom stave.

## Formáty

### JSON – celá databáza v jednom súbore
Najlepší na zálohu a prenos. Pri nahratí nahradí celú databázu.

### CSV – tabuľky pre Excel / Google Tabuľky
Štyri súbory: `ligy`, `kluby`, `hraci`, `zamestnanci`. Oddeľovač je bodkočiarka `;`,
kódovanie UTF-8. Pri nahratí sa nahradia **len nahraté tabuľky** – napríklad stačí nahrať
iba upravený súbor hráčov. Hra rozpozná tabuľku podľa stĺpcov v hlavičke.

## Stĺpce

### ligy
| stĺpec | význam |
|---|---|
| id | skratka ligy, napr. `CZ1` |
| nazov | názov ligy |
| krajina | `CZ` alebo `SK` |
| uroven | `1` alebo `2` |

### kluby
| stĺpec | význam |
|---|---|
| id | skratka klubu bez medzier, napr. `slavia` (na ňu odkazujú hráči) |
| nazov, kratky_nazov, skratka | celý názov, krátky názov, 2–3 písmená na logo |
| krajina | kód krajiny |
| liga | id ligy (prázdne = zahraničný klub) |
| mesto, stadion, kapacita | |
| farba1, farba2 | farby klubu, napr. `#d50000` |
| sila | sila klubu 1–99 (podľa nej sa odhadujú chýbajúci hráči a atribúty) |
| rozpocet | počiatočné peniaze v € (prázdne = odhad podľa sily) |
| b_tim_klubu | pri B-tíme id A-tímu |
| logo | cesta k logu (`logos/slavia.png`) alebo internetová adresa obrázka |

### hraci
| stĺpec | význam |
|---|---|
| id | jedinečný identifikátor (prázdne = vytvorí sa automaticky) |
| meno, priezvisko | |
| narodnost | kód krajiny: `SK`, `CZ`, `PL`, `HU`, `UA`, `NG`… (Anglicko `EN`, Škótsko `SC`) |
| datum_narodenia | `2001-03-15` alebo `15.3.2001` |
| pozicia | `B`, `O`, `Z`, `Ú` (brankár, obranca, záložník, útočník) |
| klub | id klubu (prázdne = voľný hráč) |
| fyzicke, technicke | 1–99 |
| obranne, utocne | 1–99 (brankár nemá) |
| brankarske | 1–99 (len brankár) |
| potencial | 1–99 |
| zmluva_do | rok konca zmluvy, napr. `2028` (zmluva končí 30. 6.) |
| plat | mesačný plat v € |

**Prázdne hodnoty:** atribúty, potenciál, zmluva a plat môžu ostať prázdne – hra ich odhadne
podľa sily klubu a veku. Stačí teda zadať len meno, národnosť, dátum narodenia, pozíciu a klub.
Klubom, ktoré majú málo hráčov, hra doplní vygenerovaných.

### zamestnanci
| stĺpec | význam |
|---|---|
| id, meno, priezvisko, narodnost, datum_narodenia | ako pri hráčoch |
| funkcia | `trener`, `asistent`, `brankar_trener`, `kondicny_trener`, `lekar` |
| klub | id klubu |
| kvalita | 1–99 |

## Kontrola
Pri nahratí hra databázu skontroluje (neznámy klub, zlá pozícia, hodnoty mimo 1–99, nepárny
počet klubov v lige…). Ak nájde chybu, databázu nenahrá a vypíše, čo treba opraviť.

## Logá
Logá sú v priečinku `public/logos/` (názov súboru = id klubu). Stiahnuté boli z Wikipédie
skriptom `scripts/stiahni-loga.mjs` a z TheSportsDB. Ak logo chýba, hra zobrazí štít vo farbách klubu.
