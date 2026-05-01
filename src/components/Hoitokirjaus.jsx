// Vaihe B — Pala B1: Hoitokirjaus-näkymän pohja (B-lomakkeen täyttö)
//
// Avautuu kun "+ Uusi käynti" suoritettiin (App.jsx setNakyma 'hoitokirjaus').
// hoitokayntiId: id B-lomakkeesta (hoitokaynnit-rivistä) joka aiemmin
// luotiin tyhjänä asiakkaan vahvistuksen yhteydessä, tai juuri luotu
// uudelle hoitokerralle. B-lomake on linkattu A-lomakkeen (asiakastieto-
// lomake_versiot) suljettuun versioon snapshot-malliksi.
//
// Tähän palaan kuuluu vain perustiedot:
//   - Otsikko (sama 50 merkin rajoitus kuin lomakeversion otsikolla)
//   - "Mitä hoidettiin" (vapaamuotoinen, auto-grow textarea)
//   - "Hoitajan kommentit" (sama)
//   - Tallenna / Peru -napit
//
// Tablet-ystävällinen: kortit isoja, hit-areat ≥48 px.
// Tulevat palat: BodyMap (B2), mittarit (B3), vertailu (B4),
// itsehoito-kirjasto (B5–B6).

import { useState, useEffect } from 'react'
import { tallennaHoitokirjaus, haeHoitokaynti, haeAsiakkaanKayntienMaara } from '../lib/db'
import { useAutoResize } from '../hooks/useAutoResize'
import { muotoilePvm } from '../lib/muotoilu'

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
  const [otsikko,            setOtsikko]            = useState('')
  const [mitaHoidettiin,     setMitaHoidettiin]     = useState('')
  const [hoitajanKommentit,  setHoitajanKommentit]  = useState('')
  const [pvm,                setPvm]                = useState(null)
  const [kayntinumero,       setKayntinumero]       = useState(null)
  const [yhteensa,           setYhteensa]           = useState(null)
  const [lataa,              setLataa]              = useState(true)
  const [tila,               setTila]               = useState('idle') // idle | tallentaa | onnistui | virhe
  const [virhe,              setVirhe]              = useState(null)

  const mitaHoidettiinRef    = useAutoResize(mitaHoidettiin)
  const hoitajanKommentitRef = useAutoResize(hoitajanKommentit)

  useEffect(() => {
    if (!hoitokayntiId || !asiakas?.id) { setLataa(false); return }
    let peruttu = false
    Promise.all([
      haeHoitokaynti(hoitokayntiId),
      haeAsiakkaanKayntienMaara(asiakas.id),
    ]).then(([kaynti, kpl]) => {
      if (peruttu) return
      if (kaynti) {
        setOtsikko(kaynti.otsikko ?? '')
        setMitaHoidettiin(kaynti.hoidon_kulku ?? '')
        setHoitajanKommentit(kaynti.hoitajan_kommentit ?? '')
        setPvm(kaynti.pvm)
      }
      setYhteensa(kpl)
      // Tämä käynti on uusin (juuri luotu) → numero = kpl
      setKayntinumero(kpl)
      setLataa(false)
    }).catch((e) => {
      if (peruttu) return
      console.error('Hoitokirjauksen lataus epäonnistui:', e)
      setLataa(false)
    })
    return () => { peruttu = true }
  }, [hoitokayntiId, asiakas?.id])

  async function tallenna() {
    setTila('tallentaa')
    setVirhe(null)
    const tulos = await tallennaHoitokirjaus(hoitokayntiId, {
      otsikko:            otsikko.trim() || null,
      hoidon_kulku:       mitaHoidettiin.trim() || null,
      hoitajan_kommentit: hoitajanKommentit.trim() || null,
      tila:               'valmis',
    })
    if (tulos.virhe) {
      setVirhe(tulos.virhe)
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
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

      {/* Sisältöryhmät */}
      <div style={ryhmaTyyli}>
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
        Tulossa myöhemmissä paloissa: kehonkartta-merkinnät · mittaustulokset · vertailu edelliseen · itsehoito-ohjeet
      </div>
    </div>
  )
}
