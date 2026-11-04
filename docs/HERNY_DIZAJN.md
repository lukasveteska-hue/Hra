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
| Ukladanie | v prehliadači (IndexedDB), ukladanie kedykoľvek do viacerých pozícií + automatické ukladanie, export/import do súboru |
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
- **Kondícia / energia** (0–100 %): klesá po zápase, obnovuje sa medzi zápasmi. Hráč môže hrať vždy, ale nižšia energia znižuje jeho výkon. Starší hráči sa unavujú rýchlejšie.
- **Forma:** zobrazená šípkami (5 úrovní), mení sa po kolách, zlepšuje sa aj v priateľských zápasoch.
- **Odohrané zápasy (skrytý bonus):** čím viac zápasov hráč v kariére odohral, tým väčší malý skrytý bonus k výkonu v zápase.
- **Koniec kariéry:** hráči končia medzi 33 a 40 rokmi (brankári najneskôr, útočníci najskôr).
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
- Kariéra je **neobmedzená** (bez pevného počtu sezón).
- **Klub sa dá zmeniť len medzi sezónami.**
- **Vedenie klubu** stanoví ciele sezóny (liga, pohár, Európa). Na konci sezóny ohodnotí sezónu na päťstupňovej škále: výborná / úspešná / prijateľná / neúspešná / katastrofálna.
- **Vyhodenie:** po katastrofálnej sezóne alebo po dvoch neúspešných sezónach po sebe.
- **Ponuky od klubov** (len CZ/SK kluby) medzi sezónami podľa výsledkov posledných dvoch sezón (pri úspechu lepšie kluby, pri neúspechu slabšie).

---

## 5. Káder, zostava, taktika

- Káder 18–30 hráčov, zápasová súpiska 11 + náhradníci a striedania podľa reálnych pravidiel (9 náhradníkov, 5 striedaní v 3 prestávkach).
- **Karty:** červená = stop (1 a viac zápasov), nazbierané žlté karty = stop na 1 zápas (podľa pravidiel súťaže).
- Formácie: 4-4-2, 4-3-3, 3-5-2, 4-5-1, 5-3-2, 5-4-1, 4-2-3-1 a ďalšie.
- **Útočnosť:** posuvník 0–100. Vyššia útočnosť pomáha útočníkom v súbojoch, ale oslabuje obranu.
- **Štýl hry:** normálny / krátke prihrávky / centre / nábehy.
- **Kapitán:** tím s kapitánom má menšiu šancu na pokles formy.
- Hra mimo pozície je možná, ale s výrazným postihom.

---

## 6. Tréning a zariadenia

- Ručné nastavovanie tréningu **nie je** (rozhodnuté – hra sa sústreďuje na prestupy).
- **Tréningové centrum** (úroveň 1–5): dá sa vylepšiť za peniaze (60 dní), vyššia úroveň = rýchlejší rast hráčov (účinok vo fáze 5).
- **Mládežnícka akadémia** (úroveň 1–5): vyššia úroveň = kvalitnejší mládežníci (účinok vo fáze 5).

## 6b. Počasie

- Každý zápas má počasie podľa ročného obdobia (stredná Európa) a náhody: slnečno, polojasno, zamračené, dážď, lejak, sneženie, hmla a teplota.
- **Výkon:** veľmi jemný vplyv (max. ~2 %) – v zlom počasí (dážď, sneh, horúčava, mráz) sa o trochu lepšie darí fyzicky silným hráčom ako technickým.
- **Návštevnosť:** pekné počasie +3 až 5 %, zlé počasie až −7 %.

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
- **Pôžičky:** klub si môže požičať od banky – **štedro aj malé kluby** (limit aspoň 1,5 mil. €, pri väčších kluboch viac).
  - Úrok 4 % (1 rok), 5,5 % (2–3 roky), 6,5 % (4–5 rokov), mesačné splátky.
  - Predčasné splatenie je možné.
- **Dlh:** pri zápornom zostatku najprv varovanie, potom zákaz prestupov, nakoniec hrozí vyhodenie.

