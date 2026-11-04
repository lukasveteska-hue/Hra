// Stiahne malé logá klubov z Wikipédie (obrázok v infoboxe článku klubu).
// Použitie: node scripts/stiahni-loga.mjs  (existujúce logá preskočí)
import { existsSync, writeFileSync, copyFileSync } from 'node:fs';

const UA = 'FutbalovyManazer/0.1 (personal hobby project; https://github.com/lukasveteska-hue/Hra)';
const OUT = new URL('../public/logos/', import.meta.url);

const TITLES = {
  slavia: 'SK_Slavia_Prague', sparta: 'AC_Sparta_Prague', plzen: 'FC_Viktoria_Plzeň', banik: 'FC_Baník_Ostrava',
  jablonec: 'FK_Jablonec', mlboleslav: 'FK_Mladá_Boleslav', olomouc: 'SK_Sigma_Olomouc', liberec: 'FC_Slovan_Liberec',
  hradec: 'FC_Hradec_Králové', slovacko: '1._FC_Slovácko', bohemians: 'Bohemians_1905', teplice: 'FK_Teplice',
  pardubice: 'FK_Pardubice', zlin: 'FC_Zlín', zbrojovka: 'FC_Zbrojovka_Brno', artis: 'SK_Artis_Brno',
  karvina: 'MFK_Karviná', dukla: 'FK_Dukla_Prague', taborsko: 'FC_Silon_Táborsko', usti: 'FK_Ústí_nad_Labem',
  pribram: '1._FK_Příbram', opava: 'SFC_Opava', zizkov: 'FK_Viktoria_Žižkov', vlasim: 'FC_Sellier_%26_Bellot_Vlašim',
  kromeriz: 'SK_Hanácká_Slavia_Kroměříž', prostejov: '1._SK_Prostějov', jihlava: 'FC_Vysočina_Jihlava', kladno: 'SK_Kladno',
  ceskalipa: 'FK_Arsenal_Česká_Lípa', trinec: 'FK_Fotbal_Třinec',
  slovan: 'ŠK_Slovan_Bratislava', zilina: 'MŠK_Žilina', trnava: 'FC_Spartak_Trnava', dac: 'FC_DAC_1904_Dunajská_Streda',
  kosice: 'FC_Košice', podbrezova: 'FK_Železiarne_Podbrezová', trencin: 'AS_Trenčín', ruzomberok: 'MFK_Ružomberok',
  michalovce: 'MFK_Zemplín_Michalovce', skalica: 'MFK_Skalica', komarno: 'KFC_Komárno', duklabb: 'FK_Dukla_Banská_Bystrica',
  presov: '1._FC_Tatran_Prešov', zlmoravce: 'FC_ViOn_Zlaté_Moravce', samorin: 'FC_ŠTK_1914_Šamorín',
  liptmikulas: 'MFK_Tatran_Liptovský_Mikuláš', bytca: 'MFK_Bytča', petrzalka: 'FC_Petržalka', humenne: 'FK_Humenné',
  povbystrica: 'MŠK_Považská_Bystrica', pohronie: 'FK_Pohronie', zvolen: 'MFK_Zvolen',
  lehota: 'OFK_Baník_Lehota_pod_Vtáčnikom', galanta: 'FC_Slovan_Galanta', malzenice: 'OFK_Malženice', inter: 'FK_Inter_Bratislava',
};
// B-tímy majú logo A-tímu
const COPIES = { banikb: 'banik', slaviab: 'slavia', zilinab: 'zilina', slovanb: 'slovan' };

// Pre niektoré kluby má lepšie logo slovenská alebo česká Wikipédia
const LANGS = {
  bytca: ['sk'], malzenice: ['sk'], povbystrica: ['sk'], hradec: ['cs', 'en'], kromeriz: ['cs'], vlasim: ['cs'],
};
const SK_TITLES = { bytca: 'MFK_Bytča', malzenice: 'OFK_Malženice', povbystrica: 'MŠK_Považská_Bystrica' };
const CS_TITLES = { hradec: 'FC_Hradec_Králové', kromeriz: 'SK_Hanácká_Slavia_Kroměříž', vlasim: 'FC_Sellier_%26_Bellot_Vlašim' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function logoFor(lang, title) {
  const res = await fetch(`https://${lang}.wikipedia.org/wiki/${title}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const html = await res.text();
  const box = html.indexOf('infobox');
  if (box < 0) return null;
  const m = html.slice(box, box + 20000).match(/src="(\/\/[^"]*upload\.wikimedia\.org\/wikipedia\/(?:commons|[a-z]+)\/thumb\/[^"]+?)"/)
    ?? html.slice(box, box + 20000).match(/src="(\/\/[^"]*wikimedia\.org\/wikipedia\/[^"]+\/thumb\/[^"]+?)"/);
  if (!m) return null;
  // Vlajky a prázdne obrázky nie sú logá
  if (/Flag_of|Replace_this_image|Noimage|No_image|Football_pictogram|Soccerball/i.test(m[1])) return null;
  // Zmenšenina so šírkou 120 px
  return 'https:' + m[1].replace(/&amp;/g, '&').replace(/\?.*$/, '').replace(/\/\d+px-/, '/120px-');
}

const failed = [];
for (const [id, title] of Object.entries(TITLES)) {
  const file = new URL(`${id}.png`, OUT);
  if (existsSync(file)) continue;
  let url = null;
  for (const lang of LANGS[id] ?? ['en', 'sk', 'cs']) {
    url = await logoFor(lang, (lang === 'sk' ? SK_TITLES[id] : lang === 'cs' ? CS_TITLES[id] : null) ?? title).catch(() => null);
    await sleep(1200);
    if (url) break;
  }
  if (!url) { failed.push(id); console.log('✗', id); continue; }
  const img = await fetch(url, { headers: { 'User-Agent': UA } });
  await sleep(1200);
  if (!img.ok) { failed.push(id); console.log('✗', id, img.status, url); continue; }
  writeFileSync(file, Buffer.from(await img.arrayBuffer()));
  console.log('✓', id);
}
for (const [id, src] of Object.entries(COPIES)) {
  const from = new URL(`${src}.png`, OUT);
  if (existsSync(from)) copyFileSync(from, new URL(`${id}.png`, OUT));
}
console.log('Nepodarilo sa:', failed.join(', ') || 'nič');
