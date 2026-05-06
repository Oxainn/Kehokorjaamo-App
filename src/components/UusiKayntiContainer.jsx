// AB-T5b/T6a: container-komponentti joka koordinoi käynnin avauksen.
//
// Tukee kahta polkua:
//   - UUSI asiakas (T5b): annettuAsiakasId puuttuu → luo tyhjä asiakas
//     (luoTyhjaAsiakas) → asiakasId
//   - OLEMASSA OLEVA asiakas (T6a): annettuAsiakasId annettu → käytä suoraan,
//     ohita luonti
//
// Jatkovaiheet (molemmissa poluissa):
// 2. Aloita käynti (aloitaUusiKaynti) → hoitokayntiId.
//    aloitaUusiKaynti kopioi pysyvät edellisestä valmis-käynnistä (AB-T4d),
//    joten olemassa olevan asiakkaan lomake aukeaa esitäytettynä.
// 3. Hae lomakepohja (haeLomakepohja palvelu.lomakepohja_id) → rakenne + kentät
// 4. Renderöi LomakeRenderoija jolla kaikki tarvittava propsit
// 5. Identiteetti-synkronointi: kun lomakkeessa muuttuu nimi/sähköposti/jne,
//    päivitä asiakkaat-tauluun (3s debounce, sama kuin auto-save)
// 6. Kun hoitaja klikkaa "Tallenna käynti" → onTilaMuutos('valmis') → onValmis()

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import {
  luoTyhjaAsiakas,
  aloitaUusiKaynti,
  haeLomakepohja,
  paivitaAsiakkaanPerustiedot,
} from '../lib/db'
import { jaaVastaukset } from '../lib/lomakeTallennus'
import LomakeRenderoija from './lomake/runtime/LomakeRenderoija'

// Debounce identiteetti-synkronoinnille — sama kuin auto-save jotta
// DB-kutsut menevät tasaisesti kirjoitustaukojen kohdalla.
const IDENTITEETTI_DEBOUNCE_MS = 3000

// Kentät jotka paivitaAsiakkaanPerustiedot hyväksyy. jaaVastaukset palauttaa
// asiakas-objektin jossa avaimet ovat näistä DB-sarakkeista — suodatamme tällä.
const SALLITUT_PERUSTIEDOT = new Set([
  'nimi', 'sahkoposti', 'puhelin',
  'lahiosoite', 'postinumero', 'postitoimipaikka',
])

