// Vaihe B — Pala B1+B2: Hoitokirjaus-näkymä (B-lomakkeen täyttö)
//
// Pala B1: perustiedot (otsikko, alkutilanne, mitä hoidettiin, hoitajan kommentit)
// Pala B2: BodyMap-havainnot + hoitoraportti (kesto, kulku, muista ensi kerralla)
//          + edellisen käynnin "muista"-nosto
//
// Avautuu kun "+ Uusi käynti" suoritettiin (App.jsx setNakyma 'hoitokirjaus').
// hoitokayntiId: id B-lomakkeesta (hoitokaynnit-rivistä) joka aiemmin
// luotiin tyhjänä asiakkaan vahvistuksen yhteydessä, tai juuri luotu
// uudelle hoitokerralle. B-lomake on linkattu A-lomakkeen suljettuun
// versioon snapshot-malliksi.

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  tallennaHoitokirjaus,
  haeHoitokaynti,
  haeAsiakkaanKayntienMaara,
  tallennaHavainnot,
  haeHavainnot,
  haeEdellinenValmiisKaynti,
  haeEdellisetMittarit,
  haeKaynninItsehoito,
  tallennaKaynninItsehoito,
  haeAsiakkaanKehonkartta,
  haeAsiakkaanOireet,
} from '../lib/db'
import { useAutoResize } from '../hooks/useAutoResize'
import { useOnline } from '../hooks/useOnline'
import { muotoilePvm } from '../lib/muotoilu'
import { lisaaJonoon } from '../lib/offlineDB'
import KehonkarttaVertailu from './KehonkarttaVertailu'
import MittariSliideri from './MittariSliideri'
import ItsehoitoValinnat from './ItsehoitoValinnat'
import AILoydosAnalyysi from './AILoydosAnalyysi'
import AsentoKuvat from './AsentoKuvat'
import { MITTARIT } from '../data/linjausmittarit'

const inputTyyli = {
  width:        '100%',
  boxSizing:    'border-box',
  padding:      '12px 14px',
  borderRadius: '12px',
  border:       '1.5px solid #e2e8f0',
  fontSize:     '15px',
  color:        '#111827',
  outline:      'none',
  background:   'white',
  fontFamily:   'inherit',
  lineHeight:   1.4,
}

const textareaTyyli = {
  ...inputTyyli,
  resize:   'none',
  overflow: 'hidden',
  minHeight: '120px',
}

const labelTyyli = {
  display:       'block',
  fontSize:      '13px',
  fontWeight:    600,
  color:         '#374151',
  marginBottom:  '6px',
}

const ryhmaTyyli = {
  background:    'white',
  border:        '1px solid #e5e7eb',
  borderRadius:  '12px',
  padding:       '20px',
  display:       'flex',
  flexDirection: 'column',
  gap:           '14px',
}

const ryhmaOtsikko = {
  fontSize:      '12px',
  fontWeight:    700,
  color:         '#374151',
  margin:        '0 0 6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  paddingBottom: '8px',
  borderBottom:  '1px solid #f3f4f6',
}

const ilmoitusTyyli = (sävy) => ({
  background:   sävy === 'onnistui' ? '#ecfdf5' : sävy === 'tieto' ? '#eff6ff' : '#fef2f2',
  border:       sävy === 'onnistui' ? '1px solid #6ee7b7' : sävy === 'tieto' ? '1px solid #93c5fd' : '1px solid #fecaca',
  color:        sävy === 'onnistui' ? '#065f46' : sävy === 'tieto' ? '#1e3a8a' : '#991b1b',
  borderRadius: '12px',
  padding:      '12px 16px',
  fontSize:     '13px',
  lineHeight:   1.5,
})

