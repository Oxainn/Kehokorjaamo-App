// Vaihe B — Pala B1+B2: Hoitokirjaus-näkymä (B-lomakkeen täyttö)
//
// Pala B1: perustiedot (otsikko, mitä hoidettiin, hoitajan kommentit)
// Pala B2: BodyMap-havainnot + hoitoraportti (kesto, lähtötilanne, kulku,
//          muista ensi kerralla) + edellisen käynnin "muista"-nosto
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
  haeHoitosarjanPituus,
} from '../lib/db'
import { useAutoResize } from '../hooks/useAutoResize'
import { muotoilePvm } from '../lib/muotoilu'
import BodyMap from './BodyMap'
import MittariSliideri from './MittariSliideri'
import ItsehoitoValinnat from './ItsehoitoValinnat'
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

export default function Hoitokirjaus({ asiakas, hoitokayntiId, onValmis, onPeru }) {
  // Pala B1 — perustiedot
  const [otsikko,            setOtsikko]            = useState('')
  const [mitaHoidettiin,     setMitaHoidettiin]     = useState('')
  const [hoitajanKommentit,  setHoitajanKommentit]  = useState('')
  // Pala B2 — hoitoraportti
  const [kesto,              setKesto]              = useState('')
  const [lahtotilanne,       setLahtotilanne]       = useState('')
  const [muistaEnsiKerralla, setMuistaEnsiKerralla] = useState('')
  // Havainnot (BodyMap-löydökset)
  const [havainnot,          setHavainnot]          = useState([])
  const [havainnotEsitayte,  setHavainnotEsitayte]  = useState(null)
  // Mittarit (Pala B3): { sarake: numero | null }
  const [mittarit,           setMittarit]           = useState({})
  // Edellisen käynnin mittarit (Pala B4) — null jos ei aiempaa käyntiä
  const [edellisetMittarit,  setEdellisetMittarit]  = useState(null)
  // Itsehoito-valinnat (Pala B6): käyntikohtainen ohjelma
  const [itsehoito,          setItsehoito]          = useState([])
  // Pala B6.5 — hoitosarjan pituus (M) ja seuraavan käynnin pvm
  const [sarjanPituus,       setSarjanPituus]       = useState(null)
  const [seuraavaKayntiPvm,  setSeuraavaKayntiPvm]  = useState('')
  // Edellisen käynnin nosto
  const [edellisenMuista,    setEdellisenMuista]    = useState(null)
  // Meta
  const [pvm,                setPvm]                = useState(null)
  const [kayntinumero,       setKayntinumero]       = useState(null)
  const [yhteensa,           setYhteensa]           = useState(null)
  const [lataa,              setLataa]              = useState(true)
  const [tila,               setTila]               = useState('idle') // idle | tallentaa | onnistui | virhe
  const [virhe,              setVirhe]              = useState(null)

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
      haeHoitosarjanPituus(),
    ]).then(([kaynti, kpl, havRivit, edellinen, edellisetMitt, itsehoitoRivit, sarjaPit]) => {
      if (peruttu) return
      if (kaynti) {
        setOtsikko(kaynti.otsikko ?? '')
        setMitaHoidettiin(kaynti.hoidon_kulku ?? '')
        setHoitajanKommentit(kaynti.hoitajan_kommentit ?? '')
        setKesto(kaynti.kesto_min ?? '')
        setLahtotilanne(kaynti.lahtotilanne ?? '')
        setMuistaEnsiKerralla(kaynti.muista_ensi_kerralla ?? '')
        setPvm(kaynti.pvm)
        // Pala B6.5 — seuraavan käynnin pvm. Esitäyttö: nykyinen + 7 vrk
        // jos ei ole vielä asetettu (vain kun käynti on tuore luonnos).
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
      // N = monesko käynti tämä on. Pala B6.5: jos käynti on jo 'valmis',
      // sen N = kpl; jos 'luonnos', N = kpl (sisältyy laskentaan).
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
      // Pala B6.5 — hoitosarjan pituus
      setSarjanPituus(sarjaPit)
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
    // Tallenna hoitokirjauksen kentät — sis. 15 mittarisaraketta (Pala B3)
    // ja seuraavan käynnin ehdotus (Pala B6.5)
    const kayntiTulos = await tallennaHoitokirjaus(hoitokayntiId, {
      otsikko:              otsikko.trim() || null,
      hoidon_kulku:         mitaHoidettiin.trim() || null,
      hoitajan_kommentit:   hoitajanKommentit.trim() || null,
      kesto_min:            kesto === '' ? null : Number(kesto),
      lahtotilanne:         lahtotilanne.trim() || null,
      muista_ensi_kerralla: muistaEnsiKerralla.trim() || null,
      seuraava_kaynti_pvm:  seuraavaKayntiPvm || null,
      tila:                 'valmis',
      ...mittarit,
    })
    if (kayntiTulos.virhe) {
      setVirhe(kayntiTulos.virhe)
      setTila('virhe')
      return
    }
    // Tallenna havainnot
    const havTulos = await tallennaHavainnot(hoitokayntiId, havainnot)
    if (havTulos.virhe) {
      setVirhe('Hoitokirjaus tallennettu mutta havaintojen tallennus epäonnistui: ' + havTulos.virhe)
      setTila('virhe')
      return
    }
    // Pala B6 — tallenna itsehoito-valinnat
    const itsehoitoTulos = await tallennaKaynninItsehoito(hoitokayntiId, itsehoito)
    if (itsehoitoTulos.virhe) {
      setVirhe('Hoitokirjaus tallennettu mutta itsehoito-valintojen tallennus epäonnistui: ' + itsehoitoTulos.virhe)
      setTila('virhe')
      return
    }
    setTila('onnistui')
    setTimeout(onValmis, 1500)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Otsikkorivi */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onPeru}
          style={{ fontSize: '13px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1D9E75', fontWeight: 500, padding: '4px 0' }}
        >
          ← Rekisteri
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#085041' }}>
          {otsikkoteksti}
        </span>
        {/* Pala B6.5: N/M jos sarjan pituus on tiedossa, muuten "N · jatkohoito" jos ylittynyt */}
        {kayntinumero != null && (
          <span style={{
            marginLeft:   'auto',
            fontSize:     '12px',
            color:        sarjanPituus && kayntinumero > sarjanPituus ? '#92400e' : '#6b7280',
            background:   sarjanPituus && kayntinumero > sarjanPituus ? '#fef3c7' : '#f3f4f6',
            padding:      '4px 10px',
            borderRadius: '999px',
            fontWeight:   500,
          }}>
            {sarjanPituus
              ? (kayntinumero > sarjanPituus
                  ? `Käynti ${kayntinumero} · jatkohoito`
                  : `Käynti ${kayntinumero} / ${sarjanPituus}`)
              : `Käynti ${kayntinumero}`}
          </span>
        )}
      </div>

      {/* Pala B6.5 — sarjan päätös / jatkohoito-huomautus */}
      {sarjanPituus && kayntinumero != null && kayntinumero === sarjanPituus && (
        <div style={{
          background:    '#fef3c7',
          border:        '1.5px solid #f59e0b',
          borderRadius:  '12px',
          padding:       '14px 18px',
          fontSize:      '13px',
          color:         '#78350f',
          lineHeight:    1.5,
        }}>
          <strong style={{ color: '#92400e' }}>🎯 Tämä on {kayntinumero}/{sarjanPituus} käynti — sarjan päätös.</strong>
          <p style={{ margin: '4px 0 0' }}>
            Keskustele asiakkaan kanssa: jatketaanko ylläpitohoitoja, vai onko tämä päätös?
          </p>
        </div>
      )}
      {sarjanPituus && kayntinumero != null && kayntinumero > sarjanPituus && (
        <div style={{
          background:    '#fffbeb',
          border:        '1.5px solid #fcd34d',
          borderRadius:  '12px',
          padding:       '12px 16px',
          fontSize:      '13px',
          color:         '#78350f',
          lineHeight:    1.5,
        }}>
          💛 <strong>Sarja on päättynyt</strong> — tämä on ylläpitohoito (käynti #{kayntinumero}).
        </div>
      )}

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

      {/* Havainnot — Pala B2 BodyMap */}
      <div style={ryhmaTyyli}>
        <h3 style={ryhmaOtsikko}>Havainnot</h3>
        <BodyMap
          piilotaAnalysoi
          initialFindings={havainnotEsitayte ?? undefined}
          onChange={onHavainnotMuutos}
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

        <div>
          <label style={labelTyyli}>Lähtötilanne</label>
          <textarea
            ref={lahtotilanneRef}
            value={lahtotilanne}
            onChange={(e) => setLahtotilanne(e.target.value)}
            placeholder="Asiakkaan tilanne hoidon alkaessa…"
            style={textareaTyyli}
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

      {/* Jatkohoitosuunnitelma — Pala B6.5 */}
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
            {sarjanPituus && kayntinumero != null && kayntinumero >= sarjanPituus
              ? '📌 Sarja on päättynyt. Sovi ylläpitohoidon ajankohta tarpeen mukaan.'
              : 'Kalevalaisessa jäsenkorjauksessa suositellaan viikon väliä käyntien välillä.'}
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
          {tila === 'tallentaa' ? 'Tallennetaan…' : tila === 'onnistui' ? '✓ Tallennettu' : 'Tallenna hoitokirjaus'}
        </button>
      </div>

    </div>
  )
}
