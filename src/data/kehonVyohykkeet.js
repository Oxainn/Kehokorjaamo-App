// Kehon vyöhykkeet
// Sijainti repossa: src/data/kehonVyohykkeet.js
//
// Mitä tämä tekee:
// - Määrittelee 76 anatomista vyöhykettä jotka näytetään 4 hahmolla
//   (etu, taka, sivu vasen, sivu oikea)
// - Jokaisella vyöhykkeellä on suomenkielinen nimi (asiakas) ja
//   tekninen nimi (hoitaja)
// - Vyöhykkeitä käytetään sekä osiossa 4 (asiakkaan kehonkartta)
//   että myöhemmin osiossa 6 (hoitajan havainnot)
//
// HUOM: cx ja cy ovat arvioidut alkusijainnit. Tarkat sijainnit
// säädetään Asetukset → Kehonkartta-kalibrointi -työkalussa.
//
// SVG viewBox: 0 0 1471 1069
// Hahmot SVG:ssä:
//   - Sivu vasen: x 144-272, y 30-790, keskilinja x=208
//   - Taka:       x 380-676, y 23-807, keskilinja x=528
//   - Etu:        x 760-1052, y 28-808, keskilinja x=906
//   - Sivu oikea: x 1164-1292, y 30-790, keskilinja x=1228
//
// Kentät:
// - id: uniikki tunniste, käytetään tietokannassa ja koodissa
// - nimi: suomenkielinen nimi joka näytetään käyttäjälle
// - tekninen: tekninen anatominen termi, näytetään sulkeissa hoitajalle
// - puoli: 'Edestä' | 'Takaa' | 'Sivu vasen' | 'Sivu oikea'
// - cx, cy: SVG-koordinaatit pisteen sijainnille