export default function Hoitokirjaus({ asiakas, hoitokayntiId, testimoodi = false, onValmis, onPeru }) {
  // Pala B1 — perustiedot
  const [otsikko,            setOtsikko]            = useState('')
  const [mitaHoidettiin,     setMitaHoidettiin]     = useState('')
  const [hoitajanKommentit,  setHoitajanKommentit]  = useState('')
  // Pala B2 — hoitoraportti
  const [kesto,              setKesto]              = useState('')
  // Sisäinen muuttuja "lahtotilanne" matchaa DB-saraketta. UI-label on
  // "Alkutilanne" — DB-rename siirretty erilliseksi siivous-paloiksi.
  const [lahtotilanne,       setLahtotilanne]       = useState('')
  const [muistaEnsiKerralla, setMuistaEnsiKerralla] = useState('')
  // Havainnot (BodyMap-löydökset)
  const [havainnot,          setHavainnot]          = useState([])
  const [havainnotEsitayte,  setHavainnotEsitayte]  = useState(null)
  // Pala B6.6 — asiakkaan A-lomakkeen kehonkartta vertailutietona
  const [asiakkaanKehonkartta, setAsiakkaanKehonkartta] = useState(null)
  // Pala B8 — asiakkaan oma "hoitoon tulon syy" AI-promptia varten
  const [asiakkaanOireet,    setAsiakkaanOireet]    = useState(null)
  // Mittarit (Pala B3): { sarake: numero | null }
  const [mittarit,           setMittarit]           = useState({})
  // Edellisen käynnin mittarit (Pala B4) — null jos ei aiempaa käyntiä
  const [edellisetMittarit,  setEdellisetMittarit]  = useState(null)
  // Itsehoito-valinnat (Pala B6): käyntikohtainen ohjelma
  const [itsehoito,          setItsehoito]          = useState([])
  // Seuraavan käynnin pvm (esitäyttö +7 vrk, käynnin laskuria ei käytetä)
  const [seuraavaKayntiPvm,  setSeuraavaKayntiPvm]  = useState('')
  // Edellisen käynnin nosto
  const [edellisenMuista,    setEdellisenMuista]    = useState(null)
  // Meta
  const [pvm,                setPvm]                = useState(null)
  const [kayntinumero,       setKayntinumero]       = useState(null)
  const [yhteensa,           setYhteensa]           = useState(null)
  const [lataa,              setLataa]              = useState(true)
  const [tila,               setTila]               = useState('idle') // idle | tallentaa | onnistui | virhe | jonossa | osittainen
  const [virhe,              setVirhe]              = useState(null)
  // VB1 — per-osio-tila kun tallennus jakautuu kolmeen kutsuun (käynti,
  // havainnot, itsehoito). Onnistumiset ja epäonnistumiset näytetään
  // erikseen ja vain epäonnistuneet voi yrittää uudelleen.
  // Tilat: 'idle' | 'tehty' | 'epaonnistui' | 'jonossa'
  const [osiot, setOsiot] = useState({ kaynti: 'idle', havainnot: 'idle', itsehoito: 'idle' })
  // VB2 — optimistinen lukko. ladattuVersio = käyntirivin versio kun
  // hoitokirjaus avattiin. Tallennushetkellä lähetetään tämä mukaan;
  // jos DB:n versio on suurempi (toinen välilehti tallentanut), saadaan
  // ristiriitailmoitus.
  const [ladattuVersio, setLadattuVersio] = useState(null)
  // Pala B9b — selain raportoi onko verkkoa
  const online = useOnline()

  const mitaHoidettiinRef     = useAutoResize(mitaHoidettiin)
  const hoitajanKommentitRef  = useAutoResize(hoitajanKommentit)
  const lahtotilanneRef       = useAutoResize(lahtotilanne)
  const muistaEnsiKerrallaRef = useAutoResize(muistaEnsiKerralla)

  useEffect(() => {
    if (!hoitokayntiId || !asiakas?.id) { setLataa(false); return }
    let peruttu = false

    Promise.all([
      haeHoitokaynti(hoitokayntiId),
      haeAsiakkaanKayntienMaara(asiakas.id),
      haeHavainnot(hoitokayntiId),
      haeEdellinenValmiisKaynti(asiakas.id, hoitokayntiId),
      haeEdellisetMittarit(asiakas.id, hoitokayntiId),
      haeKaynninItsehoito(hoitokayntiId),
      haeAsiakkaanKehonkartta(asiakas.id),
      haeAsiakkaanOireet(asiakas.id),
    ]).then(([kaynti, kpl, havRivit, edellinen, edellisetMitt, itsehoitoRivit, asKehonkartta, asOireet]) => {
      if (peruttu) return
      if (kaynti) {
        setOtsikko(kaynti.otsikko ?? '')
        setMitaHoidettiin(kaynti.hoidon_kulku ?? '')
        setHoitajanKommentit(kaynti.hoitajan_kommentit ?? '')
        setKesto(kaynti.kesto_min ?? '')
        setLahtotilanne(kaynti.lahtotilanne ?? '')
        setMuistaEnsiKerralla(kaynti.muista_ensi_kerralla ?? '')
        setPvm(kaynti.pvm)
        // VB2 — talleta lähtöversio optimistista lukkoa varten
        setLadattuVersio(kaynti.versio ?? 0)
        // Seuraavan käynnin pvm. Esitäyttö: nykyinen + 7 vrk jos ei ole
        // vielä asetettu (vain kun käynti on tuore luonnos).
        if (kaynti.seuraava_kaynti_pvm) {
          setSeuraavaKayntiPvm(kaynti.seuraava_kaynti_pvm)
        } else if (kaynti.pvm) {
          const d = new Date(kaynti.pvm)
          d.setDate(d.getDate() + 7)
          setSeuraavaKayntiPvm(d.toISOString().slice(0, 10))
        }
        // Pala B3 — esitäyttö 15 mittarille
        const m = {}
        for (const mt of MITTARIT) {
          m[mt.sarake] = kaynti[mt.sarake] ?? null
        }
        setMittarit(m)
      }
      setYhteensa(kpl)
      // N = monesko käynti tämä on (juokseva numerointi, ei sarja-yhteyttä).
      setKayntinumero(kpl)
      // Esitäyttö havainnoille — muunna DB-rivit BodyMap:n initialFindings-muotoon
      if (havRivit && havRivit.length > 0) {
        const initial = {}
        for (const r of havRivit) {
          const alueId = r.lisakentat?.alueId
          if (!alueId) continue
          initial[alueId] = {
            tyyppi:     r.lisakentat?.tyyppi ?? null,
            kipu:       r.voimakkuus ?? 0,
            kirjaukset: r.lisakentat?.kirjaukset ?? {},
          }
        }
        setHavainnotEsitayte(initial)
      }
      // Edellisen käynnin "muista ensi kerralla" -nosto
      if (edellinen && edellinen.muista_ensi_kerralla) {
        setEdellisenMuista({
          teksti: edellinen.muista_ensi_kerralla,
          pvm:    edellinen.pvm,
          otsikko: edellinen.otsikko,
        })
      }
      // Pala B4 — edellisen käynnin mittarit (saadaan myös jos edellinen on null
      // mutta jokin luonnos-rivi sisältää mittareita)
      setEdellisetMittarit(edellisetMitt ?? null)
      // Pala B6 — käyntikohtaiset itsehoito-valinnat
      setItsehoito((itsehoitoRivit ?? []).map((r) => ({
        kirjasto_harjoitus_id: r.kirjasto_harjoitus_id,
        harjoitus:             r.harjoitus,
        toistot_muokattu:      r.toistot_muokattu ?? '',
        frekvenssi_muokattu:   r.frekvenssi_muokattu ?? '',
        lisahuomautus:         r.lisahuomautus ?? '',
      })))
      // Pala B6.6 — asiakkaan A-lomakkeen kehonkartta vertailua varten
      setAsiakkaanKehonkartta(asKehonkartta ?? null)
      // Pala B8 — asiakkaan oma "hoitoon tulon syy" AI-promptia varten
      setAsiakkaanOireet(asOireet ?? null)
      setLataa(false)
    }).catch((e) => {
      if (peruttu) return
      console.error('Hoitokirjauksen lataus epäonnistui:', e)
      setLataa(false)
    })
    return () => { peruttu = true }
  }, [hoitokayntiId, asiakas?.id])

  // BodyMap kutsuu tämän jokaisesta löydösten muutoksesta
  const onHavainnotMuutos = useCallback((findings) => {
    setHavainnot(findings)
  }, [])

  async function tallenna() {
    setTila('tallentaa')
    setVirhe(null)

    // Validoi kesto: NaN ja vyörähtäneet arvot torjutaan ennen tallennusta
    // jotta DB:hen ei mene mitä tahansa numeroksi yritetty merkkijono.
    let kestoArvo = null
    if (kesto !== '' && kesto !== null && kesto !== undefined) {
      const n = Number(kesto)
      if (Number.isNaN(n)) {
        setVirhe('Hoidon kesto ei ole kelvollinen luku')
        setTila('virhe')
        return
      }
      if (n < 0 || n > 600) {
        setVirhe('Hoidon kesto pitää olla välillä 0–600 minuuttia')
        setTila('virhe')
        return
      }
      kestoArvo = n
    }

    const hoitokirjausPayload = {
      otsikko:              otsikko.trim() || null,
      hoidon_kulku:         mitaHoidettiin.trim() || null,
      hoitajan_kommentit:   hoitajanKommentit.trim() || null,
      kesto_min:            kestoArvo,
      lahtotilanne:         lahtotilanne.trim() || null,
      muista_ensi_kerralla: muistaEnsiKerralla.trim() || null,
      seuraava_kaynti_pvm:  seuraavaKayntiPvm || null,
      tila:                 'valmis',
      ...mittarit,
      // VB2 — lähetä lähtöversio optimistista lukkoa varten
      versio:               ladattuVersio,
    }

    // Tallennuksen alkuperäinen tila — jos osa on jo aiemmin onnistunut
    // (retry), käytä sitä lähtökohtana eikä yritä uudestaan.
    const lahto = osiot
    const uusiTila = { ...lahto }
    const virheet = []

    // Pala B9b: offline → kaikki epäonnistuneet osiot jonoon, ei kutsuja.
    // VB1: säilytetään aiemmin onnistuneet osiot ('tehty') — niitä ei
    // jonoteta uudestaan.
    async function aja(osio, kutsu, jonoOp, jonoArgs) {
      if (lahto[osio] === 'tehty') return  // jo onnistui aiemmin
      if (!online) {
        try {
          await lisaaJonoon({ op: jonoOp, args: jonoArgs })
          uusiTila[osio] = 'jonossa'
        } catch (e) {
          uusiTila[osio] = 'epaonnistui'
          virheet.push(`${osio}: offline-jonotus epäonnistui (${e.message ?? 'tuntematon'})`)
        }
        return
      }
      const tulos = await kutsu()
      if (tulos?.ristiriita) {
        // VB2: optimistinen-lukko-konflikti — älä jonota, käyttäjä saa
        // varoituksen ja päättää itse päivittääkö sivun.
        uusiTila[osio] = 'epaonnistui'
        virheet.push(`${osioNimi(osio)}: ${tulos.virhe}`)
        return
      }
      if (tulos?.virhe) {
        // VB1: epäonnistunut online-kutsu → siirry offline-jonoon
        // taustalle, jotta yhteyden palatessa retry tapahtuu automaattisesti.
        try {
          await lisaaJonoon({ op: jonoOp, args: jonoArgs })
          uusiTila[osio] = 'jonossa'
        } catch {
          uusiTila[osio] = 'epaonnistui'
        }
        virheet.push(`${osioNimi(osio)}: ${tulos.virhe}`)
      } else {
        uusiTila[osio] = 'tehty'
        // VB2: päivitä tila uudella versiolla jos sellainen palautettiin
        if (osio === 'kaynti' && typeof tulos.versio === 'number') {
          setLadattuVersio(tulos.versio)
        }
      }
    }

    await aja('kaynti',    () => tallennaHoitokirjaus(hoitokayntiId, hoitokirjausPayload),
              'tallennaHoitokirjaus',     [hoitokayntiId, hoitokirjausPayload])
    await aja('havainnot', () => tallennaHavainnot(hoitokayntiId, havainnot),
              'tallennaHavainnot',        [hoitokayntiId, havainnot])
    await aja('itsehoito', () => tallennaKaynninItsehoito(hoitokayntiId, itsehoito),
              'tallennaKaynninItsehoito', [hoitokayntiId, itsehoito])

    setOsiot(uusiTila)

    const epaonnistui = Object.values(uusiTila).some((s) => s === 'epaonnistui')
    const jonossa     = Object.values(uusiTila).some((s) => s === 'jonossa')
    const kaikkiTehty = Object.values(uusiTila).every((s) => s === 'tehty')

    if (kaikkiTehty) {
      setTila('onnistui')
      setTimeout(onValmis, 1500)
      return
    }
    if (jonossa && !epaonnistui) {
      setTila('jonossa')
      setTimeout(onValmis, 1800)
      return
    }
    // Osittainen onnistuminen tai virhe
    setVirhe(virheet.length > 0 ? virheet.join('; ') : 'Tallennus epäonnistui')
    setTila('osittainen')
  }

  function osioNimi(o) {
    return o === 'kaynti' ? 'Käynnin perustiedot ja mittaukset'
         : o === 'havainnot' ? 'Havainnot'
         : o === 'itsehoito' ? 'Itsehoito-ohjelma'
         : o
  }

  // Älykäs suodatus: havaintojen alueista koottu lista (Pala B6 modaalia varten)
  const havaitutAlueet = useMemo(() => {
    const set = new Set()
    for (const h of havainnot) {
      if (h.alueNimi) set.add(h.alueNimi.toLowerCase())
    }
    return [...set]
  }, [havainnot])

  if (lataa) {
    return (
      <div className="lataauspulse" style={{ padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
        Ladataan hoitokirjausta…
      </div>
    )
  }

  const otsikkoteksti = pvm
    ? `Käynti ${muotoilePvm(pvm)} · ${asiakas?.nimi || 'Asiakas'}`
    : `Käynti · ${asiakas?.nimi || 'Asiakas'}`

  // Dev: tyhjentää lomakkeen lokaalitilan jotta voi aloittaa puhtaalta
  // pöydältä. Tallennus kirjoittaa tyhjät arvot DB:hen seuraavalla
  // "Tallenna hoitokirjaus" -klikillä.
  function nollaaLomake() {
    setOtsikko('')
    setMitaHoidettiin('')
    setHoitajanKommentit('')
    setKesto('')
    setLahtotilanne('')
    setMuistaEnsiKerralla('')
    setHavainnot([])
    setHavainnotEsitayte({})
    const tyhjatMittarit = {}
    for (const m of MITTARIT) tyhjatMittarit[m.sarake] = null
    setMittarit(tyhjatMittarit)
    setItsehoito([])
    setSeuraavaKayntiPvm('')
  }

  return (
    <div className="lomake-leveys" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Testimoodi — keltainen banneri + nollaa-nappi */}
      {testimoodi && (
        <div style={{
          background:    '#fef3c7',
          border:        '1.5px solid #f59e0b',
          borderRadius:  '12px',
          padding:       '12px 16px',
          display:       'flex',
          alignItems:    'center',
          gap:           '12px',
          flexWrap:      'wrap',
        }}>
          <span style={{ fontSize: '13px', color: '#7c2d12', lineHeight: 1.5, flex: 1, minWidth: '220px' }}>
            <strong>🧪 TESTITILA</strong> — muutokset tallentuvat TESTI-asiakkaalle. Älä käytä oikeisiin kirjauksiin.
          </span>
          <button
            type="button"
            onClick={nollaaLomake}
            style={{
              fontSize:     '12px',
              padding:      '6px 12px',
              minHeight:    '32px',
              borderRadius: '8px',
              border:       '1px solid #d97706',
              background:   'white',
              color:        '#7c2d12',
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            Nollaa TESTI-data
          </button>
        </div>
      )}

      {/* Otsikkorivi */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onPeru}
          style={{ fontSize: '14px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1D9E75', fontWeight: 500, padding: '10px 8px', minHeight: '44px' }}
        >
          ← Rekisteri
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#085041' }}>
          {otsikkoteksti}
        </span>
        {/* Käynnin juokseva numero (ei sarja-yhteyttä) */}
        {kayntinumero != null && (
          <span style={{
            marginLeft:   'auto',
            fontSize:     '12px',
            color:        '#6b7280',
            background:   '#f3f4f6',
            padding:      '4px 10px',
            borderRadius: '999px',
            fontWeight:   500,
          }}>
            Käynti {kayntinumero}
          </span>
        )}
      </div>

      {/* Edellisen käynnin "Muista ensi kerralla" -nosto (B2) */}
      {edellisenMuista && (
        <div style={{
          background:    '#fffbeb',
          border:        '1.5px solid #f59e0b',
          borderRadius:  '12px',
          padding:       '14px 18px',
          display:       'flex',
          flexDirection: 'column',
          gap:           '4px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', margin: 0 }}>
            🔔 Edelliseltä käynniltä {edellisenMuista.pvm ? `(${muotoilePvm(edellisenMuista.pvm)})` : ''}
            {edellisenMuista.otsikko ? ` — ${edellisenMuista.otsikko}` : ''}
          </p>
          <p style={{ fontSize: '14px', color: '#78350f', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {edellisenMuista.teksti}
          </p>
        </div>
      )}

      {tila === 'onnistui' && (
        <div style={ilmoitusTyyli('onnistui')}>
          <strong>✓ Hoitokirjaus tallennettu.</strong> Palataan rekisteriin…
        </div>
      )}
      {tila === 'jonossa' && (
        <div style={ilmoitusTyyli('tieto')}>
          <strong>🛜 Tallennettu offline-jonoon.</strong> Lähetetään serverille kun yhteys palaa.
        </div>
      )}
      {/* VB1 — osittainen onnistuminen: kerrotaan mikä meni läpi, mikä ei */}
      {tila === 'osittainen' && (
        <div style={ilmoitusTyyli('virhe')}>
          <strong>⚠ Tallennus onnistui osittain.</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '13px' }}>
            {Object.entries(osiot).map(([o, t]) => (
              <li key={o} style={{ color: t === 'tehty' ? '#065f46' : t === 'jonossa' ? '#1e3a8a' : '#991b1b' }}>
                {t === 'tehty' ? '✓' : t === 'jonossa' ? '🛜' : '✗'} {osioNimi(o)}
                {t === 'tehty' && ' — tallennettu'}
                {t === 'jonossa' && ' — odottaa yhteyttä'}
                {t === 'epaonnistui' && ' — yritä uudelleen'}
              </li>
            ))}
          </ul>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#7f1d1d' }}>
            Onnistuneet osiot pysyvät tallessa. Klikkaa "Tallenna hoitokirjaus" yrittääksesi vain epäonnistuneita uudelleen.
          </p>
        </div>
      )}
      {tila === 'virhe' && virhe && (
        <div style={ilmoitusTyyli('virhe')}>
          <strong>✗ Tallennus epäonnistui</strong>
          <p style={{ margin: '4px 0 0' }}>{virhe}</p>
        </div>
      )}

      {/* Perustiedot — Pala B1 */}
      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Käynnin perustiedot</h3>

        <div>
          <label style={labelTyyli}>
            Käynnin otsikko
            <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '6px' }}>(valinnainen, max 50 merkkiä)</span>
          </label>
          <input
            type="text"
            value={otsikko}
            onChange={(e) => setOtsikko(e.target.value.slice(0, 50))}
            maxLength={50}
            placeholder="esim. Niskakipu, alkuhoito"
            style={inputTyyli}
          />
        </div>

        <div>
          <label style={labelTyyli}>Alkutilanne</label>
          <textarea
            ref={lahtotilanneRef}
            value={lahtotilanne}
            onChange={(e) => setLahtotilanne(e.target.value)}
            placeholder="Asiakkaan tilanne hoidon alkaessa…"
            style={textareaTyyli}
          />
        </div>

        <div>
          <label style={labelTyyli}>Mitä hoidettiin</label>
          <textarea
            ref={mitaHoidettiinRef}
            value={mitaHoidettiin}
            onChange={(e) => setMitaHoidettiin(e.target.value)}
            placeholder="Vapaamuotoinen kuvaus tehdystä hoidosta…"
            style={textareaTyyli}
          />
        </div>

        <div>
          <label style={labelTyyli}>Hoitajan kommentit</label>
          <textarea
            ref={hoitajanKommentitRef}
            value={hoitajanKommentit}
            onChange={(e) => setHoitajanKommentit(e.target.value)}
            placeholder="Omat huomiot tästä käynnistä…"
            style={textareaTyyli}
          />
        </div>
      </div>

      {/* KA1 — Asentokuvat (4 kpl: edestä/takaa/vasen/oikea).
          Sijoitettu Havainnot-kortin yläpuolelle: hoitaja ottaa kuvat
          ensin asiakkaan saapuessa, näkee visuaalisesti epätasapainot
          ja kirjaa Havainnot-kortissa kuvien tukemana. */}
      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Asentokuvat</h3>
        <AsentoKuvat hoitokayntiId={hoitokayntiId} asiakasId={asiakas?.id} asiakasPituusCm={asiakas?.pituus} />
      </div>

      {/* Havainnot — Pala B2 BodyMap + Pala B6.6 Vertailu + Pala B8 AI-analyysi */}
      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Havainnot</h3>
        <KehonkarttaVertailu
          asiakasId={asiakas?.id}
          asiakkaanKehonkartta={asiakkaanKehonkartta}
          hoitajanHavainnotInit={havainnotEsitayte}
          hoitajanHavainnot={havainnot}
          onHavainnotMuutos={onHavainnotMuutos}
        />
        <AILoydosAnalyysi
          hoitokayntiId={hoitokayntiId}
          havainnot={havainnot}
          mittarit={mittarit}
          edellisetMittarit={edellisetMittarit}
          asiakkaanKehonkartta={asiakkaanKehonkartta}
          asiakkaanOireet={asiakkaanOireet}
        />
      </div>

      {/* Mittaukset — Pala B3, 15 linjausmittaria */}
      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Mittaukset</h3>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px', lineHeight: 1.5 }}>
          Vapaaehtoiset — kirjaa vain ne joita olet mitannut. Tyhjä = ei mitattu.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {MITTARIT.map((m) => (
            <MittariSliideri
              key={m.sarake}
              mittari={m}
              arvo={mittarit[m.sarake] ?? null}
              onMuutos={(uusi) => setMittarit((prev) => ({ ...prev, [m.sarake]: uusi }))}
              edellinenArvo={edellisetMittarit?.[m.sarake] ?? null}
              onAiempiKaynti={!!edellisetMittarit}
            />
          ))}
        </div>
      </div>

      {/* Hoitoraportti — Pala B2 */}
      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Hoitoraportti</h3>

        <div>
          <label style={labelTyyli}>Hoidon kesto (min)</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="600"
            value={kesto}
            onChange={(e) => setKesto(e.target.value)}
            placeholder="esim. 60"
            style={{ ...inputTyyli, maxWidth: '160px' }}
          />
        </div>

        {/* Muista ensi kerralla — korostettu reunus jotta erottuu */}
        <div>
          <label style={{ ...labelTyyli, color: '#92400e' }}>
            🔔 Muista ensi kerralla
            <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '6px' }}>(näkyy seuraavan käynnin yläosassa)</span>
          </label>
          <textarea
            ref={muistaEnsiKerrallaRef}
            value={muistaEnsiKerralla}
            onChange={(e) => setMuistaEnsiKerralla(e.target.value)}
            placeholder="Mitä haluat muistaa kun asiakas tulee seuraavan kerran?"
            style={{
              ...textareaTyyli,
              border: '1.5px solid #fcd34d',
              background: '#fffbeb',
            }}
          />
        </div>
      </div>

      {/* Itsehoito-ohjelma — Pala B6 (HOITORAPORTTI:n jälkeen) */}
      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Itsehoito-ohjelma</h3>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px', lineHeight: 1.5 }}>
          Valitse asiakkaalle harjoituksia kirjastosta. Voit räätälöidä toistot/frekvenssin
          tälle käynnille — kirjaston oletus säilyy ennallaan.
        </p>
        <ItsehoitoValinnat
          valinnat={itsehoito}
          onMuutos={setItsehoito}
          havaitutAlueet={havaitutAlueet}
        />
      </div>

      {/* Jatkohoitosuunnitelma */}
      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Jatkohoitosuunnitelma</h3>
        <div>
          <label style={labelTyyli}>Seuraava käynti</label>
          <input
            type="date"
            value={seuraavaKayntiPvm}
            onChange={(e) => setSeuraavaKayntiPvm(e.target.value)}
            style={{ ...inputTyyli, maxWidth: '220px' }}
          />
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0', lineHeight: 1.5 }}>
            Suositus: 2–5 käyntiä viikon välein pidempikestoisille vaikutuksille.
          </p>
          {seuraavaKayntiPvm && (
            <button
              type="button"
              onClick={() => setSeuraavaKayntiPvm('')}
              style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Tyhjennä
            </button>
          )}
        </div>
      </div>

      {/* Tallenna / Peru */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onPeru}
          disabled={tila === 'tallentaa'}
          style={{
            flex:         '1 1 140px',
            minHeight:    '52px',
            padding:      '14px',
            borderRadius: '12px',
            border:       '1.5px solid #e2e8f0',
            background:   'white',
            color:        '#374151',
            fontSize:     '15px',
            fontWeight:   500,
            cursor:       tila === 'tallentaa' ? 'not-allowed' : 'pointer',
            opacity:      tila === 'tallentaa' ? 0.5 : 1,
          }}
        >
          Peru
        </button>
        <button
          type="button"
          onClick={tallenna}
          disabled={tila === 'tallentaa' || tila === 'onnistui'}
          style={{
            flex:         '2 1 200px',
            minHeight:    '52px',
            padding:      '14px',
            borderRadius: '12px',
            border:       'none',
            background:   '#1D9E75',
            color:        'white',
            fontSize:     '15px',
            fontWeight:   700,
            letterSpacing: '0.03em',
            cursor:       tila === 'tallentaa' ? 'wait' : 'pointer',
            opacity:      (tila === 'tallentaa' || tila === 'onnistui') ? 0.7 : 1,
            boxShadow:    '0 1px 3px rgba(29, 158, 117, 0.25)',
          }}
        >
          {tila === 'tallentaa' ? 'Tallennetaan…'
            : tila === 'onnistui'  ? '✓ Tallennettu'
            : tila === 'jonossa'   ? '🛜 Jonossa'
            : online ? 'Tallenna hoitokirjaus' : 'Tallenna offline-jonoon'}
        </button>
      </div>

    </div>
  )
}