---

## 9. Prestupy (jadro hry)

Cieľ: **trh musí byť živý**, žiadne hluché obdobia.

### Moji hráči
- Môžem hráča dať na prestupovú listinu a nastaviť požadovanú cenu.
- **AI kluby často posielajú ponuky**, aj na hráčov, ktorí nie sú na listine (najmä na talenty a hráčov vo forme).
- Ponuky chodia od CZ/SK klubov aj od zahraničných klubov. Zahraničie platí najviac.
- **Rozdiely v cenách medzi ligami:** hráči z CZ/SK líg sú lacní, kluby z bohatých líg platia násobne viac. Po prestupe do inej ligy sa cena hráča mení postupne (počas niekoľkých desiatok zápasov), aby sa nedalo okamžite zarobiť na preskakovaní.
- Na ponuku môžem: prijať, odmietnuť, dať protiponuku.
- Hráčova morálka klesne, keď mu zakážem prestup do veľkého klubu.

### Nákup
- Vyhľadávanie hráčov podľa pozície, veku, OVR, potenciálu, ceny, ligy a dĺžky zmluvy.
- Ponuka klubu → klub prijme / odmietne / dá protiponuku. Kluby nechcú predávať kľúčových hráčov lacno.
- Po dohode s klubom treba dohodnúť **zmluvu s hráčom** (plat, dĺžka), 3 pokusy.
- **Ochota hráča prestúpiť** (bez pevného limitu – vždy ostáva aspoň malá šanca):
  - čím je hráč lepší oproti tvojmu tímu a čím väčší je jeho súčasný klub, tým skôr odmietne a tým vyšší plat chce,
  - prestup do nižšej ligy je ťažší,
  - **povaha** (viditeľná v detaile hráča): *ambiciózny* chce do väčšieho klubu, *žoldnier* ide za peniaze kamkoľvek (ale chce viac), *lojálny* nerád opúšťa svoj klub, *pohodár* bez vyhranených požiadaviek,
  - **veteráni** (33+, a ešte viac 36+) idú oveľa ochotnejšie aj do slabšieho klubu a chcú nižší plat; medzi voľnými hráčmi je veľa skúsených veteránov,
  - **mladé talenty** chcú do silného klubu,
  - **hrací čas:** hráč, ktorý teraz sedí na lavičke a u teba by hral v základe, príde radšej; hráč zo základu, ktorý by u teba nehral, nerád,
  - voľní hráči sú otvorenejší ponukám,
  - hráč vždy povie dôvody svojho rozhodnutia; rozhodnutie je v rámci jedného prestupového obdobia stále rovnaké.
- **Predĺženie zmluvy:** spokojný a lojálny hráč predĺži lacnejšie, nespokojný chce viac, ambiciózny hráč, ktorý je na klub príliš dobrý, môže odmietnuť.
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
- Výmeny hráčov

---

## 10. Simulácia zápasu

1. Z zostavy sa vypočíta sila tímu: **brankár, obrana, záloha, útok**.
   - Každý hráč prispieva do obrany aj útoku. Pozícia určuje podiel (obranca hlavne do obrany, útočník hlavne do útoku), Obranné a Útočné atribúty určujú, ako dobre.
2. Úpravy: taktika, domáce prostredie, kondícia, forma, morálka.
3. Zápas beží po minútach: záloha rozhoduje o držaní lopty, útok proti obrane o šanci, Technické + Útočné strelca proti brankárovi o góle.
4. Výstup: výsledok, strelci, asistencie, karty, zranenia, známky hráčov, krátky textový priebeh.
5. Zápasy ostatných tímov sa simulujú rovnako (rýchlo, bez textu).

### Zápas naživo
- Môj zápas sa prehráva **naživo, trvá približne 60 sekúnd** (90 herných minút).
- Textový priebeh, priebežné skóre, štatistiky.
- Počas zápasu: striedanie, zmena formácie, útočnosti a štýlu.
- Výsledok sa nezobrazí vopred. Dĺžka je vždy 60 sekúnd, nedá sa zrýchliť ani preskočiť.
- **Ostatné zápasy kola** bežia súčasne a ich priebežné výsledky sa zobrazujú naživo.
- Domáce prostredie má výrazný vplyv.

