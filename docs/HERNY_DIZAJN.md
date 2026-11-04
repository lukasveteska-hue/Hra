# Futbalový manažér – herný dizajn

Webová hra v prehliadači, futbalový manažér pre jedného hráča, inšpirovaný manažérmi zo začiatku 2000-tych rokov.
Hlavná myšlienka: **začať so slabým klubom, zarábať na prestupoch a postupne sa prepracovať hore.**

- Jazyk: slovenčina
- Mena: euro (€)
- Len pre jedného hráča, bez multiplayeru
- Reálne kluby a reálni hráči (hra je len na osobné použitie)

---

## 1. Technické riešenie

| Časť | Riešenie |
|---|---|
| Jazyk | TypeScript |
| Obrazovky | React |
| Spúšťanie a zostavenie | Vite |
| Ukladanie | v prehliadači (IndexedDB), viac uložených hier, export/import do súboru |
| Server | nie je potrebný |

Herná logika (simulácia, prestupy, financie) je oddelená od obrazoviek, aby sa dala samostatne testovať.

---

## 2. Hráč

### Pozícia
Pevne daná: **B** (brankár), **O** (obranca), **Z** (záložník), **Ú** (útočník). Atribúty pozíciu neurčujú.

### Atribúty (stupnica 1–99)
| Atribút | Význam |
|---|---|
| **Fyzické** | kondícia, rýchlosť, sila; ovplyvňuje aj únavu |
| **Technické** | práca s loptou, prihrávky, zakončenie |
| **Obranné** | ako veľmi a ako dobre pomáha dozadu (štýl hráča) |
| **Útočné** | ako veľmi a ako dobre pomáha dopredu (štýl hráča) |
| **Brankárske** | len brankár, nahrádza Obranné a Útočné |

Príklad: dvaja útočníci s rovnakou kvalitou, jeden čistý zakončovateľ (Obr 25 / Útok 80), druhý pracovitý (Obr 55 / Útok 65).

Interne sa hodnoty ukladajú s desatinami (napr. 63,4), zobrazujú sa ako celé čísla.

### Celkové hodnotenie (OVR)
Vypočíta sa z atribútov s váhami podľa pozície (útočník: najviac Útočné, obranca: najviac Obranné, Fyzické a Technické vždy). Váhy sa doladia testovaním.

### Rozloženie hodnôt
| OVR | Kto to je |
|---|---|
| 85–99 | svetová špička |
| 75–84 | hviezda CZ/SK ligy, top kluby v Európe |
| 65–74 | kvalitný hráč 1. ligy |
| 55–64 | priemerný hráč 1. ligy |
| 45–54 | 2. liga, náhradníci |
| pod 45 | mládežníci |

### Potenciál
- Číslo 1–99, **viditeľné** (bez skautov).
- **Náhoda:** nie je isté, či hráč potenciál dosiahne a kedy. Každý hráč má skrytý „faktor vývoja“:
  - väčšina sa vyvíja normálne,
  - niekto potenciál dosiahne skôr (rýchly rast),
  - niekto sa rozbehne neskoro (okolo 25 rokov),
  - niekto sa zasekne a potenciál nedosiahne.
- Rast ovplyvňuje aj hrací čas a tréning.

### Ďalšie vlastnosti
- **Vek:** rast do 24–27 rokov, vrchol 27–30, od 31 rokov pokles.
- **Kondícia** (0–100 %): klesá po zápase, obnovuje sa medzi zápasmi.
- **Forma:** podľa posledných výkonov.
- **Morálka:** klesá, keď hráč nehrá; ovplyvňuje výkon.
- **Zranenia, karty, tresty.**
- **Zmluva:** plat a dátum konca zmluvy.
- **Trhová hodnota:** z OVR, potenciálu, veku, dĺžky zmluvy a ligy.

---

## 3. Plynutie času

- **Počas prestupového obdobia: po dňoch.** Tlačidlá „Ďalší deň“, „Preskočiť o týždeň“, „Do konca prestupového obdobia“. Pri dôležitej udalosti (ponuka na môjho hráča) sa hra zastaví.
- **Mimo prestupového obdobia: po zápasoch.** Tlačidlo „Ďalší zápas“.
- Letné prestupové obdobie: približne od polovice júna do konca augusta. Zimné: január a február.
- Medzi sezónami: prechod sezóny (starnutie, vývoj, noví mládežníci, konce zmlúv, nové ciele vedenia).

---

## 4. Začiatok hry a kariéra

- Výber ľubovoľného klubu z 1. alebo 2. ligy CZ alebo SK.
- **Vedenie klubu** stanoví cieľ sezóny (záchrana, stred tabuľky, Európa, titul). Pri dlhodobom neúspechu môže trénera vyhodiť.
- Pri úspechu môžu prísť ponuky od iných klubov.

---

## 5. Káder, zostava, taktika

- Káder 18–30 hráčov, zápasová súpiska 11 + 7 náhradníkov.
- Formácie: 4-4-2, 4-3-3, 3-5-2, 4-5-1, 5-3-2, 4-2-3-1 a ďalšie.
- Štýl: defenzívny, vyvážený, ofenzívny, protiútoky, presing.
- Hra mimo pozície je možná, ale s výrazným postihom.

---

## 6. Tréning

- Intenzita pre celý tím: nízka / stredná / vysoká (rýchlejší rast, ale väčšia únava a riziko zranení).
- Zameranie: fyzické / technické / obranné / útočné.

---

## 7. Mládež

