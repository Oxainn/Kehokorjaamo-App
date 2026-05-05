// Pala 2.24: Read-only modaali joka avaa käynnin ALKUPERÄISELLÄ lomakerakenteella.
//
// Korvaa aiemman KayntiNakyma-tiivistelmän. Renderöi saman LomakeRenderoija-
// komponentin jolla asiakas täytti lomakkeen, mutta tila='valmis' (lukutila,
// ei auto-savea, ei muokkausta).
//
// Snapshot-malli:
//   - Hoitokayntiin tallennettu lomakepohja_versio_id (Pala 2.24-migraatio)
//   - Avataan se versio, ei nykyistä — vaikka editorissa luotaisiin uudempi.
//   - Vastaukset luetaan hoitokaynnit.vastaukset-jsonbista.

import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { useEscKey } from '../hooks/useEscKey'
import LomakeRenderoija from './lomake/runtime/LomakeRenderoija'

const overlayTyyli = {
  position:       'fixed',
  inset:          0,
  background:     'rgba(0, 0, 0, 0.5)',
  display:        'flex',
  alignItems:     'flex-start',
  justifyContent: 'center',
  padding:        '16px',
  zIndex:         1000,
  overflowY:      'auto',
}

const modaaliTyyli = {
  background:    'white',
  borderRadius:  '16px',
  width:         '100%',
  maxWidth:      '900px',
  margin:        '24px auto',
  boxShadow:     '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  display:       'flex',
  flexDirection: 'column',
}

const headerTyyli = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  padding:        '16px 20px',
  borderBottom:   '1px solid #f3f4f6',
  position:       'sticky',
  top:            0,
  background:     'white',
  borderRadius:   '16px 16px 0 0',
  zIndex:         5,
}

const sulkeTyyli = {
  width:        '44px',
  height:       '44px',
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border:       'none',
  background:   'transparent',
  color:        '#6b7280',
  cursor:       'pointer',
  fontSize:     '20px',
}

const sisaltoTyyli = {
  padding:        '20px',
}

const otsikkoTyyli = {
  fontSize:   '17px',
  fontWeight: 700,
  color:      '#111827',
  margin:     '0 0 2px',
}

export default function KayntiLomakeNakyma({ lomakeVersioId, asiakas, onSulje }) {
  const [tila,   setTila]   = useState('lataa')   // lataa | valmis | virhe
  const [virhe,  setVirhe]  = useState(null)
  const [tiedot, setTiedot] = useState(null)

  useEscKey(onSulje)

  useEffect(() => {
    let peruttu = false
    setTila('lataa')
    setVirhe(null)

    ;(async () => {
      // 1. Hae hoitokäynti lomakeVersioId:n perusteella (käyntipillerin id =
      //    asiakastietolomake_versiot.id, hoitokäynti viittaa siihen
      //    lomake_versio_id:llä)
      const { data: hoitokaynti, error: hkErr } = await supabase
        .from('hoitokaynnit')
        .select('id, vastaukset, lomakepohja_versio_id, otsikko, pvm')
        .eq('lomake_versio_id', lomakeVersioId)
        .order('luotu', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (peruttu) return
      if (hkErr) { setVirhe(hkErr.message); setTila('virhe'); return }
      if (!hoitokaynti) {
        setVirhe('Hoitokäyntiä ei löydy tälle lomakeversiolle')
        setTila('virhe')
        return
      }

      // 2. Jos pohjaversio puuttuu (vanha käynti ennen Pala 2.24:ää),
      //    näytä virhe — käyttäjä voi päivittää pohjan tai katsoa tiivistelmä-
      //    näkymästä manuaalisesti.
      if (!hoitokaynti.lomakepohja_versio_id) {
        setVirhe('Tämä käynti on tehty ennen lomake-version tallennusta. Avataan tiivistelmä — palaa muokkaustilaan jos haluat täyttää uudelleen.')
        setTila('virhe')
        return
      }

      // 3. Hae pohjarakenne snapshot-versiosta
      const { data: versio, error: vErr } = await supabase
        .from('lomakepohja_versiot')
        .select('rakenne')
        .eq('id', hoitokaynti.lomakepohja_versio_id)
        .single()
      if (peruttu) return
      if (vErr || !versio?.rakenne) {
        setVirhe('Lomakepohjan versio ei löydy tai on rikki')
        setTila('virhe')
        return
      }

      // 4. Kerää tunnisteet rakenteesta ja hae kenttäkirjasto
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
        if (kErr) { setVirhe('Kenttäkirjaston haku epäonnistui'); setTila('virhe'); return }

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
      setTiedot({
        hoitokayntiId: hoitokaynti.id,
        rakenne:       versio.rakenne,
        kentat,
        vastaukset:    hoitokaynti.vastaukset ?? {},
        otsikko:       hoitokaynti.otsikko,
        pvm:           hoitokaynti.pvm,
      })
      setTila('valmis')
    })().catch((e) => {
      if (peruttu) return
      console.error('KayntiLomakeNakyma latausvirhe:', e)
      setVirhe(e?.message ?? 'Tuntematon virhe')
      setTila('virhe')
    })

    return () => { peruttu = true }
  }, [lomakeVersioId])

  const muotoilePvm = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' })
  }
  const otsikko = tiedot?.pvm
    ? `Käynti ${muotoilePvm(tiedot.pvm)}${tiedot.otsikko ? ` — ${tiedot.otsikko}` : ''}`
    : 'Käynti'

  return (
    <div style={overlayTyyli} onClick={onSulje} role="dialog" aria-modal="true">
      <div style={modaaliTyyli} onClick={(e) => e.stopPropagation()}>
        <div style={headerTyyli}>
          <div>
            <h2 style={otsikkoTyyli}>{otsikko}</h2>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              Lukutila — alkuperäinen lomake
            </p>
          </div>
          <button type="button" onClick={onSulje} style={sulkeTyyli} aria-label="Sulje">
            ✕
          </button>
        </div>

        <div style={sisaltoTyyli}>
          {tila === 'lataa' && (
            <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '32px' }}>
              Ladataan lomaketta…
            </p>
          )}
          {tila === 'virhe' && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px',
              padding: '16px 20px', color: '#991b1b', fontSize: '14px',
            }}>
              {virhe}
            </div>
          )}
          {tila === 'valmis' && tiedot && (
            <LomakeRenderoija
              valmiitTiedot={{ rakenne: tiedot.rakenne, kentat: tiedot.kentat }}
              vastaukset={tiedot.vastaukset}
              onMuutos={() => { /* read-only — ei tallennusta */ }}
              tila="valmis"
              hoitokayntiId={tiedot.hoitokayntiId}
              asiakasId={asiakas?.id}
              asiakasPituusCm={asiakas?.pituus}
            />
          )}
        </div>
      </div>
    </div>
  )
}
