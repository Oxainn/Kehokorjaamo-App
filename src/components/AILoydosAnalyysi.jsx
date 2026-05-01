// Vaihe B Pala B8 — AI-analyysi löydöksistä
//
// Pyytää Edge Function -kautta Anthropic Claude:lta tulkintaa hoitajan
// BodyMap-havainnoista ja mittauksista. Tallennettu analyysi näkyy
// uudelleen avattaessa käyntiä — uusi pyyntö lähtee vain jos hoitaja
// painaa "Päivitä analyysi" -nappia.

import { useState, useEffect, useRef } from 'react'
import { kutsuAIAnalyysi, tallennaAIAnalyysi, haeAIAnalyysi } from '../lib/db'
import { useOnline } from '../hooks/useOnline'

const lohkoTyyli = {
  marginTop:    '12px',
  background:   '#faf5ff',
  border:       '1.5px solid #e9d5ff',
  borderRadius: '12px',
  padding:      '16px 18px',
  display:      'flex',
  flexDirection: 'column',
  gap:          '10px',
}

const nappiTyyli = (taustavari, vari) => ({
  display:      'inline-flex',
  alignItems:   'center',
  gap:          '6px',
  padding:      '10px 16px',
  borderRadius: '10px',
  border:       'none',
  background:   taustavari,
  color:        vari,
  fontSize:     '14px',
  fontWeight:   600,
  cursor:       'pointer',
})

// Yksinkertainen markdown-renderöinti: ## otsikot, listat, numeroidut listat,
// **bold**. Ei käytetä ulkopuolista kirjastoa jotta bundle pysyy pienenä.
function renderoiMarkdown(teksti) {
  if (!teksti) return null
  const rivit = teksti.split('\n')
  const lohkot = []
  let listaLohko = null
  let numeroLohko = null

  const sulje = () => {
    if (listaLohko) { lohkot.push({ tyyppi: 'ul', rivit: listaLohko }); listaLohko = null }
    if (numeroLohko) { lohkot.push({ tyyppi: 'ol', rivit: numeroLohko }); numeroLohko = null }
  }

  for (const rivi of rivit) {
    if (rivi.startsWith('## ')) {
      sulje()
      lohkot.push({ tyyppi: 'h2', teksti: rivi.slice(3).trim() })
    } else if (rivi.startsWith('# ')) {
      sulje()
      lohkot.push({ tyyppi: 'h1', teksti: rivi.slice(2).trim() })
    } else if (/^\s*-\s+/.test(rivi)) {
      if (numeroLohko) { lohkot.push({ tyyppi: 'ol', rivit: numeroLohko }); numeroLohko = null }
      listaLohko = listaLohko ?? []
      listaLohko.push(rivi.replace(/^\s*-\s+/, ''))
    } else if (/^\s*\d+\.\s+/.test(rivi)) {
      if (listaLohko) { lohkot.push({ tyyppi: 'ul', rivit: listaLohko }); listaLohko = null }
      numeroLohko = numeroLohko ?? []
      numeroLohko.push(rivi.replace(/^\s*\d+\.\s+/, ''))
    } else if (rivi.trim() === '') {
      sulje()
    } else {
      sulje()
      lohkot.push({ tyyppi: 'p', teksti: rivi })
    }
  }
  sulje()

  const inline = (s) => {
    const palat = []
    let i = 0
    let avain = 0
    while (i < s.length) {
      const j = s.indexOf('**', i)
      if (j === -1) { palat.push(s.slice(i)); break }
      if (j > i) palat.push(s.slice(i, j))
      const k = s.indexOf('**', j + 2)
      if (k === -1) { palat.push(s.slice(j)); break }
      palat.push(<strong key={`b${avain++}`}>{s.slice(j + 2, k)}</strong>)
      i = k + 2
    }
    return palat
  }

  return lohkot.map((b, idx) => {
    if (b.tyyppi === 'h1') return <h3 key={idx} style={{ fontSize: '15px', fontWeight: 700, color: '#581c87', margin: '8px 0 4px' }}>{b.teksti}</h3>
    if (b.tyyppi === 'h2') return <h4 key={idx} style={{ fontSize: '14px', fontWeight: 700, color: '#6b21a8', margin: '10px 0 4px' }}>{b.teksti}</h4>
    if (b.tyyppi === 'p')  return <p key={idx} style={{ fontSize: '14px', color: '#1f2937', margin: '4px 0', lineHeight: 1.5 }}>{inline(b.teksti)}</p>
    if (b.tyyppi === 'ul') return (
      <ul key={idx} style={{ margin: '4px 0 8px 20px', padding: 0, fontSize: '14px', color: '#1f2937', lineHeight: 1.6 }}>
        {b.rivit.map((r, i) => <li key={i}>{inline(r)}</li>)}
      </ul>
    )
    if (b.tyyppi === 'ol') return (
      <ol key={idx} style={{ margin: '4px 0 8px 20px', padding: 0, fontSize: '14px', color: '#1f2937', lineHeight: 1.6 }}>
        {b.rivit.map((r, i) => <li key={i}>{inline(r)}</li>)}
      </ol>
    )
    return null
  })
}

