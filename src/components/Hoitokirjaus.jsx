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
} from '../lib/db'
import { useAutoResize } from '../hooks/useAutoResize'
import { muotoilePvm } from '../lib/muotoilu'
import BodyMap from './BodyMap'
import MittariSliideri from './MittariSliideri'
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
    ]).then(([kaynti, kpl, havRivit, edellinen, edellisetMitt]) => {
      if (peruttu) return
      if (kaynti) {
        setOtsikko(kaynti.otsikko ?? '')
        setMitaHoidettiin(kaynti.hoidon_kulku ?? '')
        setHoitajanKommentit(kaynti.hoitajan_kommentit ?? '')
        setKesto(kaynti.kesto_min ?? '')
        setLahtotilanne(kaynti.lahtotilanne ?? '')
        setMuistaEnsiKerralla(kaynti.muista_ensi_kerralla ?? '')
        setPvm(kaynti.pvm)
        // Pala B3 — esitäyttö 15 mittarille
        const m = {}
        for (const mt of MITTARIT) {
          m[mt.sarake] = kaynti[mt.sarake] ?? null
        }
        setMittarit(m)
      }
      setYhteensa(kpl)
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
    const kayntiTulos = await tallennaHoitokirjaus(hoitokayntiId, {
      otsikko:              otsikko.trim() || null,
      hoidon_kulku:         mitaHoidettiin.trim() || null,
      hoitajan_kommentit:   hoitajanKommentit.trim() || null,
      kesto_min:            kesto === '' ? null : Number(kesto),
      lahtotilanne:         lahtotilanne.trim() || null,
      muista_ensi_kerralla: muistaEnsiKerralla.trim() || null,
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
    setTila('onnistui')
    setTimeout(onValmis, 1500)
  }

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
        {kayntinumero != null && yhteensa != null && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: '999px' }}>
            Käynti {kayntinumero} / {yhteensa}
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

      {/* Esikatselu Vaihe B:n tulevista paloista */}
      <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>
        Tulossa myöhemmissä paloissa: vertailu edelliseen (B4) · itsehoito-ohjeet (B5–B6)
      </div>
    </div>
  )
}
