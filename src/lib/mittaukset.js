// Vaihe B Pala B4 — Mittausarvojen vertailu ja parannus-tulkinta.
//
// laskeMuutos(uusi, edellinen, sarake) → { delta, parannus }
//   delta:    numeerinen ero (uusi - edellinen)
//   parannus: 'parannus' | 'heikennys' | 'ennallaan'
//
// Eri mittareilla on eri "tavoite". Yhteinen idea: lasketaan kuinka kaukana
// arvo on tavoitteesta ennen ja jälkeen — pienempi etäisyys on parempi.
// Niskan käännöksellä isompi arvo on tavoite ("mitä enemmän liikkuvuutta,
// sen parempi"), muille keskimmäinen arvo tai 0.

const TAVOITE = {
  lantion_kallistus_aste:           { tyyppi: 'alue',    min: 4, max: 10 }, // M:4-7° + N:7-10° → 4-10° kaikille
  lantion_sivuttainen_aste:         { tyyppi: 'arvo',    arvo: 0 },
  lantion_kierto_aste:              { tyyppi: 'arvo',    arvo: 0 },
  olkapaiden_korkeusero_cm:         { tyyppi: 'arvo',    arvo: 0 },
  paan_eteen_tyontyminen_cm:        { tyyppi: 'arvo',    arvo: 0 },
  q_kulma_vasen_aste:               { tyyppi: 'alue',    min: 14, max: 17 },
  q_kulma_oikea_aste:               { tyyppi: 'alue',    min: 14, max: 17 },
  skolioosin_kierto_aste:           { tyyppi: 'arvo',    arvo: 0 },
  niskan_kaannos_vasen_aste:        { tyyppi: 'maksimi', tavoite: 80 },
  niskan_kaannos_oikea_aste:        { tyyppi: 'maksimi', tavoite: 80 },
  jalkapituus_ero_cm:               { tyyppi: 'arvo',    arvo: 0 },
  navicular_drop_vasen_mm:          { tyyppi: 'minimi',  tavoite: 0 },
  navicular_drop_oikea_mm:          { tyyppi: 'minimi',  tavoite: 0 },
  akillesjanteen_kulma_vasen_aste:  { tyyppi: 'arvo',    arvo: 0 },
  akillesjanteen_kulma_oikea_aste:  { tyyppi: 'arvo',    arvo: 0 },
}

function tavoiteEtaisyys(sarake, arvo) {
  const t = TAVOITE[sarake]
  if (!t) return Math.abs(arvo)
  if (t.tyyppi === 'arvo')   return Math.abs(arvo - t.arvo)
  if (t.tyyppi === 'alue')   {
    if (arvo >= t.min && arvo <= t.max) return 0
    return Math.min(Math.abs(arvo - t.min), Math.abs(arvo - t.max))
  }
  if (t.tyyppi === 'maksimi') {
    // Tavoitteen alle = huonompi (kuinka paljon vajaa). Yli tavoitteen = OK.
    return Math.max(0, t.tavoite - arvo)
  }
  if (t.tyyppi === 'minimi')  return Math.abs(arvo - t.tavoite)
  return Math.abs(arvo)
}

export function laskeMuutos(uusi, edellinen, sarake) {
  if (uusi === null || uusi === undefined) return null
  if (edellinen === null || edellinen === undefined) return null
  const delta = Number(uusi) - Number(edellinen)
  if (Math.abs(delta) < 0.01) return { delta: 0, parannus: 'ennallaan' }
  const ennenEt = tavoiteEtaisyys(sarake, Number(edellinen))
  const nytEt   = tavoiteEtaisyys(sarake, Number(uusi))
  // Käytetään pientä toleranssia jotta liukuluvun pyöristysvirheet eivät
  // tuota false positives "ennallaan"-tilanteissa.
  const ero = nytEt - ennenEt
  if (ero < -0.01) return { delta, parannus: 'parannus' }
  if (ero >  0.01) return { delta, parannus: 'heikennys' }
  return { delta, parannus: 'ennallaan' }
}

// Suomenkielinen lyhyt teksti delta-arvolle (esim. "+2.0°").
export function muotoileDelta(delta, yksikko) {
  if (delta === null || delta === undefined) return ''
  const merkki = delta > 0 ? '+' : (delta < 0 ? '−' : '±')
  const luku = Math.abs(delta).toFixed(1).replace('.0', '').replace('.', ',')
  return `${merkki}${luku} ${yksikko}`
}
