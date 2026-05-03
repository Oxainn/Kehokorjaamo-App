// AB-T7: React Context jota lomake-runtime käyttää välittäkseen kentille
// käyntikohtaista metadataa (hoitokayntiId, asiakasId, asiakasPituusCm).
//
// Käytetään erikoiskenttätyypeissä jotka tarvitsevat tämän tiedon (esim.
// Kuvantaminen — KA1-KA6 + AI-analyysi). Tavalliset kenttätyypit (Tekstirivi
// jne.) eivät tätä tarvitse.
//
// Vältetään prop-drilling LomakeRenderoija → Naytto → Osio → Kentta →
// kenttätyyppi (4-5 tasoa) suorittamalla provider LomakeRenderoija:ssa ja
// kuluttamalla hook:lla kenttätyypissä.

import { createContext, useContext } from 'react'

const LomakeKonteksti = createContext({
  hoitokayntiId:    null,
  asiakasId:        null,
  asiakasPituusCm:  null,
})

export const LomakeKontekstiProvider = LomakeKonteksti.Provider

export function useLomakeKonteksti() {
  return useContext(LomakeKonteksti)
}