export const KEHON_VYOHYKKEET = [

  // ========== EDESTÄ (24) — keskilinja x=906 ==========

  { id: 'otsa-e',                puoli: 'Edestä', nimi: 'Otsa',                                tekninen: '',                       cx: 906, cy: 30 },
  { id: 'leuka-e',               puoli: 'Edestä', nimi: 'Leuka',                               tekninen: '',                       cx: 906, cy: 84 },
  { id: 'kaula-etu-e',           puoli: 'Edestä', nimi: 'Kaulan etupuoli',                     tekninen: '',                       cx: 906, cy: 125 },
  { id: 'olkapaa-vas-e',         puoli: 'Edestä', nimi: 'Olkapään kärki vasen',                tekninen: 'acromion',               cx: 985, cy: 163 },
  { id: 'olkapaa-oik-e',         puoli: 'Edestä', nimi: 'Olkapään kärki oikea',                tekninen: 'acromion',               cx: 825, cy: 163 },
  { id: 'rintalasta-e',          puoli: 'Edestä', nimi: 'Rintalasta keski',                    tekninen: 'sternum',                cx: 906, cy: 221 },
  { id: 'rinta-vas-e',           puoli: 'Edestä', nimi: 'Rinta vasen',                         tekninen: '',                       cx: 955, cy: 229 },
  { id: 'rinta-oik-e',           puoli: 'Edestä', nimi: 'Rinta oikea',                         tekninen: '',                       cx: 856, cy: 229 },
  { id: 'ylavatsa-e',            puoli: 'Edestä', nimi: 'Ylävatsa',                            tekninen: '',                       cx: 906, cy: 296 },
  { id: 'alavatsa-e',            puoli: 'Edestä', nimi: 'Alavatsa',                            tekninen: '',                       cx: 906, cy: 354 },
  { id: 'asis-vas-e',            puoli: 'Edestä', nimi: 'Suoliluun etukärki vasen',            tekninen: 'ASIS',                   cx: 955, cy: 387 },
  { id: 'asis-oik-e',            puoli: 'Edestä', nimi: 'Suoliluun etukärki oikea',            tekninen: 'ASIS',                   cx: 856, cy: 387 },
  { id: 'lonkankoukistaja-vas-e',puoli: 'Edestä', nimi: 'Lonkankoukistaja vasen',              tekninen: '',                       cx: 947, cy: 424 },
  { id: 'lonkankoukistaja-oik-e',puoli: 'Edestä', nimi: 'Lonkankoukistaja oikea',              tekninen: '',                       cx: 864, cy: 424 },
  { id: 'reisi-etu-vas-e',       puoli: 'Edestä', nimi: 'Reisi etu vasen',                     tekninen: '',                       cx: 947, cy: 511 },
  { id: 'reisi-etu-oik-e',       puoli: 'Edestä', nimi: 'Reisi etu oikea',                     tekninen: '',                       cx: 864, cy: 511 },
  { id: 'polvilumpio-vas-e',     puoli: 'Edestä', nimi: 'Polvilumpio vasen',                   tekninen: 'patella',                cx: 943, cy: 603 },
  { id: 'polvilumpio-oik-e',     puoli: 'Edestä', nimi: 'Polvilumpio oikea',                   tekninen: 'patella',                cx: 869, cy: 603 },
  { id: 'saari-etu-vas-e',       puoli: 'Edestä', nimi: 'Sääri etu vasen',                     tekninen: '',                       cx: 943, cy: 686 },
  { id: 'saari-etu-oik-e',       puoli: 'Edestä', nimi: 'Sääri etu oikea',                     tekninen: '',                       cx: 869, cy: 686 },
  { id: 'kantaluu-vas-e',        puoli: 'Edestä', nimi: 'Nilkka, kantaluu vasen',              tekninen: 'calcaneus',              cx: 943, cy: 769 },
  { id: 'kantaluu-oik-e',        puoli: 'Edestä', nimi: 'Nilkka, kantaluu oikea',              tekninen: 'calcaneus',              cx: 869, cy: 769 },
  { id: 'holvikaari-vas-e',      puoli: 'Edestä', nimi: 'Jalkaterän holvikaari vasen',         tekninen: '',                       cx: 943, cy: 806 },
  { id: 'holvikaari-oik-e',      puoli: 'Edestä', nimi: 'Jalkaterän holvikaari oikea',         tekninen: '',                       cx: 869, cy: 806 },

  // ========== TAKAA (30) — keskilinja x=528 ==========

  { id: 'takaraivo-t',           puoli: 'Takaa',  nimi: 'Takaraivo',                           tekninen: '',                       cx: 528, cy: 47 },
  { id: 'niska-t',               puoli: 'Takaa',  nimi: 'Niska',                               tekninen: '',                       cx: 528, cy: 109 },
  { id: 'c7-t',                  puoli: 'Takaa',  nimi: 'Niskan tyvi',                         tekninen: 'C7',                     cx: 528, cy: 150 },
  { id: 'lapaluu-vas-t',         puoli: 'Takaa',  nimi: 'Lapaluu vasen',                       tekninen: 'scapula',                cx: 474, cy: 204 },
  { id: 'lapaluu-oik-t',         puoli: 'Takaa',  nimi: 'Lapaluu oikea',                       tekninen: 'scapula',                cx: 582, cy: 204 },
  { id: 'ylaselka-vas-t',        puoli: 'Takaa',  nimi: 'Yläselkä vasen',                      tekninen: '',                       cx: 501, cy: 229 },
  { id: 'ylaselka-oik-t',        puoli: 'Takaa',  nimi: 'Yläselkä oikea',                      tekninen: '',                       cx: 555, cy: 229 },
  { id: 'keskiselka-vas-t',      puoli: 'Takaa',  nimi: 'Keskiselkä vasen',                    tekninen: '',                       cx: 501, cy: 296 },
  { id: 'keskiselka-oik-t',      puoli: 'Takaa',  nimi: 'Keskiselkä oikea',                    tekninen: '',                       cx: 555, cy: 296 },
  { id: 'alaselka-keski-t',      puoli: 'Takaa',  nimi: 'Alaselkä keski',                      tekninen: 'lordoosi',               cx: 528, cy: 354 },
  { id: 'alaselka-vas-t',        puoli: 'Takaa',  nimi: 'Alaselkä vasen',                      tekninen: '',                       cx: 495, cy: 362 },
  { id: 'alaselka-oik-t',        puoli: 'Takaa',  nimi: 'Alaselkä oikea',                      tekninen: '',                       cx: 561, cy: 362 },
  { id: 'psis-vas-t',            puoli: 'Takaa',  nimi: 'Suoliluun takakärki vasen',           tekninen: 'PSIS',                   cx: 495, cy: 395 },
  { id: 'psis-oik-t',            puoli: 'Takaa',  nimi: 'Suoliluun takakärki oikea',           tekninen: 'PSIS',                   cx: 561, cy: 395 },
  { id: 'si-nivel-vas-t',        puoli: 'Takaa',  nimi: 'Risti-suoliluunivel vasen',           tekninen: 'SI-nivel',               cx: 508, cy: 412 },
  { id: 'si-nivel-oik-t',        puoli: 'Takaa',  nimi: 'Risti-suoliluunivel oikea',           tekninen: 'SI-nivel',               cx: 549, cy: 412 },
  { id: 'crista-vas-t',          puoli: 'Takaa',  nimi: 'Suoliluun harju vasen',               tekninen: 'crista iliaca',          cx: 474, cy: 387 },
  { id: 'crista-oik-t',          puoli: 'Takaa',  nimi: 'Suoliluun harju oikea',               tekninen: 'crista iliaca',          cx: 582, cy: 387 },
  { id: 'pakara-vas-t',          puoli: 'Takaa',  nimi: 'Pakara vasen',                        tekninen: '',                       cx: 491, cy: 462 },
  { id: 'pakara-oik-t',          puoli: 'Takaa',  nimi: 'Pakara oikea',                        tekninen: '',                       cx: 565, cy: 462 },
  { id: 'takareisi-vas-t',       puoli: 'Takaa',  nimi: 'Takareisi vasen',                     tekninen: '',                       cx: 495, cy: 545 },
  { id: 'takareisi-oik-t',       puoli: 'Takaa',  nimi: 'Takareisi oikea',                     tekninen: '',                       cx: 561, cy: 545 },
  { id: 'polvitaive-vas-t',      puoli: 'Takaa',  nimi: 'Polvitaive vasen',                    tekninen: '',                       cx: 495, cy: 611 },
  { id: 'polvitaive-oik-t',      puoli: 'Takaa',  nimi: 'Polvitaive oikea',                    tekninen: '',                       cx: 561, cy: 611 },
  { id: 'pohje-vas-t',           puoli: 'Takaa',  nimi: 'Pohje vasen',                         tekninen: '',                       cx: 495, cy: 686 },
  { id: 'pohje-oik-t',           puoli: 'Takaa',  nimi: 'Pohje oikea',                         tekninen: '',                       cx: 561, cy: 686 },
  { id: 'akilles-vas-t',         puoli: 'Takaa',  nimi: 'Akillesjänne vasen',                  tekninen: '',                       cx: 495, cy: 769 },
  { id: 'akilles-oik-t',         puoli: 'Takaa',  nimi: 'Akillesjänne oikea',                  tekninen: '',                       cx: 561, cy: 769 },
  { id: 'kantapaa-vas-t',        puoli: 'Takaa',  nimi: 'Kantapää vasen',                      tekninen: '',                       cx: 495, cy: 810 },
  { id: 'kantapaa-oik-t',        puoli: 'Takaa',  nimi: 'Kantapää oikea',                      tekninen: '',                       cx: 561, cy: 810 },

  // ========== SIVU VASEN (11) — keskilinja x=208 ==========

  { id: 'korva-sv',              puoli: 'Sivu vasen', nimi: 'Korva',                           tekninen: 'painovoimalinjan ylin piste', cx: 200, cy: 55 },
  { id: 'kaulan-sivu-sv',        puoli: 'Sivu vasen', nimi: 'Kaulan sivu',                     tekninen: '',                       cx: 200, cy: 125 },
  { id: 'olkapaa-sv',            puoli: 'Sivu vasen', nimi: 'Olkapään kärki',                  tekninen: 'acromion',               cx: 215, cy: 167 },
  { id: 'olkavarsi-sv',          puoli: 'Sivu vasen', nimi: 'Olkavarsi',                       tekninen: '',                       cx: 215, cy: 229 },
  { id: 'kylki-sv',              puoli: 'Sivu vasen', nimi: 'Kylki/kylkiluut',                 tekninen: '',                       cx: 235, cy: 279 },
  { id: 'lannelihas-sv',         puoli: 'Sivu vasen', nimi: 'Lannelihas',                      tekninen: 'QL — neliömäinen lannelihas', cx: 225, cy: 354 },
  { id: 'trochanter-sv',         puoli: 'Sivu vasen', nimi: 'Sarvennoinen',                    tekninen: 'trochanter major',       cx: 225, cy: 420 },
  { id: 'reisi-sivu-sv',         puoli: 'Sivu vasen', nimi: 'Reisi sivu',                      tekninen: 'IT-band',                cx: 225, cy: 528 },
  { id: 'polvi-sivu-sv',         puoli: 'Sivu vasen', nimi: 'Polvi sivu',                      tekninen: '',                       cx: 220, cy: 611 },
  { id: 'saari-sivu-sv',         puoli: 'Sivu vasen', nimi: 'Sääri sivu',                      tekninen: 'peroneus-alue',          cx: 225, cy: 694 },
  { id: 'ulkokehras-sv',         puoli: 'Sivu vasen', nimi: 'Ulkokehräs',                      tekninen: 'lateraalinen malleoli',  cx: 225, cy: 781 },

  // ========== SIVU OIKEA (11) — keskilinja x=1228 ==========

  { id: 'korva-so',              puoli: 'Sivu oikea', nimi: 'Korva',                           tekninen: 'painovoimalinjan ylin piste', cx: 1238, cy: 55 },
  { id: 'kaulan-sivu-so',        puoli: 'Sivu oikea', nimi: 'Kaulan sivu',                     tekninen: '',                       cx: 1238, cy: 125 },
  { id: 'olkapaa-so',            puoli: 'Sivu oikea', nimi: 'Olkapään kärki',                  tekninen: 'acromion',               cx: 1228, cy: 167 },
  { id: 'olkavarsi-so',          puoli: 'Sivu oikea', nimi: 'Olkavarsi',                       tekninen: '',                       cx: 1228, cy: 229 },
  { id: 'kylki-so',              puoli: 'Sivu oikea', nimi: 'Kylki/kylkiluut',                 tekninen: '',                       cx: 1208, cy: 279 },
  { id: 'lannelihas-so',         puoli: 'Sivu oikea', nimi: 'Lannelihas',                      tekninen: 'QL — neliömäinen lannelihas', cx: 1218, cy: 354 },
  { id: 'trochanter-so',         puoli: 'Sivu oikea', nimi: 'Sarvennoinen',                    tekninen: 'trochanter major',       cx: 1218, cy: 420 },
  { id: 'reisi-sivu-so',         puoli: 'Sivu oikea', nimi: 'Reisi sivu',                      tekninen: 'IT-band',                cx: 1218, cy: 528 },
  { id: 'polvi-sivu-so',         puoli: 'Sivu oikea', nimi: 'Polvi sivu',                      tekninen: '',                       cx: 1223, cy: 611 },
  { id: 'saari-sivu-so',         puoli: 'Sivu oikea', nimi: 'Sääri sivu',                      tekninen: 'peroneus-alue',          cx: 1218, cy: 694 },
  { id: 'ulkokehras-so',         puoli: 'Sivu oikea', nimi: 'Ulkokehräs',                      tekninen: 'lateraalinen malleoli',  cx: 1218, cy: 781 },
];

// Apufunktio: hae vyöhykkeet puolen perusteella
export function vyohykkeetPuolittain(puoli) {
  return KEHON_VYOHYKKEET.filter(v => v.puoli === puoli);
}

// Apufunktio: hae vyöhyke ID:n perusteella
export function vyohykeIdlla(id) {
  return KEHON_VYOHYKKEET.find(v => v.id === id) ?? null;
}

// Apufunktio: muotoile näyttönimi (suomenkielinen + tekninen jos on)
// Esim. "Suoliluun etukärki vasen (ASIS)" tai "Otsa"
export function vyohykkeenNayttonimi(vyohyke) {
  if (!vyohyke) return '';
  if (!vyohyke.tekninen) return vyohyke.nimi;
  return `${vyohyke.nimi} (${vyohyke.tekninen})`;
}