export default function AILoydosAnalyysi({
  hoitokayntiId,
  havainnot,
  mittarit,
  edellisetMittarit,
  asiakkaanKehonkartta,
  asiakkaanOireet,
}) {
  const [tila,        setTila]        = useState('idle') // idle | lataa | onnistui | virhe
  const [analyysi,    setAnalyysi]    = useState(null)   // { vastaus, prompti, malli, luotu, tallennettu }
  const [virhe,       setVirhe]       = useState(null)
  const [tallentaa,   setTallentaa]   = useState(false)
  const [tallennettu, setTallennettu] = useState(false)
  const [naytaPrompti, setNaytaPrompti] = useState(false)
  // Pala B9b — AI vaatii verkkoyhteyden
  const online = useOnline()
  // Tarkistus-bugi: kahdesti klikkaaminen "Päivitä analyysi" kahdesti
  // peräkkäin → kaksi rinnakkaista API-kutsua, ja jos myöhempi vastaa
  // ennen edellistä, vanhempi ylikirjoittaa tuoreemman. pyyntoIdRef
  // pitää viimeisimmän pyyntö-id:n; stale-vastaus jätetään huomiotta.
  const pyyntoIdRef = useRef(0)

  // Lataa olemassa oleva analyysi käynnistä — cache, ei kutsuta AI:ta uudestaan.
  useEffect(() => {
    if (!hoitokayntiId) return
    let peruttu = false
    haeAIAnalyysi(hoitokayntiId).then((tulos) => {
      if (peruttu || !tulos) return
      setAnalyysi({ ...tulos, tallennettu: true })
      setTallennettu(true)
    })
    return () => { peruttu = true }
  }, [hoitokayntiId])

  const onHavaintoja = Array.isArray(havainnot) && havainnot.length > 0

  async function pyydaAnalyysi() {
    const oma = ++pyyntoIdRef.current
    setTila('lataa')
    setVirhe(null)
    setTallennettu(false)
    const tulos = await kutsuAIAnalyysi({
      findings:             havainnot,
      mittarit,
      edellisetMittarit,
      asiakkaanKehonkartta,
      asiakkaanOireet,
    })
    // Stale-tulos: tämän pyynnön jälkeen on tehty uusi → ohita vastaus
    if (oma !== pyyntoIdRef.current) return
    if (tulos.virhe) {
      setTila('virhe')
      setVirhe(tulos.virhe)
      return
    }
    setAnalyysi({
      vastaus:     tulos.analyysi,
      prompti:     tulos.prompti,
      malli:       tulos.malli,
      luotu:       new Date().toISOString(),
      tallennettu: false,
    })
    setTila('onnistui')
  }

  async function tallenna() {
    if (!analyysi || !hoitokayntiId) return
    setTallentaa(true)
    const tulos = await tallennaAIAnalyysi(hoitokayntiId, {
      vastaus: analyysi.vastaus,
      prompti: analyysi.prompti,
      malli:   analyysi.malli,
    })
    setTallentaa(false)
    if (tulos.virhe) {
      setVirhe(tulos.virhe)
      return
    }
    setAnalyysi({ ...analyysi, tallennettu: true })
    setTallennettu(true)
  }

  return (
    <div style={{ marginTop: '8px' }}>
      {!analyysi && (
        <button
          type="button"
          onClick={pyydaAnalyysi}
          disabled={!onHavaintoja || tila === 'lataa' || !online}
          style={{
            ...nappiTyyli('#7c3aed', 'white'),
            opacity: !onHavaintoja || tila === 'lataa' || !online ? 0.5 : 1,
            cursor:  !onHavaintoja || !online ? 'not-allowed' : tila === 'lataa' ? 'wait' : 'pointer',
          }}
          title={!online ? 'AI-analyysi vaatii verkkoyhteyden' : (!onHavaintoja ? 'Tee ensin havaintoja BodyMap:ssa' : 'Pyydä AI-analyysi')}
        >
          {tila === 'lataa' ? '🤖 Analysoidaan…' : '🤖 Pyydä AI-analyysi havainnoista'}
        </button>
      )}

      {!onHavaintoja && !analyysi && (
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
          Lisää havaintoja ennen kuin pyydät AI-analyysiä.
        </p>
      )}
      {onHavaintoja && !analyysi && !online && (
        <p style={{ fontSize: '12px', color: '#92400e', marginTop: '6px' }}>
          AI-analyysi vaatii verkkoyhteyden — kokeile uudelleen kun yhteys palaa.
        </p>
      )}

      {tila === 'virhe' && virhe && (
        <div style={{ marginTop: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#991b1b' }}>
          ✗ {virhe}
        </div>
      )}

      {analyysi && (
        <div style={lohkoTyyli}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#581c87', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🤖 AI:n näkemys löydöksistä
            </h3>
            <span style={{ fontSize: '11px', color: '#9333ea' }}>
              {analyysi.malli ?? ''}{tallennettu ? ' · tallennettu' : ' · ei tallennettu'}
            </span>
          </div>

          <div>
            {renderoiMarkdown(analyysi.vastaus)}
          </div>

          <p style={{ fontSize: '12px', color: '#7c3aed', fontStyle: 'italic', margin: 0 }}>
            Tämä on AI:n ehdotus. Hoitaja päättää itse mitä tekee.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {!tallennettu && (
              <button
                type="button"
                onClick={tallenna}
                disabled={tallentaa || !hoitokayntiId}
                style={{ ...nappiTyyli('#1D9E75', 'white'), opacity: tallentaa ? 0.7 : 1, cursor: tallentaa ? 'wait' : 'pointer' }}
              >
                {tallentaa ? 'Tallennetaan…' : '✓ Tallenna analyysi käynnille'}
              </button>
            )}
            <button
              type="button"
              onClick={pyydaAnalyysi}
              disabled={tila === 'lataa'}
              style={{ ...nappiTyyli('#f3f4f6', '#374151'), cursor: tila === 'lataa' ? 'wait' : 'pointer' }}
            >
              {tila === 'lataa' ? 'Päivitetään…' : '↻ Päivitä analyysi'}
            </button>
            <button
              type="button"
              onClick={() => setNaytaPrompti((n) => !n)}
              style={{ ...nappiTyyli('transparent', '#7c3aed'), padding: '8px 12px', fontSize: '12px', fontWeight: 500 }}
            >
              {naytaPrompti ? 'Piilota prompti' : 'Näytä prompti'}
            </button>
          </div>

          {naytaPrompti && analyysi.prompti && (
            <pre style={{
              marginTop:    '4px',
              padding:      '10px 12px',
              background:   '#f3f4f6',
              borderRadius: '8px',
              fontSize:     '11px',
              color:        '#374151',
              whiteSpace:   'pre-wrap',
              wordBreak:    'break-word',
              maxHeight:    '300px',
              overflow:     'auto',
            }}>
              {analyysi.prompti}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
