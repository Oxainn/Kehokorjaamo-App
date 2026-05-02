// Laadunvalvonta-silmukka — käynnistä tarkistuskierros Codelle.
//
// UI vain tallentaa kierroksen aloituksen audit-rivinä DB:hen ja
// näyttää käyttäjälle promptin jonka tämä liittää Claude Code -istuntoon.
// Itse tarkistus tehdään Code:n puolella, ja Code merkitsee sitten
// rivin valmistuneeksi päivittäen yhteenvedon.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../services/supabase'

const muotoilePvm = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fi-FI', { dateStyle: 'short', timeStyle: 'short' })
}

const promptRunko = `TEHTÄVÄ: Kokonaisvaltainen tarkistuskierros (laadunvalvonta-silmukka)

Käy ohjelma järjestelmällisesti läpi:
- Perustoiminnot: kirjautuminen, asiakasrekisteri, lomakkeen täyttö, hoitokirjaus, PDF-tulostus
- Reunatapaukset: tyhjät kentät, validointivirheet, offline-tila, useat välilehdet
- Bugit: konsolivirheet, näkyvät virheilmoitukset, rikkoutuneet linkit
- Tietoturva: RLS, käyttäjätunnistus, dataa ei vuoda hoitajien välillä
- Käyttökokemus: PC + tablet + puhelin, hit-areat, virheviestit, latausindikaattorit
- Koodin laatu: kuolleet tiedostot, käyttämättömät importit, console.logit, vanhentuneet kommentit
- Parannukset: yksinkertaistukset, suoraviivaistukset, helpotukset

OHJEET:
1. Korjaa selkeät bugit suoraan committilla. Pieni muutos = pieni commit.
2. Lisää välttämättömät tehtävät jotka jäävät korjaamatta tällä kierroksella
   Tuotehallinta-TODO-listalle (status: 'todo', prioriteetti: 'matala' / 'keski' / 'korkea').
3. Lisää parannusehdotukset Tuotehallinta-ideat-listalle (uudessa muodossa
   IDEAT_ALKAA / IDEAT_LOPPUU jos käytät devtools-promptia, muuten suoraan).
4. Raportoi lopuksi yhteenveto: mitä korjasit suoraan, mitä jätit
   TODO:lle, mitä lisäsit ideoihin.
5. Jos löysit ison ongelman jonka korjaus vaatii arkkitehtuurimuutoksia,
   keskeytä korjaus ja kysy Oxalta mitä tehdä.

KESKITY: tällä kierroksella keskity erityisesti alueeseen [TÄYTÄ VAIHE / OSA-ALUE TÄHÄN, esim. "Vaihe B Pala B6.6" tai "asiakaslomakkeen renderöijä" tai "kaikki, ei rajoituksia"].`

