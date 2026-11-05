# ⚽ Futbalový manažér

Futbalový manažér v prehliadači – česká a slovenská liga, domáce poháre a európske súťaže.
Hra pre jedného hráča, funguje na počítači aj na mobile (aj bez internetu).

**Hrať:** https://lukasveteska-hue.github.io/Hra/

## Pridanie na plochu mobilu
- **Android (Chrome):** otvor odkaz → menu ⋮ → *Pridať na plochu* / *Inštalovať aplikáciu*.
- **iPhone (Safari):** otvor odkaz → tlačidlo *Zdieľať* → *Pridať na plochu*.

## Uložené hry
Hra sa ukladá v prehliadači (automaticky po každej zmene, ručne v časti *Hra*).
Každý prehliadač a zariadenie má vlastné uložené hry. Prenos medzi zariadeniami:
*Hra → Stiahnuť hru do súboru* a na druhom zariadení *Načítať hru zo súboru*.

## Zverejnenie
Pri každom uložení do vetvy `main` sa hra automaticky zostaví a zverejní na GitHub Pages
(`.github/workflows/zverejnenie.yml`).

## Vývoj
```
npm install
npm run dev      # spustenie na počítači
npm test         # testy
npm run build    # zostavenie
```

Dokumentácia: [herný dizajn](docs/HERNY_DIZAJN.md), [databáza](docs/DATABAZA.md).
