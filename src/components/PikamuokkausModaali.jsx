// Pikamuokkaus-modaali asiakkaan perustietojen nopeaan päivittämiseen.
// Käytetään Asiakasrekisteri-näkymässä kun hoitaja klikkaa kortin
// "✎"-ikonia. Muokkaa vain asiakkaat-taulun perustietoja — ei lomakeversioita,
// suostumuksia eikä sairauksia.

import { useState, useEffect } from 'react'
import { paivitaAsiakkaanPerustiedot } from '../lib/db'
import { jaaNimi } from '../lib/muotoilu'

const inputTyyli = {
  width:        '100%',
  boxSizing:    'border-box',
  padding:      '10px 12px',
  borderRadius: '10px',
  border:       '1.5px solid #e2e8f0',
  fontSize:     '14px',
  color:        '#111827',
  outline:      'none',
  background:   'white',
  fontFamily:   'inherit',
}

const labelTyyli = {
  fontSize:    '12px',
  fontWeight:  600,
  color:       '#6b7280',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function PikamuokkausModaali({ asiakas, onSulje, onTallennettu }) {
  const [etunimi,        setEtunimi]        = useState('')
  const [sukunimi,       setSukunimi]       = useState('')
  const [sahkoposti,     setSahkoposti]     = useState('')
  const [puhelin,        setPuhelin]        = useState('')
  const [lahiosoite,     setLahiosoite]     = useState('')
  const [postinumero,    setPostinumero]    = useState('')
  const [postitoimipaikka, setPostitoimipaikka] = useState('')
  const [tallentaa,      setTallentaa]      = useState(false)
  const [virhe,          setVirhe]          = useState(null)

  // Esitäyttö asiakkaan tiedoista
  useEffect(() => {
    if (!asiakas) return
    const [e, s] = jaaNimi(asiakas.nimi)
    setEtunimi(e)
    setSukunimi(s)
    setSahkoposti(asiakas.sahkoposti ?? '')
    setPuhelin(asiakas.puhelin ?? '')
    setLahiosoite(asiakas.lahiosoite ?? '')
    setPostinumero(asiakas.postinumero ?? '')
    setPostitoimipaikka(asiakas.postitoimipaikka ?? '')
  }, [asiakas])

  // Esc sulkee
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !tallentaa) onSulje() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tallentaa, onSulje])

  async function tallenna() {
    setTallentaa(true)
    setVirhe(null)
    const yhdistetty = `${etunimi.trim()} ${sukunimi.trim()}`.trim()
    const tulos = await paivitaAsiakkaanPerustiedot(asiakas.id, {
      nimi:             yhdistetty || null,
      sahkoposti:       sahkoposti.trim() || null,
      puhelin:          puhelin.trim() || null,
      lahiosoite:       lahiosoite.trim() || null,
      postinumero:      postinumero.trim() || null,
      postitoimipaikka: postitoimipaikka.trim() || null,
    })
    setTallentaa(false)
    if (tulos.virhe) {
      setVirhe(tulos.virhe)
      return
    }
    onTallennettu?.()
  }

  return (
    <div
      onClick={() => !tallentaa && onSulje()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pikamuokkaus-otsikko"
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0, 0, 0, 0.5)',
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'center',
        padding:        '16px',
        zIndex:         1000,
        overflowY:      'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   'white',
          borderRadius: '16px',
          width:        '100%',
          maxWidth:     '480px',
          margin:       '32px auto',
          boxShadow:    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display:      'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 12px' }}>
          <div>
            <h2 id="pikamuokkaus-otsikko" style={{ fontSize: '17px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Muokkaa yhteystietoja
            </h2>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>
              Vain asiakkaan perustiedot — ei kosketa lomaketta.
            </p>
          </div>
          <button
            type="button"
            onClick={onSulje}
            disabled={tallentaa}
            style={{
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', border: 'none', background: 'transparent',
              color: '#6b7280', cursor: tallentaa ? 'not-allowed' : 'pointer', fontSize: '18px',
            }}
            aria-label="Sulje"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelTyyli}>Etunimi</label>
              <input type="text" value={etunimi} onChange={(e) => setEtunimi(e.target.value)} style={inputTyyli} autoFocus />
            </div>
            <div>
              <label style={labelTyyli}>Sukunimi</label>
              <input type="text" value={sukunimi} onChange={(e) => setSukunimi(e.target.value)} style={inputTyyli} />
            </div>
          </div>

          <div>
            <label style={labelTyyli}>Sähköposti</label>
            <input type="email" inputMode="email" autoComplete="email" value={sahkoposti} onChange={(e) => setSahkoposti(e.target.value)} style={inputTyyli} />
          </div>

          <div>
            <label style={labelTyyli}>Puhelin</label>
            <input type="tel" inputMode="tel" autoComplete="tel" value={puhelin} onChange={(e) => setPuhelin(e.target.value)} style={inputTyyli} />
          </div>

          <div>
            <label style={labelTyyli}>Lähiosoite</label>
            <input type="text" autoComplete="street-address" value={lahiosoite} onChange={(e) => setLahiosoite(e.target.value)} style={inputTyyli} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
            <div>
              <label style={labelTyyli}>Postinumero</label>
              <input type="text" inputMode="numeric" autoComplete="postal-code" value={postinumero} onChange={(e) => setPostinumero(e.target.value)} style={inputTyyli} />
            </div>
            <div>
              <label style={labelTyyli}>Postitoimipaikka</label>
              <input type="text" autoComplete="address-level2" value={postitoimipaikka} onChange={(e) => setPostitoimipaikka(e.target.value)} style={inputTyyli} />
            </div>
          </div>

          {virhe && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#991b1b' }}>
              Tallennus epäonnistui: {virhe}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '20px 24px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onSulje}
            disabled={tallentaa}
            style={{
              padding: '10px 18px', borderRadius: '10px', border: '1px solid #e5e7eb',
              background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 500,
              cursor: tallentaa ? 'not-allowed' : 'pointer', opacity: tallentaa ? 0.5 : 1,
            }}
          >
            Peru
          </button>
          <button
            type="button"
            onClick={tallenna}
            disabled={tallentaa}
            style={{
              padding: '10px 18px', borderRadius: '10px', border: 'none',
              background: '#1D9E75', color: 'white', fontSize: '14px', fontWeight: 600,
              cursor: tallentaa ? 'wait' : 'pointer', opacity: tallentaa ? 0.7 : 1,
            }}
          >
            {tallentaa ? 'Tallennetaan…' : 'Tallenna'}
          </button>
        </div>
      </div>
    </div>
  )
}