export default function LaadunvalvontaSilmukka({ kayttajaId }) {
  const [modaaliAuki, setModaaliAuki]   = useState(false)
  const [prompt,      setPrompt]        = useState(promptRunko)
  const [tila,        setTila]          = useState('idle')  // idle | tallentaa | onnistui | virhe
  const [virhe,       setVirhe]         = useState(null)
  const [kopioitu,    setKopioitu]      = useState(false)
  const [kierrokset,  setKierrokset]    = useState([])
  const [valittu,     setValittu]       = useState(null)  // detail-näkymä

  const lataa = useCallback(async () => {
    if (!kayttajaId) return
    const { data, error } = await supabase
      .from('tarkistuskierrokset')
      .select('id, prompt, status, yhteenveto, todo_lisatty, ideat_lisatty, luotu, valmistunut')
      .order('luotu', { ascending: false })
      .limit(20)
    if (!error) setKierrokset(data ?? [])
  }, [kayttajaId])

  useEffect(() => { lataa() }, [lataa])

  const edellinen = kierrokset[0] ?? null

  async function kopioiPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setKopioitu(true)
      setTimeout(() => setKopioitu(false), 2000)
    } catch (e) {
      alert('Kopiointi epäonnistui: ' + (e.message ?? 'tuntematon virhe'))
    }
  }

  async function tallennaJaSulje() {
    if (!kayttajaId) {
      setVirhe('Käyttäjä ei tunnistettu')
      setTila('virhe')
      return
    }
    setTila('tallentaa')
    setVirhe(null)
    const { error } = await supabase
      .from('tarkistuskierrokset')
      .insert({ pyytaja_id: kayttajaId, prompt, status: 'pyydetty' })
    if (error) {
      setVirhe(`Tallennus epäonnistui: ${error.message}`)
      setTila('virhe')
      return
    }
    setTila('onnistui')
    await lataa()
    setTimeout(() => {
      setModaaliAuki(false)
      setTila('idle')
      setPrompt(promptRunko)
    }, 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.6 }}>
        Code käy ohjelman läpi, korjaa selkeät virheet, tekee tarvittavat
        päivitykset, ja ehdottaa parannuksia. Välttämättömät tehtävät
        ilmestyvät <strong>To Do</strong> -listalle, ehdotukset <strong>Koodaajan ideat</strong>
        -listalle. Sinä päätät mitä toteutetaan.
      </p>

      <div style={{
        background:    '#f0fdf4',
        border:        '1px solid #bbf7d0',
        borderRadius:  '10px',
        padding:       '12px 16px',
        fontSize:      '12px',
        color:         '#166534',
        lineHeight:    1.5,
      }}>
        <div><strong>Edellinen tarkistuskierros:</strong> {edellinen ? muotoilePvm(edellinen.luotu) : 'Ei vielä yhtään'}</div>
        <div style={{ marginTop: '4px' }}><strong>Suositus:</strong> kerran 1–2 viikossa tai isompien muutosten jälkeen.</div>
      </div>

      <button
        type="button"
        onClick={() => setModaaliAuki(true)}
        style={{
          padding:       '14px 20px',
          minHeight:     '52px',
          borderRadius:  '12px',
          border:        'none',
          background:    '#16a34a',
          color:         'white',
          fontSize:      '15px',
          fontWeight:    700,
          cursor:        'pointer',
          letterSpacing: '0.02em',
          alignSelf:     'flex-start',
        }}
      >
        🔍 Käynnistä tarkistuskierros
      </button>

      {/* Aiemmat tarkistuskierrokset */}
      {kierrokset.length > 0 && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '4px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
            Aiemmat tarkistuskierrokset
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {kierrokset.map((k) => (
              <li key={k.id}>
                <button
                  type="button"
                  onClick={() => setValittu(k)}
                  style={{
                    width:        '100%',
                    textAlign:    'left',
                    display:      'grid',
                    gridTemplateColumns: '110px 90px 1fr',
                    gap:          '10px',
                    alignItems:   'baseline',
                    fontSize:     '12px',
                    padding:      '8px 12px',
                    borderRadius: '8px',
                    background:   k.status === 'valmis' ? '#f0fdf4' : k.status === 'pyydetty' ? '#eff6ff' : '#f3f4f6',
                    border:       '1px solid #e5e7eb',
                    cursor:       'pointer',
                  }}
                >
                  <span style={{ color: '#6b7280' }}>{muotoilePvm(k.luotu)}</span>
                  <span style={{ fontWeight: 600, color: k.status === 'valmis' ? '#166534' : k.status === 'pyydetty' ? '#1e40af' : '#6b7280' }}>
                    {k.status === 'valmis' ? '✓ Valmis' : k.status === 'pyydetty' ? '⏳ Pyydetty' : '· Peruutettu'}
                  </span>
                  <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {k.yhteenveto ?? (k.prompt ?? '').split('\n')[0].slice(0, 80)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Käynnistys-modaali */}
      {modaaliAuki && (
        <Modaali otsikko="Käynnistä tarkistuskierros" onSulje={() => { if (tila !== 'tallentaa') setModaaliAuki(false) }}>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
            Muokkaa promptia tarpeen mukaan (esim. rajaa tarkasteltavaan alueeseen).
            Kopioi prompti, avaa Claude Code -istunto, liitä se sinne. Tämä rivi
            tallennetaan audit-lokiksi.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={16}
            style={{
              width:        '100%',
              fontSize:     '12px',
              fontFamily:   'monospace',
              padding:      '10px 12px',
              borderRadius: '8px',
              border:       '1px solid #e5e7eb',
              resize:       'vertical',
            }}
          />
          {tila === 'onnistui' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#166534' }}>
              ✓ Tallennettu — avaa Claude Code -istunto ja liitä prompt sinne.
            </div>
          )}
          {tila === 'virhe' && virhe && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#991b1b' }}>
              ✗ {virhe}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={kopioiPrompt}
              style={{
                padding:      '10px 16px',
                borderRadius: '8px',
                border:       '1px solid #e5e7eb',
                background:   'white',
                color:        '#374151',
                fontSize:     '13px',
                fontWeight:   600,
                cursor:       'pointer',
              }}
            >
              {kopioitu ? '✓ Kopioitu' : '📋 Kopioi prompt'}
            </button>
            <button
              type="button"
              onClick={() => setModaaliAuki(false)}
              disabled={tila === 'tallentaa'}
              style={{
                padding:      '10px 16px',
                borderRadius: '8px',
                border:       '1px solid #e5e7eb',
                background:   'white',
                color:        '#374151',
                fontSize:     '13px',
                cursor:       tila === 'tallentaa' ? 'not-allowed' : 'pointer',
                opacity:      tila === 'tallentaa' ? 0.5 : 1,
              }}
            >
              Peru
            </button>
            <button
              type="button"
              onClick={tallennaJaSulje}
              disabled={tila === 'tallentaa' || tila === 'onnistui'}
              style={{
                padding:      '10px 16px',
                borderRadius: '8px',
                border:       'none',
                background:   '#16a34a',
                color:        'white',
                fontSize:     '13px',
                fontWeight:   600,
                cursor:       'pointer',
                opacity:      (tila === 'tallentaa' || tila === 'onnistui') ? 0.6 : 1,
              }}
            >
              {tila === 'tallentaa' ? 'Tallennetaan…' : 'OK, lähetän Codelle'}
            </button>
          </div>
        </Modaali>
      )}

      {/* Detail-näkymä */}
      {valittu && (
        <Modaali otsikko={`Tarkistuskierros — ${muotoilePvm(valittu.luotu)}`} onSulje={() => setValittu(null)} maxWidth="720px">
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            Tila: <strong>{valittu.status}</strong>
            {valittu.valmistunut && <> · Valmistunut: {muotoilePvm(valittu.valmistunut)}</>}
            {valittu.todo_lisatty != null && <> · {valittu.todo_lisatty} TODO lisätty</>}
            {valittu.ideat_lisatty != null && <> · {valittu.ideat_lisatty} ideaa lisätty</>}
          </p>
          {valittu.yhteenveto && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#166534', whiteSpace: 'pre-wrap' }}>
              <strong>Yhteenveto:</strong>
              <div style={{ marginTop: '6px' }}>{valittu.yhteenveto}</div>
            </div>
          )}
          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#6b7280' }}>Näytä prompt</summary>
            <pre style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', fontSize: '11px', whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto', margin: '6px 0 0' }}>
              {valittu.prompt}
            </pre>
          </details>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setValittu(null)}
              style={{
                padding: '10px 16px', borderRadius: '8px', border: '1px solid #e5e7eb',
                background: 'white', color: '#374151', fontSize: '13px', cursor: 'pointer',
              }}
            >
              Sulje
            </button>
          </div>
        </Modaali>
      )}
    </div>
  )
}

function Modaali({ otsikko, onSulje, maxWidth = '600px', children }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onSulje() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px', zIndex: 1000, overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth,
        margin: '40px auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{otsikko}</h2>
        {children}
      </div>
    </div>
  )
}