- Každé leto 2–4 noví mládežníci (15–17 rokov) s náhodným potenciálom.
- Úroveň mládežníckej akadémie (vylepšuje sa za peniaze) zvyšuje kvalitu a potenciál mládežníkov.

---

## 8. Financie

**Príjmy:** vstupné, sponzori, televízne peniaze, odmeny za umiestnenie, pohár a Európa, predaje hráčov.
**Výdavky:** platy, nákupy hráčov, splátky pôžičiek, údržba štadióna, akadémia.

- **Cena vstupenky** sa dá nastaviť (vyššia cena = menej divákov).
- **Štadión** sa dá rozšíriť, výstavba trvá niekoľko mesiacov.
- **Sponzori:** na začiatku sezóny výber z ponúk (istá suma alebo nižšia suma + bonusy).
- **Pôžičky:** klub si môže požičať od banky.
  - Výška pôžičky je obmedzená podľa veľkosti klubu (príjmy, štadión).
  - Úrok a mesačné splátky na zvolený počet rokov.
  - Predčasné splatenie je možné.
- **Dlh:** pri zápornom zostatku najprv varovanie, potom zákaz prestupov, nakoniec hrozí vyhodenie.

---

## 9. Prestupy (jadro hry)

Cieľ: **trh musí byť živý**, žiadne hluché obdobia.

### Moji hráči
- Môžem hráča dať na prestupovú listinu a nastaviť požadovanú cenu.
- **AI kluby často posielajú ponuky**, aj na hráčov, ktorí nie sú na listine (najmä na talenty a hráčov vo forme).
- Ponuky chodia od CZ/SK klubov aj od zahraničných klubov. Zahraničie platí najviac.
- Na ponuku môžem: prijať, odmietnuť, dať protiponuku.
- Hráčova morálka klesne, keď mu zakážem prestup do veľkého klubu.

### Nákup
- Vyhľadávanie hráčov podľa pozície, veku, OVR, potenciálu, ceny, ligy a dĺžky zmluvy.
- Ponuka klubu → klub prijme / odmietne / dá protiponuku. Kluby nechcú predávať kľúčových hráčov lacno.
- Po dohode s klubom treba dohodnúť **zmluvu s hráčom** (plat, dĺžka). Hráč môže odmietnuť (malý klub, nízky plat).
- **Voľní hráči** bez zmluvy sa dajú podpísať kedykoľvek.

### Zmluvy
- Hráčovi s končiacou zmluvou treba ponúknuť novú, inak odíde zadarmo.
- Hráč s končiacou zmluvou má nižšiu cenu.

### AI trh
- AI kluby denne počas prestupového obdobia kupujú a predávajú **aj medzi sebou** podľa potrieb kádra a rozpočtu.
- **Správy:** „Klub X kúpil hráča Y za 1,2 mil. €“.

### Nie je v hre
- Hosťovania
- Skauti (potenciál je viditeľný)

---

## 10. Simulácia zápasu

1. Z zostavy sa vypočíta sila tímu: **brankár, obrana, záloha, útok**.
   - Každý hráč prispieva do obrany aj útoku. Pozícia určuje podiel (obranca hlavne do obrany, útočník hlavne do útoku), Obranné a Útočné atribúty určujú, ako dobre.
2. Úpravy: taktika, domáce prostredie, kondícia, forma, morálka.
3. Zápas beží po minútach: záloha rozhoduje o držaní lopty, útok proti obrane o šanci, Technické + Útočné strelca proti brankárovi o góle.
4. Výstup: výsledok, strelci, asistencie, karty, zranenia, známky hráčov, krátky textový priebeh.
5. Zápasy ostatných tímov sa simulujú rovnako (rýchlo, bez textu).

---

## 11. Súťaže

- **Česko:** 1. liga (16 klubov) a 2. liga, s postupmi a zostupmi.
- **Slovensko:** 1. liga (12 klubov) a 2. liga, s postupmi a zostupmi.
- Na začiatok systém každý s každým doma a vonku. Nadstavby (skupina o titul / o záchranu) neskôr.
- **Domáci pohár** v oboch krajinách (vyraďovací systém, víťaz ide do Európy).
- **Liga majstrov, Európska liga, Konferenčná liga:** reálne zahraničné kluby, miesta podľa umiestnenia v lige, predkolá, ligová fáza, vyraďovačka. Zahraničné ligy sa nesimulujú.

---

## 12. Štatistiky a história

- Tabuľky strelcov a asistentov, priemerné známky.
- História sezón: majstri, víťazi pohárov, postupy a zostupy.
- Rekordné prestupy, história prestupov.

---

## 13. Vzhľad

- Tabuľkový vzhľad v štýle starých manažérov.
- **Tmavá antracitová farebná schéma.**
- Prehľadné tabuľky so zoraďovaním a filtrovaním.

---

## 14. Dáta

- Reálne kluby a reálni hráči českej a slovenskej ligy (1. aj 2. liga).
- Atribúty a potenciál sú odhady, dajú sa upraviť.
- Dáta budú v samostatných súboroch, aby sa dali ľahko opravovať a aktualizovať.

---

## 15. Poradie vývoja

1. Základ projektu, hráči, kluby, dáta, ukladanie
2. Simulácia zápasu, liga, tabuľka, plynutie času
3. Prestupový trh a zmluvy
4. Financie (vstupné, sponzori, pôžičky, štadión)
5. Vývoj hráčov, tréning, mládež, prechod sezóny
6. Domáci pohár a európske poháre
7. Vedenie klubu, štatistiky, história