### Priateľské zápasy
- V lete a v zime počas prípravy.
- Hlavne prinášajú **peniaze**, zlepšujú formu.

---

## 11. Súťaže

- **Česko:** 1. liga (16 klubov) a 2. liga, s postupmi a zostupmi.
- **Slovensko:** 1. liga (12 klubov) a 2. liga, s postupmi a zostupmi.
- **Formát podľa reality vrátane nadstavby** (základná časť, potom skupina o titul a skupina o záchranu, body sa prenášajú):
  - Chance Liga: 16 klubov, 30 kôl, potom skupina o titul (1.–6.) a skupina o záchranu (11.–16.), každá 10 kôl. Kluby 7.–10. sezónu končia po základnej časti.
  - Niké liga: 12 klubov, 22 kôl, potom skupina o titul (1.–6.) a o záchranu (7.–12.), každá 10 kôl.
  - 2. ligy: 16 klubov, 30 kôl, bez nadstavby.
  - Nadstavba sa dá v databáze zmeniť (stĺpec `nadstavba` v tabuľke líg).
  - Kolá v soboty, pri nedostatku termínov aj v stredu; zimná prestávka od polovice decembra do začiatku februára.
- **Finančná úroveň:** česká liga je o trochu bohatšia ako slovenská (vyššie platy, ceny hráčov, TV peniaze, sponzori), približne podľa reality.
- **Cudzinci:** bez obmedzenia.
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
- **Zahraničné kluby (európske poháre):** všetky majú reálny názov.
  - Hlavné európske kluby majú reálnych hráčov.
  - Ostatné majú **generovaných hráčov**.
  - Výber klubov s reálnymi hráčmi: približne 40 klubov, ktoré pravidelne hrajú Ligu majstrov (Anglicko, Španielsko, Nemecko, Taliansko, Francúzsko, Portugalsko, Holandsko a niekoľko ďalších).
- **Sezóna: aktuálna 2026/27**, aktuálne súpisky.
- **Generátor hráčov:** vytvára hráčov s menom podľa krajiny (napr. poľské, chorvátske mená), pozíciou, vekom, atribútmi a potenciálom podľa sily klubu. Používa sa aj pre mládežníkov a voľných hráčov.
- Atribúty a potenciál sú odhady, dajú sa upraviť.
- Dáta budú v samostatných súboroch, aby sa dali ľahko opravovať a aktualizovať.

---

## 14b. Vyhodnotenie sezóny

Na konci sezóny slávnostná obrazovka s kartami:
- **Môj klub:** umiestnenie, body, séria výsledkov, doma/vonku, čisté kontá, série, návštevnosť, graf umiestnenia a bodov po kolách, góly podľa minút.
- **Konečné tabuľky** všetkých líg.
- **Hráči:** štatistiky kádra, zmena hodnotenia a hodnoty počas sezóny.
- **Liga a ocenenia:** strelci, asistencie, známky, karty, jedenástka sezóny, rekordy ligy, návštevnosť klubov.
- **Financie:** príjmy a výdavky podľa druhu, zostatok a hodnota kádra v čase, hospodárenie po mesiacoch.
- **Prestupy:** príchody, odchody, najdrahšie prestupy sezóny.

## 15. Poradie vývoja

1. ✅ Základ projektu, hráči, kluby, dáta, ukladanie
2. ✅ Simulácia zápasu, liga, tabuľka, plynutie času
3. ✅ Prestupový trh a zmluvy (+ základné financie a vyhodnotenie sezóny)
4. ✅ Financie (vstupné, sponzori, pôžičky, štadión, zariadenia) + počasie
5. Vývoj hráčov, zariadenia, mládež, prechod sezóny
6. Domáci pohár a európske poháre
7. Vedenie klubu, štatistiky, história
