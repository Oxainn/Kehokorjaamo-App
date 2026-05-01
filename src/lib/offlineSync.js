// Vaihe B Pala B9b — offline-jonon synkronointi
//
// Kun yhteys palaa (window 'online'-event tai komponentin polling),
// kutsutaan synkronoiJono() joka käy läpi IndexedDB:n queue-storen
// ja yrittää suorittaa kunkin tehtävän db.js:n kautta. Onnistuneet
// poistetaan jonosta, virheelliset jätetään uudestaan yritettäväksi.
//
// Käytetään ainoastaan kun yhteys ON päällä — ei aja kutsuja jos
// navigator.onLine === false.

import { lueJono, poistaJonosta } from './offlineDB'
import {
  tallennaHoitokirjaus,
  tallennaHavainnot,
  tallennaKaynninItsehoito,
} from './db'

// Kartta op-tunnisteesta varsinaiseen db.js-funktioon. Jokainen funktio
// palauttaa { virhe } tai heittää poikkeuksen — molemmat käsitellään.
const KASITTELIJAT = {
  tallennaHoitokirjaus:     (args) => tallennaHoitokirjaus(...args),
  tallennaHavainnot:        (args) => tallennaHavainnot(...args),
  tallennaKaynninItsehoito: (args) => tallennaKaynninItsehoito(...args),
}

export async function synkronoiJono() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { onnistuneet: 0, virheet: 0, ohitettu: true }
  }
  const jono = await lueJono()
  let onnistuneet = 0
  let virheet     = 0
  for (const tyo of jono) {
    const k = KASITTELIJAT[tyo.op]
    if (!k) {
      console.warn('[sync] tuntematon op, poistetaan:', tyo.op)
      await poistaJonosta(tyo.id)
      continue
    }
    try {
      const tulos = await k(tyo.args)
      if (tulos?.virhe) {
        // Server vastasi virheellä — älä poista jonosta, käyttäjä voi
        // yrittää manuaalisesti tai ratkaista konfliktin.
        virheet++
        console.warn('[sync] palautti virheen:', tyo.op, tulos.virhe)
        continue
      }
      await poistaJonosta(tyo.id)
      onnistuneet++
    } catch (e) {
      // Verkko tai muu poikkeus — jätetään jonoon uutta yritystä varten
      virheet++
      console.warn('[sync] heitti:', tyo.op, e)
    }
  }
  return { onnistuneet, virheet, ohitettu: false }
}
