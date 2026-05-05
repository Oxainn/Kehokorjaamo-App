// KIIRE-FIX 3b (2026-05-05): asiakasrekisterin "+ Aloita käynti" -napin polku
// käynnillisille asiakkaille. Avaa VIIMEISIMMÄN hoitokäynnin LomakeRenderoijalla
// muokkaustilassa — vastaukset esitäytetty, auto-save toimii (D-malli,
// YHDISTETTY-LOMAKE.md LISÄYS 2026-05-05).
//
// Vertailu KayntiLomakeNakyma:han: sama datalataus-logiikka mutta avataan
// kokonäyttönä muokkaustilassa, ei modaalina lukutilassa. Yhteinen pohja
// voidaan myöhemmin nostaa hookkiin (refaktorointi jää erilliseksi committiksi).
//
// Vertailu UusiKayntiContainer:iin: ei kutsu aloitaUusiKaynti — käyttää
// olemassa olevan käynnin hoitokayntiId:tä ja vastauksia. Jos käynti on
// lukittu (tila='valmis'), kutsutaan avaaKayntiUudelleen ennen renderöintiä
// → audit-trailissa näkyy uudelleenavaus.
//
// Reuna-tapaukset:
//   - lomakepohja_versio_id puuttuu (vanha käynti ennen Pala 2.24) → kutsuva
//     komponentti ohjaa palveluvalinta-flow:hin (tarkistus haeViimeisinHoitokaynti:ssa)
//   - hoitokäynti löytyy mutta pohjan haku epäonnistuu → näytä virhe
//   - avaaKayntiUudelleen epäonnistuu → näytä virhe (älä avaa lomaketta
//     muokkaustilassa lukitulle käynnille)

import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { avaaKayntiUudelleen, paivitaAsiakkaanPerustiedot } from '../lib/db'
import { jaaVastaukset } from '../lib/lomakeTallennus'
import LomakeRenderoija from './lomake/runtime/LomakeRenderoija'

const IDENTITEETTI_DEBOUNCE_MS = 3000

const SALLITUT_PERUSTIEDOT = new Set([
  'nimi', 'sahkoposti', 'puhelin',
  'lahiosoite', 'postinumero', 'postitoimipaikka',
])

const tilaTyyli = {
  fontSize:  '14px',
  color:     '#6b7280',
  textAlign: 'center',
  padding:   '32px 16px',
}

const virheTyyli = {
  ...tilaTyyli,
  color:        '#b91c1c',
  background:   '#fef2f2',
  borderRadius: '12px',
  border:       '1px solid #fecaca',
}

function poimiIdentiteetti(vastaukset) {
  const { asiakas } = jaaVastaukset(vastaukset)
  const tulos = {}
  for (const [k, v] of Object.entries(asiakas)) {
    if (SALLITUT_PERUSTIEDOT.has(k)) tulos[k] = v
  }
  return tulos
}