const tilaTyyli = {
  fontSize:   '14px',
  color:      '#6b7280',
  textAlign:  'center',
  padding:    '32px 16px',
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

export default function UusiKayntiContainer({
  palvelu,
  asiakasId: annettuAsiakasId = null,   // AB-T6a: jos annettu, ohita luoTyhjaAsiakas
  onValmis,
  onPeruuta,
}) {
  const [asiakasId,   setAsiakasId]   = useState(null)
  const [hoitokayntiId, setHoitokayntiId] = useState(null)
  const [valmiitTiedot, setValmiitTiedot] = useState(null)
  const [vastaukset,  setVastaukset]  = useState({})
  const [setupTila,   setSetupTila]   = useState('lataa')   // 'lataa' | 'valmis' | 'virhe'
  const [setupVirhe,  setSetupVirhe]  = useState(null)

  // Identiteetti-synkronoinnin debounce-timer
  const identiteettiTimerRef = useRef(null)

  // 1-3: setup ketjuna kun komponentti mounttaa (palvelu valittu)
  useEffect(() => {
    if (!palvelu?.id || !palvelu?.lomakepohja_id) {
      setSetupTila('virhe')
      setSetupVirhe('Palvelua tai lomakepohjaa ei valittu')
      return
    }

    let peruttu = false
    setSetupTila('lataa')
    setSetupVirhe(null)

    ;(async () => {
      // 1. Asiakas-id: joko annettu (T6a, olemassa oleva) tai luo tyhjä (T5b, uusi)
      let kayttoonAsiakasId
      if (annettuAsiakasId) {
        kayttoonAsiakasId = annettuAsiakasId
      } else {
        const asiakasTulos = await luoTyhjaAsiakas()
        if (peruttu) return
        if (asiakasTulos.virhe) {
          setSetupTila('virhe')
          setSetupVirhe(`Asiakkaan luonti epäonnistui: ${asiakasTulos.virhe}`)
          return
        }
        kayttoonAsiakasId = asiakasTulos.id
      }

      // 2. Aloita käynti — kopioi pysyvät edellisestä valmis-käynnistä (AB-T4d)
      const kayntiTulos = await aloitaUusiKaynti(kayttoonAsiakasId)
      if (peruttu) return
      if (kayntiTulos.virhe) {
        setSetupTila('virhe')
        setSetupVirhe(`Käynnin aloitus epäonnistui: ${kayntiTulos.virhe}`)
        return
      }
      if (!kayntiTulos.hoitokayntiId) {
        setSetupTila('virhe')
        setSetupVirhe('Käyntiä ei luotu — kokeile uudestaan')
        return
      }

      // 3. Hae lomakepohja
      const pohjaTulos = await haeLomakepohja(palvelu.lomakepohja_id)
      if (peruttu) return
      if (pohjaTulos.virhe) {
        setSetupTila('virhe')
        setSetupVirhe(`Lomakepohjan haku epäonnistui: ${pohjaTulos.virhe}`)
        return
      }

      // 4. Pala 2.24 + KIIRE-FIX 4: tallenna hoitokayntiin lomakepohja_versio_id
      //    (snapshot). KayntiLomakeNakyma käyttää tätä avatakseen käynnin
      //    alkuperäisellä pohjalla, ja Y-strategia (haeViimeisinKayntiPalvelulla)
      //    rakentuu sen päälle. Aiempi fire-and-forget jätti epäonnistuneet
      //    päivitykset hiljaa lokiin ja loi käyntejä ilman versio_id:tä → tämä
      //    odottaa onnistumisen ja nostaa virheen näkyviin sen sijaan että
      //    jatkaisi rikkinäisellä tilalla.
      if (!pohjaTulos.versioId) {
        setSetupTila('virhe')
        setSetupVirhe('Lomakepohjasta ei löytynyt versiota — käyntiä ei voi avata')
        return
      }
      const { error: vErr } = await supabase
        .from('hoitokaynnit')
        .update({ lomakepohja_versio_id: pohjaTulos.versioId })
        .eq('id', kayntiTulos.hoitokayntiId)
      if (peruttu) return
      if (vErr) {
        setSetupTila('virhe')
        setSetupVirhe(`Käynnin version tallennus epäonnistui: ${vErr.message ?? vErr}`)
        return
      }

      setAsiakasId(kayttoonAsiakasId)
      setHoitokayntiId(kayntiTulos.hoitokayntiId)
      setValmiitTiedot({ rakenne: pohjaTulos.rakenne, kentat: pohjaTulos.kentat })
      setSetupTila('valmis')
    })()

    return () => { peruttu = true }
  }, [palvelu?.id, palvelu?.lomakepohja_id, annettuAsiakasId])

  // Identiteetti-synkronointi: kun nimi/sähköposti/jne muuttuu,
  // päivitä asiakkaat-tauluun (3s debounce)
  useEffect(() => {
    if (!asiakasId) return
    if (Object.keys(vastaukset).length === 0) return

    const identiteetti = poimiIdentiteetti(vastaukset)
    if (Object.keys(identiteetti).length === 0) return

    if (identiteettiTimerRef.current) clearTimeout(identiteettiTimerRef.current)
    identiteettiTimerRef.current = setTimeout(() => {
      paivitaAsiakkaanPerustiedot(asiakasId, identiteetti).catch((e) => {
        console.warn('Asiakkaan perustietojen synkronointi epäonnistui:', e)
      })
    }, IDENTITEETTI_DEBOUNCE_MS)

    return () => {
      if (identiteettiTimerRef.current) clearTimeout(identiteettiTimerRef.current)
    }
  }, [vastaukset, asiakasId])

  function onTilaMuutos(uusiTila) {
    if (uusiTila === 'valmis') {
      // Käynti lukittu — palaa rekisteriin
      if (onValmis) onValmis(asiakasId)
    }
    // 'luonnos' (avattu uudelleen) ei vaadi parent:in toimenpidettä —
    // LomakeRenderoija jatkaa muokkausnäkymässä
  }

  if (setupTila === 'lataa') {
    return (
      <div style={tilaTyyli}>
        Valmistellaan uutta käyntiä palvelulle <strong>{palvelu?.nimi ?? '—'}</strong>…
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

  return (
    <div className="flex flex-col gap-4">
      {/* Yläpalkki: palvelun nimi + peruutus */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Uusi käynti
          </span>
          <span className="text-base font-semibold text-gray-800 truncate">
            {palvelu.nimi}
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
        hoitokayntiId={hoitokayntiId}
        asiakasId={asiakasId}
        alkuVersio={null}
        tila="luonnos"
        onTilaMuutos={onTilaMuutos}
      />
    </div>
  )
}
