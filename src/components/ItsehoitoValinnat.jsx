// Vaihe B Pala B6 — Käyntikohtainen itsehoito-ohjelman koonti.
//
// Komponentti renderöi:
//   1. Listan valittuja harjoituksia (alkuun tyhjä)
//   2. "+ Lisää itsehoito" -nappi joka avaa ValintaModaalin
//   3. ValintaModaali näyttää itsehoito_kirjaston, jossa älykäs suodatus
//      käynnin havaittujen alueiden perusteella
//   4. Räätälöinti per harjoitus: toistot, frekvenssi, lisähuomautus
//
// Props:
//   valinnat       — { kirjasto_harjoitus_id, harjoitus, toistot_muokattu,
//                      frekvenssi_muokattu, lisahuomautus, jarjestys }[]
//   onMuutos       — callback uudella valinnat-listalla
//   havaitutAlueet — string[] älykästä suodatusta varten (Pala B2 -alueet)

import { useState, useEffect, useMemo } from 'react'
import { haeItsehoitoKirjasto } from '../lib/db'

const containerTyyli = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '10px',
}

const lisaaTyyli = {
  width:        '100%',
  padding:      '12px',
  borderRadius: '12px',
  border:       '1.5px dashed #cbd5e1',
  background:   'transparent',
  color:        '#1D9E75',
  fontSize:     '14px',
  fontWeight:   600,
  cursor:       'pointer',
}

const valittuKortti = {
  background:    'white',
  border:        '1px solid #e5e7eb',
  borderRadius:  '12px',
  padding:       '14px',
  display:       'flex',
  flexDirection: 'column',
  gap:           '10px',
}

const inputTyyli = {
  width:        '100%',
  boxSizing:    'border-box',
  padding:      '8px 10px',
  borderRadius: '8px',
  border:       '1.5px solid #e2e8f0',
  fontSize:     '13px',
  outline:      'none',
  background:   'white',
  fontFamily:   'inherit',
}