export default function AvaaKayntiContainer({ asiakas, kaynti, onValmis, onPeruuta }) {
  // kaynti = { id, tila, lomakepohja_versio_id, vastaukset, versio, otsikko, pvm }
  const [valmiitTiedot, setValmiitTiedot] = useState(null)
  const [vastaukset,    setVastaukset]    = useState(kaynti?.vastaukset ?? {})
  const [alkuVersio,    setAlkuVersio]    = useState(kaynti?.versio ?? null)
  // Tila lomakkeen renderöinnille: aluksi 'lataa' kunnes pohja saatu (ja
  // käynti tarvittaessa avattu uudelleen). Sen jälkeen 'luonnos' jolloin
  // LomakeRenderoija tukee muokkausta + auto-savea.
  const [renderoiTila,  setRenderoiTila]  = useState('luonnos')
  const [setupTila,     setSetupTila]     = useState('lataa')   // 'lataa' | 'valmis' | 'virhe'
  const [setupVirhe,    setSetupVirhe]    = useState(null)

  useEffect(() => {
    if (!kaynti?.id || !kaynti?.lomakepohja_versio_id) {
      setSetupTila('virhe')
      setSetupVirhe('Hoitokäynnin tietoja puuttuu — palaa rekisteriin ja kokeile uudestaan')
      return
    }

    let peruttu = false
    setSetupTila('lataa')
    setSetupVirhe(null)

    ;(async () => {
      // 1. Jos käynti on lukittu, avaa se uudelleen — saadaan tuore versio
      //    optimistista lukkoa varten + audit-trailiin merkintä.
      let kaytettavaVersio = kaynti.versio
      if (kaynti.tila === 'valmis') {
        const tulos = await avaaKayntiUudelleen(kaynti.id)
        if (peruttu) return
        if (tulos.virhe) {
          setSetupTila('virhe')
          setSetupVirhe(`Käynnin avaus epäonnistui: ${tulos.virhe}`)
          return
        }
        // avaaKayntiUudelleen-funktio kasvattaa hoitokaynnit.versio:ta yhdellä
        // sulun-yhteydessä. Haetaan ajantasainen versio jotta auto-save ei
        // törmää lukkoon ensimmäisellä tallennuksella.
        const { data: paivitetty } = await supabase
          .from('hoitokaynnit')
          .select('versio')
          .eq('id', kaynti.id)
          .maybeSingle()
        if (peruttu) return
        if (paivitetty?.versio != null) kaytettavaVersio = paivitetty.versio
      }

      // 2. Hae snapshot-pohjarakenne käynnin lomakepohja_versio_id:n kautta —
      //    sama snapshot-malli kuin KayntiLomakeNakyma:ssa (Pala 2.24).
      const { data: versio, error: vErr } = await supabase
        .from('lomakepohja_versiot')
        .select('rakenne')
        .eq('id', kaynti.lomakepohja_versio_id)
        .single()
      if (peruttu) return
      if (vErr || !versio?.rakenne) {
        setSetupTila('virhe')
        setSetupVirhe('Lomakepohjan versio ei löydy tai on rikki')
        return
      }

      // 3. Kerää kenttä-tunnisteet pohjarakenteesta ja hae kenttäkirjasto
      const tunnisteet = []
      for (const osio of (versio.rakenne?.osiot ?? [])) {
        for (const kf of (osio.kenttat ?? [])) {
          if (kf.kentta_id_tunniste) tunnisteet.push(kf.kentta_id_tunniste)
        }
      }

      let kentat = {}
      if (tunnisteet.length > 0) {
        const { data: kenttaRivit, error: kErr } = await supabase
          .from('kenttakirjasto')
          .select('id, kentta_id_tunniste, kenttatyyppi, validointi, oletukset, kentan_versiot(versio, kaannokset, pysyva)')
          .in('kentta_id_tunniste', tunnisteet)
        if (peruttu) return
        if (kErr) {
          setSetupTila('virhe')
          setSetupVirhe('Kenttäkirjaston haku epäonnistui')
          return
        }
        for (const k of (kenttaRivit ?? [])) {
          const v = (k.kentan_versiot ?? []).slice().sort((a, b) => b.versio - a.versio)[0]
          kentat[k.kentta_id_tunniste] = {
            id:         k.id,
            tunniste:   k.kentta_id_tunniste,
            tyyppi:     k.kenttatyyppi,
            validointi: k.validointi ?? {},
            oletukset:  k.oletukset ?? {},
            kaannokset: v?.kaannokset ?? {},
            pysyva:     v?.pysyva ?? false,
          }
        }
      }

      if (peruttu) return
      setValmiitTiedot({ rakenne: versio.rakenne, kentat })
      setAlkuVersio(kaytettavaVersio)
      setRenderoiTila('luonnos')
      setSetupTila('valmis')
    })().catch((e) => {
      if (peruttu) return
      console.error('AvaaKayntiContainer-latausvirhe:', e)
      setSetupTila('virhe')
      setSetupVirhe(e?.message ?? 'Tuntematon virhe')
    })

    return () => { peruttu = true }
  }, [kaynti?.id, kaynti?.lomakepohja_versio_id, kaynti?.tila])

  // Identiteetti-synkronointi: kun lomakkeessa muuttuu nimi/sähköposti/jne,
  // päivitä asiakkaat-tauluun (3s debounce, sama kuin UusiKayntiContainer)
  useEffect(() => {
    if (!asiakas?.id) return
    if (Object.keys(vastaukset).length === 0) return

    const identiteetti = poimiIdentiteetti(vastaukset)
    if (Object.keys(identiteetti).length === 0) return

    const timer = setTimeout(() => {
      paivitaAsiakkaanPerustiedot(asiakas.id, identiteetti).catch((e) => {
        console.warn('Asiakkaan perustietojen synkronointi epäonnistui:', e)
      })
    }, IDENTITEETTI_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [vastaukset, asiakas?.id])

  function onTilaMuutos(uusiTila) {
    setRenderoiTila(uusiTila)
    if (uusiTila === 'valmis' && onValmis) onValmis(asiakas?.id)
  }

  if (setupTila === 'lataa') {
    return (
      <div style={tilaTyyli}>
        Avataan viimeisintä käyntiä…
      </div>
    )
  }

  if (setupTila === 'virhe') {
    return (
      <div className="flex flex-col gap-4">
        <div style={virheTyyli}>{setupVirhe}</div>
        {onPeruuta && (
          <button
            type="button"
            onClick={onPeruuta}
            className="self-center px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            ← Takaisin rekisteriin
          </button>
        )}
      </div>
    )
  }

  const nayttoOtsikko = kaynti?.otsikko || 'Viimeisin käynti'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Muokkaa käyntiä
          </span>
          <span className="text-base font-semibold text-gray-800 truncate">
            {nayttoOtsikko}
          </span>
        </div>
        {onPeruuta && (
          <button
            type="button"
            onClick={onPeruuta}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0"
          >
            ← Rekisteri
          </button>
        )}
      </div>

      <LomakeRenderoija
        valmiitTiedot={valmiitTiedot}
        vastaukset={vastaukset}
        onMuutos={setVastaukset}
        hoitokayntiId={kaynti.id}
        asiakasId={asiakas?.id}
        asiakasPituusCm={asiakas?.pituus}
        alkuVersio={alkuVersio}
        tila={renderoiTila}
        onTilaMuutos={onTilaMuutos}
      />
    </div>
  )
}
