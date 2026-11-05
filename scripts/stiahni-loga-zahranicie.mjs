// Stiahne logá zahraničných klubov z Wikipédie (anglická verzia)
import { existsSync, writeFileSync } from 'node:fs';

const UA = 'FutbalovyManazer/0.1 (personal hobby project; https://github.com/lukasveteska-hue/Hra)';
const OUT = new URL('../public/logos/', import.meta.url);
const T = {
  mancity: 'Manchester_City_F.C.', liverpool: 'Liverpool_F.C.', arsenal: 'Arsenal_F.C.', chelsea: 'Chelsea_F.C.', manutd: 'Manchester_United_F.C.',
  tottenham: 'Tottenham_Hotspur_F.C.', newcastle: 'Newcastle_United_F.C.', astonvilla: 'Aston_Villa_F.C.', nottingham: 'Nottingham_Forest_F.C.',
  brighton: 'Brighton_%26_Hove_Albion_F.C.', crystalpalace: 'Crystal_Palace_F.C.', westham: 'West_Ham_United_F.C.', fulham: 'Fulham_F.C.', brentford: 'Brentford_F.C.',
  realmadrid: 'Real_Madrid_CF', barcelona: 'FC_Barcelona', atletico: 'Atlético_Madrid', athletic: 'Athletic_Club', villarreal: 'Villarreal_CF', betis: 'Real_Betis',
  realsociedad: 'Real_Sociedad', sevilla: 'Sevilla_FC', celta: 'RC_Celta_de_Vigo',
  bayern: 'FC_Bayern_Munich', leverkusen: 'Bayer_04_Leverkusen', dortmund: 'Borussia_Dortmund', leipzig: 'RB_Leipzig', stuttgart: 'VfB_Stuttgart',
  frankfurt: 'Eintracht_Frankfurt', freiburg: 'SC_Freiburg', wolfsburg: 'VfL_Wolfsburg', gladbach: 'Borussia_Mönchengladbach', hoffenheim: 'TSG_Hoffenheim',
  unionberlin: '1._FC_Union_Berlin', mainz: '1._FSV_Mainz_05',
  intermilan: 'Inter_Milan', napoli: 'SSC_Napoli', juventus: 'Juventus_FC', milan: 'AC_Milan', atalanta: 'Atalanta_BC', roma: 'AS_Roma', lazio: 'SS_Lazio',
  fiorentina: 'ACF_Fiorentina', bologna: 'Bologna_FC_1909', torino: 'Torino_FC', udinese: 'Udinese_Calcio',
  psg: 'Paris_Saint-Germain_F.C.', monaco: 'AS_Monaco_FC', marseille: 'Olympique_de_Marseille', lille: 'Lille_OSC', lyon: 'Olympique_Lyonnais',
  lens: 'RC_Lens', rennes: 'Stade_Rennais_F.C.', nice: 'OGC_Nice', strasbourg: 'RC_Strasbourg_Alsace',
  benfica: 'S.L._Benfica', sporting: 'Sporting_CP', porto: 'FC_Porto', braga: 'S.C._Braga',
  psv: 'PSV_Eindhoven', feyenoord: 'Feyenoord', ajax: 'AFC_Ajax', az: 'AZ_Alkmaar', twente: 'FC_Twente',
  brugge: 'Club_Brugge_KV', unionsg: 'Royale_Union_Saint-Gilloise', anderlecht: 'R.S.C._Anderlecht', genk: 'K.R.C._Genk', gent: 'K.A.A._Gent',
  galatasaray: 'Galatasaray_S.K._(football)', fenerbahce: 'Fenerbahçe_S.K._(football)', besiktas: 'Beşiktaş_J.K.', trabzonspor: 'Trabzonspor',
  celtic: 'Celtic_F.C.', rangers: 'Rangers_F.C.',
  salzburg: 'FC_Red_Bull_Salzburg', sturm: 'SK_Sturm_Graz', rapid: 'SK_Rapid_Wien', lask: 'LASK', youngboys: 'BSC_Young_Boys', basel: 'FC_Basel', lugano: 'FC_Lugano',
  olympiakos: 'Olympiacos_F.C.', paok: 'PAOK_FC', aek: 'AEK_Athens_F.C.', panathinaikos: 'Panathinaikos_F.C.',
  kodan: 'F.C._Copenhagen', midtjylland: 'FC_Midtjylland', bodo: 'FK_Bodø/Glimt', molde: 'Molde_FK', malmo: 'Malmö_FF', hjk: 'HJK_Helsinki',
  dinamozagreb: 'GNK_Dinamo_Zagreb', hajduk: 'HNK_Hajduk_Split', rijeka: 'HNK_Rijeka', crvenazvezda: 'Red_Star_Belgrade', partizan: 'FK_Partizan',
  olimpija: 'NK_Olimpija_Ljubljana', zrinjski: 'HŠK_Zrinjski_Mostar', ludogorec: 'PFC_Ludogorets_Razgrad', fcsb: 'FCSB', cfrcluj: 'CFR_Cluj',
  shakhtar: 'FC_Shakhtar_Donetsk', dynamokyiv: 'FC_Dynamo_Kyiv', karabach: 'Qarabağ_FK', astana: 'FC_Astana',
  legia: 'Legia_Warsaw', lech: 'Lech_Poznań', rakow: 'Raków_Częstochowa', jagiellonia: 'Jagiellonia_Białystok', ferencvaros: 'Ferencvárosi_TC',
  apoel: 'APOEL_FC', pafos: 'Pafos_FC', maccabita: 'Maccabi_Tel_Aviv_F.C.', maccabihaifa: 'Maccabi_Haifa_F.C.',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failed = [];
for (const [id, title] of Object.entries(T)) {
  const file = new URL(`${id}.png`, OUT);
  if (existsSync(file)) continue;
  try {
    const res = await fetch(`https://en.wikipedia.org/wiki/${title}`, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    await sleep(1000);
    const box = html.indexOf('infobox');
    const m = box >= 0 ? html.slice(box, box + 20000).match(/src="(\/\/[^"]*wikimedia\.org\/wikipedia\/[^"]+\/thumb\/[^"]+?)"/) : null;
    if (!m || /Flag_of|Replace_this_image|Noimage|No_image/i.test(m[1])) throw new Error('bez loga');
    const url = 'https:' + m[1].replace(/&amp;/g, '&').replace(/\?.*$/, '').replace(/\/\d+px-/, '/120px-');
    const img = await fetch(url, { headers: { 'User-Agent': UA } });
    await sleep(1000);
    if (!img.ok) throw new Error(String(img.status));
    writeFileSync(file, Buffer.from(await img.arrayBuffer()));
    console.log('✓', id);
  } catch (e) {
    failed.push(id);
    console.log('✗', id, e.message);
  }
}
console.log('Nepodarilo sa:', failed.join(', ') || 'nič');