function ValittuRivi({ valinta, onMuutos, onPoista, onAvaa }) {
  const h = valinta.harjoitus
  if (!h) return null
  return (
    <div style={valittuKortti}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onAvaa(h)}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{h.nimi}</p>
          {h.lyhyt_kuvaus && (
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>{h.lyhyt_kuvaus}</p>
          )}
          {h.kohdealueet?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
              {h.kohdealueet.map((a) => (
                <span key={a} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onPoista}
          title="Poista valinta"
          style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '16px', cursor: 'pointer', padding: '4px 8px' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
            Toistot {h.toistot ? `(oletus: ${h.toistot})` : ''}
          </label>
          <input
            type="text"
            value={valinta.toistot_muokattu ?? ''}
            onChange={(e) => onMuutos({ ...valinta, toistot_muokattu: e.target.value })}
            placeholder={h.toistot ?? 'esim. 3x10'}
            style={inputTyyli}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
            Frekvenssi {h.frekvenssi ? `(oletus: ${h.frekvenssi})` : ''}
          </label>
          <input
            type="text"
            value={valinta.frekvenssi_muokattu ?? ''}
            onChange={(e) => onMuutos({ ...valinta, frekvenssi_muokattu: e.target.value })}
            placeholder={h.frekvenssi ?? 'esim. 3x päivässä'}
            style={inputTyyli}
          />
        </div>
      </div>

      <div>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
          Lisähuomautus
        </label>
        <input
          type="text"
          value={valinta.lisahuomautus ?? ''}
          onChange={(e) => onMuutos({ ...valinta, lisahuomautus: e.target.value })}
          placeholder="esim. Aluksi 1 viikon ajan, sitten lisää"
          style={inputTyyli}
        />
      </div>
    </div>
  )
}

function ValintaModaali({ kirjasto, jaValitut, havaitutAlueet, onValmis, onPeru }) {
  const [haku,         setHaku]         = useState('')
  const [vainAlueet,   setVainAlueet]   = useState(havaitutAlueet?.length > 0)
  const [valitut,      setValitut]      = useState(new Set())

  // Esitäyttö: jo valittuja ei voi valita uudestaan
  const jaValitutSet = useMemo(() => new Set(jaValitut.map((v) => v.kirjasto_harjoitus_id)), [jaValitut])

  // Esc sulkee
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onPeru() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPeru])

  const suodatetut = useMemo(() => {
    const h = haku.trim().toLowerCase()
    return kirjasto.filter((x) => {
      if (jaValitutSet.has(x.id)) return false
      if (h && !(
        x.nimi?.toLowerCase().includes(h) ||
        x.lyhyt_kuvaus?.toLowerCase().includes(h)
      )) return false
      if (vainAlueet && havaitutAlueet?.length > 0) {
        const sisaltaa = havaitutAlueet.some((a) => (x.kohdealueet ?? []).includes(a))
        if (!sisaltaa) return false
      }
      return true
    })
  }, [kirjasto, haku, vainAlueet, havaitutAlueet, jaValitutSet])

  function toggleValinta(id) {
    setValitut((p) => {
      const s = new Set(p)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function vahvista() {
    const lisattavat = kirjasto
      .filter((h) => valitut.has(h.id))
      .map((h) => ({
        kirjasto_harjoitus_id: h.id,
        harjoitus:             h,
        toistot_muokattu:      '',
        frekvenssi_muokattu:   '',
        lisahuomautus:         '',
      }))
    onValmis(lisattavat)
  }

  return (
    <div
      onClick={onPeru}
      role="dialog"
      aria-modal="true"
      aria-labelledby="itsehoito-modaali-otsikko"
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
          maxWidth:     '640px',
          margin:       '32px auto',
          boxShadow:    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display:      'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 id="itsehoito-modaali-otsikko" style={{ fontSize: '17px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Valitse harjoitukset asiakkaalle
            </h2>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>
              {valitut.size > 0 ? `${valitut.size} valittu` : 'Klikkaa harjoituksia valitaksesi'}
            </p>
          </div>
          <button type="button" onClick={onPeru} style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            value={haku}
            onChange={(e) => setHaku(e.target.value)}
            placeholder="Hae nimellä tai kuvauksella…"
            style={{ ...inputTyyli, fontSize: '14px', padding: '10px 12px' }}
          />
          {havaitutAlueet?.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
              <input
                type="checkbox"
                checked={vainAlueet}
                onChange={(e) => setVainAlueet(e.target.checked)}
                style={{ accentColor: '#1D9E75' }}
              />
              Näytä vain harjoitukset joiden alueet osuvat tähän käyntiin
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>({havaitutAlueet.join(', ')})</span>
            </label>
          )}
        </div>

        <div style={{ flex: 1, padding: '4px 20px 16px', maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {suodatetut.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
              {kirjasto.length === 0
                ? 'Itsehoito-kirjasto on tyhjä. Lisää harjoituksia Asetukset → Itsehoito-kirjasto.'
                : (jaValitut.length === kirjasto.length
                    ? 'Kaikki kirjaston harjoitukset on jo valittu tälle käynnille.'
                    : 'Ei harjoituksia tällä suodattimella. Pyyhi suodattimet pois nähdäksesi kaikki.')}
            </p>
          ) : (
            suodatetut.map((h) => {
              const valittu = valitut.has(h.id)
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => toggleValinta(h.id)}
                  style={{
                    textAlign:    'left',
                    background:   valittu ? '#ecfdf5' : 'white',
                    border:       valittu ? '1.5px solid #1D9E75' : '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding:      '12px',
                    cursor:       'pointer',
                    display:      'flex',
                    gap:          '12px',
                    alignItems:   'flex-start',
                  }}
                >
                  <input type="checkbox" checked={valittu} readOnly style={{ accentColor: '#1D9E75', marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{h.nimi}</p>
                    {h.lyhyt_kuvaus && (
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>{h.lyhyt_kuvaus}</p>
                    )}
                    {h.kohdealueet?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {h.kohdealueet.map((a) => (
                          <span key={a} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: '#f0fdf4', color: '#065f46' }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={onPeru}
            style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          >
            Peru
          </button>
          <button
            type="button"
            onClick={vahvista}
            disabled={valitut.size === 0}
            style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#1D9E75', color: 'white', fontSize: '14px', fontWeight: 600, cursor: valitut.size === 0 ? 'not-allowed' : 'pointer', opacity: valitut.size === 0 ? 0.5 : 1 }}
          >
            Lisää valitut ({valitut.size})
          </button>
        </div>
      </div>
    </div>
  )
}

function EsikatseluModaali({ harjoitus, onSulje }) {
  if (!harjoitus) return null
  return (
    <div onClick={onSulje} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 1100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', margin: '32px auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', margin: 0 }}>{harjoitus.nimi}</h3>
          <button type="button" onClick={onSulje} style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        {harjoitus.lyhyt_kuvaus && (
          <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 12px' }}>{harjoitus.lyhyt_kuvaus}</p>
        )}
        {harjoitus.pitka_ohje && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: '#1f2937', margin: 0, lineHeight: 1.6 }}>{harjoitus.pitka_ohje}</p>
          </div>
        )}
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
          {[
            harjoitus.kesto_min ? `${harjoitus.kesto_min} min` : null,
            harjoitus.toistot,
            harjoitus.frekvenssi,
          ].filter(Boolean).join(' · ')}
        </p>
        {harjoitus.varoitukset && (
          <div style={{ marginTop: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#7f1d1d' }}>
            ⚠️ {harjoitus.varoitukset}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ItsehoitoValinnat({ valinnat, onMuutos, havaitutAlueet = [] }) {
  const [modaali,    setModaali]    = useState(false)
  const [esikatselu, setEsikatselu] = useState(null)
  const [kirjasto,   setKirjasto]   = useState([])
  const [lataa,      setLataa]      = useState(false)

  async function avaaModaali() {
    setLataa(true)
    const data = await haeItsehoitoKirjasto({ arkistoitu: false })
    setKirjasto(data)
    setLataa(false)
    setModaali(true)
  }

  function lisaaValitut(uudet) {
    onMuutos([...valinnat, ...uudet])
    setModaali(false)
  }

  function muutaValintaa(idx, uusi) {
    const kopio = [...valinnat]
    kopio[idx] = uusi
    onMuutos(kopio)
  }

  function poistaValinta(idx) {
    onMuutos(valinnat.filter((_, i) => i !== idx))
  }

  return (
    <div style={containerTyyli}>
      {valinnat.length === 0 && (
        <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
          Ei vielä valittuja harjoituksia.
        </p>
      )}

      {valinnat.map((v, i) => (
        <ValittuRivi
          key={`${v.kirjasto_harjoitus_id}-${i}`}
          valinta={v}
          onMuutos={(uusi) => muutaValintaa(i, uusi)}
          onPoista={() => poistaValinta(i)}
          onAvaa={(h) => setEsikatselu(h)}
        />
      ))}

      <button
        type="button"
        onClick={avaaModaali}
        disabled={lataa}
        style={lisaaTyyli}
      >
        {lataa ? 'Ladataan kirjastoa…' : '+ Lisää itsehoito'}
      </button>

      {modaali && (
        <ValintaModaali
          kirjasto={kirjasto}
          jaValitut={valinnat}
          havaitutAlueet={havaitutAlueet}
          onValmis={lisaaValitut}
          onPeru={() => setModaali(false)}
        />
      )}

      {esikatselu && (
        <EsikatseluModaali harjoitus={esikatselu} onSulje={() => setEsikatselu(null)} />
      )}
    </div>
  )
}
